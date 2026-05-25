import React, { useState, useEffect, useRef, useMemo } from 'react';
import { XIcon } from './Icons';
import { modal, form, buttons, colors } from '../styles/shared';
import { useToast } from './Toast';
import { SUB_COUNTIES, getWardsForSubCounty } from '../data/wards';

const UploadZone = ({ children, onClick }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...form.uploadZone,
        borderColor: hovered ? colors.primary : colors.border,
        backgroundColor: hovered ? 'rgba(88,166,255,0.05)' : 'transparent',
        color: hovered ? colors.primary : colors.textSecondary,
      }}
    >
      {children}
    </div>
  );
};

const PreviewTile = ({ url, index, onRemove }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      style={{
        position: 'relative',
        width: '60px',
        height: '60px',
        borderRadius: '4px',
        overflow: 'hidden',
        border: hovered ? `2px solid ${colors.danger}` : `1px solid ${colors.border}`,
        transition: 'border-color 0.2s ease',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <img
        src={url}
        alt="preview"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: hovered ? 'scale(1.05)' : 'scale(1)',
          transition: 'transform 0.2s ease',
        }}
      />
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onRemove(index); }}
        title="Remove photo"
        style={{
          position: 'absolute',
          top: '-5px',
          right: '-5px',
          backgroundColor: hovered ? colors.danger : 'rgba(248,81,73,0.8)',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: '18px',
          height: '18px',
          fontSize: '10px',
          fontWeight: 'bold',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: hovered ? 1 : 0,
          transform: hovered ? 'scale(1)' : 'scale(0.7)',
          transition: 'opacity 0.2s ease, transform 0.2s ease, background-color 0.2s ease',
          boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
        }}
      >
        ✕
      </button>
    </div>
  );
};

const EMPTY_FORM = {
  title: '',
  description: '',
  contractor_name: '',
  budget: '',
  project_cost: '',
  cost_to_date: '',
  completion_percentage: 0,
  status: 'Ongoing',
  sub_county: '',
  ward_area: '',
  project_type: '',
  category: 'Works',
};

const AddProjectModal = ({ isOpen, onClose, onSave, loading, subCounties, editingProject }) => {
  const { addToast } = useToast();

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [files, setFiles] = useState([]);
  const [objectUrls, setObjectUrls] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});
  const objectUrlsRef = useRef([]);

  // Keep ref in sync with state
  useEffect(() => {
    objectUrlsRef.current = objectUrls;
  }, [objectUrls]);

  const prevEditingRef = useRef(undefined);
  const prevOpenRef = useRef(isOpen);

  useEffect(() => {
    // Only reset form when editingProject actually changes or modal opens
    const editingChanged = editingProject !== prevEditingRef.current;
    const justOpened = isOpen && !prevOpenRef.current;
    prevEditingRef.current = editingProject;
    prevOpenRef.current = isOpen;

    if (!editingChanged && !justOpened) return;

    if (editingProject) {
      setFormData({
        title: editingProject.title || '',
        description: editingProject.description || '',
        contractor_name: editingProject.contractor_name || '',
        budget: editingProject.budget || '',
        project_cost: editingProject.project_cost || '',
        cost_to_date: editingProject.cost_to_date || '',
        completion_percentage: editingProject.completion_percentage || 0,
        status: editingProject.status || 'Ongoing',
        sub_county: editingProject.sub_county || '',
        ward_area: editingProject.ward_area || '',
        project_type: editingProject.project_type || '',
        category: editingProject.category || 'Works',
      });
    } else {
      setFormData(EMPTY_FORM);
    }
    setFiles([]);
    setObjectUrls([]);
    setFieldErrors({});
  }, [editingProject, isOpen]);

  // Cleanup all object URLs on unmount
  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  // Compute available wards based on selected sub-county (must be before early return)
  const availableWards = useMemo(
    () => formData.sub_county ? getWardsForSubCounty(formData.sub_county) : [],
    [formData.sub_county]
  );

  if (!isOpen) return null;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear field error on change
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: null }));
    }
    // Reset ward when sub-county changes
    if (name === 'sub_county') {
      setFormData(prev => ({ ...prev, sub_county: value, ward_area: '' }));
    }
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length + files.length > 50) {
      addToast('Maximum 50 photos allowed', 'warning');
      return;
    }
    const newUrls = selectedFiles.map(file => URL.createObjectURL(file));
    setObjectUrls(prev => {
      // Cleanup old URLs
      prev.forEach(url => URL.revokeObjectURL(url));
      return newUrls;
    });
    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const removeFile = (index) => {
    URL.revokeObjectURL(objectUrls[index]);
    setObjectUrls(prev => prev.filter((_, i) => i !== index));
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const validate = () => {
    const errors = {};
    const b = parseFloat(formData.budget) || 0;
    const pc = parseFloat(formData.project_cost) || 0;
    const ctd = parseFloat(formData.cost_to_date) || 0;
    const cp = parseInt(formData.completion_percentage) || 0;

    if (b < 0 || pc < 0 || ctd < 0) {
      errors.financial = 'Budget, Project Cost, and Cost to Date cannot be negative';
    }
    if (pc > b) {
      errors.financial = 'Project Cost cannot be greater than Budget';
    }
    if (ctd > pc) {
      errors.financial = 'Cost to Date cannot be greater than Project Cost';
    }
    if (cp < 0 || cp > 100) {
      errors.completion_percentage = 'Completion percentage must be between 0 and 100';
    }
    return errors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      addToast(Object.values(errors)[0], 'error');
      return;
    }
    setFieldErrors({});
    onSave({ ...formData, files });
  };

  const close = () => {
    objectUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    setObjectUrls([]);
    onClose();
  };

  const inputStyle = { ...form.input, width: '100%', boxSizing: 'border-box' };
  const selectStyle = { ...form.select, width: '100%', boxSizing: 'border-box' };

  return (
    <div style={modal.overlay}>
      <div style={modal.container}>
        <div style={modal.header}>
          <h2 style={{ margin: 0, fontSize: '18px' }}>
            {editingProject ? 'Edit Project' : 'Add New Project'}
          </h2>
          <button onClick={close} style={modal.closeButton}
            onMouseOver={(e) => { e.currentTarget.style.color = colors.textPrimary; e.currentTarget.style.backgroundColor = colors.surfaceHover; }}
            onMouseOut={(e) => { e.currentTarget.style.color = colors.textSecondary; e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <XIcon size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={modal.body}>
          <div style={modal.formGrid2}>
            <div style={modal.fieldGroup}>
              <label style={form.label}>Project Title *</label>
              <input name="title" value={formData.title} onChange={handleInputChange}
                required placeholder="Enter project title" style={inputStyle} />
            </div>
            <div style={modal.fieldGroup}>
              <label style={form.label}>Contractor Name</label>
              <input name="contractor_name" value={formData.contractor_name}
                onChange={handleInputChange} placeholder="Contractor name" style={inputStyle} />
            </div>
          </div>

          <div style={{ ...modal.fieldGroup, marginBottom: '16px' }}>
            <label style={form.label}>Description</label>
            <textarea name="description" value={formData.description}
              onChange={handleInputChange} placeholder="Project details..."
              style={{ ...form.textarea, width: '100%', boxSizing: 'border-box' }} />
          </div>

          {fieldErrors.financial && (
            <div style={{ color: colors.danger, fontSize: '12px', marginBottom: '12px' }}>
              {fieldErrors.financial}
            </div>
          )}

          <div style={modal.formGrid3}>
            <div style={modal.fieldGroup}>
              <label style={form.label}>Budget (Kshs)</label>
              <input type="number" name="budget" value={formData.budget}
                onChange={handleInputChange} placeholder="0.00" style={inputStyle} />
            </div>
            <div style={modal.fieldGroup}>
              <label style={form.label}>Project Cost (Kshs)</label>
              <input type="number" name="project_cost" value={formData.project_cost}
                onChange={handleInputChange} placeholder="0.00" style={inputStyle} />
            </div>
            <div style={modal.fieldGroup}>
              <label style={form.label}>Cost to Date (Kshs)</label>
              <input type="number" name="cost_to_date" value={formData.cost_to_date}
                onChange={handleInputChange} placeholder="0.00" style={inputStyle} />
            </div>
          </div>

          <div style={modal.formGrid3}>
            <div style={modal.fieldGroup}>
              <label style={form.label}>Completion %</label>
              <input type="number" name="completion_percentage"
                value={formData.completion_percentage} onChange={handleInputChange}
                min="0" max="100" style={inputStyle} />
              {fieldErrors.completion_percentage && (
                <span style={{ color: colors.danger, fontSize: '11px' }}>
                  {fieldErrors.completion_percentage}
                </span>
              )}
            </div>
            <div style={modal.fieldGroup}>
              <label style={form.label}>Status</label>
              <select name="status" value={formData.status} onChange={handleInputChange} style={selectStyle}>
                <option value="Ongoing">Ongoing</option>
                <option value="Completed">Completed</option>
                <option value="On Hold">On Hold</option>
                <option value="Planning">Planning</option>
              </select>
            </div>
            <div style={modal.fieldGroup}>
              <label style={form.label}>Category</label>
              <select name="category" value={formData.category} onChange={handleInputChange} style={selectStyle}>
                <option value="Works">Works</option>
                <option value="Equipment">Equipment</option>
                <option value="Both Works and Equipment">Both</option>
              </select>
            </div>
          </div>

          <div style={modal.formGrid3}>
            <div style={modal.fieldGroup}>
              <label style={form.label}>Project Type</label>
              <input name="project_type" value={formData.project_type}
                onChange={handleInputChange} placeholder="Residential/Commercial" style={inputStyle} />
            </div>
            <div style={modal.fieldGroup}>
              <label style={form.label}>Sub-County</label>
              <select name="sub_county" value={formData.sub_county} onChange={handleInputChange} style={selectStyle}>
                <option value="">Select Sub-County</option>
                {subCounties.map(sc => <option key={sc} value={sc}>{sc}</option>)}
              </select>
            </div>
            <div style={modal.fieldGroup}>
              <label style={form.label}>Ward Area</label>
              {availableWards.length > 0 ? (
                <select name="ward_area" value={formData.ward_area} onChange={handleInputChange} style={selectStyle}>
                  <option value="">Select Ward</option>
                  {availableWards.map(w => <option key={w} value={w}>{w}</option>)}
                </select>
              ) : (
                <input name="ward_area" value={formData.ward_area}
                  onChange={handleInputChange} placeholder="Select sub-county first" style={inputStyle} />
              )}
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ ...form.label, display: 'block', marginBottom: '8px' }}>
              {editingProject ? 'Add More Photos' : 'Photos (Max 50, 20MB each)'}
            </label>
            <UploadZone onClick={() => document.getElementById('file-input').click()}>
              Click to upload photos
              <input id="file-input" type="file" multiple accept="image/*"
                hidden onChange={handleFileChange} />
            </UploadZone>
            {objectUrls.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                {objectUrls.map((url, index) => (
                  <PreviewTile key={index} url={url} index={index} onRemove={removeFile} />
                ))}
              </div>
            )}
          </div>

          <div style={modal.actions}>
            <button type="button" onClick={close} style={buttons.secondary}>
              Cancel
            </button>
            <button type="submit" disabled={loading} style={{
              ...buttons.primary,
              backgroundColor: loading ? colors.border : colors.primary,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}>
              {loading ? 'Saving...' : (editingProject ? 'Update Project' : 'Save Project')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProjectModal;
