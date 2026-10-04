"""Reproduce a disputed cartographic interpretation; never infer annual control.

Input: Kanguole, Tang outline map, 661.svg, revision 2024-03-27.
CC BY-SA 4.0. See data/sources/commons/README.md.
Only the civil, military, and western claim polygons are imported. The separate
Korean polygon shares the source's client class but has a different historical
meaning, so it is excluded pending a separate relation review.
"""
import hashlib
import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path
from shapely.geometry import Polygon, GeometryCollection, mapping
from shapely.ops import unary_union, transform
from shapely import make_valid

ROOT = Path(__file__).resolve().parents[2]
INPUT = ROOT / 'data/sources/commons/tang-661.svg'
INPUT_SHA256 = '2c04b2d23d26cbc505d52b4d842f7906395cab4a9f984da44b29b2c8a81bfeee'
SOURCE_ID = 'commons-kanguole-tang-661'
INTERPRETATION_ID = 'kanguole-661-disputed'
# From the original SVG canvas/translation and the stated geographic bounds.
# Raw coordinates precede SVG scale(1,-1) and translation.
X_SCALE = 1288.373251824464 / (130 - 61)
Y_SCALE = 756.9725373942604 / (50 - 16)

def svg_to_lonlat(x, y, z=None):
    return x / X_SCALE, y / Y_SCALE

def polygonal(g):
    if g.geom_type in ('Polygon','MultiPolygon'): return g
    return unary_union([x for x in g.geoms if x.geom_type in ('Polygon','MultiPolygon')])

def geometry(el):
    if el.tag.endswith('polygon'):
        return make_valid(Polygon([tuple(map(float,p.split(','))) for p in el.attrib['points'].split()]))
    if el.tag.endswith('path'):
        d=el.attrib['d']
        if set(re.findall('[A-Za-z]',d)) - set('MLZmlz'):
            raise ValueError('Unsupported SVG path command; do not approximate silently')
        if any(c in d for c in 'ml'):
            raise ValueError('Relative path requires explicit handling')
        result=GeometryCollection()
        for part in re.split('[Mm]',d)[1:]:
            nums=list(map(float,re.findall(r'-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?',part)))
            if len(nums)%2: raise ValueError('Unpaired SVG coordinate')
            ring=make_valid(Polygon(list(zip(nums[::2],nums[1::2]))))
            result=result.symmetric_difference(ring) # original fill-rule=evenodd
        return polygonal(result)
    return GeometryCollection()

def extract_features():
    if hashlib.sha256(INPUT.read_bytes()).hexdigest() != INPUT_SHA256:
        raise ValueError('Source revision changed; review polygon order and projection before importing')
    root=ET.parse(INPUT).getroot()
    layers={e.get('id'):e for e in root.iter() if e.get('id')}
    water=unary_union([geometry(e) for key in ['ne_50m_ocean','ne_50m_lakes','ne_50m_lakes_historic'] for e in layers[key].iter() if e.tag.endswith(('polygon','path'))])
    polys=[e for e in layers['Tang_661'].iter() if e.tag.endswith('polygon')]
    chosen=[(polys[0],'civil','administration','原图民政范围'),(polys[3],'military','administration','原图安西军事行政范围'),(polys[1],'western-claim','claim','原图西部主张范围（不代表实际控制）')]
    result=[]
    for el,slug,relation,label in chosen:
        g=polygonal(geometry(el).difference(water))
        g=transform(svg_to_lonlat,g)
        if g.is_empty or not g.is_valid: raise ValueError('Invalid converted geometry')
        evidence=[{'sourceId':SOURCE_ID,'locator':f'SVG Tang_661 / {el.attrib["class"]}; '+label,'note':'仅核对本来源版本的几何和图例；原图有历史准确性争议，未作专家审定。'}]
        result.append({'type':'Feature','geometry':mapping(g),'properties':{
          'id':f'tang-661-{slug}','entityId':'tang','regionIds':['central-asia'] if slug!='civil' else ['china-core','central-asia','southeast-asia'],
          'validity':{'start':{'earliest':'0661-01-01','latest':'0661-01-01'},'endExclusive':{'earliest':'0662-01-01','latest':'0662-01-01'},'precision':'year','label':f'661年图幅 · {label}；不代表全年持续状态'},
          'temporalSupport':'snapshot','snapshotYear':661,'relation':relation,'spatialPrecision':'disputed','interpretationId':INTERPRETATION_ID,
          'evidence':evidence,'review':{'status':'verified','reviewerKind':'agent','reviewer':'Codex（来源图幅一致性复核，非历史真实性定论）','checkedAt':'2026-10-03','evidence':evidence},
          'compilation':{'method':'从原SVG保留的等距圆柱坐标逆变换至经纬度；按原图海洋及湖泊遮罩裁切，分离行政与主张，不插值。','sourceScale':None,'controlPoints':[[61,50],[130,16]],'errorNote':'原图属小比例尺近似重建，存在边界争议；坐标变换精度不等于历史边界精度。遮罩沿用原图现代自然地理；本版本尚缺周边政权，未作为实控范围。'}
        }})
    return result

if __name__=='__main__':
    output=ROOT/'data/derived/tang-661.geojson'
    output.parent.mkdir(parents=True,exist_ok=True)
    features=extract_features()
    output.write_text(json.dumps({'type':'FeatureCollection','features':features},ensure_ascii=False,indent=2)+'\n')
    report={'input':str(INPUT.relative_to(ROOT)),'sha256':hashlib.sha256(INPUT.read_bytes()).hexdigest(),'features':len(features),'interpretationId':INTERPRETATION_ID,'relations':[f['properties']['relation'] for f in features],'excluded':'admin_client的朝鲜半岛单独多边形；关系口径待复核','historicalAccuracy':'disputed','checked':'source geometry and layer interpretation only','geographicBounds':[61,16,130,50],'inverseScale':[X_SCALE,Y_SCALE],'output':str(output.relative_to(ROOT))}
    (ROOT/'data/audits/tang-661-intake.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(report,ensure_ascii=False))
