import React from "react";

/**
 * PUBLIC_INTERFACE
 */
export class ErrorBoundary extends React.Component {
  /**
   * Global React error boundary to prevent a blank screen on runtime errors.
   *
   * Props:
   * - children: ReactNode
   * - fallback?: ReactNode
   */
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage: error?.message ? String(error.message) : "Unexpected error",
    };
  }

  componentDidCatch(error, errorInfo) {
    // eslint-disable-next-line no-console
    console.error("Unhandled UI error:", error, errorInfo);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="container" style={{ paddingTop: 24 }}>
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Something went wrong</h2>
              <p className="card-subtitle">
                The app hit an unexpected error. You can refresh, or go back to login.
              </p>
            </div>
          </div>
          <div className="card-body">
            <div className="alert alert-error" style={{ marginBottom: 12 }}>
              {this.state.errorMessage}
            </div>
            <div className="row">
              <a className="link" href="/">
                Refresh app
              </a>
              <a className="link" href="/login">
                Go to Login
              </a>
            </div>
            <div className="note">
              If this keeps happening, check your browser console for details.
            </div>
          </div>
        </div>
      </div>
    );
  }
}
