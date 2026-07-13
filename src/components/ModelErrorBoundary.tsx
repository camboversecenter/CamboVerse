import { Component, type ReactNode } from "react";

interface Props {
  fallback: ReactNode;
  children: ReactNode;
}

/**
 * If the heritage model fails to load (network, decode, missing asset), render
 * the fallback (the primitive placeholder) instead of crashing the canvas.
 */
export class ModelErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.warn("Heritage model failed to load; showing placeholder.", error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
