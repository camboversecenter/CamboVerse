"""Convert the downloaded conference-hall Gaussian PLY for local Campus Shrine review.
Original source/checkpoint stays in Downloads/results (1).zip. No training/upload.
"""
from pathlib import Path
import hashlib
import json
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
DEST=ROOT/'public/models/local/campus-shrine-capture-v1'
SOURCE=DEST/'source.ply'
EXPECTED='a070a11ea392f8629fa29d9fb28bb2c1ee98d94b63a0f1adf448a6d1c463ba10'
RECORD=np.dtype([('xyz','<f4',(3,)),('scale','<f4',(3,)),('rgba','u1',(4,)),('rotation','u1',(4,))])

def main():
    data=SOURCE.read_bytes();assert hashlib.sha256(data).hexdigest()==EXPECTED
    offset=data.index(b'\n',data.index(b'end_header'))+1
    header=data[:offset].decode('ascii');assert 'format binary_little_endian 1.0' in header
    props=[line.split() for line in header.splitlines() if line.startswith('property ')]
    assert all(p[1]=='float' for p in props), 'Unexpected PLY layout'
    count=int(next(line.split()[-1] for line in header.splitlines() if line.startswith('element vertex ')))
    vertices=np.frombuffer(data,dtype=np.dtype([(p[2],'<f4') for p in props]),offset=offset)
    assert len(vertices)==count
    xyz=np.column_stack([vertices[k] for k in ('x','y','z')])
    scales=np.exp(np.column_stack([vertices[f'scale_{i}'] for i in range(3)]))
    rotation=np.column_stack([vertices[f'rot_{i}'] for i in range(4)])
    lengths=np.linalg.norm(rotation,axis=1);rotation/=np.maximum(lengths[:,None],1e-12)
    alpha=1/(1+np.exp(-np.clip(vertices['opacity'],-60,60)))
    colors=.5+.28209479177387814*np.column_stack([vertices[f'f_dc_{i}'] for i in range(3)])
    finite=np.isfinite(xyz).all(axis=1)&np.isfinite(scales).all(axis=1)&np.isfinite(rotation).all(axis=1)&np.isfinite(colors).all(axis=1)&(lengths>1e-8)
    result=np.zeros(len(vertices),dtype=RECORD)
    result['xyz']=xyz;result['scale']=scales
    result['rgba'][:,:3]=np.rint(np.clip(colors,0,1)*255).astype('u1')
    result['rgba'][:,3]=np.rint(alpha*255).astype('u1')
    result['rotation']=np.clip(rotation*128+128,0,255).astype('u1')
    center=np.median(xyz[finite&(alpha>=.12)],axis=0)
    clean=finite&(alpha>=.2)&(scales.max(axis=1)<=.007)&(np.hypot(xyz[:,0],xyz[:,1])<=.28)&(xyz[:,2]>=-.045)&(xyz[:,2]<=.32)
    manifest={'source_notebook':'https://www.kaggle.com/code/camboversecenter/conference-hall-step2b-train-splat',
      'source_version':355602825,'source_dataset':'https://www.kaggle.com/datasets/camboversecenter/conference-hall-front',
      'source_ply_sha256':EXPECTED,'source_points':count,'training_steps':7000,
      'destination':'Buildings / NUM International Campus / Campus Shrine (user-selected review location)',
      'capture_creator':'UNCONFIRMED','capture_date':'UNCONFIRMED','permission_reference':'UNCONFIRMED','content_license':'UNCONFIRMED',
      'filter':{'minimum_alpha':.2,'maximum_axis':.007,'xy_radius':.28,'raw_z':[-.045,.32],'center':center.tolist()},'files':{}}
    for name,mask,limit in [('original-normal.splat',finite,180000),('original-ultra.splat',finite,600000),('clean-normal.splat',clean,180000),('clean-ultra.splat',clean,600000)]:
      points=result[mask];n=min(limit,len(points))
      chosen=points[np.linspace(0,len(points)-1,n).round().astype(int)].copy()
      chosen['scale']*=min(1.2,(len(points)/n)**(1/3))
      raw=chosen.tobytes();assert len(raw)==n*32
      (DEST/name).write_bytes(raw)
      manifest['files'][name]={'points':n,'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()}
    (DEST/'manifest.json').write_text(json.dumps(manifest,indent=2))
    print(json.dumps(manifest,indent=2))

if __name__=='__main__':main()
