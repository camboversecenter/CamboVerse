import { describe,expect,it } from 'vitest';
import { PerspectiveCamera,ShaderMaterial,Vector2,Vector4 } from 'three';
import { updateSplatEyeUniforms } from './splatStereo';

describe('Gaussian splat stereo uniforms',()=>{
  it('uses each eye viewport and projection rather than full-canvas dimensions',()=>{
    const material=new ShaderMaterial({uniforms:{viewport:{value:new Vector2(4000,2000)},focal:{value:1000}}});
    const left=new PerspectiveCamera(90,1, .01,100),right=new PerspectiveCamera(80,1.2,.01,100);
    updateSplatEyeUniforms(material,left,new Vector4(0,0,1000,1100));
    expect(material.uniforms.viewport.value.toArray()).toEqual([1000,1100]);
    expect(material.uniforms.focal.value).toBeCloseTo(550);
    material.uniformsNeedUpdate=false;
    updateSplatEyeUniforms(material,right,new Vector4(1000,0,1200,1300));
    expect(material.uniforms.viewport.value.toArray()).toEqual([1200,1300]);
    expect(material.uniforms.focal.value).toBeCloseTo(650*right.projectionMatrix.elements[5]);
    expect(material.uniformsNeedUpdate).toBe(true);material.dispose();
  });
  it('ignores incomplete viewport data',()=>{
    const material=new ShaderMaterial({uniforms:{viewport:{value:new Vector2(640,480)},focal:{value:240}}});
    updateSplatEyeUniforms(material,new PerspectiveCamera(),new Vector4());
    expect(material.uniforms.focal.value).toBe(240);material.dispose();
  });
});
