import { Component, Suspense, type ReactNode } from 'react';
import { Html, useGLTF } from '@react-three/drei';

function Status({ failed, retry }: { failed?: boolean; retry?: () => void }) {
  return <Html center><div role={failed ? 'alert' : 'status'} style={{ width: 210, padding: 12, background: '#15242e', color: '#edf5f7', borderRadius: 10, font: '14px system-ui', textAlign: 'center' }}>
    {failed ? 'Refined model could not load.' : 'Loading refined model…'}
    {failed && <button onClick={e => { e.stopPropagation(); retry?.(); }} style={{ display: 'block', margin: '10px auto 0' }}>Retry model</button>}
  </div></Html>;
}
class Boundary extends Component<{ url: string; children: ReactNode }, { failed: boolean; attempt: number }> {
  state = { failed: false, attempt: 0 };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: unknown) { console.warn('Refined anatomy asset unavailable:', this.props.url, error); }
  retry = () => { useGLTF.clear(this.props.url); this.setState(s => ({ failed: false, attempt: s.attempt + 1 })); };
  render() {
    return this.state.failed ? <Status failed retry={this.retry} /> : <Suspense key={this.state.attempt} fallback={<Status />}>{this.props.children}</Suspense>;
  }
}
export function AnatomyAssetBoundary({ url, children }: { url: string; children: ReactNode }) {
  return <Boundary key={url} url={url}>{children}</Boundary>;
}
