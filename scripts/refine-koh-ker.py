"""Reference-guided Prasat Prang refinement. Illustrative, not a surveyed replica.
Blender --background --python scripts/refine-koh-ker.py
"""
import bpy, math, random, json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'output/koh-ker-refined-v2'; OUT.mkdir(parents=True,exist_ok=True)

def xyz(p): return (p[0],-p[2],p[1])
def material(name,color,stone=False):
    m=bpy.data.materials.new(name); m.use_nodes=True; m.diffuse_color=(*color,1)
    p=m.node_tree.nodes['Principled BSDF']; p.inputs['Base Color'].default_value=(*color,1)
    p.inputs['Roughness'].default_value=.96
    if stone:
        im=bpy.data.images.new(name+' mineral weathering',width=128,height=128)
        rr=random.Random(28); pixels=[]
        for y in range(128):
            for x in range(128):
                patches=math.sin(x*.17+math.sin(y*.06)*3)*math.cos(y*.09)
                stain=.82 + .16*patches
                grain=rr.uniform(-.025,.025)
                pixels.extend((*[max(.03,c*stain+grain) for c in color],1))
        im.pixels[:]=pixels; im.pack()
        tex=m.node_tree.nodes.new('ShaderNodeTexImage'); tex.image=im
        m.node_tree.links.new(tex.outputs['Color'],p.inputs['Base Color'])
    return m

def add(name,mat,verts,faces,smooth=False):
    key=(name,mat.name,smooth); vv,ff=BATCH.setdefault(key,([],[])); offset=len(vv)
    vv.extend(verts); ff.extend(tuple(offset+i for i in f) for f in faces)

def box(name,p,size,mat,angle=0):
    x,y,z=p; w,h,d=[s/2 for s in size]
    verts=[]
    for a,b,c in [(-w,-h,-d),(w,-h,-d),(w,-h,d),(-w,-h,d),(-w,h,-d),(w,h,-d),(w,h,d),(-w,h,d)]:
        verts.append((x+a*math.cos(angle)+c*math.sin(angle),y+b,z-a*math.sin(angle)+c*math.cos(angle)))
    add(name,mat,verts,[(0,1,2,3),(7,6,5,4),(4,5,1,0),(6,7,3,2),(4,0,3,7),(1,5,6,2)])

def crown(name,p,size,mat):
    verts=[(p[0]+v[0]*size[0],p[1]+v[2]*size[1],p[2]+v[1]*size[2]) for v in SPHERE_V]
    add(name,mat,verts,SPHERE_F,True)

def pyramid():
    levels=[]; y=.08
    for level in range(7):
        w=7.2-level*.80; h=.56 if level<6 else .67
        label='Tier %d'%(level+1)
        if level<6:
            # Reserve the front axial stair channel instead of burying treads.
            for s in [-1,1]:
                box(label,(s*(w+.72)/4,y+h/2,0),((w-.72)/2,h-.02,w-.06),STONE[0])
            box(label,(0,y+h/2,-w/4),(.72,h-.02,w/2),STONE[0])
        else:
            # Real open central summit socket, not a new roof or sealed slab.
            for s in [-1,1]:
                box(label,(s*(w/2-.25),y+h/2,0),(.50,h,w),STONE[0])
                if s<0: box(label,(0,y+h/2,s*(w/2-.25)),(w-1,h,.50),STONE[0])
                else:
                    for sign in [-1,1]:
                        box(label,(sign*((w-1)+.72)/4,y+h/2,w/2-.25),(((w-1)-.72)/2,h,.50),STONE[0])
        rows=5 if ULTRA else 3; cols=max(5,round(w/(.24 if ULTRA else .42)))
        for row in range(rows):
            count=cols+(row%2); bw=w/count
            for j in range(count):
                a=-w/2+(j+.5)*bw
                for side in [-1,1]:
                    m=STONE[RNG.randrange(4)]; yy=y+(row+.5)*h/rows
                    # Small irregularities break mechanical stacked-box edges.
                    depth=.09+RNG.uniform(-.008,.008)
                    if side<0 or abs(a)-bw/2>=.36:
                        box(label,(a,yy,side*w/2),(bw-.008,h/rows-.007,depth),m)
                    box(label,(side*w/2,yy,a),(depth,h/rows-.007,bw-.008),m)
        for s in [-1,1]:
            for yy,extra,hh in [(y+.035,.08,.055),(y+h-.045,.11,.07)]:
                if s<0: box(label,(0,yy,s*w/2),(w+extra,hh,.15),STONE[1])
                else:
                    for sign in [-1,1]:
                        box(label,(sign*(w+extra+.72)/4,yy,w/2),((w+extra-.72)/2,hh,.15),STONE[1])
                box(label,(s*w/2,yy,0),(.15,hh,w+extra),STONE[1])
        # Grass grows intermittently on the horizontal ledges, not solid green walls.
        rr=random.Random(100+level)
        for i in range(20 if ULTRA else 12):
            side=i%4; a=rr.uniform(-w/2+.15,w/2-.15)
            p=(a,y+h+.012,(w/2-.13)*(1 if side==0 else -1)) if side<2 else ((w/2-.13)*(1 if side==2 else -1),y+h+.012,a)
            if p[2]>0 and abs(p[0])<.55: continue
            box('Ledge vegetation',p,(rr.uniform(.13,.35),.018,.10),MOSS,rr.uniform(-.2,.2))
        levels.append({'tier':level+1,'width':w,'bottom':y,'top':y+h})
        y+=h
    # Slightly projecting continuous steep stone stair, with a few worn treads.
    for i in range(64):
        top=.08+(y-.08)*(i+1)/64; z=3.98-(top-.08)*2.71/(y-.08)
        box('Ancient axial stair',(0,top/2,z),(.66,top,.065),STONE[(i//4)%4])
    # Surviving corners around the open top, never an invented complete shrine.
    for x in [-.93,.93]:
        for z in [-.93,.93]:
            box('Summit remnants',(x,y+.07,z),(.25,.14,.25),STONE[1])
    rr=random.Random(19)
    for i in range(16 if ULTRA else 8):
        a=rr.random()*math.tau; r=rr.uniform(.78,.97)
        box('Summit remnants',(math.sin(a)*r,y+.035,math.cos(a)*r),(.16,.07,.12),STONE[i%4],a)
    return levels

def landscape():
    seg=64; verts=[(0,.015,0)]
    for i in range(seg):
        a=i*math.tau/seg; r=11.5+math.sin(a*5)*.45
        verts.append((math.cos(a)*r,0,math.sin(a)*r))
    add('Forest floor',EARTH,verts,[(0,i+1,(i+1)%seg+1) for i in range(seg)])
    box('Arrival path',(0,.026,6.7),(1,.02,6),PATH)
    # A clear perimeter walk separates the monument from forest planting.
    for side in [-1,1]:
        box('Perimeter path',(side*4.35,.028,0),(.3,.02,8.8),PATH)
        box('Perimeter path',(0,.028,side*4.35),(8.8,.02,.3),PATH)
    rr=random.Random(1667); trees=[]
    for _ in range(1200):
        x=rr.uniform(-11,11); z=rr.uniform(-11,11)
        if x*x+z*z>118 or max(abs(x),abs(z))<5.25 or (z>3 and abs(x)<2.4): continue
        if any((x-a)**2+(z-b)**2<.72 for a,b,_ in trees): continue
        s=rr.uniform(.75,1.20); trees.append((x,z,s))
        if len(trees)==145: break
    for i,(x,z,s) in enumerate(trees):
        box('Forest trunks',(x,.85*s,z),(.10*s,1.7*s,.10*s),BARK)
        for j in range(3):
            a=j*2.4+i
            crown('Forest canopy',(x+math.sin(a)*.29*s,(1.55+j*.16)*s,z+math.cos(a)*.29*s),
                   (.64*s,.52*s,.63*s),LEAVES[i%2])
    # Scattered collapsed stones remain outside the original stair sightline.
    for i in range(22 if ULTRA else 12):
        x=rr.choice([-1,1])*rr.uniform(.7,2.8); z=rr.uniform(3.8,4.15)
        box('Ground rubble',(x,.08,z),(.18,.12,.16),STONE[i%4],rr.random()*3)
    return trees

def flush():
    for (name,mat,smooth),(verts,faces) in BATCH.items():
        data=bpy.data.meshes.new(name); data.from_pydata([xyz(p) for p in verts],[],faces); data.update()
        obj=bpy.data.objects.new(name+' | '+mat,data); bpy.context.collection.objects.link(obj)
        data.materials.append(bpy.data.materials[mat]); obj['component']=name
        uv=data.uv_layers.new(name='original material UV')
        for p in data.polygons:
            p.use_smooth=smooth
            for li in p.loop_indices:
                v=data.vertices[data.loops[li].vertex_index].co; n=p.normal
                uv.data[li].uv=(v.x*.18,v.y*.18) if abs(n.z)>.7 else (v.x*.18,v.z*.18) if abs(n.y)>.7 else (v.y*.18,v.z*.18)
        bpy.ops.object.select_all(action='DESELECT'); obj.select_set(True); bpy.context.view_layer.objects.active=obj
        bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.mesh.normals_make_consistent(inside=False); bpy.ops.object.mode_set(mode='OBJECT')

def stage(tier):
    sc=bpy.context.scene; sc.world=bpy.data.worlds.new('Review daylight'); sc.world.use_nodes=True
    sc.world.node_tree.nodes['Background'].inputs[0].default_value=(.44,.52,.59,1)
    sc.world.node_tree.nodes['Background'].inputs[1].default_value=.65
    bpy.ops.object.light_add(type='SUN'); bpy.context.object.rotation_euler=(.45,-.3,-.6); bpy.context.object.data.energy=2
    bpy.context.object.data.angle=.2
    sc.render.engine='CYCLES'; sc.cycles.samples=24; sc.cycles.use_denoising=True
    sc.render.resolution_x=1400; sc.render.resolution_y=1050; sc.render.resolution_percentage=100
    sc.view_settings.view_transform='AgX'; sc.view_settings.exposure=.5
    cameras=[('overview',(13,12,17),(0,1,0),25),('pyramid',(8,7.5,10),(0,2,0),11),('summit',(3.4,6,4),(0,3.8,0),5.5)]
    for name,p,target,scale in cameras:
        bpy.ops.object.camera_add(location=xyz(p)); cam=bpy.context.object; cam.name='Review '+name
        cam.rotation_euler=(Vector(xyz(target))-cam.location).to_track_quat('-Z','Y').to_euler()
        cam.data.type='ORTHO'; cam.data.ortho_scale=scale; sc.camera=cam
        if tier=='normal' and name!='pyramid': continue
        sc.render.filepath=str(OUT/(tier+'-'+name+'.png')); bpy.ops.render.render(write_still=True)
    sc.camera=bpy.data.objects['Review pyramid']
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/('koh-ker-'+tier+'.blend')))

reports=[]
for ULTRA in [False,True]:
    tier='ultra' if ULTRA else 'normal'; bpy.ops.wm.read_factory_settings(use_empty=True)
    BATCH={}; RNG=random.Random(1667)
    STONE=[material('Weathered sandstone '+str(i),c,True) for i,c in enumerate([(.36,.35,.30),(.46,.44,.37),(.29,.30,.265),(.41,.395,.33)])]
    MOSS=material('Ledge plants',(.17,.25,.075)); EARTH=material('Grassy clearing',(.28,.35,.14))
    PATH=material('Earth paths',(.40,.32,.21)); BARK=material('Bark',(.18,.14,.09))
    LEAVES=[material('Canopy '+str(i),c) for i,c in enumerate([(.12,.25,.07),(.21,.32,.09)])]
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2 if ULTRA else 1)
    template=bpy.context.object; SPHERE_V=[tuple(v.co) for v in template.data.vertices]
    SPHERE_F=[tuple(p.vertices) for p in template.data.polygons]; bpy.data.objects.remove(template,do_unlink=True)
    levels=pyramid(); trees=landscape(); flush()
    source=OUT/('koh-ker-'+tier+'.blend'); bpy.context.preferences.filepaths.save_version=0
    bpy.ops.wm.save_as_mainfile(filepath=str(source))
    groups={}
    for obj in list(bpy.context.scene.objects): groups.setdefault(obj.data.materials[0].name,[]).append(obj)
    for name,objects in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for obj in objects: obj.select_set(True)
        bpy.context.view_layer.objects.active=objects[0]
        if len(objects)>1: bpy.ops.object.join()
        objects[0].name='Batched | '+name
    bpy.ops.object.select_all(action='SELECT'); triangles=0
    for obj in bpy.context.scene.objects: obj.data.calc_loop_triangles(); triangles+=len(obj.data.loop_triangles)
    file=OUT/('koh-ker-'+tier+'.glb')
    bpy.ops.export_scene.gltf(filepath=str(file),export_format='GLB',use_selection=True,export_yup=True)
    reports.append({'tier':tier,'triangles':triangles,'draws':len(groups),'bytes':file.stat().st_size,'levels':levels,'trees':trees})
    bpy.ops.wm.open_mainfile(filepath=str(source)); stage(tier)
(OUT/'build-report.json').write_text(json.dumps(reports,indent=2))
print('KOH_KER_COMPLETE',json.dumps([{k:v for k,v in r.items() if k not in ['trees','levels']} for r in reports]))
