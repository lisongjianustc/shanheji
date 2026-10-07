"""Four dated source contours for actual annual gaps; no interval extension.

SVG strokes are open, so only explicitly reviewed junctions may be connected.
A clipped frame is excluded from the displayed historical border. Source city
icons are not controls; source text positions only choose/validate polity areas.
"""
import base64, hashlib, json, sys
import xml.etree.ElementTree as ET
from pathlib import Path
from shapely.geometry import Polygon, Point, LineString, box, mapping
from shapely.affinity import scale
from shapely.ops import substring, nearest_points, transform, polygonize, unary_union
from import_eastern_jin_dated import checked_file, filled_path, extract as shared_extract
from svg_paths import svg_polyline

ROOT = Path(__file__).resolve().parents[2]
VERSION = 'zunkir-jin-gap-snapshots'


def join(*lines):
    coordinates = []
    for line in lines:
        values = list(line.coords)
        # A shared intersection must be exactly one vertex, avoiding a floating
        # point sliver. Distinct reviewed junctions remain explicit small links.
        if coordinates and Point(coordinates[-1]).distance(Point(values[0])) < 1e-6:
            values = values[1:]
        coordinates += values
    return coordinates


def close_by_coast(trace, mainland, frame, label, max_gap):
    start, end = Point(trace[0]), Point(trace[-1])
    _, a = nearest_points(end, mainland.exterior)
    _, b = nearest_points(start, mainland.exterior)
    gaps = [end.distance(a), start.distance(b)]
    if max(gaps) > max_gap:
        raise ValueError('Reviewed stroke-to-coast tolerance exceeded')
    ring = mainland.exterior
    da, db = ring.project(a), ring.project(b)
    direct = list(substring(ring, da, db).coords)
    if da < db:
        other = join(substring(ring, da, 0), substring(ring, ring.length, db))
    else:
        other = join(substring(ring, da, ring.length), substring(ring, 0, db))
    candidates = [Polygon(trace+c) for c in [direct, other]]
    chosen = [p for p in candidates if p.is_valid and p.contains(Point(*label))
              and p.boundary.intersection(frame.boundary).length < .001]
    if len(chosen) != 1:
        raise ValueError('Source label does not select one closed, uncut coast contour')
    return chosen[0], gaps


def extract():
    config = json.loads((ROOT/'data/registration/jin-gap-snapshots.json').read_text())
    shared = json.loads((ROOT/config['sharedRegistration']).read_text())
    _, registration = shared_extract()  # Fresh four-lake checks, no fitting.
    base = ET.parse(checked_file(shared['baseFile'], shared['baseSha256'])).getroot()
    ocean = filled_path(next(p for p in base.iter() if p.get('id') == 'ocean_1').get('d'))
    entities = {e['id']:e for e in json.loads((ROOT/'data/catalog/entities.json').read_text())}
    features, records = [], []
    sources, lands = {}, {}
    for item in config['records']:
        year, entity = item['year'], item['entityId']
        source_config = config['westernJin'] if year == 280 else shared['years'][str(year)]
        width, height = (920, 1006) if year == 280 else (2000, 1335)
        if year not in sources:
            source = ET.parse(checked_file(source_config['file'], source_config['sha256'])).getroot()
            sources[year] = source
            image = next(p for p in source.iter() if p.get('id') == 'image10')
            if image.get('transform') or any(float(image.get(k, '0')) != v for k,v in
                {'x':0, 'y':0, 'width':width, 'height':height}.items()):
                raise ValueError('Unreviewed source background placement')
            expected = source_config['backgroundSha256'] if year == 280 else shared['backgroundSha256']
            raw = base64.b64decode(image.get('{http://www.w3.org/1999/xlink}href').split(',',1)[1])
            if hashlib.sha256(raw).hexdigest() != expected:
                raise ValueError('Source background revision changed')
            land = box(0,0,width,height).difference(scale(ocean, xfact=width/920,
                yfact=width/920*shared['scaleY'], origin=(0,0)))
            # Same 0.2px topology-preserving display simplification as the prior
            # import. Simplifying before union avoids excessive coastline nodes.
            lands[year] = max(land.geoms, key=lambda p:p.area).simplify(.2, preserve_topology=True)
        frame, mainland = box(0,0,width,height), lands[year]
        def stroke(id):
            p = next(p for p in sources[year].iter() if p.get('id') == id)
            if p.get('transform'):
                raise ValueError('Unreviewed boundary transform')
            return svg_polyline(p.get('d'))
        gaps = []
        if year == 280:
            boundaries = [stroke(id).intersection(mainland) for id in item['boundaryPathIds']]
            polygons = list(polygonize(unary_union([mainland.boundary, *boundaries])))
            labels = config['westernJin']['sourceLabelChecks']
            chosen = [p for p in polygons if all(p.contains(Point(*v)) for v in labels)]
            if len(chosen) != 1:
                raise ValueError('Western Jin labels do not select one source area')
            pixels = chosen[0]
            if any(pixels.contains(Point(*v)) for v in config['westernJin']['excludedLabelChecks']):
                raise ValueError('Source outer border includes an excluded northern/western label')
        elif entity == 'han-zhao':
            west, south = stroke('path3759'), stroke('path2987')
            a,b = nearest_points(west,south)
            first,second = substring(west,0,west.project(a)), substring(south,south.project(b),south.length)
            trace = join(first,second)
            gaps = [a.distance(b), Point(trace[0]).distance(Point(trace[-1]))]
            pixels = Polygon(trace)
        elif entity == 'later-zhao':
            north,west,south = [stroke(id) for id in item['boundaryPathIds']]
            a,b = nearest_points(north,west); c,d = nearest_points(west,south)
            crossing = north.intersection(mainland.exterior)
            if crossing.geom_type != 'Point':
                raise ValueError('Unreviewed northern stroke coastal crossing')
            trace = join(substring(north,north.project(crossing),north.project(a)),
                         substring(west,west.project(b),west.project(c)),
                         substring(south,south.project(d),0))
            pixels, coast_gaps = close_by_coast(trace,mainland,frame,item['sourceLabelCheck'],config['maxJunctionGapPx'])
            gaps = [a.distance(b),c.distance(d),*coast_gaps]
        else:
            north,west = [stroke(id) for id in item['boundaryPathIds']]
            a,b = nearest_points(north,west)
            crossing = west.intersection(mainland.exterior)
            if crossing.geom_type != 'MultiPoint' or len(crossing.geoms) != 2:
                raise ValueError('Unreviewed Northern Yan coastal/frame intersections')
            coast = max(crossing.geoms,key=lambda p:west.project(p))
            trace = join(substring(north,north.length,0),substring(west,west.project(b),west.project(coast)))
            pixels,coast_gaps = close_by_coast(trace,mainland,frame,item['sourceLabelCheck'],config['maxJunctionGapPx'])
            gaps = [a.distance(b),*coast_gaps]
        if gaps and max(gaps) > config['maxJunctionGapPx']:
            raise ValueError('Reviewed stroke junction tolerance exceeded')
        if not pixels.is_valid or pixels.geom_type != 'Polygon':
            raise ValueError('Invalid source contour; no automatic repair')
        if 'sourceLabelCheck' in item and not pixels.contains(Point(*item['sourceLabelCheck'])):
            raise ValueError('Source polity label outside compiled area')
        outside = pixels.difference(mainland)
        if outside.difference(mainland.boundary.buffer(config['maxJunctionGapPx'])).area > .01:
            raise ValueError('Area exceeds the reviewed shoreline junction band')
        # Clip only the tiny reviewed stroke/coast junction band against the
        # unchanged source mainland, just as the Eastern Jin source import.
        shoreline_clip_area = outside.area
        pixels = pixels.intersection(mainland)
        original = pixels
        pixels = pixels.simplify(1e-7, preserve_topology=True)
        if pixels.symmetric_difference(original).area > .001:
            raise ValueError('Numerical vertex normalization changed source area')
        if not pixels.is_valid or pixels.geom_type != 'Polygon':
            raise ValueError('Invalid shoreline clip; no automatic repair')
        partial = pixels.boundary.intersection(frame.boundary).length > .01
        span = shared['longitudeEast']-shared['longitudeWest']
        def lonlat(x,y,z=None):
            return shared['longitudeWest']+x*span/width, shared['latitudeTop']-y*span/(width*shared['scaleY'])
        geometry = transform(lonlat,pixels)
        if not geometry.is_valid:
            raise ValueError('Invalid converted geometry; no automatic repair')
        lines = pixels.boundary.difference(frame.boundary.buffer(.01))
        lines = [lines] if lines.geom_type == 'LineString' else list(lines.geoms)
        boundary = {'type':'MultiLineString','coordinates':[list(transform(lonlat,l).coords) for l in lines if l.geom_type == 'LineString']}
        evidence = [
            {'sourceId':item['sourceId'],'locator':'; '.join(item['boundaryPathIds'])+'；'+item['name']+'原图标签；原图年份说明','note':'只保留所标年份的原图外轮廓；争议复原，非全年实控审定。所列书目未逐页独立核对；未录入内部省界、族群标注或无归属岛屿。'},
            {'sourceId':'commons-eastern-china-relief','locator':config['sharedRegistration']+'；data/registration/jin-gap-snapshots.json','note':'按作者声明投影与同源底图转换，无城市点拟合；Geobox南北误写按独立湖泊检查纠正。'},
            {'sourceId':'natural-earth-registration-lakes','locator':shared['lakeFile']+'；四湖独立检查','note':'仅检查自然地理坐标，非历史政治边界证据。'}]
        compilation = {'method':'原SVG明确年代外轮廓；等距圆柱投影及117%南北伸长还原；只连接已复核的源笔画交接，最大3像素；沿同源连续大陆岸线闭合；不外推相邻年份。',
            'sourceScale':None,'controlPoints':[],
            'errorNote':f"共享底图四湖独立检查最大{registration['maxCheckErrorKm']:.2f}公里，不能证明全图或历史边界精度；原图标签只确认区域身份，不作城市坐标控制；专业史学审定待完成。",
            'boundaryGeometry':boundary}
        if not partial:
            del compilation['boundaryGeometry']
        if partial:
            compilation.update({'extent':'partial-source','extentNote':'约280年西晋图幅受99.5°E西侧与42.5°N北侧等裁切限制；图外疆域、岛屿归属待补；截断边不作国界。'})
        prop = {'id':f'{entity}-{year}-gap-reconstruction','entityId':entity,'regionIds':entities[entity]['regionIds'],
            'validity':{'start':{'earliest':f'{year:04d}-01-01','latest':f'{year:04d}-01-01'},'endExclusive':{'earliest':f'{year+1:04d}-01-01','latest':f'{year+1:04d}-01-01'},'precision':'year','label':item['label']+' · 争议复原；非全年实控'},
            'temporalSupport':'snapshot','snapshotYear':year,'relation':'reconstruction','spatialPrecision':'disputed','interpretationId':VERSION,'evidence':evidence,
            'review':{'status':'verified','reviewerKind':'agent','reviewer':'Codex（原图轮廓、来源身份与坐标转换核对；非历史专家审定）','checkedAt':config['checkedAt'],'evidence':evidence},'compilation':compilation}
        features.append({'type':'Feature','geometry':mapping(geometry),'properties':prop})
        records.append({**item,'featureId':prop['id'],'sourceSha256':source_config['sha256'],'junctionGapsPx':gaps,'pixelArea':pixels.area,'shorelineClippedAreaPx2':shoreline_clip_area,'numericalNormalizationPx':1e-7,'bounds':list(geometry.bounds),'partial':partial,'frameBoundaryLengthPx':pixels.boundary.intersection(frame.boundary).length})
    return features, {'checkedAt':config['checkedAt'],'interpretationId':VERSION,'registrationMethod':registration['registrationMethod'],'checks':registration['checks'],'maxCheckErrorKm':registration['maxCheckErrorKm'],'features':len(features),'records':records,'westernJinBackgroundComparison':config['westernJin']['backgroundComparison'],'deferred':config['deferred'],'limitations':'四个政权-年缺口新增来源范围；不代表全部逐年疆域或全年实控，约280年仍只部分图幅。'}


if __name__ == '__main__':
    features, report = extract()
    for relative, value in [('data/derived/jin-gap-snapshots.geojson',{'type':'FeatureCollection','features':features}),('data/audits/jin-gap-snapshots-intake.json',report)]:
        (ROOT/relative).write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')
    if '--apply' in sys.argv:
        for path in (ROOT/'data/packages').glob('*/package.json'):
            pack = json.loads(path.read_text())
            years = [(c['startYear'],c['endYear']) for c in pack['coverage']]
            start,end = min(p[0] for p in years),max(p[1] for p in years)
            previous = pack['territories']
            current = [f for f in previous if f['properties']['interpretationId'] != VERSION]
            current += [f for f in features if start <= f['properties']['snapshotYear'] <= end]
            if current != previous:
                pack['territories'] = current
                path.write_text(json.dumps(pack,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'features':len(features),'records':[(r['year'],r['entityId'],r['partial']) for r in report['records']],'maxCheckErrorKm':report['maxCheckErrorKm']}))
