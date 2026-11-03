import {describe, expect, it, vi} from 'vitest';
import {BoxGeometry, Group, Mesh, MeshBasicMaterial, Vector3} from 'three';
import {LabManipulation, sliderValue, type LabHand} from './labManipulation';

function fixture() {
  const engine=new LabManipulation(), room=new Group(), hand=new Group(), object=new Group();
  room.position.set(2,1,3);room.rotation.y=.6;room.add(hand,object);
  object.position.set(0,0,-.6);object.add(new Mesh(new BoxGeometry(.2,.2,.2),new MeshBasicMaterial()));
  room.updateMatrixWorld(true);
  const release=vi.fn(), move=vi.fn();
  const unregister=engine.register(object,()=>({onRelease:release,onMove:move}));
  const controller:LabHand={id:'left',handedness:'left',object:hand,pressed:false};
  return {engine,room,hand,object,controller,release,move,unregister};
}

describe('hands-on lab controller interaction',()=>{
  it('moves and rotates a grabbed object through transformed parents, then returns it',()=>{
    const f=fixture();const home=f.object.position.clone();
    f.engine.step([f.controller],1/60);f.controller.pressed=true;f.engine.step([f.controller],1/60);
    expect(f.engine.isHeld(f.object)).toBe(true);expect(f.engine.ownsGrip('left')).toBe(true);
    f.hand.position.x=.25;f.hand.rotation.y=.4;f.engine.step([f.controller],1/60);
    expect(f.object.position.x).toBeCloseTo(.25-.6*Math.sin(.4));
    expect(f.object.position.z).toBeCloseTo(-.6*Math.cos(.4));expect(f.object.rotation.y).toBeCloseTo(.4);
    f.controller.pressed=false;f.engine.step([f.controller],1/60);
    expect(f.release).toHaveBeenCalledTimes(1);expect(f.release.mock.calls[0][1]).toBe(false);
    expect(f.object.position.distanceTo(home)).toBeLessThan(1e-10);expect(f.engine.ownsGrip('left')).toBe(false);
  });
  it('supports independent hands and never assigns one object to both',()=>{
    const f=fixture(), right=new Group();f.room.add(right);
    const r:LabHand={id:'right',handedness:'right',object:right,pressed:true};
    f.controller.pressed=true;f.engine.step([f.controller,r],1/60);
    expect(f.engine.ownsGrip('left')).toBe(true);expect(f.engine.ownsGrip('right')).toBe(false);
    f.engine.step([r],1/60);expect(f.release).toHaveBeenCalledTimes(1);
    // A held squeeze must be released before it can acquire a newly available object.
    expect(f.engine.isHeld(f.object)).toBe(false);
    r.pressed=false;f.engine.step([r],1/60);r.pressed=true;f.engine.step([r],1/60);
    expect(f.engine.ownsGrip('right')).toBe(true);
  });
  it('cancels on tracking loss, blur, hidden tools and open menus without resuming on a held grip',()=>{
    const f=fixture();f.controller.pressed=true;f.engine.step([f.controller],1/60);
    f.engine.step([f.controller],1/60,false);expect(f.release.mock.calls[0][1]).toBe(true);
    expect(f.engine.ownsGrip('left')).toBe(true); // cancelling a tool must not turn its held grip into sprint
    f.engine.step([f.controller],1/60,true);expect(f.engine.isHeld(f.object)).toBe(false);
    f.controller.pressed=false;f.engine.step([f.controller],1/60);f.controller.pressed=true;
    expect(f.engine.ownsGrip('left')).toBe(false);
    f.engine.blocked=true;f.engine.step([f.controller],1/60);expect(f.engine.isHeld(f.object)).toBe(false);
    f.engine.blocked=false;f.controller.pressed=false;f.engine.step([f.controller],1/60);
    f.room.visible=false;f.controller.pressed=true;f.engine.step([f.controller],1/60);expect(f.engine.isHeld(f.object)).toBe(false);
  });
  it('returns a tool when it is unmounted and does not call its old callback again',()=>{
    const f=fixture();f.controller.pressed=true;f.engine.step([f.controller],1/60);
    f.unregister();f.engine.step([f.controller],1/60);f.engine.cancel();
    expect(f.release).toHaveBeenCalledTimes(1);expect(f.release.mock.calls[0][1]).toBe(true);
  });
  it('brings a distant tool within reach and limits suspended-frame dosing time',()=>{
    const f=fixture();f.object.position.z=-2;f.controller.pressed=true;f.engine.step([f.controller],20);
    expect(f.object.getWorldPosition(new Vector3()).distanceTo(f.hand.getWorldPosition(new Vector3()))).toBeCloseTo(.55);
    expect(f.move.mock.calls[0][1]).toBe(.05);
  });
  it('clamps and quantizes slider input outside the rail',()=>{
    expect(sliderValue(-2,5,85,5)).toBe(5);expect(sliderValue(2,5,85,5)).toBe(85);
    expect(sliderValue(.51,5,85,5)).toBe(45);
  });
});
