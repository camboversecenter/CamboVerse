"""Eye first-pass candidate. Original illustrative meshes, V2 other organs retained."""
import ast
from pathlib import Path
source=Path(__file__).with_name('build-fitted-head-v2.py')
bootstrap=ast.parse(source.read_text());bootstrap.body=bootstrap.body[:-1]
scope={'__file__':str(source)};exec(compile(bootstrap,str(source),'exec'),scope)
tree=scope['tree']
eyes=ast.parse('''
def eyes():
 cornea=h.material('Cornea schematic clear dome',(.67,.83,.87),.19)
 cornea.node_tree.nodes.get('Principled BSDF').inputs['Alpha'].default_value=.035
 cornea.diffuse_color=(.67,.83,.87,.035)
 lens=h.material('Lens schematic dark optical surface',(.025,.030,.035),.32)
 retina=h.material('Retina study lining',(.55,.16,.10),.68)
 def shell(name,s,r,start,end,mat,depth=0):
  verts=[];faces=[];rings=12 if tier=='normal' else 24;segments=24 if tier=='normal' else 48
  for j in range(rings+1):
   t=start+(end-start)*j/rings
   for i in range(segments):
    a=2*math.pi*i/segments
    verts.append((s*3.15+r*math.sin(t)*math.cos(a),10.8+r*math.sin(t)*math.sin(a),5.88+depth+r*math.cos(t)))
  for j in range(rings):
   for i in range(segments):
    a=j*segments+i;b=j*segments+(i+1)%segments;faces.append((a,b,b+segments,a+segments))
  return h.mesh(name,verts,faces,mat)
 for s in [-1,1]:
  shell('Scleral shell',s,1.3,.56,math.pi-.02,white)
  shell('Retinal inner lining',s,1.22,1.1,math.pi-.025,retina)
  # Iris annulus has a true aperture instead of a black bead on a solid disc.
  verts=[];faces=[];n=24 if tier=='normal' else 64
  for r in [.23,.67]:
   for i in range(n):
    a=2*math.pi*i/n;verts.append((s*3.15+r*math.cos(a),10.8+r*math.sin(a),6.94))
  for i in range(n):faces.append((i,(i+1)%n,(i+1)%n+n,i+n))
  h.mesh('Iris annulus',verts,faces,iris)
  # Cheap alpha dome in both tiers, no optical transmission required.
  shell('Corneal dome',s,1.3,.002,.56,cornea,.06)
  h.ellipsoid('Crystalline lens',(s*3.15,10.8,6.66),(.48,.48,.19),lens)
  h.tube('Optic nerve',[(s*3.15,10.8,4.64),(s*2.6,10.6,3.7),(s*1.3,10.4,2.5)],lambda t:.24-.04*t,nerve)
''').body[0]
class Update(ast.NodeTransformer):
 def visit_FunctionDef(self,node):
  return eyes if node.name=='eyes' else self.generic_visit(node)
 def visit_Constant(self,node):
  if isinstance(node.value,str):node.value=node.value.replace('lab-head-fitted-v2','lab-head-fitted-v3')
  return node
tree=Update().visit(tree);ast.fix_missing_locations(tree)
exec(compile(tree,str(source),'exec'),{'__file__':str(source)})
