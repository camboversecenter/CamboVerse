// Original illustrative reconstruction. Architectural reference:
// https://apsaraauthority.gov.kh/2021/06/14/angkor-wat/
// Both tiers share the same footprint, galleries, stairs and five sanctuaries.
import { createBuilder, SAND, DARK_SAND } from './lib/temple.mjs';
import { resolve } from 'node:path';

for (const ultra of [false, true]) {
  const b = createBuilder();
  const stone = [0.48, 0.43, 0.34];
  const shadow = [0.12, 0.115, 0.09];
  const tower = (x,z,w,y,h) => {
    b.box(w*1.3,.18,w*1.3,x,y,z,DARK_SAND);
    b.box(w,h*.32,w,x,y+h*.16,z,stone);
    // Recessed door and framed pilasters on all four sides.
    for (const s of [-1,1]) {
      b.box(w*.36,h*.24,.025,x,y+h*.12,z+s*w*.505,shadow);
      b.box(.025,h*.24,w*.36,x+s*w*.505,y+h*.12,z,shadow);
    }
    const tiers = ultra ? 9 : 6;
    for(let i=0;i<tiers;i++) {
      const t=i/tiers, radius=w*.69*Math.pow(1-t,.63);
      const cy=y+h*.32+(i+.5)*h*.62/tiers;
      b.cyl(radius*.88,radius,h*.62/tiers,ultra?16:8,x,cy,z,stone);
      b.cyl(radius*.96,radius*1.04,.045,ultra?16:8,x,cy-h*.27/tiers,z,DARK_SAND);
      if(ultra) for(let k=0;k<8;k++) {
        const a=k*Math.PI/4;
        b.sphere(radius*.12,x+Math.cos(a)*radius,cy,z+Math.sin(a)*radius,stone,1.5,6);
      }
    }
    b.sphere(w*.11,x,y+h*.97,z,stone,1.8,ultra?12:6);
  };
  const gallery = (x,z,length,alongX,y) => {
    const box=(l,h,d,cy,c)=>b.box(alongX?l:d,h,alongX?d:l,x,cy,z,c);
    box(length,.2,.75,y,DARK_SAND);
    // Open colonnade, with a recessed rear wall.
    box(length,.75,.14,y+.48,stone);
    const n=Math.ceil(length/(ultra?.38:.65));
    for(let i=0;i<=n;i++) {
      const a=-length/2+i*length/n;
      b.box(.095,.85,.095,x+(alongX?a:.32),y+.52,z+(alongX?.32:a),stone);
    }
    for(let r=0;r<4;r++) box(length+.12,.13,.94-r*.19,y+1.01+r*.115,r%2?stone:DARK_SAND);
  };
  for(const [w,d,y,h] of [[12,9,.25,.5],[9.6,7,.75,.5],[6.6,4.8,1.35,.7],[4.7,3.4,2,.6]]) {
    b.box(w,h,d,0,y,-.3,stone);
    b.box(w+.1,.1,d+.1,0,y+h/2,-.3,DARK_SAND);
  }
  for(const [x,z,l,axis,y] of [[0,3.9,11.4,true,.55],[0,-4.5,11.4,true,.55],[-5.5,-.3,8.4,false,.55],[5.5,-.3,8.4,false,.55], [0,2.5,8.6,true,1],[0,-3.1,8.6,true,1],[-4.2,-.3,5.6,false,1],[4.2,-.3,5.6,false,1]]) gallery(x,z,l,axis,y);
  // Four stair flights connect the stepped terraces.
  for(const side of [-1,1]) for(let i=0;i<12;i++) {
    b.box(1.15,.12,1.9-i*.12,0,.58+i*.135,side*(3.4-i*.1)-.3,stone);
    b.box(2.5-i*.16,.12,1.05,side*(4.25-i*.13),.58+i*.135,-.3,stone);
  }
  tower(0,-.3,1.45,2.35,4.3);
  for(const x of [-1.8,1.8]) for(const z of [-1.55,.95]) tower(x,z,.96,2.35,2.9);
  // Western portal, left open at ground level.
  for(const x of [-.68,.68]) b.box(.38,1.1,.8,x,1.05,3.95,stone);
  b.box(1.75,.25,1,0,1.7,3.95,DARK_SAND);
  b.box(1.6,.3,4.3,0,.3,6.1,SAND);
  b.build(resolve(`public/models/local/angkor-wat-v2-${ultra?'ultra':'normal'}.glb`),{scale:.42});
}
