"""Partial Sui source interpretation, preserving the original western data gap.

Only the fully opaque side of BOTH source gradients and visible canvas is
compiled. Its synthetic clipping edges are never emitted as historical borders.
Original image and its blurred west remain accessible in the source viewer.
"""
import hashlib, json, sys, xml.etree.ElementTree as ET
from pathlib import Path
import numpy as np
from shapely.geometry import Polygon, MultiLineString, mapping, box
from shapely.ops import unary_union, transform
from registration import Registration
from svg_paths import svg_polygon
ROOT=Path(__file__).resolve().parents[2]
CONFIG=ROOT/'data/registration/sui-610.json'
SOURCE_ID='commons-china-610'
INTERPRETATION_ID='yug-610-partial-administration'

def load_config():
    c=json.loads(CONFIG.read_text())
    for path, expected in [(ROOT/'data'/c['input'],c['sha256']),(ROOT/'data/sources/natural-earth/registration-lakes.geojson',c['referenceSha256'])]:
        if hashlib.sha256(path.read_bytes()).hexdigest()!=expected:
            raise ValueError('Source revision changed; recheck registration and gradients')
    return c

def load_registration():
    c=load_config()
    return Registration(c['controls'],c['crs'],c['maxCheckErrorKm'])

def source_geometries():
    c=load_config()
    root=ET.parse(ROOT/'data'/c['input']).getroot()
    layers={e.get('id'):e for e in root.iter() if e.get('id')}
    candidate=svg_polygon(layers['Sui ~610'].get('d'))
    land=unary_union([svg_polygon(layers[k].get('d')) for k in ('path2240','path2296')])
    water=unary_union([svg_polygon(e.get('d')) for e in layers.values() if e.tag.endswith('path') and e.get('d') and e.get('style','').find('fill:#9ec7f3')>=0 and e.get('d').rstrip().endswith(('z','Z'))])
    base=candidate.intersection(land).difference(water).simplify(.1,preserve_topology=True)
    extent=box(0,0,1000,850)
    for id in ('linearGradient7461','linearGradient8438'):
        gradient=layers[id]
        p1=np.array([float(gradient.get(k)) for k in ('x1','y1')])
        p2=np.array([float(gradient.get(k)) for k in ('x2','y2')])
        vector=(p2-p1)/np.linalg.norm(p2-p1)
        side=np.array([-vector[1],vector[0]])*10000
        far=vector*10000
        extent=extent.intersection(Polygon([p1+side,p1-side,p1-side-far,p1+side-far]))
    return base,extent

def rounded_geometry(g):
    return json.loads(json.dumps(mapping(g)),parse_float=lambda v:round(float(v),6))

def extract_features():
    c=load_config(); reg=load_registration();base,extent=source_geometries()
    geometry=base.intersection(extent)
    border=base.boundary.intersection(extent)
    if border.geom_type=='LineString':border=MultiLineString([border])
    else:border=MultiLineString([g for g in border.geoms if g.geom_type=='LineString' and g.length>0])
    geometry=transform(reg.to_lonlat,geometry);border=transform(reg.to_lonlat,border)
    if geometry.is_empty or not geometry.is_valid or border.is_empty:raise ValueError('Invalid partial source geometry')
    evidence=[{'sourceId':SOURCE_ID,'locator':'SVG Sui ~610；linearGradient7461、linearGradient8438；Commons Summary西部blur说明','note':'仅编制两条渐隐梯度均完全不透明的部分，并限制在原画布；不补齐模糊西部，不把资料裁切线作为历史国界。'},
              {'sourceId':'natural-earth-registration-lakes','locator':'六个拟合湖泊、四个独立检验湖泊；data/registration/sui-610.json','note':'只用于近似配准现代自然地理，不提供隋朝历史疆界。'}]
    error=f'部分来源范围：西部渐隐区域与画布外范围未录入，资料裁切边缘不绘制国界。四个独立检验点最大配准残差约{reg.max_check_km:.1f}公里（其中斋桑湖偏差较大）；不是全图误差上限或历史边界精度。约610年行政参考，不代表全年实控；所据原书图幅及周边政权未完成专家核对。'
    return [{'type':'Feature','geometry':rounded_geometry(geometry),'properties':{
      'id':'sui-610-partial-administration','entityId':'sui','regionIds':['china-core','southeast-asia'],
      'validity':{'start':{'earliest':'0610-01-01','latest':'0610-01-01'},'endExclusive':{'earliest':'0611-01-01','latest':'0611-01-01'},'precision':'year','label':'约610年图幅 · 隋朝行政参考（部分范围；西部未录入，不代表全年实控）'},
      'temporalSupport':'snapshot','snapshotYear':610,'relation':'administration','spatialPrecision':'disputed','interpretationId':INTERPRETATION_ID,
      'evidence':evidence,'review':{'status':'verified','reviewerKind':'agent','reviewer':'Codex（来源图幅一致性复核，非历史专家审定）','checkedAt':'2026-10-05','evidence':evidence},
      'compilation':{'method':'原SVG M/L/C/Z显式解析；贝塞尔曲线按控制折线长度以不大于0.5px步长采样，直线2px步长；原图陆地与湖泊遮罩、0.1px保拓扑简化；仅保留填充与描边渐隐梯度的完全不透明侧，裁切画布；LCC23/45六参数仿射配准；边线来自裁切前轮廓，独立保存以排除人工裁切闭合线。','sourceScale':None,'controlPoints':[p['coordinates'] for p in c['controls'] if p['role']=='fit'],'errorNote':error,'extent':'partial-source','boundaryGeometry':rounded_geometry(border)}
    }}]

if __name__=='__main__':
    features=extract_features();reg=load_registration();base,extent=source_geometries()
    output=ROOT/'data/derived/sui-610.geojson'
    output.write_text(json.dumps({'type':'FeatureCollection','features':features},ensure_ascii=False,indent=2)+'\n')
    report={'sourceId':SOURCE_ID,'sha256':load_config()['sha256'],'interpretationId':INTERPRETATION_ID,'features':len(features),'scope':'partial-source','included':'仅原图填充、描边都不透明且画布内部分；保留原图陆地与湖泊','excluded':'西部渐隐、画布外、现代国界、省界、文字标签、所有邻国疆域；裁切线不输出边界','syntheticClosurePixelLength':base.intersection(extent).boundary.difference(base.boundary.buffer(.01)).length,'registration':reg.report(),'historicalAccuracy':'disputed; source consistency only; no historical expert validation','output':str(output.relative_to(ROOT))}
    report['registration']['accuracyMeaning']='现代湖泊形状与原底图不同会影响配准；四个独立检查的残差不是全图误差上限，更不是历史边界精度'
    (ROOT/'data/audits/sui-610-intake.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(report,ensure_ascii=False))
