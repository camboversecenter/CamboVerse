"""Promote only user-requested web previews; training data stays local."""
from pathlib import Path
import hashlib,json,struct
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
files={}
for source,destination in [
 ('clock-walk-clean-v1/clean-normal.splat','captures/wat-phnom-clock-v1/normal.splat'),
 ('clock-walk-clean-v1/clean-ultra.splat','captures/wat-phnom-clock-v1/ultra.splat'),
 ('staircase-clean-v1/clean-normal.splat','captures/wat-phnom-staircase-v1/normal.splat'),
 ('staircase-clean-v1/clean-ultra.splat','captures/wat-phnom-staircase-v1/ultra.splat'),
 ('wat-phnom-refined-v4/wat-phnom-normal.glb','heritage/wat-phnom-v4/normal.glb'),
 ('wat-phnom-refined-v4/wat-phnom-ultra.glb','heritage/wat-phnom-v4/ultra.glb'),
]:
 data=(ROOT/'public/models/local'/source).read_bytes()
 assert len(data)<25*1024*1024
 if destination.endswith('.splat'):assert len(data)%32==0
 else:
  assert data[:4]==b'glTF'
  length=struct.unpack_from('<I',data,12)[0];model=json.loads(data[20:20+length])
  # These are the original procedural tile atlases from our Blender scripts,
  # visually reviewed for this release; never permit an arbitrary photo image.
  assert all(im.get('name') in {'Naga | original mottled brick atlas','hand-authored terracotta roof tiles'} for im in model.get('images',[]))
 target=ROOT/'public/models'/destination;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
 files['public/models/'+destination]={'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data)}
manifest={'scope':'User-authorized production web previews, 2026-10-27; not raw capture datasets',
 'sources':'Existing cleaned trained captures and authored Wat Phnom model; original archives, training images and checkpoints remain private.',
 'license_status':'Capture archive licence not inferred by this preview publication; provenance review remains separate.',
 'files':files}
(ROOT/'public/models/preview-publication.json').write_text(json.dumps(manifest,indent=2)+'\n')
thumbs=ROOT/'public/province-thumbnails';thumbs.mkdir(exist_ok=True)
for folder in sorted((ROOT/'camboverse-provinces').glob('[0-9][0-9]-*')):
 avatar=json.loads((folder/'avatar/avatar.json').read_text('utf-8-sig'))
 with Image.open(folder/'avatar'/avatar['refs']['face']) as im:
  im=im.convert('RGB');im.thumbnail((128,128));im.save(thumbs/(folder.name+'.webp'),quality=76)
print(json.dumps({'published_web_files':files,'province_thumbnails':len(list(thumbs.glob('*.webp'))),'thumbnail_bytes':sum(p.stat().st_size for p in thumbs.glob('*.webp'))},indent=2))
