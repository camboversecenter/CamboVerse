"""Combine V4 extremities/regions with the current V5 skull deformation.
Creates new exports only; preserves both source generations.
"""
import bpy, json
from pathlib import Path
from mathutils import Vector

OUT=Path(__file__).resolve().parents[1]/'public/models/local'
PREFIX='lab-skeleton-v6'

def smooth(a,b,x):
    t=max(0,min(1,(x-a)/(b-a)))
    return t*t*(3-2*t)

stats={}
for tier in ['normal','ultra']:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(OUT/f'lab-skeleton-regions-v4-{tier}.glb'))
    for obj in bpy.context.scene.objects:
        if obj.type!='MESH': continue
        bpy.ops.object.select_all(action='DESELECT')
        obj.select_set(True); bpy.context.view_layer.objects.active=obj
        bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
        for v in obj.data.vertices:
            x,depth,height=v.co
            if height<60:continue
            vault=smooth(73,80,height)
            chin=(1-smooth(63,68,height))*smooth(60,62,height)
            v.co.x=x*(1-.03*vault-.10*chin)
            v.co.z=height-2.8*smooth(74,86,height)
            v.co.y=depth+.65*chin*smooth(0,7,-depth)
        obj.data.update();obj.data.calc_loop_triangles()
    path=OUT/f'{PREFIX}-{tier}.glb'
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',export_extras=True,export_animations=False)
    stats[tier]={'triangles':sum(len(o.data.loop_triangles) for o in bpy.context.scene.objects if o.type=='MESH'),'bytes':path.stat().st_size}

scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24
scene.render.resolution_x=800;scene.render.resolution_y=800;scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new('Review');scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.055,.075,.09,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.7
def aim(obj,target):obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()
for loc,power in [((-80,-120,130),220000),((80,-80,-30),150000),((0,80,50),200000)]:
    bpy.ops.object.light_add(type='AREA',location=loc)
    lamp=bpy.context.object;lamp.data.energy=power;lamp.data.size=65;aim(lamp,(0,0,0))
bpy.ops.object.camera_add(location=(20,-360,30));scene.camera=bpy.context.object;scene.camera.data.type='ORTHO'
for label,target,location,span in [('body',(0,0,0),(20,-360,30),192),('hand',(25,-1.5,-12),(35,-70,-8),22),('feet',(0,-4,-82),(24,-65,-60),33)]:
    scene.camera.location=location;scene.camera.data.ortho_scale=span;aim(scene.camera,target)
    scene.render.filepath=str(OUT/f'{PREFIX}-{label}.png');bpy.ops.render.render(write_still=True)
scene.camera.location=(20,-360,30);scene.camera.data.ortho_scale=192;aim(scene.camera,(0,0,0))
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/f'{PREFIX}.blend'))
(OUT/f'{PREFIX}-stats.json').write_text(json.dumps(stats,indent=2));print(stats)
