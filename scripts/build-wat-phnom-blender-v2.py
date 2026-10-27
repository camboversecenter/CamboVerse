"""Reference-guided, illustrative Wat Phnom mesh for CamboVerse.

Creates an editable .blend and a self-contained glTF in public/models/local.
The original site model and its synthetic splat remain untouched.
Run with Blender 5.x in background mode: blender --background --python this-file
"""
import bpy
import math
import random
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "models" / "local"
OUT.mkdir(parents=True, exist_ok=True)

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
for material in list(bpy.data.materials):
    bpy.data.materials.remove(material)

def material(name, color, roughness=0.82, metallic=0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    node = mat.node_tree.nodes.get("Principled BSDF")
    node.inputs["Base Color"].default_value = (*color, 1)
    node.inputs["Roughness"].default_value = roughness
    node.inputs["Metallic"].default_value = metallic
    return mat

stone = material("warm aged stone", (0.56, 0.50, 0.41))
stair_stone = material("brick-red stair stone", (0.51, 0.22, 0.16))
plaster = material("warm ivory plaster", (0.82, 0.76, 0.63))
plaster_trim = material("ochre stucco trim", (0.69, 0.51, 0.30))
white = material("whitewashed stupa", (0.83, 0.82, 0.76))
white_shadow = material("stupa recess shadow", (0.69, 0.68, 0.63))
gold = material("gilded ornament", (0.78, 0.54, 0.16), 0.42, 0.42)
dark_gold = material("aged gilding", (0.50, 0.31, 0.09), 0.68, 0.2)
wood = material("dark carved doors", (0.19, 0.12, 0.09))
roof_edge = material("deep terracotta roof edge", (0.34, 0.13, 0.09))
eye_dark = material("guardian eye recess", (0.16, 0.12, 0.10))

# Original procedural colour texture: no photo imagery is reproduced.
image = bpy.data.images.new("hand-authored terracotta roof tiles", width=256, height=256)
pixels = []
noise = random.Random(1272)
for y in range(256):
    row = y // 24
    for x in range(256):
        offset = 12 if row % 2 else 0
        seam = (x + offset) % 32
        grout = (y % 24 < 2) or seam < 2
        variation = math.sin((x + offset) * 0.12) * 0.035 + noise.uniform(-0.018, 0.018)
        r, g, b = (0.42 + variation, 0.19 + variation * 0.6, 0.12 + variation * 0.5)
        if grout:
            r, g, b = r * 0.57, g * 0.6, b * 0.62
        pixels.extend((r, g, b, 1))
image.pixels[:] = pixels
image.pack()
roof = material("weathered terracotta tiles", (0.55, 0.26, 0.14))
nodes = roof.node_tree.nodes
tex = nodes.new("ShaderNodeTexImage")
tex.image = image
roof.node_tree.links.new(tex.outputs["Color"], nodes.get("Principled BSDF").inputs["Base Color"])

parts = {}
def to_blender(point):
    # Scene composition uses Three.js coordinates (Y up, +Z toward the
    # staircase). Blender's glTF exporter expects native Z-up coordinates.
    x, y, z = point
    return (x, -z, y)

def size_to_blender(size):
    width, height, depth = size
    return (width, depth, height)

def assign(obj, mat, part, name):
    obj.name = name
    obj.data.materials.append(mat)
    obj["study_part"] = part
    parts.setdefault(part, []).append(obj)
    return obj

def box(name, loc, scale, mat, part, bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=to_blender(loc))
    obj = bpy.context.object
    obj.dimensions = size_to_blender(scale)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    assign(obj, mat, part, name)
    if bevel:
        mod = obj.modifiers.new("softened masonry edges", "BEVEL")
        mod.width = bevel
        mod.segments = 1
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=mod.name)
        obj.modifiers.new("weighted corner normals", "WEIGHTED_NORMAL")
    return obj

def cylinder(name, loc, radius, depth, mat, part, vertices=16, radius_top=None):
    if radius_top is None:
        bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=to_blender(loc))
    else:
        bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=radius, radius2=radius_top, depth=depth, location=to_blender(loc))
    obj = assign(bpy.context.object, mat, part, name)
    for face in obj.data.polygons:
        face.use_smooth = len(face.vertices) == 4
    return obj

def sphere(name, loc, scale, mat, part, segments=12, rings=6):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=to_blender(loc))
    obj = bpy.context.object
    obj.scale = size_to_blender(scale)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    assign(obj, mat, part, name)
    for face in obj.data.polygons:
        face.use_smooth = True
    return obj

def tube(name, coords, radius, mat, part, resolution=2):
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 12
    curve.bevel_depth = radius
    curve.bevel_resolution = resolution
    spline = curve.splines.new("BEZIER")
    spline.bezier_points.add(len(coords) - 1)
    for point, coord in zip(spline.bezier_points, coords):
        point.co = to_blender(coord)
        point.handle_left_type = "AUTO"
        point.handle_right_type = "AUTO"
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    assign(obj, mat, part, name)
    return obj

def triangle(name, verts, mat, part):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata([to_blender(v) for v in verts], [], [(0, 1, 2)])
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return assign(obj, mat, part, name)

def roof_slope(name, x0, x1, z0, z1, y0, y1):
    # x0 = eave, x1 = ridge. Each roof half is a thin solid tile slab.
    thick = 0.13
    verts = [(x0, y0, z0), (x1, y1, z0), (x1, y1, z1), (x0, y0, z1),
             (x0, y0-thick, z0), (x1, y1-thick, z0), (x1, y1-thick, z1), (x0, y0-thick, z1)]
    faces = [(0,1,2,3), (7,6,5,4), (4,5,1,0), (3,2,6,7), (4,0,3,7), (1,5,6,2)]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata([to_blender(v) for v in verts], [], faces)
    mesh.update()
    uv = mesh.uv_layers.new()
    for polygon in mesh.polygons:
        for loop_index in polygon.loop_indices:
            vertex = mesh.vertices[mesh.loops[loop_index].vertex_index].co
            uv.data[loop_index].uv = (abs(vertex.x-x0)*1.6, abs(-vertex.y-z0)*1.5)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return assign(obj, roof if name.startswith("tiles") else roof_edge, "Vihara roof", name)

def roof_tier(width, depth, eave, ridge, z, level):
    x = width/2
    z0, z1 = z-depth/2, z+depth/2
    roof_slope(f"tiles left tier {level}", -x, 0, z0, z1, eave, ridge)
    roof_slope(f"tiles right tier {level}", x, 0, z0, z1, eave, ridge)
    for side in (-1,1):
        tube(f"gilt ridge lip {level} {side}", [(side*x,eave,z0),(side*x,eave,z1)], 0.045, gold, "Vihara roof")
    tube(f"roof crest {level}", [(0,ridge,z0),(0,ridge,z1)], 0.075, dark_gold, "Vihara roof")
    for front in (z0-0.02,z1+0.02):
        triangle(f"cream gable {level}", [(-x,eave-0.12,front),(x,eave-0.12,front),(0,ridge-0.1,front)], plaster_trim, "Vihara roof")
        triangle(f"gilded inset gable {level}", [(-x*0.78,eave+0.02,front + (0.018 if front>z else -0.018)),
                  (x*0.78,eave+0.02,front + (0.018 if front>z else -0.018)),
                  (0,ridge-0.24,front + (0.018 if front>z else -0.018))], gold, "Vihara roof")
        # Relief-like scrollwork and a finial silhouette, intentionally not a
        # copy of a specific sacred figure from an unlicensed photograph.
        for side in (-1,1):
            tube(f"gable scroll {level} {side}", [(0,ridge-0.32,front+0.04),
                 (side*x*0.27,eave+0.6,front+0.06),
                 (side*x*0.62,eave+0.22,front+0.07)], 0.035, dark_gold, "Vihara roof")
        tube(f"chofah {level}", [(0,ridge,front),(0,ridge+0.28,front+0.08),(0,ridge+0.65,front+0.22)], 0.08, gold, "Vihara roof")

# Terrace and raised sanctuary; main entrance is toward +Z.
box("aged terrace plinth", (0,0.20,0), (10.4,0.4,9.0), stone, "Terrace", 0.08)
box("light terrace paving", (0,0.46,0), (10.0,0.14,8.6), plaster, "Terrace", 0.03)
box("vihara foot", (0,0.82,-0.45), (6.2,0.60,4.9), stair_stone, "Vihara", 0.04)
box("sanctuary walls", (0,2.00,-0.55), (5.55,2.1,3.9), plaster, "Vihara", 0.07)
box("wall cornice", (0,3.08,-0.55), (5.8,0.17,4.15), gold, "Vihara")
box("porch floor", (0,0.89,1.82), (5.9,0.16,1.55), stone, "Vihara")
for x in (-2.36,-1.18,1.18,2.36):
    cylinder("tapered porch column", (x,2.00,2.10), 0.16, 2.12, plaster, "Vihara", 12, 0.13)
    cylinder("column foot", (x,1.02,2.10), 0.25, 0.16, plaster_trim, "Vihara", 12)
    cylinder("gold column collar", (x,3.00,2.10), 0.21, 0.13, gold, "Vihara", 12)
for side in (-1,1):
    box("dark recessed side window", (side*2.82,2.06,-0.55), (0.055,1.12,0.76), wood, "Vihara")
    box("gold window lintel", (side*2.85,2.66,-0.55), (0.08,0.11,0.93), gold, "Vihara")
for side in (-1,1):
    box("carved front door leaf", (side*0.47,1.85,1.47), (0.88,1.65,0.10), wood, "Vihara")
    for y in (1.32,1.80,2.28):
        box("door brass bar", (side*0.47,y,1.54), (0.66,0.035,0.02), dark_gold, "Vihara")
box("door surround lintel", (0,2.80,1.53), (2.05,0.14,0.15), gold, "Vihara")
roof_tier(6.65,5.20,3.25,4.48,-0.48,1)
roof_tier(5.25,4.15,4.03,5.02,-0.48,2)
roof_tier(3.80,3.05,4.73,5.47,-0.48,3)

# White stupa behind the vihara: a continuously curved bell with moulded rings,
# not the old stack of square blocks and a single cone.
sz = -4.35
box("stupa square podium", (0,0.91,sz), (3.5,0.86,3.5), white, "Stupa", 0.06)
box("stupa podium moulding", (0,1.39,sz), (3.65,0.16,3.65), white_shadow, "Stupa", 0.04)
profile = [(1.48,1.50),(1.48,1.85),(1.40,2.03),(1.28,2.18),(1.22,2.55),
           (1.23,2.94),(1.17,3.35),(1.08,3.66),(0.99,4.00),(0.93,4.35),
           (0.86,4.70),(0.79,5.05),(0.72,5.40),(0.63,5.75),(0.54,6.10),
           (0.45,6.45),(0.36,6.80),(0.28,7.15),(0.21,7.50),(0.15,7.90),
           (0.09,8.30),(0.02,8.72)]
verts=[]
segments=32
for radius,y in profile:
    for i in range(segments):
        a=2*math.pi*i/segments
        verts.append((radius*math.cos(a),y,sz+radius*math.sin(a)))
faces=[]
for row in range(len(profile)-1):
    for i in range(segments):
        j=(i+1)%segments
        faces.append((row*segments+i,row*segments+j,(row+1)*segments+j,(row+1)*segments+i))
mesh=bpy.data.meshes.new("bell and tapered spire")
mesh.from_pydata([to_blender(v) for v in verts],[],faces)
mesh.update()
obj=bpy.data.objects.new("bell and tapered spire",mesh)
bpy.context.collection.objects.link(obj)
assign(obj,white,"Stupa",obj.name)
for face in mesh.polygons: face.use_smooth=True
for radius,y in [(1.45,1.88),(1.32,2.15),(1.24,3.00),(1.12,3.55),(0.94,4.36),(0.80,5.06),(0.64,5.76),(0.46,6.46),(0.29,7.16)]:
    bpy.ops.mesh.primitive_torus_add(major_segments=32, minor_segments=6, location=to_blender((0,y,sz)), major_radius=radius, minor_radius=0.055)
    assign(bpy.context.object,white_shadow,"Stupa","white stucco moulding")
sphere("gilded stupa tip",(0,8.79,sz),(0.085,0.14,0.085),gold,"Stupa")

# Stone stairway descending the east-facing hill. Broad worn treads remain
# walkable; coils follow both balustrades continuously rather than box steps.
steps=24
for i in range(steps):
    z=4.42+i*0.80
    y=0.60-i*0.11
    box("warm-red stone tread",(0,y,z),(3.35,0.20,0.82),stair_stone,"Naga stair")
    box("worn tread nose",(0,y+0.10,z+0.36),(3.36,0.045,0.06),stone,"Naga stair")
for side in (-1,1):
    x=side*1.86
    tube("continuous naga balustrade",[(x,0.98,4.12),(x,0.75,6.5),(x,0.20,10.5),
         (x,-0.34,14.5),(x,-0.92,19.0),(x,-1.48,22.5),(x,-1.36,23.15)],0.16,white,"Naga stair",3)
    for i in range(0,steps,3):
        z=4.42+i*0.80
        y=0.60-i*0.11
        box("naga balustrade stone support",(x,y+0.22,z),(0.36,0.55,0.72),white,"Naga stair",0.03)
    # A restrained five-head fan conveys the ceremonial naga silhouette.
    for head in range(-2,3):
        hx=x+head*0.21
        hy=-1.26+0.22*(2-abs(head))
        sphere("naga hood lobe",(hx,hy,23.15),(0.19,0.34,0.11),white,"Naga stair")
        sphere("naga eye",(hx,hy+0.05,23.27),(0.035,0.035,0.02),eye_dark,"Naga stair",8,4)
    tube("naga crown sweep",[(x-0.55,-1.24,23.15),(x,-0.68,23.10),(x+0.55,-1.24,23.15)],0.055,gold,"Naga stair")

def lion(x):
    z=23.0
    box("lion base",(x,-2.04,z),(0.68,0.22,0.88),stone,"Guardians",0.04)
    sphere("seated lion torso",(x,-1.54,z),(0.30,0.54,0.34),white,"Guardians")
    sphere("guardian lion head",(x,-1.04,z+0.15),(0.29,0.29,0.25),white,"Guardians")
    sphere("lion muzzle",(x,-1.16,z+0.40),(0.22,0.13,0.13),white_shadow,"Guardians")
    for side in (-1,1):
        sphere("lion ear",(x+side*0.23,-0.88,z+0.10),(0.11,0.14,0.09),white,"Guardians",8,4)
        sphere("lion eye",(x+side*0.13,-1.00,z+0.34),(0.035,0.035,0.025),eye_dark,"Guardians",8,4)
        box("lion forepaw",(x+side*0.19,-1.86,z+0.29),(0.16,0.38,0.24),white,"Guardians",0.03)
for x in (-2.75,2.75): lion(x)

# Small secondary forms are kept modest and subordinate to the hall and stupa.
for side in (-1,1):
    x=side*3.85
    box("small terrace shrine",(x,1.10,-2.65),(1.12,1.1,1.15),plaster,"Shrines",0.035)
    cylinder("small shrine tier",(x,1.92,-2.65),0.80,0.40,gold,"Shrines",8,0.28)
    cylinder("small shrine finial",(x,2.45,-2.65),0.24,0.75,gold,"Shrines",8,0.02)

# Convert ornament curves, merge meshes by part/material for phone draw-call
# discipline, then parent the scene under one uniformly scaled root.
bpy.ops.object.select_all(action="DESELECT")
curves=[o for o in bpy.context.scene.objects if o.type=="CURVE"]
for obj in curves:
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active=obj
    bpy.ops.object.convert(target="MESH")
groups={}
for obj in list(bpy.context.scene.objects):
    if obj.type=="MESH":
        key=(obj.get("study_part","Other"),obj.data.materials[0].name if obj.data.materials else "")
        groups.setdefault(key,[]).append(obj)
for (part,mat),objects in groups.items():
    if len(objects)<2: continue
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects: obj.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    bpy.ops.object.join()
    objects[0].name=f"{part} — {mat}"
root=bpy.data.objects.new("Wat Phnom v2 · illustrative Blender study",None)
bpy.context.collection.objects.link(root)
root.scale=(0.5,0.5,0.5)
for obj in list(bpy.context.scene.objects):
    if obj.type=="MESH": obj.parent=root

# Save an editable native source before adding preview-only lights/camera.
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/"wat-phnom-v2.blend"))
bpy.ops.object.select_all(action="DESELECT")
root.select_set(True)
for obj in root.children: obj.select_set(True)
bpy.context.view_layer.objects.active=root
bpy.ops.export_scene.gltf(filepath=str(OUT/"wat-phnom-v2.glb"),export_format="GLB",use_selection=True,
    export_apply=False,export_materials="EXPORT",export_yup=True)

# Studio review render; no preview-only geometry is included in the .glb.
world=bpy.context.scene.world
world.color=(0.20,0.24,0.27)
world.use_nodes=True
world.node_tree.nodes["Background"].inputs["Color"].default_value=(0.20,0.25,0.28,1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value=0.8
bpy.ops.object.light_add(type="AREA",location=to_blender((5,8,9)))
bpy.context.object.data.energy=1450
bpy.context.object.data.shape="DISK"
bpy.context.object.data.size=8
bpy.ops.object.camera_add(location=to_blender((12,9,19)))
camera=bpy.context.object
direction=Vector(to_blender((0,1.35,3.1)))-camera.location
camera.rotation_euler=direction.to_track_quat("-Z","Y").to_euler()
camera.data.type="ORTHO"
camera.data.ortho_scale=17.5
scene=bpy.context.scene
scene.camera=camera
scene.render.engine="BLENDER_EEVEE"
scene.render.resolution_x=960
scene.render.resolution_y=960
scene.render.resolution_percentage=100
scene.render.image_settings.file_format="PNG"
scene.render.filepath=str(OUT/"wat-phnom-v2-review.png")
scene.view_settings.view_transform="AgX"
bpy.ops.render.render(write_still=True)
print("Wat Phnom v2:",len(root.children),"merged mesh groups; GLB",(OUT/"wat-phnom-v2.glb").stat().st_size,"bytes")
