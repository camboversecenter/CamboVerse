"""Original schematic lung/airway pilot. Run in a fresh Blender process."""
from pathlib import Path
import math
import json
import bpy
from mathutils import Vector

OUT = Path(__file__).resolve().parent.parent / 'public/models/local'
OUT.mkdir(parents=True, exist_ok=True)


def fissures(x, y, z):
    oblique = y - (1.0 + .65*(abs(x)-5) - 1.15*z)
    horizontal = y - (3.3-.12*z)
    return oblique, horizontal


def material(name, color, vertex=False):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = .43 if vertex else .58
    if vertex:
        attr = mat.node_tree.nodes.new('ShaderNodeVertexColor')
        attr.layer_name = 'Color'
        mat.node_tree.links.new(attr.outputs['Color'], bsdf.inputs['Base Color'])
    return mat


def mesh(name, verts, faces, mat, tissue=False):
    if name == 'part-tree':
        fitted = []
        for x,y,z in verts:
            if y>6:
                side = -1 if x<0 else 1
                theta = math.acos(max(-1,min(1,(y-2)/9)))
                t = (1-math.cos(theta))/2
                center = 3.6+3.2*t**.7
                x += side*(center-6)*min(1,(y-6)/2)
                width = (4.8 if side<0 else 4.3)*math.sin(theta*.68)
                depth = 4.1*math.sin(theta*.68)
                dx = abs(x)-center
                extent = math.hypot(dx/(width*(.76 if dx<0 else 1)),z/depth)
                if extent>.65:
                    dx *= .65/extent
                    z *= .65/extent
                x = side*(center+dx)
            fitted.append((x,y,z))
        verts = fitted
    data = bpy.data.meshes.new(name)
    data.from_pydata([(x, -z, y) for x, y, z in verts], [], faces)
    data.materials.append(mat)
    data.update()
    for poly in data.polygons:
        poly.use_smooth = True
    if tissue:
        colors = data.color_attributes.new(name='Color', type='FLOAT_COLOR', domain='POINT')
        for color, (x,y,z) in zip(colors.data, verts):
            noise = (.024 * math.sin(x*2.1+y*1.7)*math.sin(z*2.3-y*1.3)
                + .012*math.sin(x*9+y*7+z*5)*math.sin(z*11-y*8))
            # Darker crease traces distinguish the schematic lobes.
            oblique, horizontal = fissures(x,y,z)
            crease = abs(oblique)
            if x < 0 and z > 0 and oblique > 0:
                crease = min(crease, abs(horizontal))
            shade = 1-.48*math.exp(-(crease/.32)**2)
            color.color = ((.50+noise)*shade, (.19+noise*.7)*shade, (.155+noise*.6)*shade, 1)
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    if name != 'part-trachea':
        obj.shape_key_add(name='Basis')
        breath = obj.shape_key_add(name='Breath')
        for point in breath.data:
            # Deformation increases below the carina; the top airway stays still.
            weight = max(0, min(1, (7-point.co.z)/12))
            point.co.x *= 1+.035*weight
            point.co.y *= 1+.055*weight
            point.co.z -= .25*weight
    return obj


def tube(verts, faces, points, radii, sides):
    start = len(verts)
    for i, (co, radius) in enumerate(zip(points, radii)):
        direction = Vector(points[min(i+1,len(points)-1)]) - Vector(points[max(i-1,0)])
        direction.normalize()
        axis = Vector((0,0,1)) if abs(direction.z)<.9 else Vector((1,0,0))
        a = direction.cross(axis).normalized()
        b = direction.cross(a).normalized()
        for j in range(sides):
            point = Vector(co) + radius*(a*math.cos(j*math.tau/sides)+b*math.sin(j*math.tau/sides))
            verts.append(tuple(point))
    for i in range(len(points)-1):
        for j in range(sides):
            a = start+i*sides+j
            b = start+i*sides+(j+1)%sides
            faces.append((a,b,b+sides,a+sides))


def build(ultra):
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for blocks in (bpy.data.meshes,bpy.data.materials):
        for block in list(blocks):
            if not block.users:
                blocks.remove(block)
    skin = material('lung-tissue',(.58,.24,.22),True)
    airway = material('airway',(.72,.57,.37))
    objects = []
    rows, seg = (96,88) if ultra else (40,40)
    for side, label in [(-1,'right-lung'),(1,'left-lung')]:
        verts = []
        for i in range(rows+1):
            theta = .0001+(math.pi-.0002)*i/rows
            t = (1-math.cos(theta))/2
            base_y = 2+9*math.cos(theta)
            width = (4.8 if side<0 else 4.3)*math.sin(theta*.68)
            center_x = 3.6+3.2*t**.7
            for j in range(seg+1):
                phi = j*math.tau/seg
                c, s = math.cos(phi), math.sin(phi)
                # Leaning apex, flattened mediastinal side and broad rib-facing wall.
                x = center_x+width*c*(.76 if c<0 else 1)
                z = 4.1*math.sin(theta*.68)*s
                y = base_y + t**7*(1.8*max(0,-c)+.65*max(0,s))
                if side>0:
                    notch = math.exp(-((y-.8)/3.1)**2)*max(0,-c)**2*max(0,s)**.5
                    x += 3.4*notch
                    z -= .85*notch
                oblique, horizontal = fissures(side*x,y,z)
                distance = abs(oblique)
                if side<0 and z>0 and oblique>0:
                    distance = min(distance,abs(horizontal))
                groove = .20*math.exp(-(distance/.32)**2)
                x -= groove*c
                z -= groove*s
                verts.append((side*x,y,z))
        groups = {}
        for i in range(rows):
            for j in range(seg):
                a = i*(seg+1)+j
                face = (a,a+seg+1,a+seg+2,a+1)
                if side>0:
                    face = tuple(reversed(face))
                x,y,z = [sum(verts[k][axis] for k in face)/4 for axis in range(3)]
                oblique, horizontal = fissures(x,y,z)
                lobe = 'upper' if oblique>0 else 'lower'
                if side<0 and oblique>0 and horizontal<0 and z>0:
                    lobe = 'middle'
                name = f'part-{label}-{lobe}'
                if side>0 and x<6.5 and z>.8 and -1.5<y<3:
                    name = 'part-notch'
                groups.setdefault(name,[]).append(face)
        # Broad, shallow concave basal surface rather than a pointed lower pole.
        center = len(verts)
        verts.append((side*6.8,-5.3,0))
        for j in range(seg):
            face = (rows*(seg+1)+j, rows*(seg+1)+j+1, center)
            if side>0:
                face = tuple(reversed(face))
            groups.setdefault(f'part-{label}-lower',[]).append(face)
        for name, faces in groups.items():
            used = sorted({i for face in faces for i in face})
            remap = {old:new for new,old in enumerate(used)}
            objects.append(mesh(name,[verts[i] for i in used],[[remap[i] for i in face] for face in faces],skin,True))
    verts, faces = [], []
    steps = 100 if ultra else 60
    points = [(0,15-8*i/steps,0) for i in range(steps+1)]
    radii = [.78+.11*(.5+.5*math.cos(i/steps*math.tau*11))**4 for i in range(steps+1)]
    tube(verts,faces,points,radii,20 if ultra else 10)
    # Recessed lumen and annular opening at the top, no sealed solid cylinder.
    sides = 20 if ultra else 10
    start = len(verts)
    tube(verts,faces,[(0,15,0),(0,14,0)],[.56,.56],sides)
    for j in range(sides):
        faces.append((j,(j+1)%sides,start+(j+1)%sides,start+j))
    objects.append(mesh('part-trachea',verts,faces,airway))
    verts,faces = [],[]
    tube(verts,faces,[(0,7,0),(-1.5,5.6,0),(-3.8,4.7,0)],[.7,.63,.54],sides)
    tube(verts,faces,[(0,7,0),(2,6.1,0),(4.1,4.8,0)],[.6,.52,.46],sides)
    objects.append(mesh('part-bronchi',verts,faces,airway))
    verts,faces = [],[]
    def branch(start,end,radius,depth,seed):
        tube(verts,faces,[start,tuple((Vector(start)+Vector(end))*.5),end],[radius,radius*.82,radius*.64],8 if ultra else 5)
        if depth<=0:
            return
        length = 2.3*(.7**((4 if ultra else 3)-depth))
        direction = (Vector(end)-Vector(start)).normalized()
        axis = direction.cross(Vector((0,0,1))).normalized()
        tangent = direction.cross(axis).normalized()
        spread = axis*math.cos(seed*1.7)+tangent*math.sin(seed*1.7)
        for sign in [-1,1]:
            x,y,z = end
            child_direction = (direction*.82+spread*sign*.57).normalized()
            target = Vector(end)+child_direction*length*(1+sign*.12)
            target=(max(-9,min(9,target.x)),max(-5.7,min(9.4,target.y)),max(-2.8,min(2.8,target.z)))
            tx,ty,tz = target
            side = -1 if x<0 else 1
            theta = math.acos(max(-1,min(1,(ty-2)/9)))
            width = (4.35 if side<0 else 3.85)*math.sin(theta*.68)
            depth_radius = 3.7*math.sin(theta*.68)
            dx = tx-side*6
            extent = math.hypot(dx/width,tz/depth_radius)
            if extent>.72:
                dx *= .72/extent
                tz *= .72/extent
            target=(side*6+dx,ty,tz)
            branch(end,target,radius*.62,depth-1,seed+sign*.9)
    for side in [-1,1]:
        root = (side*(3.8 if side<0 else 4.1),4.7,0)
        for n,target in enumerate([(side*6.2,8,0),(side*7.1,2.5,1.3),(side*6.2,.3,-1.0)]):
            branch(root,target,.4,4 if ultra else 3,n+side*.5)
    objects.append(mesh('part-tree',verts,faces,airway))
    return objects


stats = {}
for tier in ['normal','ultra']:
    objects = build(tier=='ultra')
    bpy.ops.object.select_all(action='DESELECT')
    triangles = 0
    for obj in objects:
        obj.select_set(True)
        obj.data.calc_loop_triangles()
        triangles += len(obj.data.loop_triangles)
    path = OUT/f'lab-lungs-{tier}.glb'
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_yup=True,export_morph=True,export_animations=False)
    stats[tier]={'triangles':triangles,'bytes':path.stat().st_size,'meshes':len(objects)}
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'lab-lungs-pilot.blend'))
(OUT/'lab-lungs-stats.json').write_text(json.dumps(stats,indent=2))
print(json.dumps(stats,indent=2))
