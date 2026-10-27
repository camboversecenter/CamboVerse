"""Replace v2's shallow, disconnected face tiles with closed sculpted reliefs.

Blender-only review. Reads v2, writes a DIFFERENT .blend; never exports a GLB.
Carving is an original, approximate interpretation of photographs, not a scan.
"""
import argparse
import bisect
import json
import math
import sys
from pathlib import Path

import bmesh
import bpy
from mathutils import Matrix, Vector
from mathutils.noise import noise

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/models/local/banteay-chhmar-review-v3'
SOURCE = ROOT / 'public/models/local/banteay-chhmar-review-v2/banteay-chhmar-review-v2.blend'
parser = argparse.ArgumentParser()
parser.add_argument('--draft', action='store_true', help='Only render the south face, at reduced resolution')
parser.add_argument('--no-render', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
scene = bpy.context.scene
old = [o for o in scene.objects if o.name.startswith('Face relief')]
assert len(old) == 16, 'Unexpected v2 source: refuse to change an unknown scene'
for obj in old:
    bpy.data.objects.remove(obj, do_unlink=True)

faces_collection = bpy.data.collections.new('V3 • carved faces • editable closed meshes')
scene.collection.children.link(faces_collection)


def stone_material():
    mat = bpy.data.materials.new('V3 carved sandstone • restrained grain')
    mat.use_nodes = True
    mat.diffuse_color = (.37, .36, .295, 1)
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    bs = nodes.get('Principled BSDF')
    bs.inputs['Roughness'].default_value = .88
    geo = nodes.new('ShaderNodeNewGeometry')
    tex = nodes.new('ShaderNodeTexNoise')
    tex.inputs['Scale'].default_value = 2.5
    tex.inputs['Detail'].default_value = 4
    links.new(geo.outputs['Position'], tex.inputs['Vector'])
    ramp = nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].position = .18
    ramp.color_ramp.elements[0].color = (.19, .205, .155, 1)
    ramp.color_ramp.elements[1].position = .82
    ramp.color_ramp.elements[1].color = (.47, .455, .365, 1)
    links.new(tex.outputs['Fac'], ramp.inputs[0])
    links.new(ramp.outputs['Color'], bs.inputs['Base Color'])
    grain = nodes.new('ShaderNodeTexNoise')
    grain.inputs['Scale'].default_value = 94
    grain.inputs['Detail'].default_value = 3
    links.new(geo.outputs['Position'], grain.inputs['Vector'])
    bump = nodes.new('ShaderNodeBump')
    bump.inputs['Distance'].default_value = .026
    bump.inputs['Strength'].default_value = .34
    links.new(grain.outputs['Fac'], bump.inputs['Height'])
    links.new(bump.outputs['Normal'], bs.inputs['Normal'])
    return mat


stone = stone_material()
clay = bpy.data.materials.new('Review clay • geometry only')
clay.use_nodes = True
clay.diffuse_color = (.42, .44, .46, 1)
clay.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value = clay.diffuse_color
clay.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value = .83


def gauss(x, y, cx, cy, sx, sy):
    return math.exp(-((x - cx) / sx) ** 2 - ((y - cy) / sy) ** 2)


def smoothstep(lo, hi, x):
    t = max(0.0, min(1.0, (x - lo) / (hi - lo)))
    return t * t * (3 - 2 * t)


def sculpt(u, v):
    """Depth in the unscaled carving's coordinate frame, facing local -Y.

    Closed eyes, broad continuous brow/nasal bridge, fuller lips and cheek planes.
    Geometry carries the features; shaders provide only stone grain.
    """
    g = lambda x, y, sx, sy: gauss(u, v, x, y, sx, sy)
    # Head volume turns into the tower at the temples, not a flat square mask.
    width = .98 - .20 * (1 - smoothstep(-1.3, -.3, v))
    turn = math.sqrt(max(0.0, 1 - (u / width) ** 2))
    vertical = math.exp(-((v + .03) / 1.62) ** 8)
    d = .055 + .46 * turn * vertical
    d += .10 * g(0, .94, .74, .50)
    d += .095 * g(0, .64, .42, .24)  # brow joins the bridge across the glabella
    d += .18 * (g(-.56, -.12, .32, .40) + g(.56, -.12, .32, .40))
    d += .12 * (g(-.50, -.63, .30, .38) + g(.50, -.63, .30, .38))
    d += .23 * g(0, -1.06, .56, .24)  # rounded, broad chin rather than a point
    d -= .045 * g(0, -.91, .48, .07)  # labiomental fold

    # Broad bridge and projecting rounded alae, with carved nostril recesses.
    d += .48 * g(0, .13, .155, .62)
    d += .39 * g(0, -.18, .205, .18)
    d += .22 * (g(-.205, -.23, .13, .115) + g(.205, -.23, .13, .115))
    d -= .17 * (g(-.17, -.306, .065, .040) + g(.17, -.306, .065, .040))
    d += .045 * g(0, -.34, .065, .08)
    d -= .035 * g(0, -.45, .050, .10)  # philtrum

    # Eye contours follow arcs. No spherical eyeballs, pupils or separate eyelid tubes.
    for sign in (-1, 1):
        t = (u * sign - .445) / .285
        arch = math.sqrt(max(0.0, 1 - t * t))
        gate = math.exp(-(abs(t) / 1.02) ** 10)
        eye_line = .405 + .012 * t + .008 * arch
        upper = eye_line + .055 * arch
        lower = eye_line - .034 * arch
        d -= .11 * g(sign * .445, .435, .32, .16)
        d += .065 * g(sign * .445, .43, .25, .10)
        d += gate * .070 * math.exp(-((v - upper) / .047) ** 2)
        d += gate * .036 * math.exp(-((v - lower) / .045) ** 2)
        d -= gate * .055 * math.exp(-((v - eye_line) / .017) ** 2)
        brow = .58 + .055 * arch + .012 * t
        d += gate * .105 * math.exp(-((v - brow) / .17) ** 2)
        d -= gate * .014 * math.exp(-((v - upper - .067) / .030) ** 2)
        # Nasolabial transition, restrained enough to avoid a cartoon grin.
        fold_x = sign * (.28 + .28 * max(0, min(1, (-v - .25) / .50)))
        d -= .034 * math.exp(-((u - fold_x) / .047) ** 2 - ((v + .48) / .25) ** 2)

    # Full lips with a subtle smile, an upper bow and a visible mouth opening incision.
    gate = math.exp(-(abs(u) / .465) ** 6)
    line = -.68 + .025 * (abs(u) / .465) ** 2
    upper = line + .066 + .025 * math.exp(-((abs(u) - .14) / .090) ** 2)
    lower = line - .087
    d += .09 * g(0, -.66, .62, .25)
    d += .17 * gate * math.exp(-((v - upper) / .075) ** 2)
    d += .185 * gate * math.exp(-((v - lower) / .088) ** 2)
    d -= .085 * gate * math.exp(-((v - line) / .019) ** 2)
    d -= .027 * (g(-.46, -.65, .050, .050) + g(.46, -.65, .050, .050))

    # Elongated ears carved at the temple margins; lobes merge into the stone mass.
    for sign in (-1, 1):
        ex = (u - sign * .965) / .125
        ey = (v + .04) / .62
        radius = math.sqrt(ex * ex + ey * ey)
        d += .095 * math.exp(-((radius - .74) / .27) ** 2)
        d += .075 * g(sign * .965, -.55, .13, .16)
        d -= .025 * g(sign * .97, .02, .045, .35)
    return d


# Irregular horizontal courses, with staggered perpendicular joints, not square tiles.
COURSES = [-1.50, -1.16, -.82, -.48, -.12, .23, .57, .94, 1.22, 1.50]
JOINTS = [(-.63, .38), (-.34, .72), (-.78, .16), (-.43, .67),
          (-.82, -.12, .83), (-.54, .51), (-.87, .08, .87), (-.37, .66), (-.72, .25)]


def stone_detail(u, v, seed, damaged):
    # Small, smooth displacements: avoid high-amplitude sinusoidal ridges in v2.
    q = Vector((u * 3.0 + seed * .7, v * 3.0, seed * .23))
    depth = .009 * noise(q) + .003 * noise(q * 3.7)
    nearest = min(abs(v - (c + .006 * math.sin(u * 7 + i * 1.9 + seed)))
                  for i, c in enumerate(COURSES[1:-1]))
    depth -= .026 * math.exp(-(nearest / .010) ** 2)
    row = max(0, min(len(JOINTS) - 1, bisect.bisect_right(COURSES, v) - 1))
    for j in JOINTS[row]:
        dx = u - (j + .007 * math.sin(v * 18 + seed))
        depth -= .023 * math.exp(-(dx / .010) ** 2)
    # Eroded margins, not arbitrary removal of eyes or lips.
    if damaged:
        depth -= .08 * gauss(u, v, .83, 1.25, .22, .24)
        depth -= .055 * gauss(u, v, -.91, -.93, .16, .20)
    return depth


def create_face(cx, cy, scale, side, tower_index, damaged):
    nu, nv = (256, 288) if tower_index == 0 else (192, 216)
    angle = side * math.pi / 2
    rot = Matrix.Rotation(angle, 3, 'Z')
    z0 = .4 + 4.35 * scale
    width, height = 3.25 * scale, 3.45 * scale
    verts, polygons = [], []
    # Mild asymmetry is constant over the surface and does not disconnect course boundaries.
    for j in range(nv + 1):
        v = -1.5 + 3 * j / nv
        for i in range(nu + 1):
            u = -1.13 + 2.26 * i / nu
            sc_u = u + .009 * math.sin(v * 2.2 + side) * math.exp(-(u / .9) ** 8)
            depth = sculpt(sc_u, v) + stone_detail(u, v, tower_index * 4 + side, damaged)
            local = Vector((u * width / 2.26, -(2.23 + depth) * scale, z0 + (v + 1.5) * height / 3))
            verts.append(tuple(rot @ local + Vector((cx, cy, 0))))
    for j in range(nv):
        for i in range(nu):
            k = j * (nu + 1) + i
            polygons.append((k, k + 1, k + nu + 2, k + nu + 1))
    # Boundary and planar back, giving one connected closed solid per face.
    boundary = list(range(nu + 1))
    boundary += [j * (nu + 1) + nu for j in range(1, nv + 1)]
    boundary += [nv * (nu + 1) + i for i in range(nu - 1, -1, -1)]
    boundary += [j * (nu + 1) for j in range(nv - 1, 0, -1)]
    back_start = len(verts)
    for idx in boundary:
        local = rot.inverted() @ (Vector(verts[idx]) - Vector((cx, cy, 0)))
        local.y = -1.90 * scale
        verts.append(tuple(rot @ local + Vector((cx, cy, 0))))
    back_center = len(verts)
    verts.append(tuple(rot @ Vector((0, -1.90 * scale, z0 + height / 2)) + Vector((cx, cy, 0))))
    for i in range(len(boundary)):
        nxt = (i + 1) % len(boundary)
        polygons.append((boundary[i], back_start + i, back_start + nxt, boundary[nxt]))
        polygons.append((back_center, back_start + nxt, back_start + i))
    direction = ['South', 'East', 'North', 'West'][side]
    mesh = bpy.data.meshes.new(f'V3 Tower {tower_index + 1} {direction} • continuous relief')
    mesh.from_pydata(verts, [], polygons)
    mesh.update()
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    assert all(edge.is_manifold for edge in bm.edges), f'Open edges in {mesh.name}'
    assert all(face.calc_area() > 1e-10 for face in bm.faces), f'Degenerate faces in {mesh.name}'
    assert bm.calc_volume(signed=True) > 0, f'Inverted solid in {mesh.name}'
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(mesh.name, mesh)
    faces_collection.objects.link(obj)
    mesh.materials.append(stone)
    for poly in mesh.polygons:
        poly.use_smooth = poly.index < nu * nv
    obj['status'] = 'Unapproved interpretive carving; not a scan or exact individual-face reconstruction'
    obj['direction'] = direction
    obj['front_grid'] = f'{nu} x {nv} quads'
    obj['mesh_checks'] = 'Closed manifold; outward normals; no zero-area polygons'
    print(f'BUILT {obj.name}: {len(verts):,} vertices', flush=True)
    return obj


new_faces = []
for index, (x, y, scale, damaged) in enumerate([(8, -10, 1.15, False), (-5, -12, .92, True),
                                               (10, 12, .85, True), (-94, 0, .78, True)]):
    for side in range(4):
        new_faces.append(create_face(x, y, scale, side, index, damaged))
    # Close the inherited see-through void behind/below the face panels. This sits
    # above the doorways and does not fill the passages through the lower tower.
    z0 = .4 + 4.35 * scale
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, z0 + 1.55 * scale))
    backing = bpy.context.object
    backing.name = f'V3 Tower {index + 1} • internal head masonry'
    backing.dimensions = (4.15 * scale, 4.15 * scale, 3.85 * scale)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    backing.data.materials.append(stone)
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, z0 - .12 * scale))
    collar = bpy.context.object
    collar.name = f'V3 Tower {index + 1} • face base support'
    collar.dimensions = (4.82 * scale, 4.82 * scale, .28 * scale)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    collar.data.materials.append(stone)
    bevel = collar.modifiers.new('Rounded sandstone edges', 'BEVEL')
    bevel.width, bevel.segments = .035 * scale, 3

# Clearer neutral review lighting. This is not a proposed change to the app lighting.
for obj in scene.objects:
    if obj.type == 'LIGHT':
        obj.hide_render = True
world_bs = scene.world.node_tree.nodes.get('Background')
world_bs.inputs[0].default_value = (.69, .73, .78, 1)
world_bs.inputs[1].default_value = .5
review_lights = bpy.data.collections.new('V3 • review lighting')
scene.collection.children.link(review_lights)
for name, pos, energy, size in [('Key', (0, -21, 16), 2600, 8), ('Fill', (19, -10, 13), 1600, 9),
                                ('North rim', (8, 0, 16), 2200, 7)]:
    light = bpy.data.lights.new('V3 ' + name, 'AREA')
    light.energy, light.shape, light.size = energy, 'DISK', size
    obj = bpy.data.objects.new(light.name, light)
    review_lights.objects.link(obj)
    obj.location = pos
    obj.rotation_euler = (Vector((8, -10, 7)) - obj.location).to_track_quat('-Z', 'Y').to_euler()

views = [
    ('01-south-face', (8, -24, 7.5), (8, -13, 7.42), 5.3),
    ('02-three-quarter', (18, -25, 10.0), (8, -10, 6.7), 11.8),
    ('03-east-face', (22, -10, 7.5), (11, -10, 7.42), 5.3),
    ('04-north-face', (8, 4, 7.5), (8, -7, 7.42), 5.3),
    ('05-west-face', (-.5, -10, 7.5), (5, -10, 7.42), 5.3),
]
cams = []
for name, pos, target, ortho in views:
    data = bpy.data.cameras.new('V3 ' + name)
    obj = bpy.data.objects.new(data.name, data)
    scene.collection.objects.link(obj)
    obj.location = pos
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat('-Z', 'Y').to_euler()
    data.type = 'ORTHO'
    data.ortho_scale = ortho
    data.clip_end = 2500
    data.clip_start = .05
    cams.append(obj)

scene['Review status'] = 'V3 UNAPPROVED • carved faces only • app unchanged'
scene['Limitations'] = 'Original reference-led relief, NOT photogrammetry. Individual face damage and measurements inferred. Previous site layout remains provisional.'
scene['Reference basis'] = 'docs/BANTEAY-CHHMAR-FACES-V3.md • Laurent Dambies photographs of main-temple face towers'
scene.render.engine = 'CYCLES'
scene.cycles.samples = 24 if not args.draft else 16
scene.cycles.use_denoising = True
scene.render.resolution_x = 1152
scene.render.resolution_y = 1152
scene.render.resolution_percentage = 75 if args.draft else 100
scene.camera = cams[1]
bpy.ops.object.select_all(action='DESELECT')
for obj in new_faces[:4]:
    obj.select_set(True)
bpy.context.view_layer.objects.active = new_faces[0]
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type == 'VIEW_3D':
            area.spaces.active.region_3d.view_perspective = 'CAMERA'
            area.spaces.active.shading.type = 'MATERIAL'
            area.spaces.active.overlay.show_overlays = False

report = {'version': 3, 'status': 'unapproved Blender review; not imported',
          'new_reliefs': len(new_faces), 'new_relief_vertices': sum(len(o.data.vertices) for o in new_faces),
          'manifold': True, 'nonzero_area': True, 'positive_signed_volume': True,
          'source_preserved': str(SOURCE), 'app_assets_changed': False}
(OUT / 'mesh-validation.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'banteay-chhmar-review-v3.blend'))
if not args.no_render:
    for cam in cams[:1] if args.draft else cams:
        scene.camera = cam
        scene.render.filepath = str(OUT / (cam.name.replace('V3 ', '') + '.png'))
        print('RENDER ' + cam.name, flush=True)
        bpy.ops.render.render(write_still=True)
    scene.camera = cams[0]
    scene.view_layers[0].material_override = clay
    scene.render.filepath = str(OUT / '06-clay-geometry.png')
    bpy.ops.render.render(write_still=True)
    scene.view_layers[0].material_override = None
print('V3_REVIEW_READY • no app imports or GLB export', flush=True)
