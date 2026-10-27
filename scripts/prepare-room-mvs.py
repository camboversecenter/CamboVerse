"""Project all 27 aligned panoramas into six calibrated views for OpenMVS."""
from pathlib import Path
import sys, json
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'.codex-tools/room-recon'))
import numpy as np
import pycolmap as pc
from pycolmap.panorama import get_virtual_rotations, spherical_img_from_cam
sys.path.append(str(ROOT/'.codex-tools/python'))
import cv2
from PIL import Image

SOURCE=ROOT/'output/room-alignment-v1'
OUT=ROOT/'output/room-mesh-v1'
N=1024; F=N/2
for folder in ['images','masks','sparse']:
    (OUT/folder).mkdir(parents=True,exist_ok=True)
rec=pc.Reconstruction(SOURCE/'sparse/0')
(OUT/'render-cameras.json').write_text(json.dumps([
    {'name':i.name,'worldFromCamera':np.vstack([i.cam_from_world().inverse().matrix(),[0,0,0,1]]).tolist()}
    for i in sorted(rec.images.values(),key=lambda i:i.name)],indent=2))
rotations=list(get_virtual_rotations(4,[0]))+list(get_virtual_rotations(1,[-90,90]))
x,y=np.meshgrid(np.arange(N)+.5,np.arange(N)+.5)
rays=np.stack([(x-N/2)/F,(y-N/2)/F,np.ones_like(x)],axis=-1).reshape(-1,3)
maps=[]
for R in rotations:
    uv=spherical_img_from_cam((4096,2048),rays@R).reshape(N,N,2).astype('float32')-.5
    maps.append((uv[:,:,0],uv[:,:,1]))
images=[];tracks={};provenance=[]
for original in sorted(rec.images.values(),key=lambda i:i.name):
    photo=np.asarray(Image.open(SOURCE/'images'/original.name).convert('RGB'))
    mask=np.asarray(Image.open(SOURCE/'masks'/(original.name+'.png')))
    pose=original.cam_from_world()
    observed=[(p.point3D_id,p.xy) for p in original.points2D if p.has_point3D()]
    ids=[p[0] for p in observed]
    original_rays=original.camera.cam_ray_from_img(np.array([p[1] for p in observed]))
    for face,(R,(mx,my)) in enumerate(zip(rotations,maps)):
        name=f'{Path(original.name).stem}_face{face}.jpg'
        rendered=cv2.remap(photo,mx,my,cv2.INTER_LINEAR,borderMode=cv2.BORDER_WRAP)
        rendered_mask=cv2.remap(mask,mx,my,cv2.INTER_NEAREST,borderMode=cv2.BORDER_WRAP)
        Image.fromarray(rendered).save(OUT/'images'/name,quality=95)
        Image.fromarray(rendered_mask).save(OUT/'masks'/(Path(name).stem+'.mask.png'))
        pr=original_rays@R.T
        uv=pr[:,:2]/np.maximum(pr[:,2:3],1e-15)*F+N/2
        valid=(pr[:,2]>0)&(uv[:,0]>=.5)&(uv[:,0]<N-.5)&(uv[:,1]>=.5)&(uv[:,1]<N-.5)
        iid=len(images)+1
        pts=[]
        for k in np.flatnonzero(valid):
            xx,yy=uv[k]
            if rendered_mask[int(yy),int(xx)]==0:continue
            pid=ids[k]
            tracks.setdefault(pid,[]).append((iid,len(pts)))
            pts.append([float(xx),float(yy),pid])
        newpose=pc.Rigid3d(pc.Rotation3d(R),np.zeros(3))*pose
        q=newpose.rotation.quat
        images.append((iid,[q[3],q[0],q[1],q[2],*newpose.translation],name,pts))
        provenance.append({'image':name,'sourcePanorama':original.name,'face':face,'center':original.projection_center().tolist()})
    print('Projected',original.name,flush=True)
# Drop points with fewer than two observations; preserve original observed pixel rays.
validpoints={pid for pid,tr in tracks.items() if len(tr)>=2}
with (OUT/'sparse/cameras.txt').open('w') as f:
    f.write(f'1 PINHOLE {N} {N} {F} {F} {N/2} {N/2}\n')
with (OUT/'sparse/images.txt').open('w') as f:
    for iid,pose,name,points in images:
        f.write(f'{iid} '+ ' '.join(map(str,pose))+f' 1 {name}\n')
        f.write(' '.join(f'{x} {y} {pid if pid in validpoints else -1}' for x,y,pid in points)+'\n')
with (OUT/'sparse/points3D.txt').open('w') as f:
    for pid in sorted(validpoints):
        p=rec.points3D[pid]
        f.write(f'{pid} '+' '.join(map(str,[*p.xyz,*p.color,p.error]))+' '+' '.join(f'{i} {j}' for i,j in tracks[pid])+'\n')
check=pc.Reconstruction(OUT/'sparse')
assert check.num_reg_images()==162
assert all(np.isfinite(i.projection_center()).all() for i in check.images.values())
check.write(OUT/'sparse')
(OUT/'projection-manifest.json').write_text(json.dumps(provenance,indent=2))
print(check.summary(),flush=True)
