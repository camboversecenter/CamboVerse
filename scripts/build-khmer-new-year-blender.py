"""Original illustrative New Year courtyard; shared Blender craft helpers.
Sources and limits: docs/KHMER-NEW-YEAR-REFERENCES.md. No copied textures.
"""
import importlib.util, math, json
from pathlib import Path
import bpy
from mathutils import Vector

spec=importlib.util.spec_from_file_location('craft',Path(__file__).with_name('build-pchum-ben-blender.py'))
c=importlib.util.module_from_spec(spec);spec.loader.exec_module(c)
OUT=Path(__file__).resolve().parents[1]/'public/models/local/khmer-new-year-v1'
OUT.mkdir(parents=True,exist_ok=True)

def build(detail):
    c.setup(detail)
    c.mats['sand']=c.material('warm sand',(.65,.47,.27),1)
    c.mats['water']=c.material('water',(.21,.46,.46),.3)
    c.mats['red']=c.material('cloth red',(.50,.08,.045),.9)
    c.box('courtyard',(0,-.1,0),(22,.2,20),'earth')
    c.box('central walkway',(0,.015,0),(2.1,.03,16),'stone')
    # Open sala, distinct from the enclosed worship hall of the Pchum Ben study.
    c.box('sala floor',(0,.16,-4.8),(7.6,.32,4.6),'tile')
    for x in [-3.4,3.4]:
        for z in [-6.8,-2.8]:c.box('timber column',(x,1.5,z),(.2,3,.2),'wood',True)
        c.box('sala beam',(x,3,-4.8),(.20,.18,4.3),'wood')
    c.current='roof';c.roof('sala roof',0,4,-4.8,8,5.2)
    c.current='environment'
    for x in [-7.5,7.5]:
        for z in [-7,5]:
            c.rod('tree trunk',(x,0,z),(x,3.5,z),.16,'wood')
            c.sphere('shade tree',(x,3.7,z),(1.4,1.7,1.4),'leaf')
    # Decorative festival bunting; not sacred text or a claimed historical pattern.
    for x in [-5.7,5.7]:c.rod('bunting pole',(x,0,5),(x,3.4,5),.06,'wood')
    c.rod('bunting cord',(-5.7,3.3,5),(5.7,3.3,5),.012,'wood')
    for i in range(15):
        x=-5.3+i*.75
        mesh=bpy.data.meshes.new('cloth pennant');mesh.from_pydata([c.xyz(p) for p in [(x-.2,3.3,5),(x+.2,3.3,5),(x,2.9,5)]],[],[(0,1,2)])
        o=bpy.data.objects.new('festival pennant',mesh);bpy.context.collection.objects.link(o);c.finish(o,'red' if i%2 else 'paper')
    c.current='welcome'
    c.box('welcome table',(-3,.45,2.3),(2.4,.12,1.3),'wood',True)
    for x in [-3.9,-2.1]:
        for z in [1.85,2.75]:c.box('table leg',(x,.22,z),(.10,.44,.10),'wood')
    for x in [-3.6,-2.5]:
        c.tray((x,.52,2.3),.4)
        for i in range(5):c.sphere('fruit',(x+math.cos(i*2.4)*.18,.65,2.3+math.sin(i*2.4)*.18),(.12,.12,.12),'food')
    c.current='generosity'
    for x in [-.7,.7]:
        c.tray((x,.34,-4.5),.5)
        c.sphere('rice serving',(x,.46,-4.5),(.32,.10,.32),'rice')
    c.box('woven mat',(0,.335,-5.8),(3.8,.03,1.2),'mat')
    c.current='sand'
    for x,z,r,h in [(3,1,1.05,1.15),(1.9,-.1,.45,.55),(4.1,-.1,.45,.55),(1.9,2.1,.45,.55),(4.1,2.1,.45,.55)]:
        c.lathe('sand mound',(x,.02,z),[(0,0),(r,0),(r*.88,h*.14),(r*.65,h*.40),(r*.35,h*.73),(.04,h),(0,h+.02)],'sand')
        c.rod('plain flag stick',(x,h,z),(x,h+.6,z),.01,'wood')
        c.box('plain paper flag',(x+.10,h+.46,z),(.20,.22,.012),'paper')
    c.current='water'
    c.box('water display',(-3,.40,-1.4),(1.6,.12,1.2),'wood',True)
    for x in [-3.6,-2.4]:c.box('display support',(x,.18,-1.4),(.12,.36,.9),'wood')
    c.lathe('water bowl',(-3,.46,-1.4),[(0,0),(.25,0),(.48,.16),(.50,.38),(.46,.40),(.43,.16),(0,.05)],'silver')
    c.lathe('water surface',(-3,.78,-1.4),[(0,0),(.44,0)],'water')
    for i in range(6):c.sphere('flower petal',(-3+math.cos(i)*.23,.79,-1.4+math.sin(i)*.23),(.08,.012,.035),'paper')
    c.rod('dipper handle',(-2.5,.53,-1.5),(-2,.65,-1.1),.025,'wood')
    c.current='games'
    # Rope is an inspectable game object, not a simulated religious contest.
    for i in range(32 if detail=='ultra' else 16):
        n=32 if detail=='ultra' else 16;a=i/n*math.tau;b=(i+1)/n*math.tau
        c.rod('coiled tugging rope',(5.6+.8*math.cos(a),.08,-3.2+.65*math.sin(a)),(5.6+.8*math.cos(b),.08,-3.2+.65*math.sin(b)),.045,'mat')
    c.sphere('cloth ball for chhoung',(5.6,.22,-3.2),(.17,.17,.17),'red')
    c.box('cloth tail',(5.6,.08,-2.82),(.16,.04,.5),'red')
    for part,objects in c.groups.items():
        root=bpy.data.objects.new(part,None);bpy.context.collection.objects.link(root);root['study_part']=part
        batches={}
        for o in objects:batches.setdefault(o.data.materials[0].name,[]).append(o)
        for mat,items in batches.items():
            bpy.ops.object.select_all(action='DESELECT')
            for o in items:o.select_set(True)
            bpy.context.view_layer.objects.active=items[0]
            if len(items)>1:bpy.ops.object.join()
            o=items[0];o.name=part+'_'+mat;o.parent=root
    p=OUT/f'khmer-new-year-{detail}.glb'
    bpy.ops.export_scene.gltf(filepath=str(p),export_format='GLB',export_extras=True,export_yup=True)
    meshes=[o for o in bpy.context.scene.objects if o.type=='MESH'];tri=0
    for o in meshes:o.data.calc_loop_triangles();tri+=len(o.data.loop_triangles)
    return dict(bytes=p.stat().st_size,triangles=tri,meshes=len(meshes),groups=list(c.groups))

manifest={tier:build(tier) for tier in ['normal','ultra']}
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2))
bpy.context.scene.world.use_nodes=True;bpy.context.scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.8
for p,energy,size in [((2,10,6),2000,8),((-6,5,-2),900,6)]:
    bpy.ops.object.light_add(type='AREA',location=c.xyz(p));o=bpy.context.object;o.data.energy=energy;o.data.size=size
    o.rotation_euler=(Vector(c.xyz((0,0,0)))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=c.xyz((12,12,17)));cam=bpy.context.object
cam.rotation_euler=(Vector(c.xyz((0,.5,-1)))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=22
s=bpy.context.scene;s.camera=cam;s.render.engine='BLENDER_EEVEE';s.render.resolution_x=1200;s.render.resolution_y=850;s.render.resolution_percentage=100
s.render.filepath=str(OUT/'blender-review.png');s.render.image_settings.file_format='PNG'
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'khmer-new-year-study.blend'))
bpy.ops.render.render(write_still=True)
print(json.dumps(manifest))
