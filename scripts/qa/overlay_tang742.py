"""CC BY-SA 3.0 diagnostic adaptation of Yug/Kanguole's 742 map.

Red lines: compiled, unclipped source borders. Blue: 105E data cut, not a border.
Reproduce after node scripts/qa/render-tang742-source.mjs.
"""
import sys, json
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'scripts/data'))
from import_tang_742 import load_registration
reg=load_registration()
f=json.loads((ROOT/'data/derived/tang-742.geojson').read_text())['features'][0]
def pixel(p):
 return tuple(np.array([*reg.forward.transform(*p),1]) @ reg.affine)
im=Image.open(ROOT/'data/raw/742-source.png').convert('RGBA')
draw=ImageDraw.Draw(im)
for line in f['properties']['compilation']['boundaryGeometry']['coordinates']:
 draw.line([pixel(p) for p in line],fill=(220,25,25,255),width=2)
draw.line([pixel((105,float(lat))) for lat in np.linspace(10,50,200)],fill=(20,90,220,255),width=2)
draw.rectangle((5,5,985,35),fill='white')
draw.text((12,12),'742 source check | red: compiled border | blue: 105E DATA LIMIT, not national border',fill='black')
im.convert('RGB').save(ROOT/'docs/qa/screenshots/742-source-overlay.png')
