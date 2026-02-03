import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ error, errorInfo });
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
                    <h1 style={{ color: '#ef4444' }}>Something went wrong.</h1>
                    <p>The application has encountered a critical error and cannot render.</p>

                    <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', marginTop: '1rem', overflow: 'auto' }}>
                        <h3 style={{ marginTop: 0, fontSize: '1rem' }}>Error Details:</h3>
                        <pre style={{ color: '#dc2626', fontSize: '0.875rem' }}>
                            {this.state.error && this.state.error.toString()}
                        </pre>
                        <details style={{ marginTop: '1rem' }}>
                            <summary style={{ cursor: 'pointer', color: '#64748b' }}>Stack Trace</summary>
                            <pre style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>
                                {this.state.errorInfo && this.state.errorInfo.componentStack}
                            </pre>
                        </details>
                    </div>

                    <button
                        onClick={() => window.location.reload()}
                        style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}
                    >
                        Reload Page
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
