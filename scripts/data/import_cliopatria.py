"""Import reviewed Cliopatria v0.2.1 polity intervals (CC BY 4.0).

Source chronology conflicts are quarantined, never silently re-labelled. Source
intervals are retained as annual reconstructions, not evidence of exact-day control.
"""
import json, hashlib, zipfile, sys
from pathlib import Path
from collections import Counter
from shapely.geometry import shape, mapping, MultiPolygon
ROOT=Path(__file__).resolve().parents[2]
SOURCE='cliopatria-v021'
VERSION='cliopatria-v021-reviewed'
CONFIG=ROOT/'data/sources/cliopatria/intake-config.json'

def read(p): return json.loads(p.read_text())
def write(p,x): p.write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n')
def y(d): return int(d.rsplit('-',2)[0])
def next_year(n): return 1 if n==-1 else n+1
def last_year(v):
 n=y(v['endExclusive']['latest'])
 return (-1 if n==1 else n-1) if v['endExclusive']['latest'].endswith('-01-01') else n
def date(n,s='01-01'): return ('-' if n<0 else '')+str(abs(n)).zfill(4)+'-'+s
def label(a,b):
 def fmt(n): return ('公元前' if n<0 else '')+str(abs(n))
 return fmt(a)+'—'+fmt(b)+'年'
def interval(a,b,text):
 return {'start':{'earliest':date(a),'latest':date(a,'12-31')},'endExclusive':{'earliest':date(next_year(b)),'latest':date(next_year(b))},'precision':'year','label':text}
def features():
 c=read(CONFIG); raw=ROOT/'data/raw/cliopatria-v0.2.1.zip'
 if hashlib.sha256(raw.read_bytes()).hexdigest()!=c['zipSha256']: raise ValueError('Unreviewed source ZIP revision')
 with zipfile.ZipFile(raw) as z: data=z.read(c['zipMember'])
 if hashlib.sha256(data).hexdigest()!=c['geojsonSha256']: raise ValueError('Source member changed')
 return c,json.loads(data)['features']
def select_entity(p,entities,c):
 name=p['Name'];a,b=p['FromYear'],p['ToYear']
 if name=='Han Dynasty':
  if b<9: id='western-han'
  elif a>=25 and b<=220:id='eastern-han'
  else:return None,'汉阶段跨越新莽或220年终点'
 else:id=c['mapping'].get(name)
 if not id:return None,'未在本轮逐条身份映射清单'
 expected=c.get('reviewedIdentities',{}).get(name)
 if expected and p.get('Wikidata')!=expected:return None,'来源身份编号与本轮核对的政权不一致'
 if p['Type']!='POLITY':return None,'关系汇总，不是独立政权'
 if name=='Western Jin' and b>316:return None,'原始名称西晋越过316年；未据此重命名为东晋'
 if name=='Later Zhou' and a<951:return None,'与春秋/战国周王室同名，不能映射五代后周'
 e=entities[id]
 periods=e.get('activePeriods',[e['existence']])
 # Catalog's 220/907 context truncation is a scope limit, not a political lifetime.
 if id in ('goguryeo','baekje','silla') and a<220<=b:a=220
 for v in periods:
  if y(v['start']['earliest'])<=a and last_year(v)>=b:
   # The display name phase is also authoritative, e.g. Western Zhou and Later Jin/Qing.
   if not any(y(n['validity']['start']['earliest'])<=a and last_year(n['validity'])>=b for n in e['names']):
    return None,'来源跨越目录名称阶段'
   return (id,a,b),'accepted'
 return None,'来源区间越过已登记政权存续或阶段'

def extract():
 c,raw=features();entities={e['id']:e for e in read(ROOT/'data/catalog/entities.json')}
 out=[];records=[]
 for i,f in enumerate(raw):
  p=f['properties'];a,b=p['FromYear'],p['ToYear']
  if p['Name'] not in c['mapping'] and p['Name']!='Han Dynasty':continue
  record={'rowIndex':i,'sourceName':p['Name'],'fromYear':a,'toYear':b,'wikidata':p['Wikidata']}
  if b< -2100 or a>1912:continue
  selection,reason=select_entity(p,entities,c)
  if str(i) in c['excludeRows']:selection=None;reason=c['excludeRows'][str(i)]
  if not selection:records.append({**record,'status':'excluded','reason':reason});continue
  id,a,b=selection
  g=shape(f['geometry'])
  if not g.is_valid or g.is_empty or g.geom_type not in ('Polygon','MultiPolygon'):
   records.append({**record,'status':'excluded','reason':'无效源几何；未自动修复'});continue
  part_scope=c.get('componentSelection',{}).get(id)
  if part_scope:
   parts=list(g.geoms) if g.geom_type=='MultiPolygon' else [g]
   kept=[part for part in parts if part.bounds[1]>=part_scope['minLatitude'] and part.bounds[3]<=part_scope['maxLatitude']]
   if not kept:
    records.append({**record,'status':'excluded','reason':'本轮源图组成部分筛选后无可用范围'});continue
   g=MultiPolygon(kept)
   record['componentSelection']={'kept':len(kept),'omitted':len(parts)-len(kept),'note':part_scope['note']}
  g=g.simplify(c['simplificationDegrees'],preserve_topology=True)
  geom=json.loads(json.dumps(mapping(g)),parse_float=lambda n:round(float(n),6))
  simplified=shape(geom)
  delta=g.symmetric_difference(simplified).area
  if not simplified.is_valid or delta>g.area*.001:
   records.append({**record,'status':'excluded','reason':'取整后几何无效或面积偏离'});continue
  ev=[{'sourceId':SOURCE,'locator':f"{c['zipMember']} features[{i}]; Name={p['Name']}; FromYear={p['FromYear']}; ToYear={p['ToYear']}; Wikidata={p['Wikidata']}",
       'note':'采用来源按年区间的政权范围复原；不表示确日格局、实控审定或完整地区覆盖。原始名称与年代未改写；范围保留来源轮廓，未按现代国界裁切。'}]
  prop={'id':f'clio-v021-{i}','entityId':id,'regionIds':entities[id]['regionIds'],
        'validity':interval(a,b,f"{label(a,b)} · Cliopatria疆域复原（年份区间，非确日实控）"),
        'temporalSupport':'interval','snapshotYear':None,'relation':'reconstruction','spatialPrecision':'disputed','interpretationId':VERSION,
        'evidence':ev,'review':{'status':'verified','reviewerKind':'agent','reviewer':'Codex（来源身份、年代和几何检查；非历史专家审定）','checkedAt':c.get('reviewDates',{}).get(p['Name'],'2026-10-05'),'evidence':ev},
        'compilation':{'method':'CC BY 4.0源WGS84轮廓；显式身份映射，整段越界则排除；0.01度保拓扑简化、6位取整；不补界、不沿现代国界裁切、不插值。','sourceScale':None,'controlPoints':[],
                       'errorNote':'研究数据的疆域复原；底层图按不等间距年代采样，细节及政权转折可能缺漏，误差未量化。0.01度简化仅为显示处理，不是历史精度；确日查询不使用按年区间。'}}
  if part_scope:
   prop['compilation'].update({'extent':'partial-source','extentNote':part_scope['note'],
     'boundaryGeometry':{'type':'MultiLineString','coordinates':[ring for polygon in geom['coordinates'] for ring in polygon]}})
   prop['compilation']['method'] += ' 另按配置选取完整源图组成部分，未用纬线裁切或补绘边界。'
   prop['compilation']['errorNote'] += ' '+part_scope['note']
   prop['evidence'][0]['note'] += ' '+part_scope['note']
  out.append({'type':'Feature','geometry':geom,'properties':prop});records.append({**record,'status':'accepted','entityId':id,'featureId':prop['id'],'displayFromYear':a,'displayToYear':b})
 return out,{'sourceId':SOURCE,'sourceVersion':c['version'],'zipSha256':c['zipSha256'],'geojsonSha256':c['geojsonSha256'],'sourceFeatureCount':len(raw),
             'accepted':len(out),'excluded':sum(r['status']=='excluded' for r in records),'entities':len(set(f['properties']['entityId'] for f in out)),
             'records':records,'limitations':'按源区间复原；非全时期、全政权或历史专家审定；排除的条目不自动改名或重画。'}

if __name__=='__main__':
 fs,audit=extract();write(ROOT/'data/derived/cliopatria-reviewed.geojson',{'type':'FeatureCollection','features':fs});write(ROOT/'data/audits/cliopatria-v021-intake.json',audit)
 print(json.dumps({k:audit[k] for k in ['accepted','excluded','entities']}))
 if '--apply' in sys.argv:
  for path in (ROOT/'data/packages').glob('*/package.json'):
   p=read(path);p['territories']=[f for f in p['territories'] if f['properties']['interpretationId']!=VERSION]
   years=[(v['startYear'],v['endYear']) for v in p['coverage']]
   start=min(v[0] for v in years);end=max(v[1] for v in years)
   # Same immutable feature IDs across overlapping packages deduplicate in the scene.
   p['territories'] += [f for f in fs if y(f['properties']['validity']['start']['earliest'])<=end and last_year(f['properties']['validity'])>=start]
   for v in p['coverage']:
    if v['topic']=='territory' and any(v['regionId'] in f['properties']['regionIds'] for f in p['territories'] if f['properties']['interpretationId']==VERSION):
     if 'Cliopatria' not in v['reason']:v['reason']+=' 已加入逐条筛查的Cliopatria年份区间复原；不等于此地区完整疆界。'
   write(path,p)
