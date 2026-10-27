"""Export the approved review as paired, self-contained local viewer models.
Never edits the approved authoring source or earlier application assets.
"""
import bpy, math, random, json, hashlib
from pathlib import Path
from mathutils import Vector
from mathutils.noise import noise

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'output/banteay-chhmar-review-v4/banteay-chhmar-review-v4.blend'
OUT=ROOT/'output/banteay-chhmar-import-v4'
PUBLIC=ROOT/'public/models/local/banteay-chhmar-refined-v4'
OUT.mkdir(parents=True,exist_ok=True);PUBLIC.mkdir(parents=True,exist_ok=True)
source_hash=hashlib.sha256(SOURCE.read_bytes()).hexdigest()
SCALE=.12;ORIGIN=Vector((8,-10,0))

def texture(name,ground=False):
    size=256;im=bpy.data.images.new(name,width=size,height=size);pixels=[]
    for y in range(size):
        for x in range(size):
            n=noise(Vector((x/22,y/22,.8)))+.3*noise(Vector((x/4,y/4,1.7)))
            base=(.19,.23,.10) if ground else (.30,.31,.285)
            pixels.extend((*[max(.04,c*(1+.40*n)) for c in base],1))
    im.pixels[:]=pixels;im.pack();return im

reports=[]
for tier in ['normal','ultra']:
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
    scene=bpy.context.scene;normal=tier=='normal'
    stone_image=texture('Original sandstone weathering')
    ground_image=texture('Original green earth',True)
    mats={};component_counts=[]
    meshes=[o for o in scene.objects if o.type=='MESH']
    for obj in meshes:
        original=obj.data.materials[0];name=original.name
        # Preserve intact stone blocks; face/foliage detail distinguishes modes.
        obj.modifiers.clear()
        if obj.name.startswith('Small individual leaves') and normal:
            old=obj.data;vv=[];ff=[]
            for i in range(0,len(old.vertices)-3,12):
                centre=sum((old.vertices[i+j].co for j in range(4)),Vector())/4
                offset=len(vv)
                vv.extend(tuple(centre+(old.vertices[i+j].co-centre)*1.65) for j in range(4))
                ff.extend([(offset,offset+1,offset+2),(offset,offset+2,offset+3)])
            mesh=bpy.data.meshes.new(obj.name+' Normal');mesh.from_pydata(vv,[],ff);mesh.update();obj.data=mesh
        elif 'continuous relief' in obj.name:
            ratio=.4 if normal else 1
            if ratio<1:
                bpy.context.view_layer.objects.active=obj
                mod=obj.modifiers.new('Viewer detail reduction','DECIMATE');mod.ratio=ratio
                bpy.ops.object.modifier_apply(modifier=mod.name)
        obj.data.validate(clean_customdata=True)
        if name not in mats:
            mat=bpy.data.materials.new('Viewer '+name);mat.use_nodes=True
            bs=mat.node_tree.nodes['Principled BSDF'];bs.inputs['Roughness'].default_value=.96
            stone='sandstone' in name.lower();ground=name=='Dry forest soil'
            if stone or ground:
                tex=mat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=ground_image if ground else stone_image
                mat.node_tree.links.new(tex.outputs['Color'],bs.inputs['Base Color'])
            else:
                source_bs=original.node_tree.nodes.get('Principled BSDF') if original.use_nodes else None
                color=tuple(source_bs.inputs['Base Color'].default_value) if source_bs else tuple(original.diffuse_color)
                bs.inputs['Base Color'].default_value=color
            mats[name]=mat
        obj.data.materials.clear();obj.data.materials.append(mats[name])
        # World-projected UVs keep texture scale consistent across stone blocks.
        uv=obj.data.uv_layers.new(name='ViewerUV')
        for p in obj.data.polygons:
            for li in p.loop_indices:
                v=obj.matrix_world@obj.data.vertices[obj.data.loops[li].vertex_index].co
                n=p.normal;s=.018 if name=='Dry forest soil' else .18
                uv.data[li].uv=(v.x*s,v.y*s) if abs(n.z)>.7 else (v.x*s,v.z*s) if abs(n.y)>.7 else (v.y*s,v.z*s)
        obj.data.calc_loop_triangles()
        component_counts.append({'name':obj.name,'triangles':len(obj.data.loop_triangles)})
        obj.location=(obj.location-ORIGIN)*SCALE;obj.scale*=SCALE
        print(tier,obj.name,len(obj.data.loop_triangles),flush=True)
    # Merge only by material: cheap draw submission, same scene contents in both modes.
    groups={}
    for obj in meshes:groups.setdefault(obj.data.materials[0].name,[]).append(obj)
    for name,group in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for obj in group:obj.select_set(True)
        bpy.context.view_layer.objects.active=group[0]
        if len(group)>1:bpy.ops.object.join()
        group[0].name='Batched '+name
    bpy.ops.object.select_all(action='DESELECT')
    for obj in scene.objects:
        if obj.type=='MESH':obj.select_set(True)
    file=OUT/f'banteay-chhmar-{tier}.glb'
    bpy.ops.export_scene.gltf(filepath=str(file),export_format='GLB',use_selection=True,
        export_cameras=False,export_lights=False,export_animations=False,export_yup=True,
        export_meshopt_compression_enable=True,export_meshopt_extension='EXT_meshopt_compression')
    report={'tier':tier,'triangles':sum(c['triangles'] for c in component_counts),'draws':len(groups),
        'bytes':file.stat().st_size,'components':component_counts,'scale':SCALE,'origin':list(ORIGIN),
        'source_sha256':source_hash,'compression':'EXT_meshopt_compression',
        'materials':'Original embedded texture approximation of Blender shaders'}
    reports.append(report)
    (PUBLIC/file.name).write_bytes(file.read_bytes())
    # Offline appearance check of the actual exported mesh/materials.
    for obj in list(scene.objects):
        if obj.type in {'LIGHT','CAMERA'}:bpy.data.objects.remove(obj,do_unlink=True)
    bpy.ops.object.light_add(type='SUN');sun=bpy.context.object
    sun.rotation_euler=(.45,-.3,-.6);sun.data.energy=1.6;sun.data.angle=.20
    bpy.ops.object.camera_add(location=(Vector((23,-33,13))-ORIGIN)*SCALE)
    cam=bpy.context.object;target=(Vector((4,-8,5.5))-ORIGIN)*SCALE
    cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
    cam.data.type='ORTHO';cam.data.ortho_scale=25*SCALE;scene.camera=cam
    scene.render.resolution_x=1000;scene.render.resolution_y=760;scene.cycles.samples=16
    scene.render.filepath=str(OUT/f'{tier}-preview.png');bpy.ops.render.render(write_still=True)
assert hashlib.sha256(SOURCE.read_bytes()).hexdigest()==source_hash
(OUT/'build-report.json').write_text(json.dumps(reports,indent=2))
print('IMPORT_COMPLETE',json.dumps([{k:v for k,v in r.items() if k!='components'} for r in reports]),flush=True)
