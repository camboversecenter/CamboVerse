"""Import the approved Wat Phnom review without modifying its Blender sources.
Retain the Naga materials/texture, approximate new procedural colour at vertices,
batch by material and use the viewer's bundled meshopt decoder.
"""
import bpy, json, hashlib, math
from pathlib import Path
from mathutils import Vector
from mathutils.noise import noise

ROOT=Path(__file__).resolve().parents[1]
REVIEW=ROOT/'output/wat-phnom-review-v4'
OUT=ROOT/'output/wat-phnom-import-v4'
PUBLIC=ROOT/'public/models/local/wat-phnom-refined-v4'
OUT.mkdir(parents=True,exist_ok=True); PUBLIC.mkdir(parents=True,exist_ok=True)
approved=json.loads((REVIEW/'validation.json').read_text())
assert approved['passed']
reports=[]
for tier in ['normal','ultra']:
    source=REVIEW/f'wat-phnom-{tier}.blend'
    sha=hashlib.sha256(source.read_bytes()).hexdigest()
    validation=next(r for r in approved['reports'] if r['tier']==tier)
    assert sha==validation['blendSha256']
    bpy.ops.wm.open_mainfile(filepath=str(source))
    meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
    mats={}; counts=[]; lowered=0
    for obj in meshes:
        # Keep the existing procedural flower clock visible at its original
        # position. Only lower the new terrain beneath its circular footprint.
        if obj.name=='Green wooded hill':
            for v in obj.data.vertices:
                if math.hypot(v.co.x,v.co.y+13.2)<3.1 and v.co.z> -1.445:
                    v.co.z=-1.445; lowered+=1
            obj.data.update()
            # An open terrain sheet has no enclosed volume for Blender's
            # automatic normal orientation. Explicitly face its surface upward
            # for glTF's back-face culling and downward floor raycasts.
            for p in obj.data.polygons:
                if p.normal.z<0: p.flip()
            obj.data.update()
        original=obj.data.materials[0]; name=original.name
        if name.startswith('V4 |'):
            if name not in mats:
                m=bpy.data.materials.new('Viewer '+name); m.use_nodes=True
                bs=m.node_tree.nodes['Principled BSDF']; bs.inputs['Roughness'].default_value=.88
                colors=m.node_tree.nodes.new('ShaderNodeVertexColor'); colors.layer_name='Weathering'
                m.node_tree.links.new(colors.outputs['Color'],bs.inputs['Base Color']); mats[name]=m
            ramp=next(n for n in original.node_tree.nodes if n.type=='VALTORGB').color_ramp
            scale=next(n for n in original.node_tree.nodes if n.type=='TEX_NOISE').inputs['Scale'].default_value
            low=Vector(ramp.elements[0].color[:3]); high=Vector(ramp.elements[-1].color[:3])
            colors=obj.data.color_attributes.new(name='Weathering',type='BYTE_COLOR',domain='POINT')
            for v,col in zip(obj.data.vertices,colors.data):
                t=max(0,min(1,.5+.40*noise((obj.matrix_world@v.co)*scale)))
                col.color=(*low.lerp(high,t),1)
            obj.data.materials.clear(); obj.data.materials.append(mats[name])
        obj.data.calc_loop_triangles()
        counts.append({'name':obj.name,'triangles':len(obj.data.loop_triangles)})
    groups={}
    for obj in meshes: groups.setdefault(obj.data.materials[0].name,[]).append(obj)
    for name,group in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for obj in group: obj.select_set(True)
        bpy.context.view_layer.objects.active=group[0]
        if len(group)>1: bpy.ops.object.join()
        group[0].name='Batched '+name
    bpy.ops.object.select_all(action='DESELECT')
    for o in bpy.context.scene.objects:
        if o.type=='MESH': o.select_set(True)
    file=OUT/f'wat-phnom-{tier}.glb'
    bpy.ops.export_scene.gltf(filepath=str(file),export_format='GLB',use_selection=True,
        export_cameras=False,export_lights=False,export_animations=False,export_yup=True,
        export_meshopt_compression_enable=True,export_meshopt_extension='EXT_meshopt_compression')
    (PUBLIC/file.name).write_bytes(file.read_bytes())
    assert sum(c['triangles'] for c in counts)==validation['triangles']
    assert hashlib.sha256(source.read_bytes()).hexdigest()==sha
    reports.append({'tier':tier,'source_sha256':sha,'triangles':validation['triangles'],
        'draws':len(groups),'bytes':file.stat().st_size,'scale':1,'viewerLift':1.4,
        'clockTerrainVerticesLowered':lowered,'components':counts,'trees':validation['trees'],
        'materials':'Naga materials retained; new procedural colour approximated at vertices',
        'compression':'EXT_meshopt_compression'})
    (OUT/'build-report.json').write_text(json.dumps(reports,indent=2))
    print('EXPORTED',tier,file.stat().st_size,flush=True)
