"""Source-declared projection/crop conversion, NOT a new city-point fit.

327/383/409 Zunkir diagrams (CC BY-SA 4.0) show only part of Eastern Jin.
383's undated counter-attack border is deliberately excluded. Modern lakes are
independent checks only; original city icons are not georeferencing controls.
"""
import base64, hashlib, json, re
from pathlib import Path
import xml.etree.ElementTree as ET
from shapely.geometry import Polygon, Point, box, shape, mapping
from shapely.ops import substring, nearest_points, transform
from shapely.affinity import scale
from pyproj import Geod
from svg_paths import svg_polygon, svg_polyline

ROOT = Path(__file__).resolve().parents[2]
VERSION = 'zunkir-eastern-jin-dated'


def checked_file(relative, expected):
    file = ROOT/'data'/relative
    if hashlib.sha256(file.read_bytes()).hexdigest() != expected:
        raise ValueError(f'Source revision changed: {relative}')
    return file


def filled_path(d):
    # SVG fill closes each M subpath implicitly, unlike an open border stroke.
    return svg_polygon(' '.join(c.strip()+('' if c.strip()[-1] in 'zZ' else ' Z')
                               for c in re.split(r'(?=M)', d) if c.strip()))


def extract():
    config = json.loads((ROOT/'data/registration/eastern-jin-dated.json').read_text())
    base = ET.parse(checked_file(config['baseFile'], config['baseSha256'])).getroot()
    lakes = json.loads(checked_file(config['lakeFile'], config['lakeSha256']).read_text())['features']
    span = config['longitudeEast']-config['longitudeWest']
    factor = config['width']/920
    def lonlat(x, y, z=None):
        return config['longitudeWest']+x*span/config['width'], config['latitudeTop']-y*span/(config['width']*config['scaleY'])
    def base_path(id):
        return next(p for p in base.iter() if p.get('id') == id)
    checks = []
    for id, name in config['checks'].items():
        center = filled_path(base_path(id).get('d')).centroid
        pixel = [center.x*factor, center.y*factor*config['scaleY']]
        predicted = lonlat(*pixel)
        reference = shape(next(f for f in lakes if f['properties']['name'] == name)['geometry']).centroid
        error = Geod(ellps='WGS84').inv(*predicted, reference.x, reference.y)[2]/1000
        checks.append({'sourcePathId':id, 'name':name, 'pixel':pixel, 'predicted':predicted, 'reference':[reference.x,reference.y], 'errorKm':error})
    max_error = max(c['errorKm'] for c in checks)
    if len(checks) < 4 or max_error > config['maxCheckErrorKm']:
        raise ValueError('Independent declared-projection checks failed')
    frame = box(0,0,config['width'],config['height'])
    ocean = scale(filled_path(base_path('ocean_1').get('d')), xfact=factor, yfact=factor*config['scaleY'], origin=(0,0))
    land = frame.difference(ocean)
    mainland = max(land.geoms, key=lambda p:p.area)
    features, reports = [], []
    for text_year, item in config['years'].items():
        year = int(text_year)
        source = ET.parse(checked_file(item['file'], item['sha256'])).getroot()
        image = next(p for p in source.iter() if p.get('id') == 'image10')
        if any(float(image.get(k, '0')) != v for k,v in {'x':0,'y':0,'width':2000,'height':1335}.items()) or image.get('transform'):
            raise ValueError('Embedded source crop placement changed')
        href = image.get('{http://www.w3.org/1999/xlink}href')
        if hashlib.sha256(base64.b64decode(href.split(',',1)[1])).hexdigest() != config['backgroundSha256']:
            raise ValueError('Source background changed')
        def stroke(id):
            element = next(p for p in source.iter() if p.get('id') == id)
            if element.get('transform'):
                raise ValueError('Boundary transform requires explicit review')
            return svg_polyline(element.get('d'))
        north = stroke('path2987')
        gaps = []
        if year == 383:
            west = stroke('path3911')
            a,b = nearest_points(north,west)
            gaps.append(a.distance(b))
            north = substring(north,0,north.project(a))
            west = substring(west,west.project(b),west.length)
            trace = list(north.coords)+list(west.coords)
        elif year == 327:
            west,south = stroke('path2989'),stroke('path3075')
            a,b = nearest_points(north,west)
            c,d = nearest_points(west,south)
            gaps.extend([a.distance(b),c.distance(d)])
            north = substring(north,0,north.project(a))
            west = substring(west,west.project(b),west.project(c))
            south = substring(south,south.project(d),south.length)
            trace = list(north.coords)+list(west.coords)+list(south.coords)
        else:
            trace = list(north.coords)
        if any(gap > config['maxJunctionGapPx'] for gap in gaps):
            raise ValueError('Source stroke junction exceeds reviewed tolerance')
        pixels = Polygon(trace+[(config['width'],config['height']),(config['width'],trace[0][1])]).intersection(mainland)
        if pixels.geom_type != 'Polygon' or not pixels.is_valid or not Point(1200,975).within(pixels):
            raise ValueError('Source polity label is outside selected polygon')
        pixels = pixels.simplify(.2, preserve_topology=True)
        # Frame closure is a data extent, not a historical border. Remove it
        # from the displayed boundary but retain the original mainland coast.
        lines = pixels.boundary.difference(frame.boundary.buffer(.01))
        if lines.geom_type == 'LineString':
            line_coordinates = [list(transform(lonlat,lines).coords)]
        else:
            line_coordinates = [list(transform(lonlat,line).coords) for line in lines.geoms if line.geom_type == 'LineString']
        geometry = transform(lonlat,pixels)
        if not geometry.is_valid:
            raise ValueError('Converted polygon invalid')
        evidence = [
            {'sourceId':f'commons-eastern-jin-{year}','locator':'; '.join(item['boundaryPathIds'])+'；Jin orientaux标签；原图年份标题','note':'原图部分图幅的争议复原轮廓，非全年实控审定；所列书目尚未逐页独立核对。383年只取战前红线，反击后棕线无明确年份，排除。'},
            {'sourceId':'commons-eastern-china-relief','locator':'SVG 920×1006；scale(1,1.17)；三图共享2000×1335嵌入底图；data/registration/eastern-jin-dated.json','note':'按作者声明的等距圆柱投影及同源放大裁切转换，非城市点拟合。Geobox页面N/S颠倒；以独立湖泊检查确认方向。'},
            {'sourceId':'natural-earth-registration-lakes','locator':config['lakeFile']+'；青海湖、太湖、洪泽湖、鄱阳湖','note':'四个现代湖泊重心仅作独立坐标检查，均未参与拟合。不是历史政治边界。'},
        ]
        note = '东晋仅录入原图部分图幅；约27.55°N以南及图外疆域待补，截断处不作国界。'
        features.append({'type':'Feature','geometry':mapping(geometry),'properties':{
            'id':f'jin-{year}-partial-reconstruction','entityId':'jin','regionIds':['china-core'],
            'validity':{'start':{'earliest':f'{year:04d}-01-01','latest':f'{year:04d}-01-01'},'endExclusive':{'earliest':f'{year+1:04d}-01-01','latest':f'{year+1:04d}-01-01'},'precision':'year','label':item['label']+' · 争议复原；非全年实控'},
            'temporalSupport':'snapshot','snapshotYear':year,'relation':'reconstruction','spatialPrecision':'disputed','interpretationId':VERSION,'evidence':evidence,
            'review':{'status':'verified','reviewerKind':'agent','reviewer':'Codex（来源轮廓与坐标转换复核，非历史专家审定）','checkedAt':'2026-10-06','evidence':evidence},
            'compilation':{'method':'原始SVG边界曲线采样；按作者声明的等距圆柱投影和117%南北伸长还原；同源底图岸线裁切连续大陆；不外推其他年份。','sourceScale':None,'controlPoints':[],'errorNote':f'四个独立湖泊检查最大残差{max_error:.2f}公里，只验证所查自然地理点，不是全图或历史边界精度。原图城市标点有明显偏位，未用于配准或地点。原图历史轮廓仍待专业复核。','extent':'partial-source','extentNote':note,'boundaryGeometry':{'type':'MultiLineString','coordinates':line_coordinates}}
        }})
        reports.append({'year':year,'featureId':features[-1]['properties']['id'],'sourceSha256':item['sha256'],'boundaryPathIds':item['boundaryPathIds'],'excludedPathIds':item['excludedPathIds'],'junctionGapsPx':gaps,'pixelArea':pixels.area,'bounds':list(geometry.bounds),'extent':'partial-source'})
    report={'interpretationId':VERSION,'features':len(features),'registrationMethod':'source-declared projection and identified crop; no fitted parameters','baseSha256':config['baseSha256'],'embeddedBackgroundSha256':config['backgroundSha256'],'orientationCorrection':config['sourcePageCorrection'],'checks':checks,'maxCheckErrorKm':max_error,'registrationGateKm':config['maxCheckErrorKm'],'records':reports,'limitations':'图幅南部缺失；只编制所标年份的东晋部分图幅；不证明全年实控。旧383城市点试配仍保留为失败；本次不使用其拟合或误差结果。395图caption/filename年份矛盾未采纳。'}
    return features, report


if __name__ == '__main__':
    features,report=extract()
    (ROOT/'data/derived/eastern-jin-dated.geojson').write_text(json.dumps({'type':'FeatureCollection','features':features},ensure_ascii=False,indent=2)+'\n')
    (ROOT/'data/audits/eastern-jin-dated-intake.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'features':len(features),'maxCheckErrorKm':report['maxCheckErrorKm'],'years':[r['year'] for r in report['records']]}))
