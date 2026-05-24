import React, { useState } from 'react';
import { X, Star, Check } from 'lucide-react';
import { modal, colors, getStatusColor, cards } from '../styles/shared';
import axios from 'axios';

const ProjectDetailModal = ({ isOpen, onClose, project, onCoverUpdate }) => {
  const [settingCover, setSettingCover] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [coverFeedback, setCoverFeedback] = useState(null);
  const [deleteFeedback, setDeleteFeedback] = useState(null);

  if (!isOpen || !project) return null;

  const apiUrl = import.meta.env.VITE_API_URL || '';

  const handleImageError = (e) => {
    e.target.style.display = 'none';
  };

  const handleSetCover = async (photoUrl) => {
    setSettingCover(true);
    setCoverFeedback(null);
    try {
      await axios.put(`${apiUrl}/api/projects/${project.id}/cover-photo`, { photo_url: photoUrl });
      setCoverFeedback({ type: 'success', message: 'Cover photo updated!' });
      if (project) {
        project.cover_photo = photoUrl;
      }
      if (onCoverUpdate) onCoverUpdate(photoUrl);
    } catch (err) {
      setCoverFeedback({ type: 'error', message: err.response?.data?.error || 'Failed to set cover photo' });
    } finally {
      setSettingCover(false);
      setTimeout(() => setCoverFeedback(null), 3000);
    }
  };

  const handleDeletePhoto = async (photoId, photoUrl) => {
    if (!window.confirm('Delete this photo? This cannot be undone.')) return;
    setDeletingId(photoId);
    setDeleteFeedback(null);
    try {
      const res = await axios.delete(`${apiUrl}/api/projects/${project.id}/photos/${photoId}`);
      setDeleteFeedback({ type: 'success', message: 'Photo deleted' });
      if (project) {
        project.photos = project.photos.filter(p => p.id !== photoId);
        if (res.data.was_cover) {
          project.cover_photo = null;
          if (project.photos.length > 0) {
            try {
              await axios.put(`${apiUrl}/api/projects/${project.id}/cover-photo`, { photo_url: project.photos[0].url });
              project.cover_photo = project.photos[0].url;
            } catch (e) { /* ignore auto-cover error */ }
          }
        }
      }
    } catch (err) {
      setDeleteFeedback({ type: 'error', message: err.response?.data?.error || 'Failed to delete photo' });
    } finally {
      setDeletingId(null);
      setTimeout(() => setDeleteFeedback(null), 3000);
    }
  };

  return (
    <div style={modal.overlayDark}>
      <div style={modal.containerWide}>
        <div style={modal.headerHighlight}>
          <h2 style={{ margin: 0, fontSize: '18px' }}>Project Details</h2>
          <button onClick={onClose} style={modal.closeButton}
            onMouseOver={(e) => { e.currentTarget.style.color = colors.textPrimary; e.currentTarget.style.backgroundColor = colors.surfaceHover; }}
            onMouseOut={(e) => { e.currentTarget.style.color = colors.textSecondary; e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <X size={24} />
          </button>
        </div>

        <div style={modal.bodyGrid}>
          {/* Information Side */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Field label="Title" value={project.title} bold />
            <Field label="Category" value={project.category} />
            <Field label="Sub-County / Ward" value={`${project.sub_county || ''} / ${project.ward_area || ''}`} />
            <Field label="Status" value={project.status} badge />
            <Field label="Budget" value={`Kshs ${Number(project.budget || 0).toLocaleString()}`} accent />
            <Field label="Project Cost" value={`Kshs ${Number(project.project_cost || 0).toLocaleString()}`} />
            <Field label="Cost to Date" value={`Kshs ${Number(project.cost_to_date || 0).toLocaleString()}`} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', color: colors.textSecondary }}>Completion</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={cards.progressBar}>
                  <div style={cards.progressFill(project.completion_percentage || 0)} />
                </div>
                <span>{project.completion_percentage || 0}%</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', color: colors.textSecondary }}>Description</label>
              <span style={{ fontSize: '14px', color: colors.textSecondary }}>
                {project.description || 'No description provided.'}
              </span>
            </div>

            {project.contractor_name && (
              <Field label="Contractor" value={project.contractor_name} />
            )}
            {project.project_type && (
              <Field label="Project Type" value={project.project_type} />
            )}
            {project.updated_at && (
              <Field label="Last Updated" value={new Date(project.updated_at).toLocaleString()} />
            )}
          </div>

          {/* Photo Gallery Side */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontSize: '18px' }}>Project Gallery</h3>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {deleteFeedback && (
                  <span style={{
                    fontSize: '12px',
                    color: deleteFeedback.type === 'success' ? colors.success : colors.danger,
                  }}>
                    {deleteFeedback.message}
                  </span>
                )}
                {coverFeedback && (
                  <span style={{
                    fontSize: '12px',
                    color: coverFeedback.type === 'success' ? colors.success : colors.danger,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}>
                    {coverFeedback.type === 'success' ? <Check size={14} /> : null}
                    {coverFeedback.message}
                  </span>
                )}
              </div>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
              gap: '12px',
              overflowY: 'auto',
              maxHeight: '500px',
              paddingRight: '8px',
            }}>
              {project.photos && project.photos.length > 0 ? (
                project.photos.map((photo) => (
                  <PhotoTile
                    key={photo.id}
                    photo={photo}
                    isCover={project.cover_photo === photo.url}
                    isDeleting={deletingId === photo.id}
                    apiUrl={apiUrl}
                    settingCover={settingCover}
                    onOpen={(url) => window.open(`${apiUrl}${url}`, '_blank')}
                    onSetCover={handleSetCover}
                    onDelete={handleDeletePhoto}
                  />
                ))
              ) : (
                <div style={{
                  gridColumn: '1 / -1',
                  textAlign: 'center',
                  padding: '40px',
                  color: colors.textSecondary,
                  border: `1px dashed ${colors.border}`,
                  borderRadius: '8px',
                }}>
                  No photos available for this project.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const PhotoTile = ({ photo, isCover, isDeleting, apiUrl, settingCover, onOpen, onSetCover, onDelete }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{
        height: '120px',
        borderRadius: '8px',
        overflow: 'hidden',
        border: isCover
          ? `2px solid ${colors.warning}`
          : hovered
            ? `2px solid ${colors.primary}`
            : `1px solid ${colors.border}`,
        cursor: isDeleting ? 'default' : 'pointer',
        position: 'relative',
        opacity: isDeleting ? 0.5 : 1,
        transition: 'border-color 0.2s ease, opacity 0.2s ease, box-shadow 0.2s ease',
        boxShadow: hovered && !isCover ? `0 0 16px ${colors.primary}50` : 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => !isDeleting && onOpen(photo.url)}
    >
      <img
        src={`${apiUrl}${photo.url}`}
        alt="Project photo"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: hovered ? 'scale(1.08)' : 'scale(1)',
          transition: 'transform 0.3s ease',
        }}
        onError={function(e) { e.target.style.display = 'none'; }}
      />
      {/* Hover overlay */}
      {hovered && !isDeleting && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 50%)',
          pointerEvents: 'none',
          transition: 'opacity 0.2s ease',
        }} />
      )}
      {/* Cover photo badge */}
      {isCover && (
        <div style={{
          position: 'absolute',
          top: '4px',
          left: '4px',
          backgroundColor: colors.warning,
          color: '#000',
          fontSize: '10px',
          fontWeight: 'bold',
          padding: '2px 6px',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
        }}>
          <Star size={10} fill="#000" /> COVER
        </div>
      )}
      {/* Action buttons — visible on hover */}
      {!isDeleting && hovered && (
        <>
          {/* Set as cover button */}
          {!isCover && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onSetCover(photo.url); }}
              disabled={settingCover}
              style={{
                position: 'absolute',
                bottom: '6px',
                right: '6px',
                backgroundColor: 'rgba(0,0,0,0.75)',
                color: '#fff',
                border: `1px solid ${colors.primary}`,
                borderRadius: '4px',
                padding: '3px 8px',
                fontSize: '10px',
                fontWeight: 'bold',
                cursor: settingCover ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
                transition: 'background-color 0.2s ease, transform 0.15s ease',
              }}
              onMouseOver={(e) => { e.currentTarget.style.backgroundColor = colors.primary; e.currentTarget.style.transform = 'scale(1.05)'; }}
              onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.75)'; e.currentTarget.style.transform = 'scale(1)'; }}
              title="Set as cover photo"
            >
              <Star size={10} /> Cover
            </button>
          )}
          {/* Delete button */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(photo.id, photo.url); }}
            style={{
              position: 'absolute',
              top: '6px',
              right: '6px',
              backgroundColor: 'rgba(248,81,73,0.9)',
              color: '#fff',
              border: 'none',
              borderRadius: '50%',
              width: '22px',
              height: '22px',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
              transition: 'background-color 0.2s ease, transform 0.15s ease',
            }}
            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = colors.danger; e.currentTarget.style.transform = 'scale(1.2)'; }}
            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'rgba(248,81,73,0.9)'; e.currentTarget.style.transform = 'scale(1)'; }}
            title="Delete photo"
          >
            ✕
          </button>
        </>
      )}
    </div>
  );
};

const Field = ({ label, value, bold, accent, badge }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
    <label style={{ fontSize: '12px', color: colors.textSecondary }}>{label}</label>
    {badge ? (
      <span style={{
        fontSize: '12px', padding: '2px 8px', borderRadius: '12px',
        backgroundColor: getStatusColor(value), color: 'white',
        width: 'fit-content', fontWeight: 'bold',
      }}>
        {value}
      </span>
    ) : (
      <span style={{
        fontSize: '16px', fontWeight: bold ? 'bold' : 'normal',
        color: accent ? colors.primary : colors.textPrimary,
      }}>
        {value}
      </span>
    )}
  </div>
);

export default ProjectDetailModal;
