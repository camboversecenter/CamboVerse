import type { ReactNode } from 'react';
import type { PoiCapture } from '../spots';

/** Always reset all transforms when switching between capture and temple. */
export function SceneAssetGroup({ capture, modelScale, modelY, children }: {
  capture?: PoiCapture;
  modelScale: number;
  modelY: number;
  children?: ReactNode;
}) {
  return <group
    scale={capture ? capture.scale : modelScale}
    position={capture ? capture.position : [0, modelY, 0]}
    // R3F ignores undefined rotations; it does not restore the identity.
    rotation={capture ? capture.rotation : [0, 0, 0]}
  >{children}</group>;
}
