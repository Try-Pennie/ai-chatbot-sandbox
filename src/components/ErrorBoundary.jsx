import React from 'react';
import './ErrorBoundary.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Chat Widget Error:', error, errorInfo);

    // Optional: Send to error tracking service
    if (window.trackError) {
      window.trackError(error, { component: 'ChatWidget', ...errorInfo });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="chat-error-fallback">
          <p>Unable to load chat. Please refresh the page.</p>
          <button onClick={() => window.location.reload()}>
            Refresh
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
