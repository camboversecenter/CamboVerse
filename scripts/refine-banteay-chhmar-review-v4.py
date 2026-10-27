"""Non-destructive Blender-only review. No live assets or application edits.

Reads the existing v3 authoring study. New sources and renders go to output/.
The inherited layout and original carved faces are illustrative, not a survey.
"""
import bpy, bmesh, math, json, hashlib, sys
from pathlib import Path
from mathutils import Vector, Matrix
from mathutils.noise import noise

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT/'public/models/local/banteay-chhmar-review-v3/banteay-chhmar-review-v3.blend'
OUT = ROOT/'output/banteay-chhmar-review-v4'
OUT.mkdir(parents=True, exist_ok=True)

def count_triangles():
    total=0
    deps=bpy.context.evaluated_depsgraph_get()
    for obj in bpy.context.scene.objects:
        if obj.type!='MESH': continue
        evaluated=obj.evaluated_get(deps);mesh=evaluated.to_mesh()
        mesh.calc_loop_triangles();total+=len(mesh.loop_triangles)
        evaluated.to_mesh_clear()
    return total

def remove_unsupported_roof_stones(scene):
    """Discard inherited gallery roof fragments with no nearby standing pier.

    The source generator sampled roof survival independently of column survival.
    Its masonry batch stores each original box as eight consecutive vertices.
    Work on the review copy only, without inventing new structural supports.
    """
    obj=next(o for o in scene.objects if o.type=='MESH' and o.name.startswith('Main core'))
    if obj.get('unsupported_roof_checked')==2: return 0
    old=obj.data; groups=[]; piers=[]
    assert len(old.vertices)%8==0
    for i in range(0,len(old.vertices),8):
        vv=[v.co.copy() for v in old.vertices[i:i+8]]
        c=sum(vv,Vector())/8
        d=[max(v[k] for v in vv)-min(v[k] for v in vv) for k in range(3)]
        groups.append((i,vv,c,d))
        if max(d[:2])<.54 and 2.60<c.z<2.80: piers.append(c)
    vv=[];ff=[];removed=0
    for i,verts,c,d in groups:
        roof=3.05<c.z<4.25 and 2.06<max(d[:2])<2.24 and .57<min(d[:2])<.74 and d[2]<.34
        along=0 if d[0]>d[1] else 1
        across=1-along
        if roof and not any(abs(c[along]-p[along])<.15 and abs(c[across]-p[across])<2.8 for p in piers):
            removed+=1;continue
        offset=len(vv);vv.extend(tuple(v) for v in verts)
        for poly in old.polygons[(i//8)*6:(i//8+1)*6]:
            ff.append(tuple(offset+j-i for j in poly.vertices))
    mesh=bpy.data.meshes.new('Supported ruin masonry');mesh.from_pydata(vv,[],ff)
    for mat in old.materials: mesh.materials.append(mat)
    mesh.update();obj.data=mesh;obj['unsupported_roof_checked']=2
    print('REMOVED_UNSUPPORTED_ROOF_STONES',removed,flush=True)
    return removed

if '--refresh-canopies' in sys.argv:
    bpy.ops.wm.open_mainfile(filepath=str(OUT/'banteay-chhmar-review-v4.blend'))
    scene=bpy.context.scene
    removed=remove_unsupported_roof_stones(scene)
    for obj in scene.objects:
        if obj.type=='MESH' and obj.name.startswith('Small individual leaves'):
            ratio=2.1/obj.get('review_leaf_scale',1)
            for i in range(0,len(obj.data.vertices)-3,4):
                centre=sum((obj.data.vertices[i+j].co for j in range(4)),Vector())/4
                for j in range(4):
                    obj.data.vertices[i+j].co=centre+(obj.data.vertices[i+j].co-centre)*ratio
            obj['review_leaf_scale']=2.1
    scene.view_settings.exposure=.1
    for obj in scene.objects:
        if obj.type=='LIGHT' and obj.data.type=='SUN': obj.data.energy=1.6
    cam=scene.objects.get('V4 04-gallery')
    cam.location=(85,-55,20)
    cam.rotation_euler=(Vector((70,-34,1.8))-cam.location).to_track_quat('-Z','Y').to_euler()
    bpy.context.preferences.filepaths.save_version=0
    report=json.loads((OUT/'review-validation.json').read_text())
    report['removed_unsupported_roof_stones']=report.get('removed_unsupported_roof_stones',0)+removed
    report['triangles_after']=count_triangles()
    (OUT/'review-validation.json').write_text(json.dumps(report,indent=2))
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'banteay-chhmar-review-v4.blend'))
    for cam in sorted((o for o in scene.objects if o.type=='CAMERA' and o.name.startswith('V4 ')),key=lambda o:o.name):
        scene.camera=cam;scene.render.filepath=str(OUT/(cam.name[3:]+'.png'))
        bpy.ops.render.render(write_still=True)
    print('CANOPY_REVIEW_COMPLETE',flush=True)
    sys.exit(0)
source_hash = hashlib.sha256(SOURCE.read_bytes()).hexdigest()
bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
bpy.context.preferences.filepaths.save_version = 0
scene = bpy.context.scene

before=count_triangles()
removed=remove_unsupported_roof_stones(scene)
face_report=[]
for obj in list(scene.objects):
    if obj.type!='MESH': continue
    # Keep originals untouched. This fresh file retains separate editable components.
    if obj.name.startswith('V3 Tower') and 'continuous relief' in obj.name:
        idx=int(obj.name.split('Tower ')[1][0])-1
        side=['South','East','North','West'].index(obj['direction'])
        cx,cy,scale=[(8,-10,1.15),(-5,-12,.92),(10,12,.85),(-94,0,.78)][idx]
        rot=Matrix.Rotation(side*math.pi/2,3,'Z')
        z0=.4+4.35*scale
        # Surface wear varies by face. It does not claim to copy particular damage.
        for v in obj.data.vertices:
            p=rot.inverted()@(v.co-Vector((cx,cy,0)))
            if p.y > -2.25*scale: continue  # leave closed rear and support intact
            h=(p.z-z0)/scale
            u=p.x/scale
            wear=.024*noise(Vector((u*5+side*2,h*5,idx+.7)))
            # A few shallow edge chips, not missing eyes or invented iconography.
            wear+=.065*math.exp(-((abs(u)-1.42)/.16)**2-((h-(.6+side*.47))/ .30)**2)
            p.y+=wear*scale
            v.co=rot@p+Vector((cx,cy,0))
        bpy.context.view_layer.objects.active=obj
        mod=obj.modifiers.new('Review mesh reduction retaining carved silhouette','DECIMATE')
        mod.ratio=.055 if idx==0 else .035
        bpy.ops.object.modifier_apply(modifier=mod.name)
        bm=bmesh.new();bm.from_mesh(obj.data)
        assert all(e.is_manifold for e in bm.edges), obj.name
        assert bm.calc_volume(signed=True)>0, obj.name
        bm.free()
        face_report.append({'name':obj.name,'vertices':len(obj.data.vertices),'direction':obj['direction']})
    else:
        for mod in list(obj.modifiers):
            if mod.type=='BEVEL': mod.segments=1
    # Retain sampled leaves throughout each original canopy, not fewer trees.
    if obj.name.startswith('Small individual leaves'):
        old=obj.data; vv=[];ff=[]
        for i in range(0,len(old.vertices)-3,16):
            offset=len(vv)
            centre=sum((old.vertices[i+j].co for j in range(4)),Vector())/4
            vv.extend(tuple(centre+(old.vertices[i+j].co-centre)*2.1) for j in range(4))
            ff.extend([(offset,offset+1,offset+2),(offset,offset+2,offset+3)])
        mesh=bpy.data.meshes.new(obj.name+' lighter leaf sampling')
        mesh.from_pydata(vv,[],ff);mesh.materials.append(old.materials[0]);mesh.update()
        obj.data=mesh
        obj['review_leaf_scale']=2.1

# Match the cooler, uneven stone seen in reference photographs. Only original
# procedural shaders are used, with no third-party photo textures in the blend.
for mat in bpy.data.materials:
    if 'sandstone' not in mat.name.lower() or not mat.use_nodes: continue
    bs=mat.node_tree.nodes.get('Principled BSDF')
    for node in mat.node_tree.nodes:
        if node.type=='VALTORGB':
            for e in node.color_ramp.elements:
                t=e.position
                e.color=(.09+.30*t,.095+.30*t,.085+.28*t,1)
    bs.inputs['Roughness'].default_value=.96

soil=bpy.data.materials.get('Dry forest soil')
for node in soil.node_tree.nodes:
    if node.type=='VALTORGB':
        node.color_ramp.elements[0].color=(.075,.11,.035,1)
        node.color_ramp.elements[-1].color=(.23,.25,.12,1)

# A darker, greener canopy and restrained daylight let masonry remain legible.
for mat in bpy.data.materials:
    if mat.name.startswith('Foliage '):
        bs=mat.node_tree.nodes.get('Principled BSDF')
        c=mat.diffuse_color
        bs.inputs['Base Color'].default_value=(c[0]*.8,c[1]*1.25,c[2]*.85,1)

for obj in list(scene.objects):
    if obj.type in {'LIGHT','CAMERA'}: bpy.data.objects.remove(obj,do_unlink=True)
world=scene.world.node_tree.nodes['Background']
world.inputs[0].default_value=(.68,.75,.82,1);world.inputs[1].default_value=.65
bpy.ops.object.light_add(type='SUN')
sun=bpy.context.object;sun.rotation_euler=(.45,-.3,-.6)
sun.data.energy=1.6;sun.data.angle=.20
scene.view_settings.view_transform='AgX';scene.view_settings.exposure=.1
scene.render.engine='CYCLES';scene.cycles.samples=20;scene.cycles.use_denoising=True
scene.render.resolution_x=1280;scene.render.resolution_y=900;scene.render.resolution_percentage=100
scene['Review status']='V4 UNAPPROVED - review only, no app import'
scene['Reference basis']='Community tourism gallery + inherited v2/v3 reference research'
scene['Limitations']='Interpretive ruin study, not surveyed; facial wear and tree condition inferred'

views=[
    ('01-core-overview',(182,-220,186),(0,0,2),330),
    ('02-face-towers',(23,-33,13),(4,-8,5.5),25),
    ('03-carved-face',(18,-25,10),(8,-10,6.7),11.8),
    ('04-gallery',(85,-55,20),(70,-34,1.8),27),
]
cams=[]
for name,pos,target,width in views:
    bpy.ops.object.camera_add(location=pos)
    cam=bpy.context.object;cam.name='V4 '+name
    cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler()
    cam.data.type='ORTHO';cam.data.ortho_scale=width;cam.data.clip_end=2500
    cams.append(cam)
scene.camera=cams[1]
after=count_triangles()
assert len(face_report)==16
assert after<before
assert hashlib.sha256(SOURCE.read_bytes()).hexdigest()==source_hash
report={'status':'unapproved Blender review; no app integration','source_sha256':source_hash,
        'removed_unsupported_roof_stones':removed,
        'triangles_before':before,'triangles_after':after,'faces':face_report,
        'all_reliefs_closed':True,'source_unchanged':True,
        'mobile_ready':False,'note':'Normal/Ultra export remains gated on shape approval'}
(OUT/'review-validation.json').write_text(json.dumps(report,indent=2))
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'banteay-chhmar-review-v4.blend'))
for cam in cams:
    scene.camera=cam;scene.render.filepath=str(OUT/(cam.name[3:]+'.png'))
    bpy.ops.render.render(write_still=True)
print('REVIEW_COMPLETE',json.dumps({k:v for k,v in report.items() if k!='faces'}),flush=True)
