import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';

const ToastContext = createContext(null);

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = 'error') => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 5000);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ addToast }}>
            {children}
            <div
                style={{
                    position: 'fixed',
                    bottom: '24px',
                    right: '24px',
                    zIndex: 9999,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                }}
                role="alert"
                aria-live="polite"
            >
                {toasts.map(toast => (
                    <ToastMessage key={toast.id} toast={toast} onDismiss={removeToast} />
                ))}
            </div>
        </ToastContext.Provider>
    );
}

function ToastMessage({ toast, onDismiss }) {
    const [hovered, setHovered] = useState(false);

    const colorMap = {
        error: { bg: '#f85149', border: '#da3633' },
        success: { bg: '#238636', border: '#2ea043' },
        warning: { bg: '#9e6a03', border: '#d29922' },
        info: { bg: '#1f6feb', border: '#58a6ff' },
    };
    const c = colorMap[toast.type] || colorMap.error;

    return (
        <div
            style={{
                backgroundColor: c.bg,
                color: 'white',
                padding: '10px 16px',
                borderRadius: '8px',
                border: `1px solid ${c.border}`,
                boxShadow: hovered
                    ? '0 8px 24px rgba(0,0,0,0.5)'
                    : '0 4px 12px rgba(0,0,0,0.4)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                minWidth: '280px',
                maxWidth: '480px',
                fontSize: '14px',
                fontWeight: 500,
                lineHeight: '20px',
                transform: hovered ? 'scale(1.01)' : 'scale(1)',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                cursor: 'pointer',
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onClick={() => onDismiss(toast.id)}
            role="status"
        >
            <span style={{ flex: 1 }}>{toast.message}</span>
            <button
                onClick={(e) => { e.stopPropagation(); onDismiss(toast.id); }}
                style={{
                    background: 'none',
                    border: 'none',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '16px',
                    padding: '0 2px',
                    opacity: hovered ? 1 : 0.6,
                    transition: 'opacity 0.15s',
                    lineHeight: '20px',
                }}
                aria-label="Dismiss notification"
            >
                ✕
            </button>
        </div>
    );
}
