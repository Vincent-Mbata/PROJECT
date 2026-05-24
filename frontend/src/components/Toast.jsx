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
      <div style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}>
        {toasts.map(toast => (
          <Toast key={toast.id} toast={toast} onDismiss={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function Toast({ toast, onDismiss }) {
  const [hovered, setHovered] = useState(false);

  const colors = {
    error: { bg: '#f85149', border: '#da3633' },
    success: { bg: '#3fb950', border: '#2ea043' },
    warning: { bg: '#d29922', border: '#9e6a03' },
    info: { bg: '#58a6ff', border: '#1f6feb' },
  };
  const c = colors[toast.type] || colors.error;

  return (
    <div
      style={{
        backgroundColor: c.bg,
        color: 'white',
        padding: '12px 20px',
        borderRadius: '8px',
        border: `1px solid ${c.border}`,
        boxShadow: hovered
          ? '0 8px 24px rgba(0,0,0,0.5)'
          : '0 4px 12px rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        minWidth: '300px',
        maxWidth: '500px',
        fontSize: '14px',
        fontWeight: '500',
        animation: 'slideIn 0.3s ease-out',
        transform: hovered ? 'scale(1.02)' : 'scale(1)',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        cursor: 'pointer',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onDismiss(toast.id)}
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
          padding: '0 4px',
          opacity: hovered ? 1 : 0.6,
          transition: 'opacity 0.15s ease',
        }}
      >
        ✕
      </button>
    </div>
  );
}
