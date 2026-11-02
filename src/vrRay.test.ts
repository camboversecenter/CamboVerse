import {describe,expect,it} from 'vitest';
import {Group,Mesh,MeshBasicMaterial,PlaneGeometry,Scene} from 'three';
import {RayIntersector} from '@pmndrs/pointer-events';
import {IMMERSIVE_XR_OPTIONS,HeritageCursorMaterial,HeritageRayMaterial} from './immersiveVR';

describe('scaled Quest controller ray',()=>{
  it.each([.30/1.6,1.2/1.6])('hits a menu at capture scale %s using the installed intersector',scale=>{
    const scene=new Scene(),origin=new Group(),controller=new Group();
    origin.scale.setScalar(scale);scene.add(origin);origin.add(controller);
    const menu=new Mesh(new PlaneGeometry(.92*scale,.16*scale),new MeshBasicMaterial());
    menu.position.z=-1.4*scale;scene.add(menu);scene.updateMatrixWorld(true);
    const hit=(minDistance:number)=>{
      const ray=new RayIntersector({current:controller},{minDistance});
      ray.startIntersection();ray.executeIntersection(menu,100);
      return ray.finalizeIntersection(scene).object;
    };
    expect(hit(IMMERSIVE_XR_OPTIONS.controller.rayPointer.minDistance)).toBe(menu);
    if(scale<.2)expect(hit(.2)).not.toBe(menu); // old XR default excluded the nearby menu
  });
  it('draws the beam and endpoint over capture and information panels',()=>{
    const options=IMMERSIVE_XR_OPTIONS.controller.rayPointer;
    expect(options.rayModel.renderOrder).toBeGreaterThan(2000);
    expect(options.cursorModel.renderOrder).toBeGreaterThan(2000);
    expect(new HeritageRayMaterial().depthTest).toBe(false);
    expect(new HeritageCursorMaterial().depthTest).toBe(false);
    expect(options.clickThresholdMs).toBeGreaterThan(300);
  });
});
