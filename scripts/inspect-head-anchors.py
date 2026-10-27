"""Read the authored registration without rebuilding or changing any assets."""
import ast, json
from pathlib import Path
source=Path(__file__).with_name('build-fitted-head-v1.py')
tree=ast.parse(source.read_text())
tree.body=tree.body[:next(i for i,n in enumerate(tree.body) if isinstance(n,ast.For))]
scope={'__file__':str(source)}
exec(compile(tree,str(source),'exec'),scope)
points={
 'nose':[(.9,8.6,6),(.5,8.63,5.3),(.46,10,4.9)],
 'mouth':[(0,4.2,4.5),(0,5.85,4.1),(0,5.15,2.65),(5.6,5.3,.3)],
 'ears':[(-7.88,10,.15),(-5.98,9.5,.3),(-5.72,9.78,.34),(-4.95,8.85,.5)],
 'eyes':[(3.15,10.8,7.33),(3.15,10.8,7.24),(3.15,10.8,6.7),(-3.15,10.8,4.8),(-2.6,10.6,3.7)]}
for part,anchors in points.items():
 result=[]
 for anchor in anchors:
  p=scope['fitted'](scope['h'].xyz(anchor))
  result.append([round(p.x,4),round(p.z,4),round(-p.y,4)])
 print(part,json.dumps(result))
