"""Compare actual rendered frames in artwork coordinates, including static controls."""
from pathlib import Path
from PIL import Image
import json,numpy as np
root=Path(__file__).resolve().parents[1]/'artifacts/page02-environment'
for case in ['chromium-1440','chromium-1920','chromium-390','webkit-1440']:
 p=root/case
 report=json.loads((p/'results.json').read_text())
 frames=[np.asarray(Image.open(p/f't-{t}.png').convert('RGB')).astype(int) for t in [0,5,10]]
 camera=report['samples'][0]['camera'];s=camera['scale'];dx=camera['dx'];dy=camera['dy']
 regions={'sky':(150,20,650,210),'ribbon':(950,80,1600,410),'water':(950,710,1600,900),'mist':(790,630,1100,645),'terrain':(250,460,420,520),'foreground':(30,710,230,870)}
 results={}
 for name,(x0,y0,x1,y1) in regions.items():
  sl=(slice(max(0,int(y0*s+dy)),min(frames[0].shape[0],int(y1*s+dy))),slice(max(0,int(x0*s+dx)),min(frames[0].shape[1],int(x1*s+dx))))
  values=[]
  for i in [1,2]:
   d=np.abs(frames[0][sl]-frames[i][sl]);values.append({'meanDifference':float(d.mean()),'changedFraction':float(np.mean(d.max(axis=2)>3)),'maxDifference':int(d.max())})
  if name in ['terrain','foreground']:assert all(v['maxDifference']==0 for v in values),(case,name,values)
  else:assert all(v['maxDifference']>3 and v['meanDifference']>.05 for v in values),(case,name,values)
  results[name]=values
 (p/'pixel-checks.json').write_text(json.dumps(results,indent=2)+'\n')
 print('PASS actual pixel motion and stable terrain/foreground:',case)
