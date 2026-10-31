"""Derive web assets only; preserve all approved PNG bytes and dimensions."""
from pathlib import Path
from PIL import Image
import hashlib,json,math,os,shutil,subprocess
import numpy as np
root=Path(__file__).resolve().parents[1]
out=root/'src/assets/final-backgrounds';out.mkdir(parents=True,exist_ok=True)
rows=[]
for n in range(1,8):
 p=root/f'background/page{n:02}.png';sha=hashlib.sha256(p.read_bytes()).hexdigest();im=Image.open(p);dst=out/f'page{n:02}.webp'
 encoder=os.environ.get('FLOW_CWEBP') or shutil.which('cwebp')
 if encoder:subprocess.run([encoder,'-quiet','-near_lossless','60','-q','80','-m','4','-metadata','icc',str(p),'-o',str(dst)],check=True)
 else:im.save(dst,'WEBP',lossless=True,exact=True,method=6,icc_profile=im.info.get('icc_profile',b''))
 a=np.asarray(im.convert('RGB'),dtype=float);b=np.asarray(Image.open(dst).convert('RGB'),dtype=float)
 mse=float(np.mean((a-b)**2));psnr=10*math.log10(255**2/mse) if mse else 100
 assert Image.open(dst).size==im.size
 assert np.max(np.abs(a-b))<=2
 assert hashlib.sha256(p.read_bytes()).hexdigest()==sha
 rows.append(dict(page=n,source=str(p.relative_to(root)),web=str(dst.relative_to(root)),width=im.width,height=im.height,sourceBytes=p.stat().st_size,webBytes=dst.stat().st_size,sourceSha256=sha,encoding='WebP near-lossless60, quality80, method4' if encoder else 'WebP lossless method6',maxChannelError=int(np.max(np.abs(a-b))),psnrDb=round(psnr,2)))
 print(n,p.stat().st_size,'->',dst.stat().st_size,round(psnr,2),flush=True)
(root/'docs/final-background-assets.json').write_text(json.dumps(rows,indent=2,ensure_ascii=False)+'\n')
lines=["import type {Page} from './session';","/** Approved clean artwork. Originals: experience/background/page01–07.png. */","export const backgroundAssets:Record<Page,{plate:string;artwork?:string}>={"]
for r in rows:lines.append(f" {r['page']}:{{plate:new URL('./assets/final-backgrounds/page{r['page']:02}.webp',import.meta.url).href}},")
lines.append('};');(root/'src/backgroundAssets.ts').write_text('\n'.join(lines)+'\n')
