"""Package user-approved Blender studies for local review; preserve both sources.
No scene geometry is decimated or removed. Bake procedural colour to vertices,
batch by material, and compress with the viewer's bundled meshopt decoder.
"""
import bpy, json, hashlib
from pathlib import Path
from mathutils import Vector
from mathutils.noise import noise

ROOT=Path(__file__).resolve().parents[1]
REVIEW=ROOT/'output/sambor-prei-kuk-review-v2'
OUT=ROOT/'output/sambor-prei-kuk-import-v2'
PUBLIC=ROOT/'public/models/local/sambor-prei-kuk-refined-v2'
OUT.mkdir(parents=True,exist_ok=True); PUBLIC.mkdir(parents=True,exist_ok=True)
SCALE=.5
reports=[]
approved=json.loads((REVIEW/'validation.json').read_text())
for tier in ['normal','ultra']:
    source=REVIEW/f'sambor-prei-kuk-{tier}.blend'
    source_hash=hashlib.sha256(source.read_bytes()).hexdigest()
    assert source_hash==next(r['sha256'] for r in approved if r['tier']==tier)
    bpy.ops.wm.open_mainfile(filepath=str(source))
    scene=bpy.context.scene; meshes=[o for o in scene.objects if o.type=='MESH']
    mats={}; counts=[]
    for obj in meshes:
        original=obj.data.materials[0]; name=original.name
        if name not in mats:
            m=bpy.data.materials.new('Viewer '+name); m.use_nodes=True
            bs=m.node_tree.nodes['Principled BSDF']; bs.inputs['Roughness'].default_value=.94
            colors=m.node_tree.nodes.new('ShaderNodeVertexColor'); colors.layer_name='Weathering'
            m.node_tree.links.new(colors.outputs['Color'],bs.inputs['Base Color'])
            mats[name]=m
        ramp=next(n for n in original.node_tree.nodes if n.type=='VALTORGB').color_ramp
        tex=next(n for n in original.node_tree.nodes if n.type=='TEX_NOISE')
        scale=tex.inputs['Scale'].default_value
        low=Vector(ramp.elements[0].color[:3]); high=Vector(ramp.elements[-1].color[:3])
        colors=obj.data.color_attributes.new(name='Weathering',type='BYTE_COLOR',domain='POINT')
        # Approximate the original world-position shader without external textures.
        for v,col in zip(obj.data.vertices,colors.data):
            p=(obj.matrix_world@v.co)*scale
            n=.5+.42*noise(p)+.10*noise(p*3.1)
            t=max(0,min(1,(n-.34)/.32))
            rgb=low.lerp(high,t)
            col.color=(*rgb,1)
        obj.data.materials.clear(); obj.data.materials.append(mats[name])
        obj.data.validate(clean_customdata=False); obj.data.calc_loop_triangles()
        counts.append({'name':obj.name,'triangles':len(obj.data.loop_triangles)})
        obj.scale*=SCALE; obj.location*=SCALE
    groups={}
    for obj in meshes: groups.setdefault(obj.data.materials[0].name,[]).append(obj)
    for name,group in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for obj in group: obj.select_set(True)
        bpy.context.view_layer.objects.active=group[0]
        if len(group)>1: bpy.ops.object.join()
        group[0].name='Batched '+name
    bpy.ops.object.select_all(action='DESELECT')
    for obj in scene.objects:
        if obj.type=='MESH': obj.select_set(True)
    file=OUT/f'sambor-prei-kuk-{tier}.glb'
    bpy.ops.export_scene.gltf(filepath=str(file),export_format='GLB',use_selection=True,
        export_cameras=False,export_lights=False,export_animations=False,export_yup=True,
        export_meshopt_compression_enable=True,export_meshopt_extension='EXT_meshopt_compression')
    (PUBLIC/file.name).write_bytes(file.read_bytes())
    reports.append({'tier':tier,'triangles':sum(c['triangles'] for c in counts),'draws':len(groups),
        'bytes':file.stat().st_size,'scale':SCALE,'source_sha256':source_hash,'components':counts,
        'materials':'Vertex-colour approximation of original procedural weathering; no photo textures',
        'compression':'EXT_meshopt_compression'})
    assert hashlib.sha256(source.read_bytes()).hexdigest()==source_hash
    (OUT/'build-report.json').write_text(json.dumps(reports,indent=2))
    print('EXPORTED',tier,file.stat().st_size,flush=True)
print('SAMBOR_IMPORT_COMPLETE',flush=True)
