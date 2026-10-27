import { Splat } from "@react-three/drei";
import { useMemo } from 'react';
import { ShaderMaterial, Vector4 } from 'three';
import { updateSplatEyeUniforms } from '../splatStereo';

/**
 * Renders a Gaussian-splat capture (.splat) via drei's splat renderer the
 * photoreal path. Splats are self-illuminated (baked colour), so they don't take
 * scene lighting; that's expected for a capture.
 */
export function SplatModel({ url }: { url: string }) {
  const viewport=useMemo(()=>new Vector4(),[]);
  // frustumCulled=false: the instanced splat mesh has a degenerate bounding
  // sphere and can otherwise be culled when the camera isn't at the origin.
  return <Splat src={url} frustumCulled={false} onBeforeRender={(renderer,_scene,camera,_geometry,material)=>{
    if(renderer.xr.isPresenting&&material instanceof ShaderMaterial){
      renderer.getCurrentViewport(viewport);updateSplatEyeUniforms(material,camera,viewport);
    }
  }}/>;
}
