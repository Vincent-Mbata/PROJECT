import React, { useRef } from 'react';
import { colors, modal } from '../styles/shared';

const CalendarIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
);

export default function DateInput({ value, onChange, placeholder, style, ...props }) {
    const inputRef = useRef(null);

    const handleIconClick = () => {
        if (inputRef.current) {
            inputRef.current.showPicker();
        }
    };

    return (
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
                ref={inputRef}
                type="date"
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                style={{
                    ...modal.input,
                    width: '100%',
                    paddingRight: '32px',
                    colorScheme: 'dark',
                    ...style,
                }}
                {...props}
            />
            <button
                type="button"
                onClick={handleIconClick}
                style={{
                    position: 'absolute',
                    right: '6px',
                    background: 'none',
                    border: 'none',
                    color: colors.textMuted,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '4px',
                    borderRadius: '3px',
                }}
                onMouseOver={(e) => { e.currentTarget.style.color = colors.textSecondary; }}
                onMouseOut={(e) => { e.currentTarget.style.color = colors.textMuted; }}
                tabIndex={-1}
            >
                <CalendarIcon />
            </button>
        </div>
    );
}
