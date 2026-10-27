"""Non-destructive review candidate. Not a medically validated anatomical atlas.
Run with Blender --background --python scripts/build-complete-organ-review.py.
Keeps live GLBs unchanged. Source reference: OpenStax A&P 2e chapter 23.
"""
import bpy, math, json, importlib.util
from pathlib import Path
from mathutils import Vector, Matrix

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/models/local'
spec=importlib.util.spec_from_file_location('h',Path(__file__).with_name('build-anatomy-room-v2.py'))
h=importlib.util.module_from_spec(spec);spec.loader.exec_module(h)
h.N=32
bpy.ops.wm.read_factory_settings(use_empty=True)

def load(asset, keep=lambda o:True):
    before=set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=str(OUT/asset))
    added=set(bpy.context.scene.objects)-before
    meshes=[]
    for o in added:
        if o.type=='MESH' and keep(o):
            if o.data.shape_keys:o.shape_key_clear()
            parent=o
            while not parent.get('anatomyPart') and parent.parent:parent=parent.parent
            if parent.get('anatomyPart'):o['anatomyPart']=parent['anatomyPart']
            world=o.matrix_world.copy();o.parent=None;o.matrix_world=world
            meshes.append(o)
    for o in added:
        if o not in meshes:bpy.data.objects.remove(o,do_unlink=True)
    return meshes

def fit(objects, diameter, at, part):
    points=[o.matrix_world@Vector(c) for o in objects for c in o.bound_box]
    lo=Vector(tuple(min(p[i] for p in points) for i in range(3)))
    hi=Vector(tuple(max(p[i] for p in points) for i in range(3)))
    scale=diameter/max(hi-lo);center=(hi+lo)/2
    for o in objects:
        world=o.matrix_world.copy()
        for v in o.data.vertices:v.co=(world@v.co-center)*scale+h.xyz(at)
        o.matrix_world.identity();o['anatomyPart']=part

viscera=load('lab-viscera-v3-ultra.glb')
for o in viscera:
    # Preserve IDs on imported multi-material primitives after detaching.
    if not o.get('anatomyPart'):
        o['anatomyPart']=o.name.removeprefix('part-').split('__')[0]
for o in list(viscera):
    if o.get('anatomyPart') in ['liver','stomach','small-intestine']:
        bpy.data.objects.remove(o,do_unlink=True)

liver=h.material('Review liver',(.30,.075,.06),.48)
gut=h.material('Review gastric and bowel tissue',(.57,.28,.23),.56)
# A broad asymmetric wedge, thinning towards the patient's left, with a flatter
# inferior surface. Shape improvement only: no claim of complete hepatic lobes.
o=h.ellipsoid('review-liver',(-4,18,0),(11,5.7,6),liver,
    lambda x,y,z:(x, (y if y>0 else y*.45)*(.80-.42*x)+.22*x,
                   z*(.82-.30*x)-.12*math.exp(-x*x*30)*max(0,-y)))
o['anatomyPart']='liver'
# Broader fundus and body, narrower distal antrum; separate from the oesophagus.
o=h.tube('review-stomach',[(3.5,23,-1),(6.5,22,0),(8,19,1),(8,15,2),
    (6,12,2),(2.5,12.5,1),(.5,14,0)],
    lambda t:.8+3.1*math.sin(math.pi*t)**.72,gut,96)
o['anatomyPart']='stomach'
# More occupied abdominal volume than V3, without a regular stacked sine wave.
path=[(.5,14,0),(-2,12,-1),(-4,9,-1),(-1,7,1),(4,6,2),(6,3,2),
      (2,2,3),(-4,4,3),(-6,1,3),(-2,-1,4),(4,0,4),(6,-3,3),
      (1,-4,3),(-5,-2,2),(-6,-5,2),(-1,-7,4),(4,-6,4),(5,-9,3),
      (0,-10,3),(-4,-8,2),(-5,-11,1),(-2,-12,1),(3,-11,0),
      (5,-7,-1),(2,-3,-1),(-3,-4,-1),(-6,-7,-1),(-8,-10,1)]
o=h.tube('review-small-intestine',path,1.05,gut,420);o['anatomyPart']='small-intestine'

heart=load('lab-heart-ultra.glb')
# This older asset uses a different authoring up-axis from the newer GLBs.
for o in heart:o.matrix_world=Matrix.Rotation(math.pi/2,4,'X')@o.matrix_world
bpy.context.view_layer.update()
fit(heart,14,(2.5,32,3),'heart')
# Fit lungs and airway together so the source bronchial junction is preserved.
chest=load('lab-lungs-ultra.glb')
fit(chest,34,(0,38,0),'lungs')
for o in chest:
    if any(p in o.name for p in ['part-trachea','part-bronchi','part-tree']):o['anatomyPart']='airways'
brain=load('lab-head-internal-v2-ultra.glb',lambda o:o.name.startswith('part-brain'))
fit(brain,16,(0,73,-1),'brain')

scene=bpy.context.scene
meshes=[o for o in scene.objects if o.type=='MESH']
parts=sorted(set(o.get('anatomyPart','UNASSIGNED') for o in meshes))
assert len(parts)==19 and 'UNASSIGNED' not in parts,parts
stats={'status':'review candidate; not imported into app','parts':parts,'meshes':len(meshes)}
for o in meshes:o.data.calc_loop_triangles()
stats['triangles']=sum(len(o.data.loop_triangles) for o in meshes)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=str(OUT/'complete-organs-review-v1.glb'),export_format='GLB',export_extras=True,export_animations=False)

scene.render.engine='BLENDER_EEVEE'
scene.render.resolution_x=620;scene.render.resolution_y=980;scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new('Review background');scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.035,.055,.075,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.5
target=h.xyz((0,28,0))
for pos,power in [((-65,-95,110),150000),((65,-40,40),85000),((0,65,100),140000)]:
    bpy.ops.object.light_add(type='AREA',location=pos);o=bpy.context.object
    o.data.energy=power;o.data.size=65;o.rotation_euler=(target-o.location).to_track_quat('-Z','Y').to_euler()
for name,offset in [('front',(0,-170,0)),('side',(170,0,0)),('back',(0,170,0))]:
    bpy.ops.object.camera_add(location=target+Vector(offset));camera=bpy.context.object
    camera.name='Review '+name;camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
    camera.data.type='ORTHO';camera.data.ortho_scale=115;scene.camera=camera
    scene.render.filepath=str(OUT/f'complete-organs-review-v1-{name}.png')
    bpy.ops.render.render(write_still=True)
scene.camera=bpy.data.objects['Review front']
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'complete-organs-review-v1.blend'))
(OUT/'complete-organs-review-v1-stats.json').write_text(json.dumps(stats,indent=2))
print(stats)
