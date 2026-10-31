from pathlib import Path
from PIL import Image
import numpy as np,json
root=Path(__file__).resolve().parents[1]/'artifacts/page02-water'
for case in ['chromium-1440','chromium-1920','chromium-390','webkit-1440']:
 p=root/case;r=json.loads((p/'results.json').read_text());camera=r['samples'][0]['camera'];s=camera['scale'];dx=camera['dx'];dy=camera['dy']
 frames=[np.asarray(Image.open(p/f't-{t}.png').convert('RGB')).astype(int) for t in [0,3,6,10]]
 regions={'left-water':(590,710,760,750),'right-water':(1350,720,1650,880),'reflection':(1115,720,1210,900),'near-water':(960,870,1330,935),'sky':(750,50,950,190),'mountain':(1300,510,1450,560),'rocks':(250,640,360,675),'pink-flower':(512,800,528,813),'left-foliage':(200,735,220,780),'green-leaves':(387,765,400,775)}
 results={}
 for name,(x0,y0,x1,y1) in regions.items():
  sl=(slice(max(0,int(y0*s+dy)),min(frames[0].shape[0],int(y1*s+dy))),slice(max(0,int(x0*s+dx)),min(frames[0].shape[1],int(x1*s+dx))))
  differences=[]
  for f in frames[1:]:
   d=np.abs(f[sl]-frames[0][sl]);entry={'mean':float(d.mean()),'changed':float(np.mean(d.max(axis=2)>3)),'max':int(d.max())};differences.append(entry)
   if name in ['left-water','right-water','reflection','near-water']:assert entry['mean']>.5 and entry['changed']>.10,(case,name,entry)
   else:assert entry['max']==0,(case,name,entry)
  results[name]=differences
 # Interior opacity is confirmed using the actual GL framebuffer's alpha.
 assert r['opaqueWaterPassed']
 (p/'pixel-checks.json').write_text(json.dumps(results,indent=2)+'\n')
 print('PASS water motion, terrain/flowers/rocks unchanged:',case)
