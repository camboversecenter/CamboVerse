"""Keep original panorama appearance; recovered poses only place navigation."""
import hashlib,io,json,math,zipfile,sys
from pathlib import Path
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/models/local/room-panorama-tour'
OUT.mkdir(parents=True,exist_ok=True)
sys.path.insert(0,str(ROOT/'.codex-tools/room-recon'))
import pycolmap
poses=json.loads((ROOT/'output/room-mesh-v1/render-cameras.json').read_text())
by_id={p['name'].split('_')[-1].split('.')[0]:p for p in poses}
# Follow the capture route, without shortcuts across the central tables.
edges=[(i,i+1) for i in range(50,76)]+[(65,50)]
links={key:[] for key in by_id}
for a,b in edges:
    links[f'{a:03}'].append(f'{b:03}');links[f'{b:03}'].append(f'{a:03}')
titles={50:'Room entrance',51:'Wooden wall · 1',52:'Side aisle · 1',53:'Wooden wall · 2',54:'Side aisle · 2',55:'Side aisle · 3',56:'Side aisle · 4',57:'Screen corner · 1',58:'In front of the screen',59:'Screen corner · 2',60:'Window aisle · 1',61:'Window aisle · 2',62:'Window aisle · 3',63:'Window aisle · 4',64:'Entrance corner',65:'Entrance aisle',66:'Beside the tables · 1',67:'Beside the tables · 2',68:'Beside the tables · 3',69:'Beside the tables · 4',70:'Table corner · 1',71:'Inside the tables · 1',72:'Inside the tables · 2',73:'Table corner · 2',74:'Inside the tables · 3',75:'Inside the tables · 4',76:'Inside the tables · 5'}
flip=np.diag([1.,-1.,-1.]);stops=[];manifest=[]
with zipfile.ZipFile('D:/Images/360/360 tain.zip') as archive:
    entries={Path(e.filename).name:e for e in archive.infolist() if not e.is_dir()}
    for key,p in sorted(by_id.items()):
        raw=archive.read(entries[p['name']])
        with Image.open(io.BytesIO(raw)) as original:
            for width,quality in [(2048,85),(4096,90)]:
                image=original.resize((width,width//2),Image.Resampling.LANCZOS).convert('RGB')
                image.save(OUT/f'{key}-{width}.jpg',quality=quality,optimize=True)
        matrix=np.array(p['worldFromCamera']);R=matrix[:3,:3];C=matrix[:3,3]
        q=pycolmap.Rotation3d(flip@R@flip).quat.tolist()
        forward=flip@R@np.array([0.,0.,1.]);heading=math.atan2(-forward[0],-forward[2])
        targets=[]
        for target in links[key]:
            delta=np.array(by_id[target]['worldFromCamera'])[:3,3]-C
            # Direction below eye level; height is a display convention, not a survey.
            delta[1]=max(.8,np.linalg.norm(delta[[0,2]])*.48)
            ray=R.T@delta
            u=(.5+math.atan2(ray[0],ray[2])/(2*math.pi))%1
            v=.5+math.atan2(ray[1],np.linalg.norm(ray[[0,2]]))/math.pi
            targets.append({'to':target,'u':u,'v':v})
        stops.append({'id':key,'title':titles[int(key)],'orientation':q,'heading':heading,'links':targets})
        manifest.append({'id':key,'source':p['name'],'sha256':hashlib.sha256(raw).hexdigest()})
        print('Prepared panorama',key,flush=True)
(OUT/'tour.json').write_text(json.dumps(stops,indent=2))
(OUT/'provenance.json').write_text(json.dumps(manifest,indent=2))
print('Ready:',len(stops),'panoramas,',sum(len(s['links']) for s in stops),'directional links')
