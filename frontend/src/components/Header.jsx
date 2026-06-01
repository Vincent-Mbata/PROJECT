import React from 'react';
import { PlusCircleIcon } from './Icons';
import { layout, buttons, colors, type } from '../styles/shared';

const Header = ({ onAddClick }) => {
    return (
        <header style={layout.header}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                    width: '28px', height: '28px', borderRadius: '6px',
                    backgroundColor: colors.primary, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                </div>
                <h1 style={{ fontWeight: 700, color: colors.textPrimary, margin: 0, fontSize: '17px', lineHeight: '24px' }}>
                    Project Tracker
                </h1>
            </div>
            <button
                onClick={onAddClick}
                style={buttons.primary}
                onMouseOver={(e) => { e.currentTarget.style.backgroundColor = colors.primaryHover; }}
                onMouseOut={(e) => { e.currentTarget.style.backgroundColor = colors.primary; }}
            >
                <PlusCircleIcon size={16} />
                Add Project
            </button>
        </header>
    );
};

export default Header;
