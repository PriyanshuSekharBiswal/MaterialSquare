import { Component, Suspense, type ReactNode } from "react";

/** Keeps a failed feature load from replacing the entire staff workspace. */
export default class FeatureBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <div role="alert" className="empty">
          <p>This screen could not load. Reload the workspace to try again.</p>
          <button className="btn-sm" onClick={() => window.location.reload()}>
            Reload workspace
          </button>
        </div>
      );
    }
    return (
      <Suspense
        fallback={
          <div className="admin-feature-skeleton" role="status" aria-label="Loading screen">
            <i /><i /><i /><i />
          </div>
        }
      >
        {this.props.children}
      </Suspense>
    );
  }
}
