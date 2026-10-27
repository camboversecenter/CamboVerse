"""Package the inspected reconstruction and all camera positions for local review."""
import io,json,struct
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'output/room-mesh-v1'
OUT=ROOT/'public/models/local/room-mesh-v1'
OUT.mkdir(parents=True,exist_ok=True)
data=(SOURCE/'room-textured-v2.glb').read_bytes()
json_size=struct.unpack_from('<I',data,12)[0]
model=json.loads(data[20:20+json_size])
bin_offset=20+json_size
bin_size=struct.unpack_from('<I',data,bin_offset)[0]
binary=bytearray(data[bin_offset+8:bin_offset+8+bin_size])
for image in model['images']:
    pixels=Image.open(SOURCE/image.pop('uri')).convert('RGB')
    stream=io.BytesIO();pixels.save(stream,format='JPEG',quality=91,subsampling=0)
    payload=stream.getvalue()
    while len(binary)%4:binary.append(0)
    index=len(model['bufferViews'])
    model['bufferViews'].append({'buffer':0,'byteOffset':len(binary),'byteLength':len(payload)})
    binary.extend(payload)
    image['bufferView']=index;image['mimeType']='image/jpeg'
while len(binary)%4:binary.append(0)
model['buffers'][0]['byteLength']=len(binary)
encoded=json.dumps(model,separators=(',',':')).encode()
encoded+=b' '*((-len(encoded))%4)
total=12+8+len(encoded)+8+len(binary)
(OUT/'room.glb').write_bytes(struct.pack('<III',0x46546c67,2,total)+struct.pack('<II',len(encoded),0x4e4f534a)+encoded+struct.pack('<II',len(binary),0x004e4942)+binary)
results=json.loads((ROOT/'output/room-alignment-v1/results.json').read_text())
(OUT/'cameras.json').write_text(json.dumps(results[0]['cameras'],indent=2))
assert len(results[0]['cameras'])==27
assert not any('uri' in image for image in model['images'])
print('Packaged self-contained GLB:',total,'bytes; 27 camera positions; two embedded textures.')
