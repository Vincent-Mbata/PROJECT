import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { ToastProvider } from './components/Toast'

// Simple error boundary for the root
class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', textAlign: 'center', color: '#f0f6fc', fontFamily: 'monospace' }}>
          <h2>Something went wrong</h2>
          <p style={{ color: '#8b949e', marginTop: '12px' }}>Please refresh the page</p>
          <button onClick={() => window.location.reload()} style={{
            marginTop: '20px', backgroundColor: '#58a6ff', color: 'white', border: 'none',
            borderRadius: '6px', padding: '8px 16px', cursor: 'pointer', fontWeight: 'bold',
          }}>
            Refresh Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RootErrorBoundary>
      <ToastProvider>
        <App />
      </ToastProvider>
    </RootErrorBoundary>
  </StrictMode>,
)
