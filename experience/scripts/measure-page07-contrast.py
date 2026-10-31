"""Raster probes at actual browser glyph cores, not a flat backdrop colour.
Report both the scene alone and the rendered local text shadow/compensation.
These measurements are a conservative raster sample, not WCAG certification.
"""
from pathlib import Path
from PIL import Image
import numpy as np,json,re,sys
root=Path(__file__).resolve().parents[1]
phase=sys.argv[1] if len(sys.argv)>1 else 'before'
base=root/'artifacts/page07-readability'/phase

def lum(rgb):
 v=rgb/255.;return np.where(v<=.04045,v/12.92,((v+.055)/1.055)**2.4)@np.array([.2126,.7152,.0722])
rows=[]
for d in sorted(base.glob('*-*')):
 p=d/'results.json'
 if not p.exists():continue
 result=json.loads(p.read_text());g=result['geometry'];mask=np.asarray(Image.open(d/'glyph-mask.png').convert('RGB'))[:,:,0]>200
 scenes={n:np.asarray(Image.open(d/f'background-{n}.png').convert('RGB')).astype(float) for n in ['scene','with-shadow']}
 groups=[('body-1',g['paragraphs'][0]),('body-2',g['paragraphs'][1]),('ending',g['ending'])]
 readings=[]
 for name,meta in groups:
  r=meta['rect'];region=np.zeros(mask.shape,dtype=bool);x0,y0=int(r['left']),int(r['top']);x1,y1=int(np.ceil(r['right'])),int(np.ceil(r['bottom']));region[max(0,y0):y1,max(0,x0):x1]=True
  glyphs=mask&region;foreground=np.array([float(x) for x in re.findall(r'[\d.]+',meta['color'])][:3]);fg=lum(foreground)
  entry={'group':name,'glyphCorePixels':int(glyphs.sum()),'color':meta['color'],'opacity':meta['opacity'],'fontSize':meta['size'],'text':meta['text']}
  assert glyphs.sum()>100,(d,name,'Invalid glyph mask')
  for scene,pixels in scenes.items():
   bg=lum(pixels[glyphs]);ratio=(np.maximum(fg,bg)+.05)/(np.minimum(fg,bg)+.05)
   entry[scene]={'minimum':round(float(ratio.min()),3),'p05':round(float(np.percentile(ratio,5)),3),'median':round(float(np.median(ratio)),3),'pctAtLeast4_5':round(float(np.mean(ratio>=4.5)*100),2)}
  readings.append(entry)
 rows.append({'case':d.name,'readings':readings})
 print(d.name,[(e['group'],e['scene'],e['with-shadow']) for e in readings])
(base/'contrast.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
