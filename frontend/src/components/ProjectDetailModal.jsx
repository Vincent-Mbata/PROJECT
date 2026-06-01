import React, { useState, useEffect } from 'react';
import { modal, colors, tabBar, tab, type } from '../styles/shared';
import ProjectInfoTab from './ProjectInfoTab';
import HandoverTab from './HandoverTab';
import InspectionsTab from './InspectionsTab';
import EquipmentTab from './EquipmentTab';

const XIconComp = ({ size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

export default function ProjectDetailModal({ isOpen, onClose, project, onCoverUpdate }) {
    const [activeTab, setActiveTab] = useState('info');
    const apiUrl = import.meta.env.VITE_API_URL || '';

    useEffect(() => {
        if (isOpen && project) setActiveTab('info');
    }, [isOpen, project?.id]);

    if (!isOpen || !project) return null;

    const category = project?.category || '';
    const isWorks = category === 'Works' || category === 'Both Works and Equipment';
    const isEquipment = category === 'Equipment' || category === 'Both Works and Equipment';

    const tabs = [{ id: 'info', label: 'Project Info' }];
    if (isWorks) {
        tabs.push({ id: 'handover', label: 'Site Handover' });
        tabs.push({ id: 'inspections', label: 'Inspections' });
    }
    if (isEquipment) {
        tabs.push({ id: 'equipment', label: 'Equipment' });
    }

    const tabContent = {
        info: <ProjectInfoTab project={project} apiUrl={apiUrl} />,
        handover: <HandoverTab project={project} apiUrl={apiUrl} />,
        inspections: <InspectionsTab project={project} apiUrl={apiUrl} />,
        equipment: <EquipmentTab project={project} apiUrl={apiUrl} />,
    };

    return (
        <div style={modal.overlayDark} onClick={onClose}>
            <div style={modal.containerWide} onClick={e => e.stopPropagation()}>
                <div style={modal.headerHighlight}>
                    <h2 style={modal.headerTitle}>{project.title}</h2>
                    <button onClick={onClose} style={modal.closeButton} aria-label="Close">
                        <XIconComp size={20} />
                    </button>
                </div>

                <div style={tabBar}>
                    {tabs.map(t => (
                        <button
                            key={t.id}
                            onClick={() => setActiveTab(t.id)}
                            style={tab(activeTab === t.id)}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                <div style={{ ...modal.body, maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
                    {tabContent[activeTab]}
                </div>
            </div>
        </div>
    );
}
