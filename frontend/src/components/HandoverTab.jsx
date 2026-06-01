import React, { useState } from 'react';
import { colors, type, modal, buttons, feedbackBanner, cards } from '../styles/shared';
import DateInput from './DateInput';

export default function HandoverTab({ project, apiUrl }) {
    const [form, setForm] = useState({
        handover_date: project.handover?.handover_date || '',
        notes: project.handover?.notes || '',
        photos: [],
    });
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState(null);
    const [photos, setPhotos] = useState(project.handover?.photos || []);

    const handleSave = async () => {
        setSaving(true);
        setFeedback(null);
        try {
            const formData = new FormData();
            formData.append('handover_date', form.handover_date);
            formData.append('notes', form.notes);
            form.photos.forEach(f => formData.append('photos', f));
            const res = await fetch(`${apiUrl}/api/projects/${project.id}/handover`, {
                method: 'POST', body: formData,
            });
            if (!res.ok) throw new Error('Failed');
            const data = await res.json();
            setPhotos(data.photos || []);
            setForm(prev => ({ ...prev, photos: [] }));
            setFeedback({ type: 'success', message: 'Handover saved!' });
        } catch {
            setFeedback({ type: 'error', message: 'Failed to save handover' });
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

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
                <h3 style={{ margin: '0 0 4px 0', ...type.heading, color: colors.textPrimary }}>Site Handover</h3>
                <p style={{ margin: 0, ...type.sm, color: colors.textMuted }}>
                    Record the initial site handover. This happens once before works begin.
                </p>
            </div>

            {feedback && <div style={feedbackBanner(feedback.type)}>{feedback.message}</div>}

            <div style={{ ...cards.section, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1 1 200px' }}>
                        <label style={modal.label}>Handover Date</label>
                        <DateInput
                            value={form.handover_date}
                            onChange={e => setForm(prev => ({ ...prev, handover_date: e.target.value }))}
                        />
                    </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={modal.label}>Notes</label>
                    <textarea
                        value={form.notes}
                        onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Site handover notes..." rows={3}
                        style={modal.textarea}
                    />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={modal.label}>Photos (initial site condition)</label>
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
                    {saving ? 'Saving...' : (project.handover ? 'Update Handover' : 'Save Handover')}
                </button>
            </div>

            {photos.length > 0 && (
                <div>
                    <h4 style={{ margin: '0 0 8px 0', ...type.subheading, color: colors.textSecondary }}>Handover Photos</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px' }}>
                        {photos.map(photo => (
                            <div key={photo.id} style={{
                                position: 'relative', borderRadius: '6px', overflow: 'hidden',
                                border: `1px solid ${colors.border}`, aspectRatio: '1',
                            }}>
                                <img src={`${apiUrl}${photo.url}`} alt="Handover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                                <button
                                    onClick={() => handleDeletePhoto(photo.id)}
                                    style={{
                                        position: 'absolute', top: '4px', right: '4px',
                                        background: 'rgba(248,81,73,0.9)', color: '#fff',
                                        border: 'none', borderRadius: '50%', width: '20px', height: '20px',
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
