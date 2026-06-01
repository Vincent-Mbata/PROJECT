import React, { useState } from 'react';
import { Edit2Icon, Trash2Icon, EyeIcon } from './Icons';
import { cards, getStatusColor, colors, type, statusBadge } from '../styles/shared';

const ProjectCard = ({ project, onEdit, onDelete, onView }) => {
    const apiUrl = import.meta.env.VITE_API_URL || '';
    const [isHovered, setIsHovered] = useState(false);

    const mainPhoto = project.cover_photo
        ? `${apiUrl}${project.cover_photo}`
        : project.photos && project.photos.length > 0
            ? `${apiUrl}${project.photos[0].url}`
            : null;

    const handleImageError = (e) => {
        e.target.style.display = 'none';
        e.target.nextSibling.style.display = 'flex';
    };

    const statusColor = getStatusColor(project.status);

    return (
        <div
            style={{
                ...cards.project,
                transform: isHovered ? cards.projectHover.transform : 'translateY(0)',
                boxShadow: isHovered
                    ? '0 8px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(74,158,255,0.12)'
                    : cards.project.boxShadow,
                borderColor: isHovered ? '#354a66' : colors.border,
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            role="article"
            aria-label={`Project: ${project.title}`}
        >
            <div style={cards.imageContainer}>
                {mainPhoto ? (
                    <>
                        <img
                            src={mainPhoto}
                            alt={`Cover photo for ${project.title}`}
                            style={{ ...cards.image, transform: isHovered ? 'scale(1.04)' : 'scale(1)' }}
                            onError={handleImageError}
                            loading="lazy"
                        />
                        <div style={{
                            ...cards.image, display: 'none', alignItems: 'center', justifyContent: 'center',
                            backgroundColor: colors.surfaceActive, color: colors.textMuted, fontSize: '12px',
                        }}>
                            No Image
                        </div>
                    </>
                ) : (
                    <div style={{
                        ...cards.image, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        backgroundColor: colors.surfaceActive, color: colors.textMuted, fontSize: '12px',
                    }}>
                        No Image
                    </div>
                )}
                {/* Status badge — always visible, solid opaque background */}
                {project.status && (
                    <div style={{
                        position: 'absolute', top: '8px', left: '8px',
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        padding: '4px 10px', borderRadius: '5px',
                        backgroundColor: statusColor === colors.success ? '#1a3a1a'
                            : statusColor === colors.warning ? '#2d2a0e'
                            : statusColor === colors.danger ? '#2d1212'
                            : '#1e2330',
                        border: `1px solid ${statusColor === colors.success ? '#2ea043'
                            : statusColor === colors.warning ? '#d29922'
                            : statusColor === colors.danger ? '#f85149'
                            : '#3a4456'}`,
                        boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                    }}>
                        <span style={{
                            width: '8px', height: '8px', borderRadius: '50%',
                            backgroundColor: statusColor,
                            flexShrink: 0,
                            boxShadow: `0 0 6px ${statusColor}`,
                        }} />
                        <span style={{
                            color: statusColor,
                            fontSize: '10px', fontWeight: 700,
                            lineHeight: '14px',
                            letterSpacing: '0.3px',
                        }}>
                            {project.status.toUpperCase()}
                        </span>
                    </div>
                )}
                {/* Action buttons */}
                <div style={{
                    position: 'absolute', bottom: '8px', right: '8px',
                    display: 'flex', gap: '5px',
                    opacity: isHovered ? 1 : 0,
                    transform: isHovered ? 'translateY(0)' : 'translateY(6px)',
                    transition: 'opacity 0.2s ease, transform 0.2s ease',
                }}>
                    {[
                        { Icon: EyeIcon, label: 'View project', action: () => onView(project) },
                        { Icon: Edit2Icon, label: 'Edit project', action: () => onEdit(project) },
                        { Icon: Trash2Icon, label: 'Delete project', action: () => onDelete(project.id), danger: true },
                    ].map(({ Icon, label, action, danger }, i) => (
                        <button
                            key={i}
                            onClick={action}
                            title={label}
                            aria-label={label}
                            style={{
                                backgroundColor: 'rgba(0,0,0,0.7)',
                                color: danger ? colors.danger : 'white',
                                border: 'none', borderRadius: '4px',
                                padding: '5px', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'background-color 0.15s ease, transform 0.1s ease',
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.backgroundColor = danger ? colors.danger : colors.primary;
                                e.currentTarget.style.transform = 'scale(1.1)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.7)';
                                e.currentTarget.style.transform = 'scale(1)';
                            }}
                        >
                            <Icon size={13} />
                        </button>
                    ))}
                </div>
            </div>

            <div style={cards.content}>
                <h3 style={cards.title}>{project.title}</h3>
                {project.description && (
                    <p style={cards.description}>{project.description}</p>
                )}

                <div style={cards.tagContainer}>
                    {project.sub_county && <span style={cards.tagMuted}>{project.sub_county}</span>}
                    {project.ward_area && <span style={cards.tagMuted}>{project.ward_area}</span>}
                    {project.category && <span style={cards.tag(colors.primary)}>{project.category}</span>}
                    {project.project_type && <span style={cards.tagMuted}>{project.project_type}</span>}
                </div>

                {/* Event indicators */}
                {(project.handover || (project.inspections && project.inspections.length > 0) || project.equipment_acceptance) && (
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '8px', flexWrap: 'wrap' }}>
                        {project.handover && (
                            <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: '4px',
                                padding: '2px 7px', borderRadius: '4px', fontSize: '10px',
                                fontWeight: 600, lineHeight: '15px',
                                backgroundColor: '#1a3a1a', color: colors.success,
                                border: `1px solid ${colors.successBorder}`,
                            }}>
                                <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: colors.success }} />
                                Handover
                            </span>
                        )}
                        {project.inspections && project.inspections.length > 0 && (
                            <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: '4px',
                                padding: '2px 7px', borderRadius: '4px', fontSize: '10px',
                                fontWeight: 600, lineHeight: '15px',
                                backgroundColor: '#1e2330', color: colors.primary,
                                border: `1px solid ${colors.primary}40`,
                            }}>
                                <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: colors.primary }} />
                                {project.inspections.length} Insp.
                            </span>
                        )}
                        {project.equipment_acceptance && (
                            <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: '4px',
                                padding: '2px 7px', borderRadius: '4px', fontSize: '10px',
                                fontWeight: 600, lineHeight: '15px',
                                backgroundColor: project.equipment_acceptance.decision === 'accepted' ? '#1a3a1a'
                                    : project.equipment_acceptance.decision === 'rejected' ? '#2d1212' : '#2d2a0e',
                                color: project.equipment_acceptance.decision === 'accepted' ? colors.success
                                    : project.equipment_acceptance.decision === 'rejected' ? colors.danger : colors.warning,
                                border: `1px solid ${project.equipment_acceptance.decision === 'accepted' ? colors.successBorder
                                    : project.equipment_acceptance.decision === 'rejected' ? colors.dangerBorder : colors.warningBorder}`,
                            }}>
                                <span style={{
                                    width: '5px', height: '5px', borderRadius: '50%',
                                    backgroundColor: project.equipment_acceptance.decision === 'accepted' ? colors.success
                                        : project.equipment_acceptance.decision === 'rejected' ? colors.danger : colors.warning,
                                }} />
                                Eq: {project.equipment_acceptance.decision}
                            </span>
                        )}
                    </div>
                )}

                <div style={cards.budgetRow}>
                    Budget: <strong>Kshs {Number(project.budget || 0).toLocaleString()}</strong>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={cards.progressBar}>
                        <div style={cards.progressFill(project.completion_percentage || 0)} />
                    </div>
                    <span style={{ fontSize: '11px', color: colors.textMuted, fontWeight: 500, minWidth: '32px', textAlign: 'right' }}>
                        {project.completion_percentage || 0}%
                    </span>
                </div>
            </div>
        </div>
    );
};

export default ProjectCard;
