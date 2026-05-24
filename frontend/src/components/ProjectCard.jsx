import React, { useState } from 'react';
import { Edit2, Trash2, Eye } from 'lucide-react';
import { cards, getStatusColor, colors } from '../styles/shared';

const ProjectCard = ({ project, onEdit, onDelete, onView }) => {
  const apiUrl = import.meta.env.VITE_API_URL || '';
  const [hovered, setHovered] = useState(false);

  const mainPhoto = project.cover_photo
    ? `${apiUrl}${project.cover_photo}`
    : project.photos && project.photos.length > 0
      ? `${apiUrl}${project.photos[0].url}`
      : null;

  const handleImageError = (e) => {
    e.target.src = `data:image/svg+xml,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" fill="%23161b22"><rect width="400" height="200"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%238b949e" font-family="monospace" font-size="14">No Image</text></svg>`
    )}`;
  };

  return (
    <div
      style={{
        ...cards.project,
        transform: hovered ? cards.projectHover.transform : 'translateY(0)',
        backgroundColor: hovered ? cards.projectHover.backgroundColor : cards.project.backgroundColor,
        boxShadow: hovered
          ? '0 8px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(88,166,255,0.15)'
          : cards.project.boxShadow,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={cards.imageContainer}>
        {mainPhoto ? (
          <img
            src={mainPhoto}
            alt={project.title}
            style={{
              ...cards.image,
              transform: hovered ? 'scale(1.06)' : 'scale(1)',
            }}
            onError={handleImageError}
          />
        ) : (
          <div style={{
            ...cards.image,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.surface,
            color: colors.textSecondary,
            fontFamily: 'monospace',
            fontSize: '14px',
          }}>
            No Image
          </div>
        )}
        {/* Action buttons — visible on card hover */}
        <div style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          display: 'flex',
          gap: '6px',
          opacity: hovered ? 1 : 0,
          transform: hovered ? 'translateY(0)' : 'translateY(-8px)',
          transition: 'opacity 0.2s ease, transform 0.2s ease',
          pointerEvents: hovered ? 'auto' : 'none',
        }}>
          {[
            { Icon: Eye, color: colors.primary, action: () => onView(project), title: 'View' },
            { Icon: Edit2, color: colors.primary, action: () => onEdit(project), title: 'Edit' },
            { Icon: Trash2, color: colors.danger, action: () => onDelete(project.id), title: 'Delete' },
          ].map(({ Icon, color, action, title }, i) => (
            <button
              key={i}
              onClick={action}
              title={title}
              style={{
                backgroundColor: 'rgba(0,0,0,0.65)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.2s ease, transform 0.15s ease',
                boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
              }}
              onMouseOver={(e) => { e.currentTarget.style.backgroundColor = color; e.currentTarget.style.transform = 'scale(1.1)'; }}
              onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.65)'; e.currentTarget.style.transform = 'scale(1)'; }}
            >
              <Icon size={14} />
            </button>
          ))}
        </div>
      </div>

      <div style={cards.content}>
        <h3 style={cards.title}>{project.title}</h3>
        <p style={cards.description}>{project.description}</p>

        <div style={cards.tagContainer}>
          {project.status && (
            <span style={cards.tag(getStatusColor(project.status))}>{project.status}</span>
          )}
          {project.sub_county && (
            <span style={cards.tagMuted()}>{project.sub_county}</span>
          )}
          {project.ward_area && (
            <span style={cards.tagMuted()}>{project.ward_area}</span>
          )}
          {project.category && (
            <span style={cards.tag(colors.primary)}>{project.category}</span>
          )}
          {project.project_type && (
            <span style={cards.tagMuted()}>{project.project_type}</span>
          )}
        </div>

        <div style={cards.budgetRow}>
          <div>Budget: Kshs {Number(project.budget || 0).toLocaleString()}</div>
          <div style={{ color: colors.textSecondary, fontWeight: 'normal' }}>
            Project Cost: Kshs {Number(project.project_cost || 0).toLocaleString()}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={cards.progressBar}>
            <div style={cards.progressFill(project.completion_percentage || 0)} />
          </div>
          <span style={{ fontSize: '12px', color: colors.textSecondary }}>
            {project.completion_percentage || 0}%
          </span>
        </div>
      </div>
    </div>
  );
};

export default ProjectCard;
