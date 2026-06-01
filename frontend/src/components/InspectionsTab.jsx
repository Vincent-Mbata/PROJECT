import React, { useState } from 'react';
import { colors, type, modal, buttons, cards, feedbackBanner } from '../styles/shared';
import DateInput from './DateInput';

function InspectionForm({ num, data, existing, apiUrl, projectId, onSaved }) {
    const [form, setForm] = useState({
        inspection_date: data?.inspection_date || '',
        notes: data?.notes || '',
        photos: [],
    });
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            const formData = new FormData();
            formData.append('inspection_number', num);
            formData.append('inspection_date', form.inspection_date);
            formData.append('notes', form.notes);
            form.photos.forEach(f => formData.append('photos', f));
            const res = await fetch(`${apiUrl}/api/projects/${projectId}/inspections`, {
                method: 'POST', body: formData,
            });
            if (!res.ok) throw new Error('Failed');
            const result = await res.json();
            setForm(prev => ({ ...prev, photos: [] }));
            if (onSaved) onSaved(result);
        } catch { /* ignore */ } finally {
            setSaving(false);
        }
    };

    const handleDeletePhoto = async (photoId) => {
        if (!window.confirm('Delete this photo?')) return;
        try {
            await fetch(`${apiUrl}/api/event-photos/${photoId}`, { method: 'DELETE' });
            if (onSaved) onSaved();
        } catch { /* ignore */ }
    };

    return (
        <div style={{ ...cards.section, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ ...type.subheading, color: colors.textPrimary }}>Inspection {num}</span>
                {existing && (
                    <span style={{
                        fontSize: '9px', padding: '2px 6px', borderRadius: '10px',
                        backgroundColor: colors.successBg, color: colors.success,
                        fontWeight: 600,
                    }}>Saved</span>
                )}
            </div>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1 1 200px' }}>
                    <label style={modal.label}>Inspection Date</label>
                    <DateInput
                        value={form.inspection_date}
                        onChange={e => setForm(prev => ({ ...prev, inspection_date: e.target.value }))}
                    />
                </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={modal.label}>Notes</label>
                <textarea
                    value={form.notes}
                    onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder={`Inspection ${num} notes...`} rows={2}
                    style={modal.textarea}
                />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={modal.label}>Progress Photos</label>
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
                ...buttons.primary, alignSelf: 'flex-start', fontSize: '12px', padding: '6px 12px',
                opacity: saving ? 0.6 : 1, cursor: saving ? 'not-allowed' : 'pointer',
            }}>
                {saving ? 'Saving...' : (existing ? `Update Insp. ${num}` : `Save Insp. ${num}`)}
            </button>

            {existing?.photos?.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '6px' }}>
                    {existing.photos.map(photo => (
                        <div key={photo.id} style={{
                            position: 'relative', borderRadius: '4px', overflow: 'hidden',
                            border: `1px solid ${colors.border}`, aspectRatio: '1',
                        }}>
                            <img src={`${apiUrl}${photo.url}`} alt={`Insp ${num}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                            <button
                                onClick={() => handleDeletePhoto(photo.id)}
                                style={{
                                    position: 'absolute', top: '2px', right: '2px',
                                    background: 'rgba(248,81,73,0.9)', color: '#fff',
                                    border: 'none', borderRadius: '50%', width: '16px', height: '16px',
                                    cursor: 'pointer', fontSize: '9px', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center',
                                }}>✕</button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function InspectionsTab({ project, apiUrl }) {
    const [inspections, setInspections] = useState(project.inspections || []);
    const [feedback, setFeedback] = useState(null);

    const handleSaved = (result) => {
        setInspections(prev => {
            const idx = prev.findIndex(i => i.inspection_number === result.inspection_number);
            if (idx >= 0) {
                const updated = [...prev];
                updated[idx] = result;
                return updated;
            }
            return [...prev, result];
        });
        setFeedback({ type: 'success', message: `Inspection ${result.inspection_number} saved!` });
        setTimeout(() => setFeedback(null), 3000);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
                <h3 style={{ margin: '0 0 4px 0', ...type.heading, color: colors.textPrimary }}>Inspections</h3>
                <p style={{ margin: 0, ...type.sm, color: colors.textMuted }}>Record up to 4 inspections. Each documents progress with photos and notes.</p>
            </div>

            {feedback && <div style={feedbackBanner(feedback.type)}>{feedback.message}</div>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[1, 2, 3, 4].map(num => {
                    const existing = inspections.find(i => i.inspection_number === num);
                    return (
                        <InspectionForm
                            key={num}
                            num={num}
                            data={existing}
                            existing={existing}
                            apiUrl={apiUrl}
                            projectId={project.id}
                            onSaved={handleSaved}
                        />
                    );
                })}
            </div>
        </div>
    );
}
