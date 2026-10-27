"""Match solid-viewport swatches to exported tissue colors without replacing shaders."""
import bpy, json
from pathlib import Path
from mathutils import Vector

OUT=Path(__file__).resolve().parents[1]/'public/models/local'
bpy.ops.wm.open_mainfile(filepath=str(OUT/'complete-organs-review-v1.blend'))
audit=[]
for o in bpy.context.scene.objects:
    if o.type!='MESH':continue
    for slot,mat in enumerate(o.data.materials):
        if not mat:continue
        old=list(mat.diffuse_color)
        color=None
        # The imported glTF's base color is often white because the actual
        # tissue color is supplied by a vertex-color node, not an image texture.
        nodes=mat.node_tree.nodes if mat.use_nodes else []
        for node in nodes:
            if node.type not in ('VERTEX_COLOR','ATTRIBUTE'):continue
            layer=node.layer_name if node.type=='VERTEX_COLOR' else node.attribute_name
            attr=o.data.color_attributes.get(layer) if layer else o.data.color_attributes.active_color
            if not attr:continue
            values=[]
            for poly in o.data.polygons:
                if poly.material_index!=slot:continue
                for li in poly.loop_indices:
                    index=li if attr.domain=='CORNER' else o.data.loops[li].vertex_index
                    values.append(attr.data[index].color)
            if values:color=tuple(sum(v[k] for v in values)/len(values) for k in range(3))+(1,)
        if color is None:
            shader=next((n for n in nodes if n.type=='BSDF_PRINCIPLED'),None)
            if shader and not shader.inputs['Base Color'].is_linked:
                color=tuple(shader.inputs['Base Color'].default_value)
        if color:
            mat.diffuse_color=color
            o.color=color
        audit.append({'object':o.name,'part':o.get('anatomyPart'),
                      'material':mat.name,'before':old,'after':list(mat.diffuse_color)})

for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':
            space=area.spaces.active
            space.shading.type='MATERIAL'
            space.shading.color_type='MATERIAL'
            space.overlay.show_extras=False
            space.region_3d.view_perspective='ORTHO'
            space.region_3d.view_location=Vector((0,0,28))
            space.region_3d.view_distance=125
            space.region_3d.view_rotation=bpy.data.objects['Review front'].rotation_euler.to_quaternion()
bpy.ops.object.select_all(action='DESELECT')
bpy.context.scene.camera=bpy.data.objects['Review front']
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'complete-organs-review-v2-colors.blend'))
(OUT/'complete-organs-review-v2-colors-audit.json').write_text(json.dumps(audit,indent=2))
print('Corrected viewport material swatches:',sum(a['before']!=a['after'] for a in audit),'of',len(audit))
print('Shaders and vertex-color layers preserved; no missing image textures replaced.')
