import {Box3,BoxGeometry,Group,Mesh,Vector3} from 'three';
import {describe,expect,it} from 'vitest';
import {buildAnatomyPieces} from './anatomyPieces';
import {readFileSync} from 'node:fs';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {anatomyAssetUrl} from './anatomyAssets';

describe('floating anatomy pieces',()=>{
  it.each(['normal','ultra'] as const)('separates every organ in both local %s Blender packs',async tier=>{
    const seen=new Set<string>();
    for (const kind of ['organs','head'] as const) {
      const bytes=readFileSync('public'+anatomyAssetUrl(kind,tier));
      const {scene}=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
      const organs=new Map<string,Group>();
      scene.traverse(node=>{
        const id=node.userData.anatomyPart;
        if (!id || node.parent?.userData.anatomyPart===id) return;
        let group=organs.get(id);
        if(!group) {group=new Group();organs.set(id,group);}
        group.add(node.clone(true));
      });
      for(const [id,model] of organs){
        const layout=buildAnatomyPieces(model);
        expect(layout.pieces.length,id).toBeGreaterThan(1);
        if(id==='heart')expect(layout.pieces).toHaveLength(17);
        for(const piece of layout.pieces){
          expect(piece.offset.toArray().every(Number.isFinite),id).toBe(true);
          expect(new Box3().setFromObject(piece.model).isEmpty(),id).toBe(false);
        }
        layout.dispose(); seen.add(id);
      }
    }
    expect(seen.size).toBe(23);
  });
  it('keeps all material primitives for each authored structure together and leaves the source assembled',()=>{
    const model=new Group(); model.position.set(2,3,4);model.rotation.x=.7;
    for(const name of ['part-aorta','part-lv']){
      const part=new Group();part.name=name;part.userData.anatomyPart='heart';
      part.position.x=name==='part-aorta'?3:-3;
      part.add(new Mesh(new BoxGeometry()),new Mesh(new BoxGeometry()));model.add(part);
    }
    const before=new Box3().setFromObject(model);
    const layout=buildAnatomyPieces(model);
    expect(layout.pieces.map(p=>p.name)).toEqual(['aorta','lv']);
    expect(layout.pieces.every(p=>p.model.children.length===2)).toBe(true);
    expect(layout.pieces[0].offset.x).toBeGreaterThan(3);
    expect(layout.pieces[1].offset.x).toBeLessThan(-3);
    expect(new Box3().setFromObject(model).equals(before)).toBe(true);
    layout.dispose();
  });
  it('clips a continuous surface into bounded geometric sections and conserves its area',()=>{
    const model=new Group(), geo=new BoxGeometry(6,2,2);model.add(new Mesh(geo));
    const layout=buildAnatomyPieces(model);
    expect(layout.pieces.map(p=>p.name)).toEqual(['Illustrative section 1','Illustrative section 2','Illustrative section 3']);
    let area=0;
    layout.pieces.forEach((p,index)=>{
      const attr=(p.model.children[0] as Mesh).geometry.attributes.position;
      for(let i=0;i<attr.count;i+=3){
        const [a,b,c]=[i,i+1,i+2].map(n=>new Vector3().fromBufferAttribute(attr,n));
        for(const point of [a,b,c]){
          expect(point.x).toBeGreaterThanOrEqual(-3+index*2-1e-5);
          expect(point.x).toBeLessThanOrEqual(-1+index*2+1e-5);
        }
        area+=b.sub(a).cross(c.sub(a)).length()/2;
      }
    });
    expect(area).toBeCloseTo(56);
    expect(geo.index!.count).toBe(36);layout.dispose();
  });
});
