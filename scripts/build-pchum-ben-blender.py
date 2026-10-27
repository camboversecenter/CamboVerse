"""Original reference-guided Pchum Ben study. Run with Blender --background --python.
References and limitations: docs/PCHUM-BEN-REFERENCES.md. No reference images copied.
Writes Normal/Ultra GLB, editable Ultra .blend, preview PNG and measured manifest.
"""
import bpy, math, json, random
from pathlib import Path
from mathutils import Vector

OUT = Path(__file__).resolve().parents[1] / 'public/models/local/pchum-ben-v2'
OUT.mkdir(parents=True, exist_ok=True)
def xyz(p): return (p[0], -p[2], p[1])
def material(name, color, rough=.8, metal=0):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
    n=m.node_tree.nodes.get('Principled BSDF'); n.inputs['Base Color'].default_value=(*color,1)
    n.inputs['Roughness'].default_value=rough; n.inputs['Metallic'].default_value=metal
    return m
def setup(detail):
    global mats, groups, seg, bevel, current
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
    seg=32 if detail=='ultra' else 12; bevel=.025 if detail=='ultra' else 0
    mats={k:material(k,c,r,m) for k,c,r,m in [
      ('ivory',(.72,.67,.54),.95,0),('stone',(.48,.44,.36),.95,0),('wood',(.23,.115,.06),.87,0),
      ('roof',(.35,.095,.045),.9,0),('trim',(.65,.41,.13),.65,.12),('silver',(.55,.59,.58),.3,.65),
      ('rice',(.91,.87,.74),.95,0),('leaf',(.09,.24,.065),.9,0),('paper',(.93,.91,.83),1,0),
      ('incense',(.40,.12,.065),1,0),('wax',(.9,.68,.3),.9,0),('mat',(.58,.40,.19),1,0),
      ('cloth',(.47,.20,.06),1,0),('bowl',(.09,.085,.075),.4,.12),('earth',(.27,.32,.22),1,0),
      ('food',(.37,.43,.09),.9,0),('flame',(1,.46,.08),.5,0),
      ('gilt',(.78,.49,.14),.42,.45),('robe',(.59,.30,.055),.65,.22),('detail',(.24,.13,.035),.8,0) ]}
    flame=mats['flame'].node_tree.nodes.get('Principled BSDF')
    flame.inputs['Emission Color'].default_value=(1,.28,.015,1); flame.inputs['Emission Strength'].default_value=2
    # Original packed ceramic tile colour texture: works in Blender and GLB.
    image=bpy.data.images.new('original ceramic tile grid '+detail,width=128,height=128)
    rng=random.Random(25); pixels=[]
    for y in range(128):
      for x in range(128):
        line=x%32<1 or y%32<1
        n=rng.uniform(-.025,.025)
        c=(.32,.30,.26) if line else (.70+n,.64+n,.50+n)
        pixels.extend((*c,1))
    image.pixels[:]=pixels; image.pack()
    tile=material('tile',(.7,.64,.5)); tex=tile.node_tree.nodes.new('ShaderNodeTexImage');tex.image=image
    tile.node_tree.links.new(tex.outputs['Color'],tile.node_tree.nodes.get('Principled BSDF').inputs['Base Color']); mats['tile']=tile
    groups={}; current='environment'
def finish(obj, mat):
    obj.data.materials.clear();obj.data.materials.append(mats[mat]);obj['study_part']=current
    groups.setdefault(current,[]).append(obj);return obj
def box(name,p,size,mat='wood',edge=False):
    bpy.ops.mesh.primitive_cube_add(size=1,location=xyz(p));o=bpy.context.object;o.name=name
    o.scale=(size[0],size[2],size[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if edge and bevel:
      mod=o.modifiers.new('soft worked edges','BEVEL');mod.width=bevel;mod.segments=2
      bpy.ops.object.modifier_apply(modifier=mod.name)
    return finish(o,mat)
def sphere(name,p,scale,mat='rice'):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg//2,ring_count=max(6,seg//3),radius=1,location=xyz(p))
    o=bpy.context.object;o.name=name;o.scale=(scale[0],scale[2],scale[1]);
    for f in o.data.polygons:f.use_smooth=True
    return finish(o,mat)
def lathe(name,p,profile,mat):
    verts=[];faces=[]
    for r,h in profile:
      for i in range(seg):
        a=i*math.tau/seg;verts.append((r*math.cos(a),r*math.sin(a),h))
    for j in range(len(profile)-1):
      for i in range(seg):
        a=j*seg+i;b=j*seg+(i+1)%seg;faces.append((a,b,b+seg,a+seg))
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
    o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);o.location=xyz(p)
    for f in mesh.polygons:f.use_smooth=True
    return finish(o,mat)
def rod(name,a,b,r,mat):
    av,bv=Vector(xyz(a)),Vector(xyz(b));delta=bv-av
    bpy.ops.mesh.primitive_cylinder_add(vertices=max(6,seg//2),radius=r,depth=delta.length,location=(av+bv)/2)
    o=bpy.context.object;o.name=name;o.rotation_euler=delta.to_track_quat('Z','Y').to_euler();return finish(o,mat)
def roof(name,x,y,z,width,depth):
    for side in [-1,1]:
      o=box(name,(x+side*width*.24,y,z),(width*.56,.10,depth),'roof')
      o.rotation_euler[1]=side*.46
      rod('gilt eave',(x+side*width*.49,y-width*.12,z-depth*.5),(x+side*width*.49,y-width*.12,z+depth*.5),.045,'trim')
    rod('ridge',(x,y+width*.12,z-depth*.53),(x,y+width*.12,z+depth*.53),.075,'trim')
    for s in [-1,1]:
      rod('upturned roof tip',(x,y+width*.12,z+s*depth*.53),(x,y+width*.12+.45,z+s*(depth*.53+.15)),.055,'trim')
def tray(p,r=.55):
    return lathe('offering tray',p,[(0,0),(r*.7,0),(r,.05),(r,.11),(r*.94,.12),(r*.89,.055),(0,.045)],'silver')

def buddha():
    # Original interpretive image, informed by the Met's Cambodian Enthroned
    # Buddha (2013.247a-h). Right hand reaches down; left rests in the lap.
    global current, seg
    saved_seg=seg;seg=48 if seg==32 else 16
    current='buddha'; z=-9.05
    for y,w,d in [(0.72,2.6,1.65),(.95,2.25,1.45),(1.12,1.95,1.25)]:
        box('tiered altar',(0,y,z),(w,.22,d),'trim',True)
    for side in [-1,1]:
        leg=sphere('folded robe knee',(side*.43,1.38,z+.13),(.56,.23,.34),'robe')
        leg.rotation_euler[2]=side*.19
        sphere('crossed foot',(side*.23,1.48,z+.39),(.27,.12,.13),'gilt')
    torso=lathe('robed torso',(0,1.43,z),[(.32,0),(.35,.20),(.33,.48),(.43,.78),(.38,.88),(.15,1.02),(0,1.03)],'gilt')
    torso.scale.y=.66
    # Draped left shoulder, no decorative crown or invented inscription.
    sphere('robe left shoulder',(.30,2.20,z),(.19,.23,.21),'robe')
    for i in range(4):
        rod('robe fold',(.32-i*.045,2.15,z+.22),(-.22+i*.08,1.55,z+.24),.012,'robe')
    for side in [-1,1]:
        a=Vector(xyz((side*.40,2.12,z))); b=Vector(xyz((side*.51,1.69,z+.1)))
        arm=sphere('upper arm',(side*.455,1.905,z+.05),(.12,.27,.12),'gilt' if side<0 else 'robe')
        arm.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler()
    # Figure's right is the viewer's left.
    arm=sphere('right forearm',(-.525,1.56,z+.30),(.10,.28,.10),'gilt')
    arm.rotation_euler=(Vector(xyz((-.54,1.40,z+.50)))-Vector(xyz((-.51,1.72,z+.1)))).to_track_quat('Z','Y').to_euler()
    sphere('earth touching hand',(-.54,1.33,z+.53),(.10,.16,.055),'gilt')
    arm=sphere('left forearm',(.315,1.67,z+.25),(.095,.27,.095),'gilt')
    arm.rotation_euler=(Vector(xyz((.12,1.62,z+.40)))-Vector(xyz((.51,1.72,z+.1)))).to_track_quat('Z','Y').to_euler()
    sphere('left palm in lap',(.02,1.61,z+.42),(.20,.065,.10),'gilt')
    lathe('neck',(0,2.30,z),[(.12,0),(.13,.22)],'gilt')
    sphere('head',(0,2.65,z),(.245,.32,.205),'gilt')
    sphere('hair cap',(0,2.84,z-.015),(.235,.16,.20),'robe')
    lathe('ushnisha',(0,2.94,z),[(.12,0),(.13,.09),(.09,.17),(.03,.25),(0,.28)],'gilt')
    for side in [-1,1]:
        sphere('elongated ear',(side*.25,2.60,z),(.045,.14,.055),'gilt')
        for i in range(5):
            t=i/5;u=(i+1)/5
            rod('lowered eyelid',(side*(.045+.11*t),2.67-.02*math.sin(t*math.pi),z+.198-.035*t),(side*(.045+.11*u),2.67-.02*math.sin(u*math.pi),z+.198-.035*u),.007,'detail')
    sphere('nose',(0,2.61,z+.205),(.037,.076,.047),'gilt')
    rod('quiet mouth',(-.06,2.53,z+.176),(.06,2.53,z+.176),.012,'detail')
    current='environment';seg=saved_seg
def build(detail):
    global current
    setup(detail)
    box('courtyard',(0,-.10,-1),(24,.15,23),'earth')
    box('sala plinth',(0,.05,0),(8.5,.24,6.4),'stone',True)
    box('tiled sala floor',(0,.20,0),(8.1,.12,6),'tile')
    for x in [-3.8,3.8]:
      for z in [-2.7,0,2.7]:
        box('column plinth',(x,.45,z),(.48,.38,.48),'stone',True)
        box('sala column',(x,2,z),(.21,3.2,.21),'ivory',True)
        box('capital',(x,3.5,z),(.4,.18,.4),'trim')
      box('sala beam',(x,3.65,0),(.22,.23,6.2),'wood')
    # Background hall is contextual, not a claimed replica of a named pagoda.
    box('vihear foundation',(0,.25,-8),(8,.6,5.2),'stone',True)
    box('vihear floor',(0,.57,-8),(7,.04,4.4),'tile')
    for x in [-3.5,3.5]:box('side wall',(x,2.15,-8),(.20,3.2,4.6),'ivory',True)
    box('rear wall',(0,2.15,-10.2),(7.2,3.2,.20),'ivory',True)
    for x in [-2.3,2.3]:box('entrance wall',(x,2.15,-5.8),(2.6,3.2,.20),'ivory',True)
    box('entrance lintel',(0,3.5,-5.8),(2,.5,.20),'ivory',True)
    for x in [-2.5,2.5]:
      box('door recess',(x,1.9,-5.68),(1.2,2.5,.06),'wood')
      for dx in [-.66,.66]:box('door frame',(x+dx,1.95,-5.6),(.10,2.6,.10),'trim')
      box('door lintel',(x,3.27,-5.6),(1.4,.12,.12),'trim')
    for x in [-1.05,1.05]:box('open doorway frame',(x,1.95,-5.65),(.10,2.8,.14),'trim')
    box('open doorway lintel',(0,3.32,-5.65),(2.2,.14,.14),'trim')
    buddha()
    roof('hall roof',0,4.15,-8,8.8,6)
    roof('upper roof',0,4.95,-8,5.5,5)
    for i in range(4):box('hall stair',(0,.06+i*.14,-4.75-i*.27),(2.6,.15,.32),'stone')
    for x in [-7,7]:
      lathe('memorial stupa',(x,0,-7),[(0,0),(.95,0),(.95,.22),(.72,.22),(.72,.55),(.5,.62),(.65,1),(.58,1.45),(.32,1.7),(.25,2),(.20,2.3),(.04,3),(0,3.1)],'ivory')
    for x in [-2,0,2]:
      box('woven visitor mat',(x,.28,1.35),(1.55,.035,1.9),'mat',True)
    current='roof';roof('sala roof',0,4.2,0,8.7,6.8)
    current='seating'
    box('monks platform',(-2.6,.38,-.65),(1.35,.22,3.4),'wood',True)
    for z in [-1.7,-.65,.4]:box('seating mat',(-2.6,.52,z),(1.15,.05,.86),'cloth',True)
    current='rice';tray((-.6,.29,.5),.65)
    for i in range(14):
      a=i*2.399;r=.18+.28*(i%3)/2
      sphere('rice ball',(-.6+math.cos(a)*r,.43+(i%2)*.025,.5+math.sin(a)*r),(.095,.08,.095))
    current='leaf'
    tray((.95,.29,.4),.44)
    lathe('folded banana leaf cone',(.95,.36,.4),[(.22,0),(.21,.05),(.015,.72),(0,.74)],'leaf')
    rod('leaf fold',(.74,.36,.4),(.95,1.10,.4),.007,'food')
    current='flags'
    rod('offering flag stem',(-.6,.4,.5),(-.6,1.55,.5),.008,'wood')
    # Paper silhouette inspired by inspected photo 3; no invented sacred lettering.
    vertices=[(-.68,1.54,.5),(-.53,1.54,.5),(-.43,1.39,.5),(-.52,1.4,.5),(-.45,.77,.5),(-.53,.84,.5),(-.59,1.27,.5),(-.64,.77,.5),(-.71,.83,.5),(-.68,1.35,.5),(-.77,1.38,.5)]
    mesh=bpy.data.meshes.new('paper silhouette');mesh.from_pydata([xyz(v) for v in vertices],[],[tuple(range(len(vertices)))]);mesh.update()
    o=bpy.data.objects.new('white paper offering flag',mesh);bpy.context.collection.objects.link(o);finish(o,'paper')
    current='incense'
    lathe('incense bowl',(0,.29,-.65),[(0,0),(.15,0),(.23,.10),(.21,.23),(.19,.22),(.18,.10),(0,.05)],'silver')
    for x in [-.05,0,.05]:rod('incense stick',(x,.4,-.65),(x,.97,-.65),.008,'incense')
    for x in [-.5,.5]:
      lathe('candle base',(x,.29,-.65),[(0,0),(.10,0),(.10,.05),(0,.05)],'trim')
      rod('candle',(x,.34,-.65),(x,.65,-.65),.025,'wax');sphere('candle flame',(x,.68,-.65),(.018,.05,.018),'flame')
    current='alms'
    for x in [-.7,.15,1]:
      lathe('alms bowl',(x,.29,.45),[(0,0),(.16,0),(.30,.16),(.32,.35),(.30,.39),(.28,.36),(.27,.17),(0,.06)],'bowl')
      sphere('cooked rice',(x,.60,.45),(.25,.065,.25),'rice')
    current='food'
    for x in [-.6,.6]:
      tray((x,.29,1.25),.35)
      for i in range(4):sphere('food offering',(x+(i%2-.5)*.2,.43,1.25+(i//2-.5)*.2),(.12,.08,.10),'food')
    current='receptacle'
    lathe('rice receiving bowl',(1.9,.28,.1),[(0,0),(.25,0),(.38,.22),(.4,.48),(.37,.48),(.35,.23),(0,.06)],'silver')
    # Merge by teaching group/material. Names and extras form the web interaction contract.
    for part,objects in groups.items():
      root=bpy.data.objects.new(part,None);bpy.context.collection.objects.link(root);root['study_part']=part
      batches={}
      for o in objects:batches.setdefault(o.data.materials[0].name,[]).append(o)
      for mat,items in batches.items():
        bpy.ops.object.select_all(action='DESELECT')
        for o in items:o.select_set(True)
        bpy.context.view_layer.objects.active=items[0]
        if len(items)>1:bpy.ops.object.join()
        o=items[0];o.name=part+'_'+mat;o.parent=root
    path=OUT/f'pchum-ben-{detail}.glb'
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',export_extras=True,export_yup=True,export_materials='EXPORT')
    meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
    triangles=0
    for o in meshes:o.data.calc_loop_triangles();triangles+=len(o.data.loop_triangles)
    return dict(bytes=path.stat().st_size,triangles=triangles,meshes=len(meshes),groups=list(groups))

if __name__ == '__main__':
    manifest={detail:build(detail) for detail in ['normal','ultra']}
    # Save an editable, lit preview with only the opening moment displayed.
    for o in bpy.context.scene.objects:
        if o.type=='MESH' and o.get('study_part') in ['roof','alms','food','receptacle']:
          o.hide_render=True;o.hide_set(True)
    world=bpy.context.scene.world;world.use_nodes=True
    world.node_tree.nodes['Background'].inputs['Color'].default_value=(.30,.36,.44,1)
    world.node_tree.nodes['Background'].inputs['Strength'].default_value=.65
    bpy.ops.object.light_add(type='AREA',location=xyz((2,10,5)));bpy.context.object.data.energy=1800;bpy.context.object.data.shape='DISK';bpy.context.object.data.size=9
    bpy.ops.object.camera_add(location=xyz((10,11,17)));cam=bpy.context.object
    cam.rotation_euler=(Vector(xyz((0,1,-2)))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=20
    scene=bpy.context.scene;scene.camera=cam;scene.render.engine='BLENDER_EEVEE';scene.render.resolution_x=1200;scene.render.resolution_y=850;scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG';scene.render.filepath=str(OUT/'blender-review.png');scene.view_settings.view_transform='AgX'
    bpy.context.preferences.filepaths.save_version=0
    for screen in bpy.data.screens:
        for area in screen.areas:
          if area.type=='VIEW_3D':
            area.spaces.active.region_3d.view_perspective='CAMERA'
            area.spaces.active.shading.type='MATERIAL'
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'pchum-ben-study.blend'))
    (OUT/'manifest.json').write_text(json.dumps(manifest,indent=2))
    bpy.ops.render.render(write_still=True)
    # A second Blender render makes the reference-guided small objects reviewable.
    cam.location=xyz((2.8,3.4,5));cam.rotation_euler=(Vector(xyz((0,.7,0)))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=4.4
    scene.render.filepath=str(OUT/'blender-objects-review.png');bpy.ops.render.render(write_still=True)
    cam.location=xyz((0,2.4,-6.5));cam.rotation_euler=(Vector(xyz((0,1.95,-9.05)))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=3.5
    bpy.ops.object.light_add(type='AREA',location=xyz((0,3.5,-7)));bpy.context.object.data.energy=140;bpy.context.object.data.size=2
    scene.render.filepath=str(OUT/'blender-hall-review.png');bpy.ops.render.render(write_still=True)
    print('PCHUM_BEN_BUILD',json.dumps(manifest))
