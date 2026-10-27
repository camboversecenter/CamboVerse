"""Sequential original teaching refinements: V4 nose, V5 mouth, V6 outer ears.
Blender first, separate immutable exports; not a clinical atlas or scan.
References: nidcd.nih.gov/health/smell-disorders, /health/how-do-we-hear;
nidcr.nih.gov/health-info/saliva-salivary-gland-disorders.
"""
import ast
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent
source = ROOT / 'build-fitted-head-v3.py'
bootstrap = ast.parse(source.read_text())
bootstrap.body = bootstrap.body[:-1]
scope = {'__file__': str(source)}
exec(compile(bootstrap, str(source), 'exec'), scope)
tree = scope['tree']
stage = int(sys.argv[-1]) if sys.argv[-1] in ['4', '5', '6'] else 4

nose = ast.parse('''
def nose():
 mucosa=h.material('Nasal mucosa',(.45,.16,.14),.66)
 olfactory=h.material('Olfactory region schematic',(.63,.43,.17),.7)
 h.ellipsoid('Nasal septum',(0,8.65,5.35),(.13,1.6,1.3),cartilage)
 for s in [-1,1]:
  # Open-sided curved lateral wall, leaving the septum and shelves inspectable.
  verts=[];faces=[];n=12 if tier=='normal' else 24
  for j in range(n+1):
   t=j/n
   for i in range(n+1):
    u=i/n
    verts.append((s*(.90+.25*math.sin(math.pi*t)*math.sin(math.pi*u)),7.25+2.9*t,4.0+2.4*u))
  for j in range(n):
   for i in range(n):
    a=j*(n+1)+i;faces.append((a,a+1,a+n+2,a+n+1))
  wall=h.mesh('Lateral nasal cavity wall',verts,faces,mucosa)
  bpy.context.view_layer.objects.active=wall
  mod=wall.modifiers.new('Thin mucosal wall','SOLIDIFY');mod.thickness=.07
  bpy.ops.object.modifier_apply(modifier=mod.name)
  # Three curved shelves per side; same structures at both quality levels.
  for k in range(3):
   y=7.9+k*.73;length=1.85-k*.28
   verts=[];faces=[];steps=10 if tier=='normal' else 24;cross=6 if tier=='normal' else 12
   for j in range(steps+1):
    t=j/steps
    for i in range(cross+1):
     a=i/cross*math.pi*.95
     verts.append((s*(.91-.46*math.sin(a)*(.45+.55*math.sin(math.pi*t))),y+.24*math.cos(a),4.25+length*t))
   for j in range(steps):
    for i in range(cross):
     a=j*(cross+1)+i;faces.append((a,a+1,a+cross+2,a+cross+1))
   o=h.mesh(['Inferior','Middle','Superior'][k]+' turbinate',verts,faces,mucosa)
   bpy.context.view_layer.objects.active=o
   mod=o.modifiers.new('Mucosal shelf thickness','SOLIDIFY');mod.thickness=.07
   bpy.ops.object.modifier_apply(modifier=mod.name)
  h.ellipsoid('Olfactory mucosal patch',(s*.46,10.0,4.9),(.36,.13,.66),olfactory)
  h.tube('Nasal vestibule rim',[(s*.36,7.28,6.5),(s*.75,7.1,6.6),(s*.98,7.4,6.35)],.12,mucosa,14 if tier=='normal' else 28)
''').body[0]

mouth = ast.parse('''
def mouth():
 palate=h.material('Palatal mucosa',(.52,.23,.20),.7)
 glands=h.material('Salivary gland tissue',(.57,.35,.27),.75)
 duct=h.material('Salivary ducts schematic',(.76,.60,.40),.68)
 h.ellipsoid('Tongue shaped muscular body',(0,3.7,3.9),(2.2,.58,1.8),tissue,
  lambda x,y,z:(x*(.84+.16*(1-z*z)),y*(.9+.1*z),z))
 h.tube('Median tongue sulcus',[(0,4.23,5.15),(0,4.28,4.35),(0,4.22,3.6)],.025,palate,16 if tier=='normal' else 32)
 h.ellipsoid('Hard palate',(0,5.85,4.1),(2.25,.19,1.55),palate)
 h.ellipsoid('Soft palate',(0,5.55,2.55),(1.85,.25,.65),palate)
 h.ellipsoid('Uvula',(0,5.02,2.55),(.17,.43,.18),tissue)
 for s in [-1,1]:
  h.tube('Palatoglossal arch',[(s*1.45,5.5,2.8),(s*1.8,4.8,2.8),(s*1.6,4.0,3)],.13,palate,12 if tier=='normal' else 24)
  h.ellipsoid('Parotid gland',(s*5.6,5.3,.3),(.72,1.35,.8),glands)
  h.ellipsoid('Submandibular gland',(s*2.7,2.65,2.5),(.85,.52,.72),glands)
  h.ellipsoid('Sublingual gland',(s*1.05,3.05,4.2),(.42,.23,1.05),glands)
  h.tube('Parotid duct',[(s*5.4,5.5,.65),(s*4.25,5.0,2.3),(s*2.7,4.8,4.0)],.08,duct,16 if tier=='normal' else 32)
  h.tube('Submandibular duct',[(s*2.5,2.9,2.7),(s*1.25,3.15,3.6),(s*.45,3.3,5.1)],.07,duct,16 if tier=='normal' else 32)
  for i in range(3):
   h.tube('Palatal fold',[(s*.2,5.66,4.0+i*.35),(s*.85,5.68,4.1+i*.35),(s*1.5,5.72,4.0+i*.35)],.045,palate,10 if tier=='normal' else 20)
''').body[0]

ear_extension = ast.parse('''
outer=h.material('Auricular cartilage tissue',(.52,.30,.23),.72)
for s in [-1,1]:
 # Shallow concave pinna, modelled in a sagittal plane, not a solid oval bead.
 verts=[];faces=[];rings=8 if tier=='normal' else 16;segments=24 if tier=='normal' else 48
 for j in range(rings+1):
  r=.02+.98*j/rings
  for i in range(segments):
   a=2*math.pi*i/segments
   verts.append((s*(7.35+.50*r*r),9.5+1.75*r*math.cos(a),.15+1.0*r*math.sin(a)))
 for j in range(rings):
  for i in range(segments):
   a=j*segments+i;b=j*segments+(i+1)%segments;faces.append((a,b,b+segments,a+segments))
 o=h.mesh('Pinna conchal bowl',verts,faces,outer)
 bpy.context.view_layer.objects.active=o
 mod=o.modifiers.new('Cartilage thickness','SOLIDIFY');mod.thickness=.12
 bpy.ops.object.modifier_apply(modifier=mod.name)
 h.tube('Helix rim',[(s*7.88,9.5+1.75*math.cos(i/32*math.pi*2),.15+math.sin(i/32*math.pi*2)) for i in range(33)],.14,outer,32 if tier=='normal' else 64)
 h.tube('Antihelix',[(s*7.62,8.7,.35),(s*7.64,9.65,-.30),(s*7.73,10.6,.05)],.11,outer,16 if tier=='normal' else 32)
 h.tube('Antihelix upper branch',[(s*7.64,9.65,-.30),(s*7.73,10.2,.45),(s*7.76,10.6,.65)],.09,outer,12 if tier=='normal' else 24)
 h.ellipsoid('Tragus',(s*7.52,9.2,.91),(.21,.38,.22),outer)
 h.ellipsoid('Ear lobule',(s*7.67,7.85,.22),(.28,.44,.40),outer)
''').body

class Refine(ast.NodeTransformer):
 def visit_FunctionDef(self,node):
  if node.name=='nose':return nose
  if stage>=5 and node.name=='mouth':return mouth
  if stage>=6 and node.name=='ears':node.body.extend(ear_extension)
  return self.generic_visit(node)
 def visit_Constant(self,node):
  if isinstance(node.value,str):node.value=node.value.replace('lab-head-fitted-v3',f'lab-head-fitted-v{stage}')
  return node

tree=Refine().visit(tree);ast.fix_missing_locations(tree)
exec(compile(tree,str(source),'exec'),{'__file__':str(source)})
