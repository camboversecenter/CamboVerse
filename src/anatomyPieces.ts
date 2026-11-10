import {Box3, BufferGeometry, Float32BufferAttribute, Group, Matrix4, Mesh, Object3D, Vector3} from 'three';

type Vertex = {p:Vector3; n:Vector3; uv:number[]; color:number[]};
type Axis = 'x' | 'y' | 'z';
type Piece = {name:string; model:Group; offset:Vector3};

// Cut triangle edges at each section boundary so long triangles do not bridge the gaps.
function clipPolygon(vertices:Vertex[], axis:Axis, limit:number, above:boolean): Vertex[] {
  const result: Vertex[] = [];
  for (let i=0; i<vertices.length; i++) {
    const a=vertices[i], b=vertices[(i+1)%vertices.length];
    const aIn=above ? a.p[axis]>=limit : a.p[axis]<=limit;
    const bIn=above ? b.p[axis]>=limit : b.p[axis]<=limit;
    if (aIn) result.push(a);
    if (aIn!==bIn) {
      const t=(limit-a.p[axis])/(b.p[axis]-a.p[axis]);
      result.push({p:a.p.clone().lerp(b.p,t), n:a.n.clone().lerp(b.n,t).normalize(),
        uv:a.uv.map((v,j)=>v+(b.uv[j]-v)*t), color:a.color.map((v,j)=>v+(b.color[j]-v)*t)});
    }
  }
  return result;
}

export function buildAnatomyPieces(model:Object3D) {
  model.updateWorldMatrix(true,true);
  const inverse=model.matrixWorld.clone().invert(), groups=new Map<Object3D,Group>();
  const allocated:BufferGeometry[]=[];
  model.traverse(node=>{
    if (!(node instanceof Mesh)) return;
    let tagged:Object3D=node;
    while (tagged.parent && tagged.parent!==model && !tagged.userData.anatomyPart) tagged=tagged.parent;
    let group=groups.get(tagged);
    if (!group) {group=new Group(); group.name=tagged.name || node.name; groups.set(tagged,group);}
    const copy=new Mesh(node.geometry,node.material);
    copy.applyMatrix4(new Matrix4().multiplyMatrices(inverse,node.matrixWorld));
    group.add(copy);
  });
  const bounds=new Box3();
  for (const group of groups.values()) bounds.union(new Box3().setFromObject(group));
  const span=bounds.getSize(new Vector3()), center=bounds.getCenter(new Vector3());
  const diameter=Math.max(span.x,span.y,span.z);
  const pieces:Piece[]=[];
  if (groups.size>1) {
    for (const group of groups.values()) {
      const direction=new Box3().setFromObject(group).getCenter(new Vector3()).sub(center);
      if (direction.lengthSq()<1e-8) direction.set(Math.cos(pieces.length),.25,Math.sin(pieces.length));
      pieces.push({name:group.name.replace(/^part-/,'').replace(/[-_]+/g,' '), model:group, offset:direction.normalize().multiplyScalar(diameter*.46)});
    }
  } else if (groups.size===1 && diameter>0) {
    const axis:Axis=span.x===diameter?'x':span.y===diameter?'y':'z';
    const cuts=[bounds.min[axis]+diameter/3,bounds.max[axis]-diameter/3];
    const sections=[new Group(),new Group(),new Group()];
    for (const node of [...groups.values()][0].children as Mesh[]) {
      const source=node.geometry.clone().applyMatrix4(node.matrix);
      if (!source.attributes.normal) source.computeVertexNormals();
      const {position,normal,uv,color}=source.attributes;
      const verts:Vertex[]=[];
      for (let i=0;i<position.count;i++) verts.push({p:new Vector3().fromBufferAttribute(position,i),n:new Vector3().fromBufferAttribute(normal,i),
        uv:uv?[uv.getX(i),uv.getY(i)]:[],color:color?[color.getX(i),color.getY(i),color.getZ(i)]:[]});
      const buffers=sections.map(()=>({p:[] as number[],n:[] as number[],uv:[] as number[],c:[] as number[]}));
      const count=source.index?.count ?? position.count;
      for (let i=0;i<count;i+=3) {
        const triangle=[0,1,2].map(k=>verts[source.index?.getX(i+k)??(i+k)]);
        for (let s=0;s<3;s++) {
          let polygon=triangle;
          if (s>0) polygon=clipPolygon(polygon,axis,cuts[s-1],true);
          if (s<2) polygon=clipPolygon(polygon,axis,cuts[s],false);
          for (let t=1;t+1<polygon.length;t++) for(const v of [polygon[0],polygon[t],polygon[t+1]]) {
            buffers[s].p.push(v.p.x,v.p.y,v.p.z); buffers[s].n.push(v.n.x,v.n.y,v.n.z);
            buffers[s].uv.push(...v.uv);buffers[s].c.push(...v.color);
          }
        }
      }
      buffers.forEach((b,s)=>{
        if (!b.p.length) return;
        const g=new BufferGeometry();
        g.setAttribute('position',new Float32BufferAttribute(b.p,3));
        g.setAttribute('normal',new Float32BufferAttribute(b.n,3));
        if(b.uv.length)g.setAttribute('uv',new Float32BufferAttribute(b.uv,2));
        if(b.c.length)g.setAttribute('color',new Float32BufferAttribute(b.c,3));
        sections[s].add(new Mesh(g,node.material)); allocated.push(g);
      });
      source.dispose();
    }
    sections.forEach((group,i)=>{
      if (!group.children.length) return;
      const offset=new Vector3(); offset[axis]=(i-1)*diameter*.34;
      pieces.push({name:`Illustrative section ${i+1}`, model:group, offset});
    });
  }
  // Grip and rotate each piece about its own center rather than the organ origin.
  for (const piece of pieces) {
    const pivot=new Box3().setFromObject(piece.model).getCenter(new Vector3());
    piece.model.position.sub(pivot);
    piece.offset.add(pivot);
  }
  return {pieces, dispose:()=>allocated.forEach(g=>g.dispose())};
}
