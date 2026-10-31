from pathlib import Path
from PIL import Image
import numpy as np,json
root=Path(__file__).resolve().parents[1];base=root/'artifacts/page07-readability';results={'otherPages':[],'page07':[]}
def rgb(p):return np.asarray(Image.open(p).convert('RGB'))
def changes(a,b):return int(np.any(a!=b,axis=2).sum())
for n in range(1,7):
 a=base/'before/chromium-1920'/f'page-{n}.png';b=base/'after/chromium-1920'/f'page-{n}.png';diff=changes(rgb(a),rgb(b));assert diff==0,(n,diff);results['otherPages'].append({'page':n,'width':1920,'changedPixels':diff})
for name in ['chromium-1920','chromium-1440','chromium-1280','chromium-390']:
 before=base/'before'/name;after=base/'after'/name;a=json.loads((before/'results.json').read_text());b=json.loads((after/'results.json').read_text());ga=a['geometry'];gb=b['geometry']
 for key in ['title','cloud','rail','image','scrollHeight']:assert ga[key]==gb[key],(name,key)
 assert a['dialog']==b['dialog'],(name,'Consent dialog must remain unchanged')
 for key in ['body','ending']:
  for prop in ['text','font','size','weight','lineHeight','spacing','rect','opacity']:assert ga[key][prop]==gb[key][prop],(name,key,prop)
 outside=changes(rgb(before/'outside-copy.png'),rgb(after/'outside-copy.png'));assert outside==0,(name,'Outside copy',outside)
 im0=rgb(before/'page-7.png');im1=rgb(after/'page-7.png')
 def region(r):return (slice(max(0,int(r['top'])),int(np.ceil(r['bottom']))),slice(max(0,int(r['left'])),int(np.ceil(r['right']))))
 protected={}
 for key in ['title','rail']:
  s=region(gb[key]['rect']);protected[key]=changes(im0[s],im1[s]);assert protected[key]==0,(name,key)
 rects=[x['rect'] for x in gb['cloud']];cloud={'left':min(r['left'] for r in rects),'right':max(r['right'] for r in rects),'top':min(r['top'] for r in rects),'bottom':max(r['bottom'] for r in rects)}
 s=region(cloud);protected['cloud']=changes(im0[s],im1[s]);assert protected['cloud']==0,(name,'cloud')
 if b['width']>700:
  protected['rightScene']=changes(im0[:,int(b['width']*.47):],im1[:,int(b['width']*.47):]);assert protected['rightScene']==0
  # Probe the real raster at every internal rectangle edge of each feather.
  s0=rgb(before/'background-scene.png');s1=rgb(after/'background-scene.png');edgeDiff=[]
  for key in ['body','ending']:
   e=gb[key];r=e['rect'];size=float(e['size'].replace('px',''));top=r['top']-1.4*size;bottom=r['bottom']+1.4*size;right=r['right']+.5*size
   for y in [int(np.floor(top))-1,int(np.ceil(bottom))+1]:edgeDiff.append(changes(s0[y:y+1,:int(right)+1],s1[y:y+1,:int(right)+1]))
   x=int(np.ceil(right))+1;edgeDiff.append(changes(s0[max(0,int(top)):int(bottom)+1,x:x+1],s1[max(0,int(top)):int(bottom)+1,x:x+1]))
  assert all(v==0 for v in edgeDiff),(name,'Visible gradient rectangle boundary',edgeDiff);protected['gradientBoundaryChangedPixels']=edgeDiff
 results['page07'].append({'case':name,'outsideCopyChangedPixels':outside,'typographyAndGeometryUnchanged':True,'consentDialogUnchanged':True,'protected':protected})
(base/'scope-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2));print(json.dumps(results,ensure_ascii=False,indent=2))
