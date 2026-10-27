"""Original illustrative site models; not surveyed reconstructions.
Run Blender --background --python scripts/build-heritage-sites-blender.py.
Native sources, paired glTF exports and review renders stay in models/local.
"""
import bpy, math, json, random, sys
from pathlib import Path
from mathutils import Vector

OUT = Path(__file__).resolve().parents[1] / 'public/models/local/heritage-blender-v1'
OUT.mkdir(parents=True, exist_ok=True)

def material(name, color):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Roughness'].default_value = .87
    return m

def finish(o, name, mat):
    o.name = name
    o.data.materials.append(mat)
    if o.type == 'MESH' and ULTRA and name not in ['ground','waterfall curtain','upper stream']:
        bevel=o.modifiers.new('weathered edges','BEVEL')
        bevel.width=.018; bevel.segments=1
        # Applied in the final conversion, rather than evaluating the entire
        # scene after every individual brick is created.
    return o

def box(name, p, size, mat):
    sx,sy,sz=size[0]/2,size[2]/2,size[1]/2
    verts=[(-sx,-sy,-sz),(sx,-sy,-sz),(sx,sy,-sz),(-sx,sy,-sz),
           (-sx,-sy,sz),(sx,-sy,sz),(sx,sy,sz),(-sx,sy,sz)]
    mesh=bpy.data.meshes.new(name)
    mesh.from_pydata(verts,[],[(3,2,1,0),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)])
    mesh.update()
    o=bpy.data.objects.new(name,mesh); bpy.context.collection.objects.link(o)
    o.location=(p[0],-p[2],p[1])
    return finish(o,name,mat)

def roundpart(name,p,r,h,mat,top=None):
    bpy.ops.mesh.primitive_cone_add(vertices=24 if ULTRA else 10, radius1=r,
        radius2=r if top is None else top, depth=h, location=(p[0],-p[2],p[1]))
    return finish(bpy.context.object,name,mat)

def ellipsoid(name,p,size,mat):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16 if ULTRA else 8, ring_count=8 if ULTRA else 4,
        location=(p[0],-p[2],p[1]))
    o=bpy.context.object
    o.scale=(size[0],size[2],size[1])
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    return finish(o,name,mat)

def line(name,points,r,mat):
    c=bpy.data.curves.new(name,'CURVE'); c.dimensions='3D'
    c.resolution_u=8 if ULTRA else 3
    c.bevel_depth=r; c.bevel_resolution=2 if ULTRA else 0
    s=c.splines.new('BEZIER'); s.bezier_points.add(len(points)-1)
    for v,p in zip(s.bezier_points,points):
        v.co=(p[0],-p[2],p[1]); v.handle_left_type='AUTO'; v.handle_right_type='AUTO'
    o=bpy.data.objects.new(name,c); bpy.context.collection.objects.link(o); o.data.materials.append(mat)

def portal(x,z,faces=False):
    for side in [-1,1]: box('portal jamb',(x+side*.48,.65,z),(.3,1.3,.7),stone)
    box('lintel',(x,1.35,z),(1.45,.25,.85),stone)
    for side in [-1,1]:
        roundpart('door colonette',(x+side*.29,.65,z+.39),.045,1.12,stone)
    for i in range(5):
        w=1.4-i*.2
        box('receding crown',(x,1.6+i*.2,z),(w,.2,w*.7),stone)
    if faces:
        for side in [-1,1]:
            ellipsoid('face relief',(x,1.85,z+side*.48),(.3,.4,.10),stone)
            ellipsoid('nose',(x,1.82,z+side*.58),(.07,.13,.08),stone)
            for dx in [-.12,.12]: line('closed eye',[(x+dx-.05,1.95,z+side*.58),(x+dx+.05,1.95,z+side*.58)],.018,dark)
            line('mouth',[(x-.10,1.68,z+side*.57),(x,1.66,z+side*.60),(x+.1,1.68,z+side*.57)],.016,dark)

def gallery(x,z,length,turn=False):
    # Broken rear masonry gives the colonnade depth and enclosure.
    for row in range(3):
        for j in range(int(length/.5)):
            a=-length/2+j*.5+.25
            if abs(a)<.55: continue
            if site=='beng-mealea' and (j+row)%5 in [1,2]: continue
            box('wall course',(x+(.23 if turn else a),.23+row*.26,z+(a if turn else -.23)),
                (.25,.245,.48) if turn else (.48,.245,.25),stone)
    for i in range(4):
        if site=='beng-mealea':
            for j in range(int(length/.5)):
                if j%7 in [2,3,4]: continue
                a=-length/2+j*.5+.25
                box('broken roof course',(x+(0 if turn else a),1.2+i*.1,z+(a if turn else 0)),
                    (.85-i*.15,.12,.48) if turn else (.48,.12,.85-i*.15),stone)
        else:
            box('corbelled gallery roof',(x,1.2+i*.1,z),(.85-i*.15 if turn else length,.12,length if turn else .85-i*.15),stone)
    for i in range(int(length/.45)+1):
        a=-length/2+i*.45
        if site=='beng-mealea' and i%6 in [2,3]: continue
        box('gallery pillar',(x+(0 if turn else a),.65,z+(a if turn else 0)),(.12,1.1,.12),stone)

def tree(x,z,roots=False):
    line('trunk',[(x,0,z),(x-.2,1.4,z),(x+.1,3.5,z)],.16,wood)
    for s in [-1,1]:
        line('branch',[(x,2,z),(x+s*.6,3.2,z+.2),(x+s,3.7,z)],.08,wood)
        for k in range(5 if ULTRA else 3):
            a=k*2.4
            ellipsoid('canopy',(x+s*.6+math.sin(a)*.45,3.5+math.cos(a)*.25,z+math.cos(a)*.45),(.6,.45,.55),leaf)
        if roots: line('exposed root',[(x,1.8,z),(x+s*.3,.8,z+.2),(x+s*.8,.12,z+.8),(x+s*1.2,.05,z+1.3)],.10,wood)

def gable(x,y,z,w,d,h,mat):
    verts=[(x-w/2,-(z-d/2),y),(x+w/2,-(z-d/2),y),(x,-(z-d/2),y+h),
           (x-w/2,-(z+d/2),y),(x+w/2,-(z+d/2),y),(x,-(z+d/2),y+h)]
    mesh=bpy.data.meshes.new('pitched roof'); mesh.from_pydata(verts,[],[(0,2,1),(3,4,5),(0,3,5,2),(2,5,4,1),(0,1,4,3)]); mesh.update()
    o=bpy.data.objects.new('pitched roof',mesh); bpy.context.collection.objects.link(o); finish(o,'pitched roof',mat)

def sanctuary(x,y,z,w,h,mat):
    box('sanctuary terrace',(x,y+.1,z),(w*1.4,.2,w*1.4),mat)
    # Open doorway with substantial side walls and a rear wall.
    for side in [-1,1]: box('sanctuary side',(x+side*w*.36,y+h*.35,z),(w*.28,h*.7,w),mat)
    box('sanctuary back',(x,y+h*.35,z-w*.42),(w,h*.7,w*.18),mat)
    box('lintel',(x,y+h*.72,z),(w*1.05,.18,w),mat)
    for i in range(5):
      box('receding tower',(x,y+h*.78+i*h*.06,z),(w*(1-i*.14),h*.07,w*(1-i*.14)),mat)
    for side in [-1,1]: roundpart('carved jamb',(x+side*w*.22,y+h*.34,z+w*.53),w*.045,h*.64,stone)
    line('pediment arch',[(x-w*.58,y+h*.73,z+w*.56),(x-w*.35,y+h*.99,z+w*.56),
         (x,y+h*1.12,z+w*.56),(x+w*.35,y+h*.99,z+w*.56),(x+w*.58,y+h*.73,z+w*.56)],.045,mat)

def face_tower(x,y,z,w,h):
    box('tower shaft',(x,y+h*.48,z),(w,h*.96,w),stone)
    for i in range(4): box('tower crown',(x,y+h+i*.13,z),(w*(1-i*.18),.14,w*(1-i*.18)),stone)
    for nx,nz in [(0,1),(1,0),(0,-1),(-1,0)]:
      tx,tz=nz,-nx
      def pt(a,b,c): return (x+tx*a+nx*c,y+b,z+tz*a+nz*c)
      ellipsoid('face plane',pt(0,h*.68,w*.49),(w*.40 if nz else .065,h*.24,.065 if nz else w*.40),stone)
      ellipsoid('sculpted nose',pt(0,h*.65,w*.54),(.045 if nz else .065,h*.085,.065 if nz else .045),stone)
      for side in [-1,1]:
        line('brow ridge',[pt(side*.05,h*.80,w*.55),pt(side*.14,h*.81,w*.55),pt(side*.23,h*.78,w*.53)],.018,stone)
        line('closed eyelid',[pt(side*.06,h*.76,w*.56),pt(side*.14,h*.75,w*.57),pt(side*.22,h*.76,w*.55)],.009,dark)
      line('half smile',[pt(-.14,h*.54,w*.55),pt(0,h*.525,w*.58),pt(.14,h*.54,w*.55)],.012,dark)
      for side in [-1,1]: ellipsoid('cheek',pt(side*.15,h*.62,w*.52),(.10 if nz else .025,.12,.025 if nz else .10),stone)

selected=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
sites=selected or ['banteay-chhmar','preah-khan','beng-mealea','phnom-kulen','oudong','koh-ker','sambor-prei-kuk','bayon','ta-prohm','banteay-srei','preah-vihear','royal-palace','pre-rup']
manifest=json.loads((OUT/'manifest.json').read_text()) if (OUT/'manifest.json').exists() else []
manifest=[entry for entry in manifest if entry['site'] not in sites]
for site in sites:
  for ULTRA in [False,True]:
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
    stone=material('aged sandstone',(.43,.39,.30)); dark=material('recess',(.13,.15,.12))
    wood=material('root bark',(.29,.24,.17)); leaf=material('forest canopy',(.16,.28,.14))
    earth=material('earth',(.31,.34,.23)); white=material('stupa plaster',(.78,.76,.66))
    water=material('water',(.20,.43,.46))
    box('ground',(0,-.12,0),(9,.2,8),earth)
    if site=='bayon':
      box('lower terrace',(0,.12,0),(7,.24,6),stone)
      box('upper terrace',(0,.45,0),(4.8,.4,4.2),stone)
      for x,z in [(-1.7,-1.4),(0,-1.4),(1.7,-1.4),(-1.7,0),(1.7,0),(-1.7,1.4),(0,1.4),(1.7,1.4)]:
        face_tower(x,.65,z,.72,1.55)
      roundpart('central circular sanctuary',(0,1.2,0),.85,1.2,stone)
      face_tower(0,1.5,0,1.1,2.0)
      for z in [-2.6,2.6]: gallery(0,z,6.5)
      # Relief frieze is an abstract teaching cue, not copied sacred imagery.
      for x in [-2.5,-2,-1.5,1.5,2,2.5]:
        ellipsoid('relief head',(x,.65,2.79),(.07,.08,.025),stone)
        box('relief body',(x,.45,2.79),(.12,.25,.04),stone)
    elif site=='banteay-srei':
      rose=material('pink sandstone',(.54,.29,.22)); stone=rose
      box('courtyard platform',(0,.1,0),(6.8,.2,5.7),stone)
      for x,h in [(-1.55,1.8),(0,2.25),(1.55,1.8)]: sanctuary(x,.2,-.8,1.05,h,rose)
      for x in [-2.1,2.1]:
        box('library walls',(x,.6,1.3),(1,.8,1.4),rose)
        gable(x,1.05,1.3,1.3,1.65,.65,rose)
        line('library pediment',[(x-.66,1.05,2.14),(x,1.72,2.14),(x+.66,1.05,2.14)],.055,rose)
        for k in range(7 if ULTRA else 3):
          a=k*2*math.pi/(7 if ULTRA else 3)
          ellipsoid('floral relief',(x+math.sin(a)*.16,1.3+math.cos(a)*.16,2.15),(.04,.06,.025),rose)
      portal(0,2.5)
    elif site=='ta-prohm':
      for z in [-2.5,2.5]: gallery(0,z,6)
      gallery(-3,0,5,True); gallery(3,0,5,True)
      sanctuary(-.8,0,-.6,1.1,1.8,stone); portal(1.0,1.4)
      tree(1.3,.5,True); tree(-2.5,-1.5,True)
      for i in range(7 if ULTRA else 4):
        x=.65+i*.14
        line('roof gripping root',[(1.3,3,.5),(x,1.8,1.1),(x,1.45,1.7),(x-.12,.15,1.9),(x-.6,.04,2.3)],.06,wood)
      for i in range(18 if ULTRA else 9):
        o=box('fallen gallery stone',(-1.3+math.sin(i*1.9),.16,1+math.cos(i*2.3)),(.42,.3,.3),stone)
        o.rotation_euler=(.1*i,.17*i,.28*i)
    elif site=='preah-vihear':
      for level in range(5):
        z=3-level*1.5; y=.25+level*.32
        box('ridge terrace',(0,y/2,z),(3.6,y,1.5),stone)
        before=set(bpy.context.scene.objects)
        portal(0,z)
        for o in set(bpy.context.scene.objects)-before: o.location.z+=y
        gable(0,y+1.45,z,2.8,.85,.5,stone)
        for k in range(5): box('ascent step',(0,y-.30+k*.065,z+.83-k*.09),(.9,.1,.12),stone)
      for x in [-1.5,1.5]:
        box('sanctuary courtyard wall',(x,1.65,-2.8),(.18,.6,1.8),stone)
      box('cliff face',(0,.7,-3.7),(4,1.4,.35),stone)
    elif site=='royal-palace':
      gold=material('gilded trim',(.72,.48,.12)); tile=material('terracotta roof',(.48,.16,.09))
      def palace_hall(x,z,w,d,h,spire=False):
        box('palace plinth',(x,.15,z),(w+.5,.3,d+.5),white)
        box('hall walls',(x,h*.47+.3,z),(w*.75,h*.94,d*.82),white)
        for side in [-1,1]:
          for j in range(5):
            zz=z-d*.4+j*d*.2
            roundpart('veranda column',(x+side*w*.46,h*.5+.3,zz),.065,h,white)
            box('window recess',(x+side*w*.38,h*.55+.3,zz),(.03,.5,.23),dark)
        for i in range(3):
          yy=h+.3+i*.3; ww=w+.5-i*.35; dd=d+.5-i*.45
          gable(x,yy,z,ww,dd,.65,tile)
          for end in [-1,1]:
            line('gold bargeboard',[(x-ww/2,yy,z+end*dd/2),(x,yy+.66,z+end*dd/2),(x+ww/2,yy,z+end*dd/2)],.04,gold)
            line('roof finial',[(x,yy+.65,z+end*dd/2),(x,yy+.85,z+end*(dd/2+.15)),(x,yy+1.0,z+end*(dd/2+.13))],.035,gold)
        if spire:
          for i in range(4): roundpart('spire moulding',(x,h+1.5+i*.15,z),.4-i*.07,.16,gold)
          roundpart('central golden spire',(x,h+2.7,z),.18,1.5,gold,.01)
      palace_hall(-.6,-.6,2.5,3.4,1.3,True)
      palace_hall(2.2,1.1,1.3,1.8,.85)
      palace_hall(-2.6,1.8,1.2,1.3,.7)
      for x in [-3.8,3.8]: box('compound wall',(x,.4,0),(.12,.8,6.5),white)
    elif site=='pre-rup':
      brick=material('warm brick',(.47,.23,.12))
      for level in range(3):
        w=7-level*1.3
        box('laterite terrace',(0,.25+level*.45,0),(w,.5,w),stone)
      for x,z in [(-1.45,-1.45),(1.45,-1.45),(-1.45,1.45),(1.45,1.45),(0,0)]:
        sanctuary(x,1.4,z,.95,2.1 if x==0 else 1.55,brick)
      for i in range(21): box('eastern stair',(0,(i+1)*.065/2,3.6-i*.075),(.85,(i+1)*.065,.1),stone)
      for x in [-2.4,-1.2,1.2,2.4]: sanctuary(x,.5,3,.55,.8,brick)
    elif site in ['banteay-chhmar','preah-khan','beng-mealea']:
      for z in [-2.5,2.5]: gallery(0,z,7)
      for x in [-3.5,3.5]: gallery(x,0,5,True)
      portal(0,2.5,site=='banteay-chhmar')
      if site=='banteay-chhmar':
        for x,z in [(-1.7,0),(1.7,0),(0,-1.4)]: portal(x,z,True)
      elif site=='preah-khan':
        # Cruciform corridors and a separate two-storey column pavilion.
        gallery(0,0,4); gallery(0,-.8,3,True); portal(0,-1.8)
        for x in [2.1,3.0]:
          for z in [-1.5,-.7]: roundpart('pavilion column',(x,1.2,z),.09,2.4,stone)
        box('pavilion upper floor',(2.55,1.4,-1.1),(1.3,.18,1.3),stone)
        box('pavilion roof',(2.55,2.4,-1.1),(1.3,.18,1.3),stone)
      else:
        for i in range(24 if ULTRA else 12):
          x=math.sin(i*2.3)*2.7; z=math.cos(i*1.9)*1.8
          o=box('collapsed masonry',(x,.15+(i%3)*.12,z),(.48,.3,.36),stone)
          o.rotation_euler=(i*.17,i*.09,i*.41)
      tree(-2,-1,True); tree(2.5,1,True)
    elif site=='sambor-prei-kuk':
      brick=material('fired brick',(.42,.20,.115))
      # A compact teaching composition, not a claim that the separated groups
      # stand beside one another. Square and octagonal brick sanctuaries.
      for cx,cz,sides,radius in [(-1.7,-.7,4,1.15),(1.6,-1.0,8,1.05),(0,1.7,4,.75)]:
        rows=22 if ULTRA else 11
        height=2.3 if radius>1 else 1.7
        for row in range(rows):
          y=.14+(row+.5)*height/rows
          radiusrow=radius*(1-.045*row/rows)
          for face in range(sides):
            angle=face*2*math.pi/sides
            nx,nz=math.sin(angle),math.cos(angle)
            facewidth=2*radiusrow*math.tan(math.pi/sides)
            count=8 if ULTRA else 4
            for j in range(count):
              offset=-facewidth/2+(j+.5)*facewidth/count
              # Front entrance is a genuine opening, not a painted square.
              if face==0 and abs(offset)<.34 and y<1.5: continue
              o=box('brick course',(cx+nx*radiusrow+math.cos(angle)*offset,y,cz+nz*radiusrow-math.sin(angle)*offset),
                    (facewidth/count-.014,height/rows-.012,.16),brick)
              o.rotation_euler.z=angle
        for dx in [-.36,.36]:
          box('sandstone door jamb',(cx+dx,.83,cz+radius+.04),(.13,1.48,.27),stone)
        box('sandstone lintel',(cx,1.59,cz+radius+.05),(.88,.22,.3),stone)
        for k in range(5):
          bpy.ops.mesh.primitive_cone_add(vertices=sides,radius1=(radius-.08*k)/math.cos(math.pi/sides),
            radius2=(radius-.08*(k+1))/math.cos(math.pi/sides),depth=.16,
            location=(cx,-cz,.14+height+.08+k*.16),rotation=(0,0,math.pi/sides))
          finish(bpy.context.object,'corbelled brick crown',brick)
        box('threshold',(cx,.12,cz+radius+.25),(.9,.18,.65),stone)
      tree(-3.5,-1.8,True); tree(3.3,.3,True)
    elif site=='koh-ker':
      # Seven stepped terraces; the summit is ruined, not a modern roofed hut.
      # Illustrative proportions, informed by UNESCO's Koh Ker dossier.
      rng=random.Random(1667)
      for level in range(7):
        width=7-level*.79; bottom=level*.49
        box('terrace core',(0,bottom+.235,0),(width-.06,.47,width-.06),stone)
        count=max(5,round(width/(.34 if ULTRA else .68)))
        blockwidth=width/count
        for row in range(3 if ULTRA else 2):
          rowheight=.47/(3 if ULTRA else 2)
          for side in [-1,1]:
            for j in range(count):
              a=-width/2+(j+.5)*blockwidth
              y=bottom+(row+.5)*rowheight
              box('terrace masonry',(a,y,side*width/2),(blockwidth-.012,rowheight-.012,.09),stone)
              box('side masonry',(side*width/2,y,a),(.09,rowheight-.012,blockwidth-.012),stone)
        box('terrace coping',(0,bottom+.48,0),(width+.07,.045,width+.07),stone)
      # Narrow axial stone stair, retaining individual treads in both modes.
      for step in range(49):
        y=(step+1)*.07; z=3.68-step*.056
        box('axial stair',(0,y/2,z),(.65,y,.075),stone)
      for x in [-.72,.72]:
        for z in [-.72,.72]:
          box('summit remnant',(x,3.52,z),(.24,.18+rng.random()*.15,.24),stone)
      for x,z in [(-3.8,-2.7),(3.8,-2.7)]: tree(x,z)
    elif site=='phnom-kulen':
      for i in range(7):
        ellipsoid('sandstone river ledge',(-3+i,.5,-1.8),(1.1,.65,.75),stone)
      box('upper stream',(0,1.18,-2),(2,.04,2.5),water)
      # Put the curtain beyond the rock face so it is visible from the approach.
      box('waterfall curtain',(0,.61,-.70),(1.4,1.14,.08),water)
      for i in range(9 if ULTRA else 4):
        x=-.63+i*1.26/(8 if ULTRA else 3)
        line('falling water ribbon',[(x,1.18,-.73),(x+.03,.7,-.60),(x,.10,-.42)],.026,water)
      ellipsoid('lower pool',(0,.015,1.1),(2.4,.07,1.7),water)
      # An illustrative carved riverbed patch, retained in both detail tiers.
      box('carved riverbed',(2,1.03,-2),(1.5,.08,1.6),stone)
      for x in [1.55,1.95,2.35]:
        for z in [-2.5,-2.1,-1.7]:
          roundpart('riverbed carving',(x,1.12,z),.11,.12,stone)
      for x,z in [(-3,-2),(3,-2),(-3,2),(3,2)]: tree(x,z)
    else:
      ellipsoid('hill',(0,.15,0),(4,.6,3.5),earth)
      for x,z,h in [(-2,-1,2.2),(0,-1.6,3.6),(2,-.6,2.6)]:
        box('stupa terrace',(x,.7,z),(1.5,.25,1.5),stone)
        for i in range(4): roundpart('stupa base',(x,.9+i*.15,z),.68-i*.06,.16,white)
        ellipsoid('bell',(x,1.6,z),(.5,.6,.5),white)
        roundpart('spire',(x,2+h*.25,z),.30,h*.65,white,.015)
      for i in range(18):
        z=3.5-i*.18
        top=.15+.6*math.sqrt(max(0,1-(z/3.5)**2))+.06
        box('hill stair',(0,top/2,z),(1,top,.2),stone)
    # Bake curve geometry and merge by material: bounded draw calls.
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.convert(target='MESH')
    groups={}
    for o in list(bpy.context.scene.objects): groups.setdefault(o.data.materials[0].name,[]).append(o)
    for name,objs in groups.items():
      bpy.ops.object.select_all(action='DESELECT')
      for o in objs: o.select_set(True)
      bpy.context.view_layer.objects.active=objs[0]
      if len(objs)>1: bpy.ops.object.join()
      objs[0].name=site+' / '+name
      # Exportable stone variation; avoids relying on Blender-only noise nodes.
      obj=objs[0]
      attr=obj.data.color_attributes.new(name='StoneVariation',type='FLOAT_COLOR',domain='CORNER')
      rng=random.Random(42)
      for poly in obj.data.polygons:
        shade=rng.uniform(.72,1.0) if 'sandstone' in name else rng.uniform(.92,1.0)
        base=obj.data.materials[0].diffuse_color
        for li in poly.loop_indices: attr.data[li].color=(base[0]*shade,base[1]*shade,base[2]*shade,1)
      mat=obj.data.materials[0]
      color=mat.node_tree.nodes.new('ShaderNodeVertexColor'); color.layer_name='StoneVariation'
      mat.node_tree.links.new(color.outputs['Color'],mat.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
    tier='ultra' if ULTRA else 'normal'; stem=site+'-'+tier
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(stem+'.blend')))
    bpy.ops.export_scene.gltf(filepath=str(OUT/(stem+'.glb')),export_format='GLB',use_selection=True)
    tris=sum(len(o.data.polygons) for o in bpy.context.scene.objects)
    manifest.append({'site':site,'tier':tier,'file':stem+'.glb','bytes':(OUT/(stem+'.glb')).stat().st_size,'polygons':tris,'status':'generated; visual review pending'})
    if ULTRA:
      bpy.ops.object.light_add(type='AREA',location=(3,-5,9)); bpy.context.object.data.energy=1800; bpy.context.object.data.size=7
      bpy.ops.object.camera_add(location=(10,-13,9)); cam=bpy.context.object
      cam.rotation_euler=(Vector((0,0,1))-cam.location).to_track_quat('-Z','Y').to_euler()
      cam.data.type='ORTHO'; cam.data.ortho_scale=12
      sc=bpy.context.scene; sc.camera=cam; sc.world.color=(.25,.25,.25)
      sc.render.engine='BLENDER_EEVEE'; sc.render.resolution_x=720; sc.render.resolution_y=720; sc.render.resolution_percentage=100
      sc.render.filepath=str(OUT/(site+'-review.png')); bpy.ops.render.render(write_still=True)
    # Preserve other site batches when a targeted rebuild is run separately.
    latest=json.loads((OUT/'manifest.json').read_text()) if (OUT/'manifest.json').exists() else []
    completed={(entry['site'],entry['tier']) for entry in manifest if entry['site'] in sites}
    latest=[entry for entry in latest if (entry['site'],entry['tier']) not in completed]
    latest.extend(entry for entry in manifest if entry['site'] in sites)
    (OUT/'manifest.json').write_text(json.dumps(latest,indent=2))
