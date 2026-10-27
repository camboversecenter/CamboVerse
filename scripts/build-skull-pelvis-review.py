"""Blender-only review gate: no app assets overwritten, no export/import yet.
Original schematic geometry; not clinically validated. Uses V2 geometry helpers.
"""
import bpy
import math
import importlib.util
from pathlib import Path
from mathutils import Vector

ROOT=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('anatomy_helpers',ROOT/'build-anatomy-room-v2.py')
h=importlib.util.module_from_spec(spec);spec.loader.exec_module(h);h.N=32
OUT=h.OUT

def apply(o,mod):
    bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
    bpy.ops.object.modifier_apply(modifier=mod.name)

def union(name,objects,voxel=.14):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:o.select_set(True)
    bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();o=objects[0];o.name=name
    mod=o.modifiers.new('Continuous bone surface','REMESH');mod.mode='VOXEL';mod.voxel_size=voxel;apply(o,mod)
    mod=o.modifiers.new('Sculpt smoothing','SMOOTH');mod.factor=.65;mod.iterations=12;apply(o,mod)
    for p in o.data.polygons:p.use_smooth=True
    return o

def subtract(o,cutter):
    mod=o.modifiers.new('Anatomical opening','BOOLEAN');mod.operation='DIFFERENCE';mod.solver='EXACT';mod.object=cutter;apply(o,mod)
    bpy.data.objects.remove(cutter,do_unlink=True)

def skull():
    bone=h.material('Bone ivory',(.63,.55,.42),.68);teeth=h.material('Enamel',(.78,.73,.61),.38)
    parts=[h.ellipsoid('Cranial vault',(0,15,-1.5),(7.1,8.6,8.8),bone),
           h.ellipsoid('Maxilla',(0,7.1,4.2),(4.1,2.0,2.4),bone,lambda x,y,z:(x*(.86-.14*y),y,z)),
           h.ellipsoid('Nasal bridge',(0,11,7),(1.1,3,1.4),bone)]
    for s in [-1,1]:
        parts.append(h.ellipsoid('Zygomatic bone',(s*5.0,9.1,4.9),(1.4,1.5,1.2),bone))
        parts.append(h.tube('Brow ridge',[(s*.6,13.3,6),(s*3,13.6,6.6),(s*5.3,12.5,5.1)],.32,bone))
        parts.append(h.tube('Zygomatic arch',[(s*5,9,6),(s*6.7,9,2),(s*6.4,10,-1.8)],.55,bone))
        parts.append(h.tube('Maxillary buttress',[(s*3.5,5.1,4.5),(s*3.7,7.2,4.5),(s*4.7,9,4.7)],.7,bone))
    parts.append(h.tube('Alveolar arch',[(3.8*math.cos(t),5.15,1.1+5.4*math.sin(t)) for t in [math.pi*i/40 for i in range(41)]],.62,bone,80))
    cranium=union('Skull - cranium and facial bones',parts,.12)
    for s in [-1,1]:
        subtract(cranium,h.ellipsoid('Orbit cutter',(s*3.15,10.8,7),(2.1,2.0,4.3),bone))
        subtract(cranium,h.ellipsoid('Temporal hollow',(s*5.6,8.5,1.3),(.8,1.6,2.0),bone))
    subtract(cranium,h.ellipsoid('Nasal aperture',(0,8.8,7.7),(1.12,2.25,3.1),bone,lambda x,y,z:(x*(.8-.25*y),y,z)))
    subtract(cranium,h.ellipsoid('Foramen magnum',(0,7,-3.5),(2.2,3,2.8),bone))
    jawpoints=[(4.7*math.cos(t),1.7+.25*abs(math.cos(t)),1+6.0*math.sin(t)) for t in [math.pi*i/40 for i in range(41)]]
    jaw=[h.tube('Mandibular body',jawpoints,1.05,bone,80)]
    for s in [-1,1]:
        jaw.append(h.tube('Mandibular ramus',[(s*4.7,1.8,1),(s*5.3,4,0),(s*5.1,7.5,-.6)],.86,bone))
        jaw.append(h.ellipsoid('Condylar process',(s*5.1,8,-.8),(1,.75,.8),bone))
        jaw.append(h.tube('Coronoid process',[(s*5.1,4,.7),(s*4.8,7,1.8)],.55,bone))
    union('Mandible',jaw,.10)
    for y,label in [(4.45,'Upper'),(3.05,'Lower')]:
        for i in range(14):
            t=.14+(math.pi-.28)*(i+.5)/14
            x=3.8*math.cos(t);z=1.1+5.4*math.sin(t)
            o=h.ellipsoid(label+' tooth '+str(i+1),(x,y,z),(.42,.65,.48),teeth)
            # Flatten incisal edge and reduce the rounded-bead appearance.
            for v in o.data.vertices:
                v.co.z=max(-.55,min(.55,v.co.z))

def wing(side,bone):
    # Curved fan from acetabular body to iliac crest: both faces have real depth.
    edge=[(2.1,-1,-4.2),(3,4,-5),(8,7,-4),(12,6,0),(14,3,3),(12,0,4),(10,-3,2)]
    samples=[]
    for i in range(len(edge)-1):
        a,b,c,d=[Vector(edge[k]) for k in [max(0,i-1),i,i+1,min(len(edge)-1,i+2)]]
        for j in range(8):
            t=j/8
            samples.append(.5*(2*b+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t))
    samples.append(Vector(edge[-1]));steps=len(samples);rings=20;verts=[];faces=[]
    for r in range(rings+1):
        t=r/rings
        for i,p in enumerate(samples):
            q=Vector((8,-7,0)).lerp(p,t)
            q.z-=3.4*math.sin(math.pi*t)*math.sin(math.pi*i/(steps-1))
            verts.append((side*q.x,q.y,q.z))
    for r in range(rings):
        for j in range(steps-1):
            a=r*steps+j;face=(a,a+1,a+1+steps,a+steps)
            faces.append(face if side>0 else tuple(reversed(face)))
    o=h.mesh('Iliac wing',verts,faces,bone)
    mod=o.modifiers.new('Cortical thickness','SOLIDIFY');mod.thickness=.85;apply(o,mod)
    return o

def pelvis():
    bone=h.material('Bone ivory',(.63,.55,.42),.68)
    for s in [-1,1]:
        parts=[wing(s,bone),h.ellipsoid('Acetabular body',(s*8,-7.6,1),(2.8,3.1,2.8),bone)]
        parts.append(h.tube('Ischiopubic ramus',[(s*8,-8,1),(s*8,-12,0),(s*6,-16,2),(s*2,-14,6),(s*.7,-10,6),(s*4,-8,5),(s*8,-8,1)],lambda t:.9+.3*math.sin(t*math.pi),bone,100))
        parts.append(h.ellipsoid('Ischial tuberosity',(s*6.6,-14,1.4),(1.6,1.8,1.5),bone))
        hip=union(('Left' if s>0 else 'Right')+' hip bone',parts,.13)
        subtract(hip,h.ellipsoid('Hip socket',(s*10,-7.5,2),(2.2,2.2,2.3),bone))
    sacrum=h.ellipsoid('Sacrum',(0,-3,-4),(3.6,7,2),bone,lambda x,y,z:(x*(.62+.36*y),y,z+.5*y*y))
    for i in range(4):
        for s in [-1,1]:subtract(sacrum,h.ellipsoid('Sacral foramen',(s*(1.7-i*.22),1-i*2.1,-3.4),(.46,.55,3),bone))
    h.tube('Coccyx',[(0,-9,-3),(0,-11,-1.8),(0,-12,-.6)],lambda t:.55-.3*t,bone)

def render_review(kind):
    scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE';scene.render.resolution_x=720;scene.render.resolution_y=800;scene.render.resolution_percentage=100
    scene.world=bpy.data.worlds.new('Review studio');scene.world.use_nodes=True
    scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.035,.05,.065,1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value=.6
    target=h.xyz((0,12 if kind=='skull' else -4,0));span=31 if kind=='skull' else 37
    for loc,power in [((-30,-40,45),26000),((35,-15,20),13000),((0,30,40),23000)]:
        bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=power;o.data.size=25
        o.rotation_euler=(target-o.location).to_track_quat('-Z','Y').to_euler()
    cameras=[]
    for name,offset in [('front',(0,-70,5)),('side',(70,-3,3)),('back',(0,70,5))]:
        bpy.ops.object.camera_add(location=target+Vector(offset));camera=bpy.context.object;camera.name=name+' review camera'
        camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=span;cameras.append(camera)
    scene.camera=cameras[0]
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type=='VIEW_3D':
                area.spaces.active.region_3d.view_location=target
                area.spaces.active.region_3d.view_distance=span*1.3
                area.spaces.active.region_3d.view_rotation=cameras[0].rotation_euler.to_quaternion()
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/f'{kind}-review-v3.blend'))
    for camera in cameras:
        scene.camera=camera;scene.render.filepath=str(OUT/f'{kind}-review-v3-{camera.name.split()[0]}.png');bpy.ops.render.render(write_still=True)

for kind,build in [('skull',skull),('pelvis',pelvis)]:
    bpy.ops.wm.read_factory_settings(use_empty=True);build();render_review(kind)
