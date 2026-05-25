import React, { useState, useEffect } from 'react';
import { modal, colors, getStatusColor, cards, buttons } from '../styles/shared';
import axios from 'axios';

const XIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const StarIcon = ({ size = 18, fill = 'none' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const CheckIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const ProjectDetailModal = ({ isOpen, onClose, project, onCoverUpdate }) => {
  const [activeTab, setActiveTab] = useState('info');
  const [handover, setHandover] = useState(null);
  const [inspections, setInspections] = useState([]);
  const [equipmentAcceptance, setEquipmentAcceptance] = useState(null);
  const [loading, setLoading] = useState(false);

  // Form states
  const [handoverForm, setHandoverForm] = useState({ handover_date: '', notes: '', photos: [] });
  const [inspectionForms, setInspectionForms] = useState({});
  const [acceptanceForm, setAcceptanceForm] = useState({ acceptance_date: '', decision: 'pending', notes: '', photos: [] });

  const [settingCover, setSettingCover] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [coverFeedback, setCoverFeedback] = useState(null);
  const [deleteFeedback, setDeleteFeedback] = useState(null);
  const [saveFeedback, setSaveFeedback] = useState(null);

  const apiUrl = import.meta.env.VITE_API_URL || '';

  const category = project?.category || '';
  const isWorks = category === 'Works' || category === 'Both Works and Equipment';
  const isEquipment = category === 'Equipment' || category === 'Both Works and Equipment';

  // Fetch handover/inspection data when modal opens
  useEffect(() => {
    if (isOpen && project) {
      fetchEventData();
      setActiveTab('info');
    }
  }, [isOpen, project?.id]);

  const fetchEventData = async () => {
    if (!project) return;
    setLoading(true);
    try {
      const [hRes, iRes, eaRes] = await Promise.all([
        isWorks ? axios.get(`${apiUrl}/api/projects/${project.id}/handover`) : Promise.resolve({ data: null }),
        isWorks ? axios.get(`${apiUrl}/api/projects/${project.id}/inspections`) : Promise.resolve({ data: [] }),
        isEquipment ? axios.get(`${apiUrl}/api/projects/${project.id}/equipment-acceptance`) : Promise.resolve({ data: null }),
      ]);
      setHandover(hRes.data);
      setHandoverForm({
        handover_date: hRes.data?.handover_date || '',
        notes: hRes.data?.notes || '',
        photos: []
      });
      setInspections(iRes.data || []);
      const inspForms = {};
      (iRes.data || []).forEach(insp => {
        inspForms[insp.inspection_number] = {
          inspection_date: insp.inspection_date || '',
          notes: insp.notes || '',
          photos: []
        };
      });
      setInspectionForms(inspForms);
      setEquipmentAcceptance(eaRes.data);
      setAcceptanceForm({
        acceptance_date: eaRes.data?.acceptance_date || '',
        decision: eaRes.data?.decision || 'pending',
        notes: eaRes.data?.notes || '',
        photos: []
      });
    } catch (err) {
      console.error('Error fetching event data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleImageError = (e) => {
    e.target.style.display = 'none';
  };

  const handleSetCover = async (photoUrl) => {
    setSettingCover(true);
    setCoverFeedback(null);
    try {
      await axios.put(`${apiUrl}/api/projects/${project.id}/cover-photo`, { photo_url: photoUrl });
      setCoverFeedback({ type: 'success', message: 'Cover photo updated!' });
      if (project) project.cover_photo = photoUrl;
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
            } catch (e) { /* ignore */ }
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

  // ---- HANDOVER SAVE ----
  const handleSaveHandover = async () => {
    setSaveFeedback(null);
    try {
      const formData = new FormData();
      formData.append('handover_date', handoverForm.handover_date);
      formData.append('notes', handoverForm.notes);
      handoverForm.photos.forEach(f => formData.append('photos', f));
      const res = await axios.post(`${apiUrl}/api/projects/${project.id}/handover`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setHandover(res.data);
      setHandoverForm(prev => ({ ...prev, photos: [] }));
      setSaveFeedback({ type: 'success', message: 'Handover saved!' });
      setTimeout(() => setSaveFeedback(null), 3000);
    } catch (err) {
      setSaveFeedback({ type: 'error', message: err.response?.data?.error || 'Failed to save handover' });
    }
  };

  // ---- INSPECTION SAVE ----
  const handleSaveInspection = async (num) => {
    setSaveFeedback(null);
    const form = inspectionForms[num];
    if (!form) return;
    try {
      const formData = new FormData();
      formData.append('inspection_number', num);
      formData.append('inspection_date', form.inspection_date);
      formData.append('notes', form.notes);
      form.photos.forEach(f => formData.append('photos', f));
      const res = await axios.post(`${apiUrl}/api/projects/${project.id}/inspections`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      // Refresh all inspections
      const iRes = await axios.get(`${apiUrl}/api/projects/${project.id}/inspections`);
      setInspections(iRes.data);
      setInspectionForms(prev => ({ ...prev, [num]: { ...prev[num], photos: [] } }));
      setSaveFeedback({ type: 'success', message: `Inspection ${num} saved!` });
      setTimeout(() => setSaveFeedback(null), 3000);
    } catch (err) {
      setSaveFeedback({ type: 'error', message: err.response?.data?.error || 'Failed to save inspection' });
    }
  };

  // ---- EQUIPMENT ACCEPTANCE SAVE ----
  const handleSaveAcceptance = async () => {
    setSaveFeedback(null);
    try {
      const formData = new FormData();
      formData.append('acceptance_date', acceptanceForm.acceptance_date);
      formData.append('decision', acceptanceForm.decision);
      formData.append('notes', acceptanceForm.notes);
      acceptanceForm.photos.forEach(f => formData.append('photos', f));
      const res = await axios.post(`${apiUrl}/api/projects/${project.id}/equipment-acceptance`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setEquipmentAcceptance(res.data);
      setAcceptanceForm(prev => ({ ...prev, photos: [] }));
      setSaveFeedback({ type: 'success', message: 'Equipment acceptance saved!' });
      setTimeout(() => setSaveFeedback(null), 3000);
    } catch (err) {
      setSaveFeedback({ type: 'error', message: err.response?.data?.error || 'Failed to save equipment acceptance' });
    }
  };

  // ---- DELETE EVENT PHOTO ----
  const handleDeleteEventPhoto = async (photoId) => {
    if (!window.confirm('Delete this photo?')) return;
    try {
      await axios.delete(`${apiUrl}/api/event-photos/${photoId}`);
      fetchEventData();
    } catch (err) {
      alert('Failed to delete photo');
    }
  };

  if (!isOpen || !project) return null;

  const tabs = [
    { id: 'info', label: 'Project Info' },
  ];
  if (isWorks) {
    tabs.push({ id: 'handover', label: 'Site Handover' });
    tabs.push({ id: 'inspections', label: 'Inspections' });
  }
  if (isEquipment) {
    tabs.push({ id: 'equipment', label: 'Equipment' });
  }

  return (
    <div style={modal.overlayDark}>
      <div style={modal.containerWide}>
        {/* Header */}
        <div style={modal.headerHighlight}>
          <h2 style={{ margin: 0, fontSize: '18px' }}>Project Details</h2>
          <button onClick={onClose} style={modal.closeButton}
            onMouseOver={(e) => { e.currentTarget.style.color = colors.textPrimary; e.currentTarget.style.backgroundColor = colors.surfaceHover; }}
            onMouseOut={(e) => { e.currentTarget.style.color = colors.textSecondary; e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <XIcon size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${colors.border}`, backgroundColor: colors.surface }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 20px',
                border: 'none',
                backgroundColor: activeTab === tab.id ? colors.bg : 'transparent',
                color: activeTab === tab.id ? colors.textPrimary : colors.textSecondary,
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: activeTab === tab.id ? 'bold' : 'normal',
                borderBottom: activeTab === tab.id ? `2px solid ${colors.primary}` : '2px solid transparent',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Feedback */}
        {saveFeedback && (
          <div style={{
            padding: '8px 16px',
            backgroundColor: saveFeedback.type === 'success' ? '#2ea04320' : '#f8514920',
            color: saveFeedback.type === 'success' ? colors.success : colors.danger,
            fontSize: '13px',
            borderBottom: `1px solid ${colors.border}`,
          }}>
            {saveFeedback.message}
          </div>
        )}

        {/* Tab Content */}
        <div style={{ ...modal.bodyGrid, maxHeight: 'calc(100vh - 220px)', overflowY: 'auto' }}>

          {/* ============ PROJECT INFO TAB ============ */}
          {activeTab === 'info' && (
            <>
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
                {project.contractor_name && <Field label="Contractor" value={project.contractor_name} />}
                {project.project_type && <Field label="Project Type" value={project.project_type} />}
                {project.updated_at && <Field label="Last Updated" value={new Date(project.updated_at).toLocaleString()} />}
              </div>

              {/* Photo Gallery */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 style={{ margin: 0, fontSize: '18px' }}>Project Gallery</h3>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {deleteFeedback && (
                      <span style={{ fontSize: '12px', color: deleteFeedback.type === 'success' ? colors.success : colors.danger }}>
                        {deleteFeedback.message}
                      </span>
                    )}
                    {coverFeedback && (
                      <span style={{ fontSize: '12px', color: coverFeedback.type === 'success' ? colors.success : colors.danger, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {coverFeedback.type === 'success' ? <CheckIcon size={14} /> : null}
                        {coverFeedback.message}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px', overflowY: 'auto', maxHeight: '500px', paddingRight: '8px' }}>
                  {project.photos && project.photos.length > 0 ? (
                    project.photos.map((photo) => (
                      <PhotoTile key={photo.id} photo={photo} isCover={project.cover_photo === photo.url}
                        isDeleting={deletingId === photo.id} apiUrl={apiUrl} settingCover={settingCover}
                        onOpen={(url) => window.open(`${apiUrl}${url}`, '_blank')}
                        onSetCover={handleSetCover} onDelete={handleDeletePhoto} />
                    ))
                  ) : (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: colors.textSecondary, border: `1px dashed ${colors.border}`, borderRadius: '8px' }}>
                      No photos available for this project.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ============ SITE HANDOVER TAB ============ */}
          {activeTab === 'handover' && isWorks && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', gridColumn: '1 / -1' }}>
              <h3 style={{ margin: 0, fontSize: '16px', color: colors.textPrimary }}>
                Site Handover — Initial Site Condition
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: colors.textSecondary }}>
                Record the initial site handover. This happens once before works begin. Photos should show the initial state of the site.
              </p>

              {/* Handover form */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: colors.surface, padding: '16px', borderRadius: '8px', border: `1px solid ${colors.border}` }}>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1 1 200px' }}>
                    <label style={{ fontSize: '12px', color: colors.textSecondary }}>Handover Date</label>
                    <input type="date" value={handoverForm.handover_date} onChange={e => setHandoverForm(prev => ({ ...prev, handover_date: e.target.value }))}
                      style={{ ...modal.input, padding: '8px' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', color: colors.textSecondary }}>Notes</label>
                  <textarea value={handoverForm.notes} onChange={e => setHandoverForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Site handover notes..." rows={3} style={{ ...modal.textarea, padding: '8px' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', color: colors.textSecondary }}>Photos (initial site condition)</label>
                  <input type="file" multiple accept="image/*" onChange={e => setHandoverForm(prev => ({ ...prev, photos: Array.from(e.target.files) }))}
                    style={{ fontSize: '13px', color: colors.textSecondary }} />
                  {handoverForm.photos.length > 0 && (
                    <span style={{ fontSize: '12px', color: colors.success }}>{handoverForm.photos.length} file(s) selected</span>
                  )}
                </div>
                <button onClick={handleSaveHandover} style={{ ...buttons.primary, alignSelf: 'flex-start' }}>
                  {handover ? 'Update Handover' : 'Save Handover'}
                </button>
              </div>

              {/* Existing handover photos */}
              {handover && handover.photos && handover.photos.length > 0 && (
                <div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: colors.textSecondary }}>Handover Photos</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '8px' }}>
                    {handover.photos.map(photo => (
                      <div key={photo.id} style={{ position: 'relative', borderRadius: '6px', overflow: 'hidden', border: `1px solid ${colors.border}` }}>
                        <img src={`${apiUrl}${photo.url}`} alt="Handover" style={{ width: '100%', height: '100px', objectFit: 'cover' }} onError={handleImageError} />
                        <button onClick={() => handleDeleteEventPhoto(photo.id)}
                          style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(248,81,73,0.9)', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', fontSize: '10px' }}>✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============ INSPECTIONS TAB ============ */}
          {activeTab === 'inspections' && isWorks && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', gridColumn: '1 / -1' }}>
              <h3 style={{ margin: 0, fontSize: '16px', color: colors.textPrimary }}>
                Inspections — Progress Monitoring
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: colors.textSecondary }}>
                Record up to 4 inspections. Each inspection documents progress with photos and notes.
              </p>

              {[1, 2, 3, 4].map(num => {
                const existing = inspections.find(i => i.inspection_number === num);
                const form = inspectionForms[num] || { inspection_date: '', notes: '', photos: [] };
                const setForm = (updates) => setInspectionForms(prev => ({ ...prev, [num]: { ...prev[num], ...updates } }));

                return (
                  <div key={num} style={{ display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: colors.surface, padding: '16px', borderRadius: '8px', border: `1px solid ${colors.border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 'bold', color: colors.textPrimary }}>Inspection {num}</span>
                      {existing && (
                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', backgroundColor: colors.success + '20', color: colors.success }}>
                          Saved
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1 1 200px' }}>
                        <label style={{ fontSize: '12px', color: colors.textSecondary }}>Inspection Date</label>
                        <input type="date" value={form.inspection_date || ''} onChange={e => setForm({ inspection_date: e.target.value })}
                          style={{ ...modal.input, padding: '8px' }} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '12px', color: colors.textSecondary }}>Notes</label>
                      <textarea value={form.notes || ''} onChange={e => setForm({ notes: e.target.value })}
                        placeholder={`Inspection ${num} notes...`} rows={2} style={{ ...modal.textarea, padding: '8px' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '12px', color: colors.textSecondary }}>Progress Photos</label>
                      <input type="file" multiple accept="image/*" onChange={e => setForm({ photos: Array.from(e.target.files) })}
                        style={{ fontSize: '13px', color: colors.textSecondary }} />
                      {form.photos && form.photos.length > 0 && (
                        <span style={{ fontSize: '12px', color: colors.success }}>{form.photos.length} file(s) selected</span>
                      )}
                    </div>
                    <button onClick={() => handleSaveInspection(num)} style={{ ...buttons.primary, alignSelf: 'flex-start' }}>
                      {existing ? `Update Inspection ${num}` : `Save Inspection ${num}`}
                    </button>

                    {/* Existing inspection photos */}
                    {existing && existing.photos && existing.photos.length > 0 && (
                      <div>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: colors.textSecondary }}>Inspection {num} Photos</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '6px' }}>
                          {existing.photos.map(photo => (
                            <div key={photo.id} style={{ position: 'relative', borderRadius: '6px', overflow: 'hidden', border: `1px solid ${colors.border}` }}>
                              <img src={`${apiUrl}${photo.url}`} alt={`Inspection ${num}`} style={{ width: '100%', height: '80px', objectFit: 'cover' }} onError={handleImageError} />
                              <button onClick={() => handleDeleteEventPhoto(photo.id)}
                                style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(248,81,73,0.9)', color: '#fff', border: 'none', borderRadius: '50%', width: '18px', height: '18px', cursor: 'pointer', fontSize: '9px' }}>✕</button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ============ EQUIPMENT ACCEPTANCE TAB ============ */}
          {activeTab === 'equipment' && isEquipment && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', gridColumn: '1 / -1' }}>
              <h3 style={{ margin: 0, fontSize: '16px', color: colors.textPrimary }}>
                Equipment Inspection & Acceptance
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: colors.textSecondary }}>
                Record equipment inspection and acceptance or rejection decision.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: colors.surface, padding: '16px', borderRadius: '8px', border: `1px solid ${colors.border}` }}>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1 1 200px' }}>
                    <label style={{ fontSize: '12px', color: colors.textSecondary }}>Acceptance Date</label>
                    <input type="date" value={acceptanceForm.acceptance_date} onChange={e => setAcceptanceForm(prev => ({ ...prev, acceptance_date: e.target.value }))}
                      style={{ ...modal.input, padding: '8px' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1 1 200px' }}>
                    <label style={{ fontSize: '12px', color: colors.textSecondary }}>Decision</label>
                    <select value={acceptanceForm.decision} onChange={e => setAcceptanceForm(prev => ({ ...prev, decision: e.target.value }))}
                      style={{ ...modal.select, padding: '8px' }}>
                      <option value="pending">Pending</option>
                      <option value="accepted">Accepted</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', color: colors.textSecondary }}>Notes</label>
                  <textarea value={acceptanceForm.notes} onChange={e => setAcceptanceForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Equipment inspection notes..." rows={3} style={{ ...modal.textarea, padding: '8px' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', color: colors.textSecondary }}>Photos</label>
                  <input type="file" multiple accept="image/*" onChange={e => setAcceptanceForm(prev => ({ ...prev, photos: Array.from(e.target.files) }))}
                    style={{ fontSize: '13px', color: colors.textSecondary }} />
                  {acceptanceForm.photos.length > 0 && (
                    <span style={{ fontSize: '12px', color: colors.success }}>{acceptanceForm.photos.length} file(s) selected</span>
                  )}
                </div>
                <button onClick={handleSaveAcceptance} style={{ ...buttons.primary, alignSelf: 'flex-start' }}>
                  {equipmentAcceptance ? 'Update Acceptance' : 'Save Acceptance'}
                </button>
              </div>

              {/* Existing acceptance photos */}
              {equipmentAcceptance && equipmentAcceptance.photos && equipmentAcceptance.photos.length > 0 && (
                <div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: colors.textSecondary }}>Equipment Photos</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '8px' }}>
                    {equipmentAcceptance.photos.map(photo => (
                      <div key={photo.id} style={{ position: 'relative', borderRadius: '6px', overflow: 'hidden', border: `1px solid ${colors.border}` }}>
                        <img src={`${apiUrl}${photo.url}`} alt="Equipment" style={{ width: '100%', height: '100px', objectFit: 'cover' }} onError={handleImageError} />
                        <button onClick={() => handleDeleteEventPhoto(photo.id)}
                          style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(248,81,73,0.9)', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', fontSize: '10px' }}>✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ---- Shared sub-components ----

const PhotoTile = ({ photo, isCover, isDeleting, apiUrl, settingCover, onOpen, onSetCover, onDelete }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <div style={{ height: '120px', borderRadius: '8px', overflow: 'hidden', border: isCover ? `2px solid ${colors.warning}` : hovered ? `2px solid ${colors.primary}` : `1px solid ${colors.border}`, cursor: isDeleting ? 'default' : 'pointer', position: 'relative', opacity: isDeleting ? 0.5 : 1, transition: 'border-color 0.2s ease, opacity 0.2s ease, box-shadow 0.2s ease', boxShadow: hovered && !isCover ? `0 0 16px ${colors.primary}50` : 'none' }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onClick={() => !isDeleting && onOpen(photo.url)}>
      <img src={`${apiUrl}${photo.url}`} alt="Project photo" style={{ width: '100%', height: '100%', objectFit: 'cover', transform: hovered ? 'scale(1.08)' : 'scale(1)', transition: 'transform 0.3s ease' }} onError={function(e) { e.target.style.display = 'none'; }} />
      {hovered && !isDeleting && <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 50%)', pointerEvents: 'none' }} />}
      {isCover && (
        <div style={{ position: 'absolute', top: '4px', left: '4px', backgroundColor: colors.warning, color: '#000', fontSize: '10px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '2px', boxShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
          <StarIcon size={10} fill="#000" /> COVER
        </div>
      )}
      {!isDeleting && hovered && (
        <>
          {!isCover && (
            <button type="button" onClick={(e) => { e.stopPropagation(); onSetCover(photo.url); }} disabled={settingCover}
              style={{ position: 'absolute', bottom: '6px', right: '6px', backgroundColor: 'rgba(0,0,0,0.75)', color: '#fff', border: `1px solid ${colors.primary}`, borderRadius: '4px', padding: '3px 8px', fontSize: '10px', fontWeight: 'bold', cursor: settingCover ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: '3px', boxShadow: '0 1px 4px rgba(0,0,0,0.4)' }}
              onMouseOver={(e) => { e.currentTarget.style.backgroundColor = colors.primary; e.currentTarget.style.transform = 'scale(1.05)'; }}
              onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.75)'; e.currentTarget.style.transform = 'scale(1)'; }} title="Set as cover photo">
              <StarIcon size={10} /> Cover
            </button>
          )}
          <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(photo.id, photo.url); }}
            style={{ position: 'absolute', top: '6px', right: '6px', backgroundColor: 'rgba(248,81,73,0.9)', color: '#fff', border: 'none', borderRadius: '50%', width: '22px', height: '22px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.5)' }}
            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = colors.danger; e.currentTarget.style.transform = 'scale(1.2)'; }}
            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'rgba(248,81,73,0.9)'; e.currentTarget.style.transform = 'scale(1)'; }} title="Delete photo">✕</button>
        </>
      )}
    </div>
  );
};

const Field = ({ label, value, bold, accent, badge }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
    <label style={{ fontSize: '12px', color: colors.textSecondary }}>{label}</label>
    {badge ? (
      <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '12px', backgroundColor: getStatusColor(value), color: 'white', width: 'fit-content', fontWeight: 'bold' }}>{value}</span>
    ) : (
      <span style={{ fontSize: '16px', fontWeight: bold ? 'bold' : 'normal', color: accent ? colors.primary : colors.textPrimary }}>{value}</span>
    )}
  </div>
);

export default ProjectDetailModal;
