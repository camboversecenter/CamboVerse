"""Correct the landscape to green summit clearings and dense surrounding forest.

Blender --background --python scripts/build-preah-vihear-mountain.py
The v2 Blender originals remain untouched. Landform is not surveyed topography.
"""
import bpy
import math
import random
import json
from pathlib import Path
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'output/preah-vihear-review-v2'
OUT=ROOT/'output/preah-vihear-green-v4'
OUT.mkdir(parents=True,exist_ok=True)
ROWS=[(44,3),(40,3.8),(35,4.4),(30,5.7),(25,6.2),(18,6.5),(10,7),
      (5,7.5),(0,8),(-5,9.7),(-10,10.2),(-16,10),(-22,9.2),(-28,8.5),(-34,8.4),(-40,7.4)]
BASE=-20

def xyz(p): return (p[0],-p[2],p[1])

def height(z):
    points=[(44,-.4),(40,0),(32,2.5),(28,2.5),(7.5,4.4),(3.7,4.4),
            (-7.5,6),(-15,6),(-18,7),(-25,7),(-26,7.5),(-40,7.5)]
    for (a,ya),(b,yb) in zip(points,points[1:]):
        if b<=z<=a: return ya+(yb-ya)*(a-z)/(a-b)
    return points[0][1] if z>44 else points[-1][1]

def make_mesh(name,verts,faces,materials,indices):
    data=bpy.data.meshes.new(name)
    data.from_pydata([xyz(p) for p in verts],[],faces); data.update()
    obj=bpy.data.objects.new(name,data); bpy.context.collection.objects.link(obj)
    for mat in materials: data.materials.append(mat)
    for poly,index in zip(data.polygons,indices): poly.material_index=index
    return obj

def mountain():
    outline=[(-w,height(z)-.31,z) for z,w in ROWS]
    outline += [(w,height(z)-.31,z) for z,w in reversed(ROWS)]
    n=len(outline); rings=[]
    # Official aerial photographs show grassy summit clearings surrounded by
    # dense forest, not a continuous exposed rock wall around the complex.
    for band,(spread,drop) in enumerate([(0,0),(5,.03),(13,.30),(24,.75),(34,1)]):
        ring=[]
        for i,(x,y,z) in enumerate(outline):
            side=1 if x>0 else -1
            north=(z+40)/84
            flank=(.94+.06*math.sin(i*.7))
            xx=x+side*spread*flank
            zz=z+(north-.5)*spread*.75
            yy=y*(1-drop)+BASE*drop
            if band not in [0,4]: yy+=math.sin(i*1.9+band)*.55
            ring.append((xx,yy,zz))
        rings.append(ring)
    verts=[p for ring in rings for p in ring]; faces=[]; indices=[]; forest=[]
    for band in range(4):
        for i in range(n):
            j=(i+1)%n
            a,b,c,d=band*n+i,band*n+j,(band+1)*n+j,(band+1)*n+i
            for tri in [(a,b,c),(a,c,d)]:
                faces.append(tri)
                indices.append(0 if band==0 else 1)
                forest.append([verts[k] for k in tri])
    make_mesh('Mountain v4 | green summit and forest slopes',verts,faces,
        [bpy.data.materials['Dry plateau'],bpy.data.materials['Mountain ground']],indices)
    return forest

def add_tree(x,y,z,scale,ultra):
    # Reuse sphere topology and batch by material: dense canopy, few draw calls.
    def append(material,verts,faces):
        vv,ff=TREE_BATCH.setdefault(material,([],[])); base=len(vv)
        vv.extend(verts); ff.extend(tuple(base+i for i in face) for face in faces)
    seg=5
    trunk=[(x+math.cos(j*math.tau/seg)*r*scale,y+h*scale,z+math.sin(j*math.tau/seg)*r*scale)
           for r,h in [(.12,-.25),(.07,2.8)] for j in range(seg)]
    append('Bark',trunk,[(j,(j+1)%seg,(j+1)%seg+seg,j+seg) for j in range(seg)])
    color='Canopy' if int(abs(x*13+z*7))%3 else 'Canopy light'
    for i in range(2):
        a=i*2.4
        cx=x+math.sin(a)*.55*scale; cz=z+math.cos(a)*.5*scale
        verts=[(cx+v[0]*1.5*scale,y+(2.5+i*.35+v[2]*1.15)*scale,cz+v[1]*1.4*scale) for v in CROWN_VERTS]
        append(color,verts,CROWN_FACES)

def forest_on_surface(triangles,ultra):
    rng=random.Random(1224); positions=[]; candidates=[]
    # Same tree locations and sizes in both tiers; only mesh detail changes.
    for tri in triangles:
        a,b,c=[Vector(p) for p in tri]
        area=(b-a).cross(c-a).length/2
        for _ in range(max(2,int(area/4))):
            r=rng.random(); s=rng.random()
            if r+s>1: r=1-r; s=1-s
            p=a*r+b*s+c*(1-r-s)
            # Keep the northern approach and portal sightline open.
            if p.z>39 and abs(p.x)<4: continue
            candidates.append(p)
    rng.shuffle(candidates)
    for p in candidates:
        if len(positions)>=420: break
        if any((p.x-q[0])**2+(p.z-q[2])**2<7.0 for q in positions): continue
        size=rng.uniform(1.05,1.65)
        positions.append((p.x,p.y,p.z,size))
        add_tree(p.x,p.y-.08,p.z,size,ultra)
    return positions

def recalc():
    for obj in list(bpy.context.scene.objects):
        if obj.type!='MESH': continue
        bpy.ops.object.select_all(action='DESELECT'); obj.select_set(True)
        bpy.context.view_layer.objects.active=obj
        bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.mesh.normals_make_consistent(inside=False); bpy.ops.object.mode_set(mode='OBJECT')

def export(tier):
    source=OUT/('preah-vihear-'+tier+'.blend')
    bpy.context.preferences.filepaths.save_version=0
    bpy.ops.wm.save_as_mainfile(filepath=str(source))
    # Split mountain's material slots before batching all meshes by material.
    for obj in list(bpy.context.scene.objects):
        if obj.type!='MESH' or len(obj.data.materials)<=1: continue
        bpy.ops.object.select_all(action='DESELECT'); obj.select_set(True)
        bpy.context.view_layer.objects.active=obj
        bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.mesh.separate(type='MATERIAL'); bpy.ops.object.mode_set(mode='OBJECT')
    groups={}
    for obj in list(bpy.context.scene.objects):
        if obj.type=='MESH': groups.setdefault(obj.data.materials[0].name,[]).append(obj)
    for name,objects in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for obj in objects: obj.select_set(True)
        bpy.context.view_layer.objects.active=objects[0]
        if len(objects)>1: bpy.ops.object.join()
        objects[0].name='Batched | '+name
    bpy.ops.object.select_all(action='DESELECT'); count=0
    for obj in bpy.context.scene.objects:
        if obj.type=='MESH':
            obj.select_set(True); obj.data.calc_loop_triangles(); count+=len(obj.data.loop_triangles)
    dest=OUT/('preah-vihear-'+tier+'.glb')
    bpy.ops.export_scene.gltf(filepath=str(dest),export_format='GLB',use_selection=True,export_apply=True,export_yup=True)
    bpy.ops.wm.open_mainfile(filepath=str(source))
    return {'tier':tier,'triangles':count,'draws':len(groups),'bytes':dest.stat().st_size}

reports=[]
for tier in ['normal','ultra']:
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE/('preah-vihear-'+tier+'.blend')))
    # Preserve every approved temple part and the seven original summit trees.
    for obj in list(bpy.context.scene.objects):
        if obj.name.startswith('Ridge | cliff stratum'): bpy.data.objects.remove(obj,do_unlink=True)
    mat=bpy.data.materials.new('Mountain ground'); mat.diffuse_color=(.16,.25,.065,1)
    mat.use_nodes=True
    mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.16,.25,.065,1)
    mat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=1
    for name,color in [('Dry plateau',(.29,.40,.105,1)),('Canopy',(.105,.245,.055,1)),('Canopy light',(.19,.32,.075,1))]:
        material=bpy.data.materials.get(name) or bpy.data.materials.new(name)
        material.use_nodes=True; material.diffuse_color=color
        material.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=color
        material.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=1
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2 if tier=='ultra' else 1)
    template=bpy.context.object
    CROWN_VERTS=[tuple(v.co) for v in template.data.vertices]
    CROWN_FACES=[tuple(p.vertices) for p in template.data.polygons]
    bpy.data.objects.remove(template,do_unlink=True); TREE_BATCH={}
    triangles=mountain(); positions=forest_on_surface(triangles,tier=='ultra')
    for material,(verts,faces) in TREE_BATCH.items():
        obj=make_mesh('Mountain v4 | forest '+material,verts,faces,[bpy.data.materials[material]],[0]*len(faces))
        if material.startswith('Canopy'):
            for poly in obj.data.polygons: poly.use_smooth=True
    recalc()
    sc=bpy.context.scene
    cam=bpy.data.objects['Review 1 - full ridge']
    cam.location=xyz((70,64,82))
    cam.rotation_euler=(Vector(xyz((0,-4,0)))-cam.location).to_track_quat('-Z','Y').to_euler()
    cam.data.ortho_scale=145
    report=export(tier); report['newTrees']=len(positions); report['mountainBase']=BASE
    report['treePositions']=positions; reports.append(report)
    sc=bpy.context.scene; sc.cycles.samples=24
    sc.camera=bpy.data.objects['Review 1 - full ridge']
    sc.render.filepath=str(OUT/(tier+'-mountain.png')); bpy.ops.render.render(write_still=True)
    if tier=='ultra':
        sc.camera=bpy.data.objects['Review 3 - upper enclosure']
        sc.render.filepath=str(OUT/'ultra-sanctuary.png'); bpy.ops.render.render(write_still=True)
    sc.camera=bpy.data.objects['Review 1 - full ridge']
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/('preah-vihear-'+tier+'.blend')))
(OUT/'build-report.json').write_text(json.dumps(reports,indent=2))
print('MOUNTAIN_COMPLETE',json.dumps([{k:v for k,v in r.items() if k!='treePositions'} for r in reports]))
