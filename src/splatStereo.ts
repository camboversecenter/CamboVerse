import type { Camera, ShaderMaterial, Vector4 } from 'three';

/** Called for each actual eye, after Three selects that eye's viewport.
 * Frame-level full-canvas dimensions stretch Gaussian footprints in stereo. */
export function updateSplatEyeUniforms(material:ShaderMaterial,camera:Camera,viewport:Vector4):void {
  const {uniforms}=material;
  if(!uniforms.viewport||!uniforms.focal||viewport.z<=0||viewport.w<=0)return;
  uniforms.viewport.value.set(viewport.z,viewport.w);
  uniforms.focal.value=viewport.w*.5*Math.abs(camera.projectionMatrix.elements[5]);
  material.uniformsNeedUpdate=true;
}
