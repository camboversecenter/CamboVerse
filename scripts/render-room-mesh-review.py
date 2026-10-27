"""Render actual reconstructed mesh from recovered camera positions in Blender."""
import bpy, json, math, os
from pathlib import Path
from mathutils import Matrix, Vector
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'output/room-mesh-v1'
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(OUT/os.environ.get('ROOM_REVIEW_MODEL','room-textured.glb')))
for obj in bpy.context.scene.objects:
    if obj.type!='MESH': continue
    for slot in obj.material_slots:
        material=slot.material
        if material is None or not material.use_nodes:continue
        nodes=material.node_tree.nodes
        tex=next((n for n in nodes if n.type=='TEX_IMAGE'),None)
        output=next((n for n in nodes if n.type=='OUTPUT_MATERIAL'),None)
        if tex and output:
            emission=nodes.new('ShaderNodeEmission')
            material.node_tree.links.new(tex.outputs['Color'],emission.inputs['Color'])
            material.node_tree.links.new(emission.outputs[0],output.inputs['Surface'])
scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=4
scene.render.threads_mode='FIXED';scene.render.threads=4
scene.render.resolution_x=640;scene.render.resolution_y=480;scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new('Review background');scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.045,.07,.09,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.3
scene.view_settings.view_transform='Standard'
camdata=bpy.data.cameras.new('Review camera');cam=bpy.data.objects.new('Review camera',camdata);scene.collection.objects.link(cam);scene.camera=cam
camdata.lens=20;camdata.clip_start=.02;camdata.clip_end=200
# Camera centres plus full original rotations exported by the preparation script.
poses=json.loads((OUT/'render-cameras.json').read_text())
world=Matrix.Rotation(math.pi/2,4,'X')
for index in [0,9,19]:
    pose=poses[index]
    for yaw in [0,math.pi]:
        # Native camera: +Z forward,+Y down. Blender camera: -Z forward,+Y up.
        posemat=Matrix(pose['worldFromCamera'])
        cam.matrix_world=world @ posemat @ Matrix.Rotation(yaw,4,'Y') @ Matrix.Rotation(math.pi,4,'X')
        scene.render.filepath=str(OUT/f'review-{index:02}-{round(yaw/math.pi)}.png')
        bpy.ops.render.render(write_still=True)
print('ROOM_REVIEW_RENDERS_COMPLETE')
