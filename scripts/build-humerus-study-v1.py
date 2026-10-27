"""Original illustrative humerus, long-bone cutaway and enlarged osteon.
Review assets only; not scans, clinical anatomy or a measured histology specimen.
"""
import bpy, math, json, importlib.util
from pathlib import Path
from mathutils import Vector
spec=importlib.util.spec_from_file_location('helpers',Path(__file__).with_name('build-anatomy-room-v2.py'))
h=importlib.util.module_from_spec(spec);spec.loader.exec_module(h)
OUT=h.OUT

def tag(o,key):
    o['studyPart']=key;o['studyScale']='magnified-not-body-scale' if MODE=='micro' else 'illustrative-centimetres'
    return o
def ball(key,at,r,mat,deform=None):return tag(h.ellipsoid(key,at,r,mat,deform),key)
def line(key,pts,r,mat,steps=30):return tag(h.tube(key,pts,r,mat,steps),key)
def shell(key,inner,outer,low,high,mat,arc=2*math.pi):
    verts=[];faces=[];n=h.N*3
    for y in [low,high]:
        for r in [inner,outer]:
            for i in range(n+1):
                a=math.pi/2+(2*math.pi-arc)/2+arc*i/n
                verts.append((r*math.cos(a),y,r*math.sin(a)))
    k=n+1
    for i in range(n):
        faces.extend([(i,i+1,k+i+1,k+i),(2*k+i,3*k+i,3*k+i+1,2*k+i+1),
                      (i,2*k+i,2*k+i+1,i+1),(k+i,k+i+1,3*k+i+1,3*k+i)])
    faces.extend([(0,k,3*k,2*k),(n,2*k+n,3*k+n,k+n)])
    return tag(h.mesh(key,verts,faces,mat),key)

def macro():
    bone=h.material('Bone ivory',(.68,.59,.43),.65)
    # Medial head, lateral tubercle, tapered shaft and expanded distal end.
    line('shaft',[(0,-13,0),(-.15,-7,0),(.15,0,-.18),(.1,7,-.1),(0,12,0)],lambda t:1.05+.9*abs(2*t-1)**5,bone,70)
    ball('head',(-1.4,13.4,-.35),(2.35,2.2,2.15),bone)
    ball('greater-tubercle',(1.3,12.4,0),(1.1,1.6,1.3),bone)
    ball('lesser-tubercle',(.25,11.9,1.25),(.7,1,.6),bone)
    ball('deltoid-tuberosity',(1.05,2,.3),(.42,1.7,.6),bone)
    # Distal depression is sculpted into the body, not shown as an extra bone.
    ball('distal-body',(0,-12.3,0),(2.35,1.8,1.2),bone,
         lambda x,y,z:(x,y,z*(1-.65*math.exp(-x*x*9-(y-.25)**2*8))))
    ball('medial-epicondyle',(-2.35,-12.8,0),(.85,.85,.85),bone)
    ball('lateral-epicondyle',(2.1,-12.9,0),(.55,.7,.65),bone)
    ball('capitulum',(1.2,-14, .45),(1,1,1),bone)
    line('trochlea',[(-1.7,-14,0),(-.9,-14,0),(-.15,-14,0)],lambda t:.8+.24*abs(2*t-1),bone,25)

def cutaway():
    ivory=h.material('Compact bone',(.68,.59,.43),.65)
    lining=h.material('Endosteum',(.56,.35,.30),.72)
    covering=h.material('Periosteum',(.65,.43,.34),.75)
    marrow=h.material('Yellow marrow',(.82,.48,.10),.7)
    trab=h.material('Trabecular bone',(.75,.58,.36),.65)
    red=h.material('Red marrow',(.42,.065,.07),.8)
    blue=h.material('Vein',(.07,.16,.38),.55)
    artery=h.material('Artery',(.57,.055,.04),.55)
    shell('compact-bone',1.15,1.65,-10,10,ivory,math.pi*1.45)
    shell('endosteum',1.10,1.15,-10,10,lining,math.pi*1.45)
    shell('periosteum',1.66,1.73,-8,8,covering,math.pi*.45)
    line('yellow-marrow',[(0,-9,0),(0,0,0),(0,9,0)],.82,marrow)
    for sign in [-1,1]:
        # Open trabecular lattice at the two illustrative ends; no solid cap.
        for j in range(4):
            y=sign*(10+j*.95);r=1.5+.7*math.sin(math.pi*(j+1)/5)
            pts=[(r*math.cos(a),y,r*math.sin(a)) for a in [2*math.pi*i/10 for i in range(11)]]
            line('spongy-bone',pts,.15,trab,50)
            for i in range(6):
                a=2*math.pi*i/6
                line('spongy-bone',[(r*math.cos(a),y,r*math.sin(a)),(.3*math.cos(a+.6),y+sign*.8,.3*math.sin(a+.6))],.12,trab,8)
        ball('red-marrow',(0,sign*11.7,0),(.65,1.3,.65),red)
    line('artery',[(.45,-9,.5),(.45,9,.5)],.13,artery)
    line('vein',[(-.45,-9,.5),(-.45,9,.5)],.15,blue)

def micro():
    lamella=[h.material('Lamella '+str(i),(.62+i*.025,.40+i*.025,.23+i*.025),.75) for i in range(5)]
    cell=h.material('Osteocytes',(.25,.09,.07),.7)
    space=h.material('Lacuna illustration',(.14,.075,.05),.8)
    nerve=h.material('Nerve',(.87,.60,.13),.6)
    red=h.material('Arterial vessel',(.58,.045,.03),.5)
    blue=h.material('Venous vessel',(.06,.14,.39),.5)
    for i in range(5):shell('lamellae',1+i*.66,1.63+i*.66,-2,2,lamella[i],math.pi*1.6)
    # Central canal is the empty lumen; its wall is a separately tagged surface.
    shell('central-canal',.94,1,-2,2,lamella[0],math.pi*1.6)
    line('artery',[(-.35,-2.5,0),(-.35,3,0)],.19,red)
    line('vein',[(.30,-2.5,0),(.30,3,0)],.23,blue)
    line('nerve',[(0,-2.5,.45),(0,3,.45)],.10,nerve)
    # Cells/lacunae enlarged on the exposed top face for readable instruction.
    for ring in range(5):
        r=1.32+ring*.66
        for i in range(8):
            a=math.pi*.7+math.pi*1.6*(i+.5)/8
            x,z=r*math.cos(a),r*math.sin(a)
            ball('lacunae',(x,2.01,z),(.16,.055,.10),space)
            ball('osteocytes',(x,2.07,z),(.095,.055,.065),cell)
            for delta in [-.10,0,.10]:
                line('canaliculi',[(x,2.03,z),((r-.32)*math.cos(a+delta),2.03,(r-.32)*math.sin(a+delta))],.015,space,5)

def consolidate():
    groups={}
    for o in bpy.context.scene.objects:
        if o.type=='MESH':groups.setdefault(o['studyPart'],[]).append(o)
    for key,objects in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for o in objects:o.select_set(True)
        bpy.context.view_layer.objects.active=objects[0]
        if len(objects)>1:bpy.ops.object.join()
        objects[0].name='study-'+key
    return sorted(groups)

def review(mode):
    scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE'
    scene.render.resolution_x=650;scene.render.resolution_y=900;scene.render.resolution_percentage=100
    scene.world=bpy.data.worlds.new('Study studio');scene.world.use_nodes=True
    scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.035,.05,.07,1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value=.5
    target=Vector((0,0,0));dist=40 if mode!='micro' else 15
    bpy.ops.object.camera_add(location=(dist*.3,-dist*2,dist*(1.5 if mode=='micro' else .25)))
    cam=bpy.context.object;cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=dist;scene.camera=cam
    for at,power in [((-30,-40,50),22000),((35,-20,5),14000),((0,30,40),18000)]:
        bpy.ops.object.light_add(type='AREA',location=at);o=bpy.context.object;o.data.energy=power;o.data.size=30;o.rotation_euler=(target-o.location).to_track_quat('-Z','Y').to_euler()
    scene['studyNotice']='MAGNIFIED - NOT TO BODY SCALE' if mode=='micro' else 'Illustrative teaching model - not medically validated'
    bpy.ops.object.text_add()
    title=bpy.context.object;title.name='Review notice';title.parent=cam
    title.location=(-dist*.32,dist*.43,-dist*3);title.rotation_euler=(0,0,0)
    title.data.body={'macro':'HUMERUS - EXTERNAL STUDY','cutaway':'LONG BONE - SCHEMATIC CUTAWAY','micro':'OSTEON - MAGNIFIED\nNOT TO BODY SCALE'}[mode]
    title.data.size=dist*.025
    ink=bpy.data.materials.new('Review title');ink.use_nodes=True
    shader=ink.node_tree.nodes.get('Principled BSDF');shader.inputs['Base Color'].default_value=(.8,.85,.9,1)
    shader.inputs['Emission Color'].default_value=(.8,.85,.9,1);shader.inputs['Emission Strength'].default_value=1
    title.data.materials.append(ink)
    scene.render.filepath=str(OUT/f'humerus-study-v1-{mode}-preview.png')
    bpy.ops.render.render(write_still=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/f'humerus-study-v1-{mode}.blend'))

stats={}
for MODE,build in [('macro',macro),('cutaway',cutaway),('micro',micro)]:
    for tier in ['normal','ultra']:
        bpy.ops.wm.read_factory_settings(use_empty=True);h.N=10 if tier=='normal' else 24
        build();parts=consolidate()
        meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
        for o in meshes:o.data.calc_loop_triangles()
        total=sum(len(o.data.loop_triangles) for o in meshes)
        if tier=='normal' and total>30000:
            for o in meshes:
                bpy.context.view_layer.objects.active=o
                mod=o.modifiers.new('Normal detail budget','DECIMATE');mod.ratio=30000/total
                bpy.ops.object.modifier_apply(modifier=mod.name);o.data.calc_loop_triangles()
        path=OUT/f'humerus-study-v1-{MODE}-{tier}.glb'
        bpy.ops.object.select_all(action='SELECT')
        bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',export_extras=True,export_animations=False)
        stats[MODE+'-'+tier]={'parts':parts,'triangles':sum(len(o.data.loop_triangles) for o in meshes),'bytes':path.stat().st_size}
        if tier=='ultra':review(MODE)
(OUT/'humerus-study-v1-stats.json').write_text(json.dumps(stats,indent=2));print(stats)
