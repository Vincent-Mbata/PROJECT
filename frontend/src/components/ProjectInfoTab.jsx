import React from 'react';
import { colors, type, cards, modal, buttons, getStatusColor } from '../styles/shared';

function Field({ label, value, bold, accent, badge }) {
    const statusColors = {
        Completed: colors.success,
        Ongoing: colors.warning,
        'On Hold': colors.danger,
        Planning: colors.textMuted,
    };
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <label style={modal.label}>{label}</label>
            {badge ? (
                <span style={{
                    display: 'inline-flex', alignSelf: 'flex-start',
                    padding: '2px 8px', borderRadius: '4px', fontSize: '11px',
                    fontWeight: 600, lineHeight: '16px',
                    backgroundColor: (statusColors[value] || colors.textMuted) + '20',
                    color: statusColors[value] || colors.textMuted,
                    border: `1px solid ${statusColors[value] || colors.textMuted}40`,
                }}>
                    {value}
                </span>
            ) : (
                <span style={{
                    ...type.base,
                    color: accent ? colors.primary : bold ? colors.textPrimary : colors.textSecondary,
                    fontWeight: bold ? 600 : 400,
                }}>
                    {value || '—'}
                </span>
            )}
        </div>
    );
}

export default function ProjectInfoTab({ project, apiUrl }) {
    const [settingCover, setSettingCover] = React.useState(false);
    const [deletingId, setDeletingId] = React.useState(null);
    const [coverFeedback, setCoverFeedback] = React.useState(null);
    const [deleteFeedback, setDeleteFeedback] = React.useState(null);

    const handleSetCover = async (photoUrl) => {
        setSettingCover(true);
        setCoverFeedback(null);
        try {
            await fetch(`${apiUrl}/api/projects/${project.id}/cover-photo`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ photo_url: photoUrl }),
            });
            setCoverFeedback({ type: 'success', message: 'Cover photo updated!' });
            if (project) project.cover_photo = photoUrl;
        } catch {
            setCoverFeedback({ type: 'error', message: 'Failed to set cover' });
        } finally {
            setSettingCover(false);
            setTimeout(() => setCoverFeedback(null), 3000);
        }
    };

    const handleDeletePhoto = async (photoId) => {
        if (!window.confirm('Delete this photo? This cannot be undone.')) return;
        setDeletingId(photoId);
        setDeleteFeedback(null);
        try {
            const res = await fetch(`${apiUrl}/api/projects/${project.id}/photos/${photoId}`, { method: 'DELETE' });
            const data = await res.json();
            setDeleteFeedback({ type: 'success', message: 'Photo deleted' });
            if (project) {
                project.photos = project.photos.filter(p => p.id !== photoId);
                if (data.was_cover) {
                    project.cover_photo = null;
                    if (project.photos.length > 0) {
                        await fetch(`${apiUrl}/api/projects/${project.id}/cover-photo`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ photo_url: project.photos[0].url }),
                        });
                        project.cover_photo = project.photos[0].url;
                    }
                }
            }
        } catch {
            setDeleteFeedback({ type: 'error', message: 'Failed to delete' });
        } finally {
            setDeletingId(null);
            setTimeout(() => setDeleteFeedback(null), 3000);
        }
    };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
            {/* Left: Project details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <Field label="Title" value={project.title} bold />
                <Field label="Category" value={project.category} />
                <Field label="Sub-County / Ward" value={`${project.sub_county || ''} / ${project.ward_area || ''}`} />
                <Field label="Status" value={project.status} badge />
                <Field label="Budget" value={`Kshs ${Number(project.budget || 0).toLocaleString()}`} accent />
                <Field label="Project Cost" value={`Kshs ${Number(project.project_cost || 0).toLocaleString()}`} />
                <Field label="Cost to Date" value={`Kshs ${Number(project.cost_to_date || 0).toLocaleString()}`} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={modal.label}>Completion</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={cards.progressBar}>
                            <div style={cards.progressFill(project.completion_percentage || 0)} />
                        </div>
                        <span style={{ ...type.sm, color: colors.textMuted, fontWeight: 500 }}>{project.completion_percentage || 0}%</span>
                    </div>
                </div>
                {project.contractor_name && <Field label="Contractor" value={project.contractor_name} />}
                {project.project_type && <Field label="Project Type" value={project.project_type} />}
                {project.description && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={modal.label}>Description</label>
                        <span style={{ ...type.base, color: colors.textSecondary, lineHeight: '20px' }}>{project.description}</span>
                    </div>
                )}
                {project.updated_at && <Field label="Last Updated" value={new Date(project.updated_at).toLocaleString()} />}
            </div>

            {/* Right: Photo gallery */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h3 style={{ margin: 0, ...type.heading, color: colors.textPrimary }}>Project Gallery</h3>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {deleteFeedback && (
                            <span style={{ ...type.xs, color: deleteFeedback.type === 'success' ? colors.success : colors.danger }}>
                                {deleteFeedback.message}
                            </span>
                        )}
                        {coverFeedback && (
                            <span style={{ ...type.xs, color: coverFeedback.type === 'success' ? colors.success : colors.danger }}>
                                {coverFeedback.message}
                            </span>
                        )}
                    </div>
                </div>
                <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                    gap: '10px', overflowY: 'auto', maxHeight: '480px', paddingRight: '4px',
                }}>
                    {project.photos && project.photos.length > 0 ? (
                        project.photos.map((photo) => (
                            <div key={photo.id} style={{
                                position: 'relative', borderRadius: '6px', overflow: 'hidden',
                                border: project.cover_photo === photo.url
                                    ? `2px solid ${colors.success}` : `1px solid ${colors.border}`,
                                aspectRatio: '1',
                            }}>
                                {project.cover_photo === photo.url && (
                                    <div style={{
                                        position: 'absolute', top: '4px', left: '4px',
                                        backgroundColor: colors.success, color: 'white',
                                        fontSize: '9px', fontWeight: 700, padding: '1px 5px',
                                        borderRadius: '3px', zIndex: 2,
                                    }}>COVER</div>
                                )}
                                <img
                                    src={`${apiUrl}${photo.url}`}
                                    alt="Project photo"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                    loading="lazy"
                                />
                                <div style={{
                                    position: 'absolute', bottom: 0, left: 0, right: 0,
                                    display: 'flex', gap: '4px', padding: '4px',
                                    background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                                }}>
                                    {project.cover_photo !== photo.url && (
                                        <button
                                            onClick={() => handleSetCover(photo.url)}
                                            disabled={settingCover}
                                            style={{
                                                flex: 1, fontSize: '9px', fontWeight: 600,
                                                padding: '3px', borderRadius: '3px', border: 'none',
                                                backgroundColor: 'rgba(255,255,255,0.15)', color: 'white',
                                                cursor: 'pointer',
                                            }}
                                        >Set Cover</button>
                                    )}
                                    <button
                                        onClick={() => handleDeletePhoto(photo.id)}
                                        disabled={deletingId === photo.id}
                                        style={{
                                            flex: 1, fontSize: '9px', fontWeight: 600,
                                            padding: '3px', borderRadius: '3px', border: 'none',
                                            backgroundColor: 'rgba(248,81,73,0.3)', color: '#fff',
                                            cursor: 'pointer',
                                        }}
                                    >Delete</button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div style={{
                            gridColumn: '1 / -1', textAlign: 'center', padding: '40px',
                            color: colors.textMuted, border: `1px dashed ${colors.border}`,
                            borderRadius: '8px', ...type.base,
                        }}>No photos available for this project.</div>
                    )}
                </div>
            </div>
        </div>
    );
}
