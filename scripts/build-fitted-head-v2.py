"""Versioned ear refinement using the established V1 head registration.
Original illustrative geometry; not a medically validated inner-ear atlas.
"""
import ast
from pathlib import Path
source=Path(__file__).with_name('build-fitted-head-v1.py')
tree=ast.parse(source.read_text())
replacement=ast.parse('''
def ears():
 for s in [-1,1]:
  h.tube('External auditory canal',[(s*7.2,9.5,0),(s*6.5,9.45,.1),(s*6.0,9.5,.3)],.25,cartilage)
  h.ellipsoid('Tympanic membrane',(s*5.98,9.5,.3),(.055,.38,.32),tissue)
  h.tube('Malleus',[(s*5.93,9.3,.3),(s*5.78,9.65,.35),(s*5.72,9.78,.34)],.075,nerve,12)
  h.tube('Incus',[(s*5.72,9.78,.34),(s*5.47,9.75,.35),(s*5.40,9.48,.4)],.07,nerve,12)
  h.tube('Stapes illustrative arch',[(s*5.4,9.48,.4),(s*5.24,9.60,.42),(s*5.12,9.46,.43),(s*5.24,9.33,.42),(s*5.4,9.48,.4)],.045,nerve,20)
  h.ellipsoid('Vestibule',(s*5.05,9.46,.43),(.23,.26,.25),nerve)
  pts=[]
  for i in range(61):
   t=i/60;a=t*math.pi*4.5;r=.62*(1-.78*t)
   pts.append((s*(4.95+r*math.cos(a)),8.85+r*math.sin(a),.50+.18*t))
  h.tube('Cochlea illustrative spiral',pts,lambda t:.13-.055*t,nerve,60 if tier=='ultra' else 30)
  # Three canals in distinct planes; magnified tube thickness for legibility.
  for k,name in enumerate(['Anterior semicircular canal','Posterior semicircular canal','Lateral semicircular canal']):
   pts=[]
   for i in range(33):
    a=i/32*math.pi*2
    if k==0:p=(s*(5.05+.62*math.cos(a)),10.1+.68*math.sin(a),.35)
    elif k==1:p=(s*5.05,10.1+.68*math.sin(a),.35+.62*math.cos(a))
    else:p=(s*(5.05+.62*math.cos(a)),9.85,.35+.62*math.sin(a))
    pts.append(p)
   h.tube(name,pts,.085,nerve,48 if tier=='ultra' else 24)
  h.tube('Auditory tube',[(s*5.85,9.28,.3),(s*4.75,8.35,1),(s*3.7,7.6,1.9)],.14,cartilage,20)
''').body[0]
class Update(ast.NodeTransformer):
 def visit_FunctionDef(self,node):
  if node.name=='ears':return replacement
  return self.generic_visit(node)
 def visit_Constant(self,node):
  if isinstance(node.value,str):
   node.value=node.value.replace('lab-head-fitted-v1','lab-head-fitted-v2').replace('lab-skeleton-head-v5-ultra.glb','lab-skeleton-v11-ultra.glb')
  return node
tree=Update().visit(tree);ast.fix_missing_locations(tree)
exec(compile(tree,str(source),'exec'),{'__file__':str(source)})
