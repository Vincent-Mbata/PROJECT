import React, { useState } from 'react';
import { colors, type, modal, buttons, cards, feedbackBanner } from '../styles/shared';
import DateInput from './DateInput';

export default function EquipmentTab({ project, apiUrl }) {
    const [form, setForm] = useState({
        acceptance_date: project.equipment_acceptance?.acceptance_date || '',
        decision: project.equipment_acceptance?.decision || 'pending',
        notes: project.equipment_acceptance?.notes || '',
        photos: [],
    });
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState(null);
    const [photos, setPhotos] = useState(project.equipment_acceptance?.photos || []);

    const handleSave = async () => {
        setSaving(true);
        setFeedback(null);
        try {
            const formData = new FormData();
            formData.append('acceptance_date', form.acceptance_date);
            formData.append('decision', form.decision);
            formData.append('notes', form.notes);
            form.photos.forEach(f => formData.append('photos', f));
            const res = await fetch(`${apiUrl}/api/projects/${project.id}/equipment-acceptance`, {
                method: 'POST', body: formData,
            });
            if (!res.ok) throw new Error('Failed');
            const data = await res.json();
            setPhotos(data.photos || []);
            setForm(prev => ({ ...prev, photos: [] }));
            setFeedback({ type: 'success', message: 'Equipment acceptance saved!' });
        } catch {
            setFeedback({ type: 'error', message: 'Failed to save' });
        } finally {
            setSaving(false);
            setTimeout(() => setFeedback(null), 3000);
        }
    };

    const handleDeletePhoto = async (photoId) => {
        if (!window.confirm('Delete this photo?')) return;
        try {
            await fetch(`${apiUrl}/api/event-photos/${photoId}`, { method: 'DELETE' });
            setPhotos(prev => prev.filter(p => p.id !== photoId));
        } catch { /* ignore */ }
    };

    const decisionColors = {
        accepted: colors.success,
        rejected: colors.danger,
        pending: colors.warning,
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
                <h3 style={{ margin: '0 0 4px 0', ...type.heading, color: colors.textPrimary }}>Equipment Inspection & Acceptance</h3>
                <p style={{ margin: 0, ...type.sm, color: colors.textMuted }}>Record equipment inspection and acceptance or rejection decision.</p>
            </div>

            {feedback && <div style={feedbackBanner(feedback.type)}>{feedback.message}</div>}

            <div style={{ ...cards.section, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1 1 200px' }}>
                        <label style={modal.label}>Acceptance Date</label>
                        <DateInput
                            value={form.acceptance_date}
                            onChange={e => setForm(prev => ({ ...prev, acceptance_date: e.target.value }))}
                        />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1 1 200px' }}>
                        <label style={modal.label}>Decision</label>
                        <select
                            value={form.decision}
                            onChange={e => setForm(prev => ({ ...prev, decision: e.target.value }))}
                            style={modal.select}
                        >
                            <option value="pending">Pending</option>
                            <option value="accepted">Accepted</option>
                            <option value="rejected">Rejected</option>
                        </select>
                    </div>
                </div>

                {project.equipment_acceptance?.decision && (
                    <div style={{
                        display: 'inline-flex', alignSelf: 'flex-start', alignItems: 'center', gap: '6px',
                        padding: '4px 10px', borderRadius: '4px',
                        backgroundColor: decisionColors[project.equipment_acceptance.decision] + '15',
                        border: `1px solid ${decisionColors[project.equipment_acceptance.decision]}40`,
                    }}>
                        <span style={{
                            width: '7px', height: '7px', borderRadius: '50%',
                            backgroundColor: decisionColors[project.equipment_acceptance.decision],
                        }} />
                        <span style={{
                            fontSize: '11px', fontWeight: 700,
                            color: decisionColors[project.equipment_acceptance.decision],
                            letterSpacing: '0.3px',
                        }}>
                            {project.equipment_acceptance.decision.toUpperCase()}
                        </span>
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={modal.label}>Notes</label>
                    <textarea
                        value={form.notes}
                        onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Equipment inspection notes..." rows={3}
                        style={modal.textarea}
                    />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={modal.label}>Photos</label>
                    <input
                        type="file" multiple accept="image/*"
                        onChange={e => setForm(prev => ({ ...prev, photos: Array.from(e.target.files) }))}
                        style={{ ...type.sm, color: colors.textSecondary }}
                    />
                    {form.photos.length > 0 && (
                        <span style={{ ...type.xs, color: colors.success }}>{form.photos.length} file(s) selected</span>
                    )}
                </div>
                <button onClick={handleSave} disabled={saving} style={{
                    ...buttons.primary, alignSelf: 'flex-start',
                    opacity: saving ? 0.6 : 1, cursor: saving ? 'not-allowed' : 'pointer',
                }}>
                    {saving ? 'Saving...' : (project.equipment_acceptance ? 'Update' : 'Save')}
                </button>
            </div>

            {photos.length > 0 && (
                <div>
                    <h4 style={{ margin: '0 0 8px 0', ...type.subheading, color: colors.textSecondary }}>Equipment Photos</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px' }}>
                        {photos.map(photo => (
                            <div key={photo.id} style={{
                                position: 'relative', borderRadius: '6px', overflow: 'hidden',
                                border: `1px solid ${colors.border}`, aspectRatio: '1',
                            }}>
                                <img src={`${apiUrl}${photo.url}`} alt="Equipment" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                                <button
                                    onClick={() => handleDeletePhoto(photo.id)}
                                    style={{
                                        position: 'absolute', top: '4px', right: '4px',
                                        background: 'rgba(248,81,73,0.9)', color: '#fff',
                                        border: 'none', radius: '50%', width: '20px', height: '20px',
                                        cursor: 'pointer', fontSize: '10px', display: 'flex',
                                        alignItems: 'center', justifyContent: 'center',
                                    }}>✕</button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
