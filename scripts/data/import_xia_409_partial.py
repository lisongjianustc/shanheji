"""409 Xia source footprint, omitting unsupported SVG stroke junctions.

The temporary closed ring is bookkeeping only. Larger-than-reviewed connections
and their surrounding bands are removed from both fill and displayed border.
Never extend this snapshot to the neighbouring years or change existing imports.
"""
import json
import sys
import xml.etree.ElementTree as ET
from pathlib import Path
from shapely.geometry import Polygon, Point, LineString, mapping
from shapely.ops import nearest_points, substring, unary_union, transform
from import_eastern_jin_dated import checked_file, extract as shared_extract
from import_jin_gap_snapshots import join
from svg_paths import svg_polyline

ROOT = Path(__file__).resolve().parents[2]


def extract():
    config = json.loads((ROOT/'data/registration/xia-409-partial.json').read_text())
    shared = json.loads((ROOT/config['sharedRegistration']).read_text())
    _, registration = shared_extract()  # Includes exact shared PNG/hash checks.
    source_config = shared['years'][str(config['sourceYear'])]
    source = ET.parse(checked_file(source_config['file'], source_config['sha256'])).getroot()
    labels = [p for p in source.iter() if p.get('id') == config['sourceLabelId']]
    if len(labels) != 1 or ' '.join(''.join(labels[0].itertext()).split()) != config['sourceLabel']:
        raise ValueError('Source polity identity changed')
    lines = []
    for id in config['boundaryPathIds']:
        element = next(p for p in source.iter() if p.get('id') == id)
        if element.get('transform') or 'fill:none;stroke:#6b0000;' not in element.get('style', ''):
            raise ValueError('Unreviewed source border transform or stroke')
        lines.append(svg_polyline(element.get('d')))
    north, west, south = lines
    a, b = nearest_points(north, west)
    c, d = nearest_points(west, south)
    e, f = nearest_points(south, north)
    pairs = [(a, b), (c, d), (e, f)]
    trace = join(substring(north, north.project(f), north.project(a)),
                 substring(west, west.project(b), west.project(c)),
                 substring(south, south.project(d), south.project(e)))
    candidate = Polygon(trace)
    if not candidate.is_valid:
        raise ValueError('Invalid bookkeeping ring; no automatic repair')
    omitted = []
    junctions = []
    for p, q in pairs:
        gap = p.distance(q)
        large = gap > config['maxReviewedJunctionGapPx']
        junctions.append({'from': [p.x, p.y], 'to': [q.x, q.y], 'gapPx': gap,
                          'status': 'omitted' if large else 'reviewed-short-junction'})
        if large:
            # Entire bookkeeping link is masked, including its endpoints.
            if config['omissionBufferPx'] < gap:
                raise ValueError('Omission band too small for unsupported junction')
            omitted.append(LineString([p, q]).buffer(config['omissionBufferPx']))
    if len(omitted) != 2:
        raise ValueError('Source junction review changed')
    mask = unary_union(omitted)
    pixels = candidate.difference(mask)
    if pixels.geom_type != 'Polygon' or not pixels.is_valid or pixels.is_empty:
        raise ValueError('Invalid partial footprint; no automatic repair')
    if not pixels.contains(Point(*config['sourceLabelCheck'])):
        raise ValueError('Source label outside partial area')
    if any(pixels.contains(Point(*p)) for p in config['excludedLabelChecks']):
        raise ValueError('Partial area includes another polity label')
    # Mask edges are omission limits, not historical political boundaries.
    border = pixels.boundary.difference(mask.buffer(.01))
    span = shared['longitudeEast']-shared['longitudeWest']
    def lonlat(x, y, z=None):
        return (shared['longitudeWest']+x*span/shared['width'],
                shared['latitudeTop']-y*span/(shared['width']*shared['scaleY']))
    geometry = transform(lonlat, pixels)
    if not geometry.is_valid:
        raise ValueError('Invalid transformed geometry')
    border_lines = [border] if border.geom_type == 'LineString' else list(border.geoms)
    display = {'type': 'MultiLineString', 'coordinates': [list(transform(lonlat, l).coords) for l in border_lines if l.geom_type == 'LineString']}
    evidence = [
        {'sourceId': config['sourceId'], 'locator': '; '.join(config['boundaryPathIds'])+'；text3262-7 Xia标签；409年说明与2016-10-02原图版本',
         'note': '只保留409年原图夏（赫连氏）的部分轮廓；两处超过3像素的笔画交接及周围12像素带剔除；不补画缺口，不代表全年实控或专家审定。'},
        {'sourceId': 'commons-eastern-china-relief', 'locator': config['sharedRegistration']+'；data/registration/xia-409-partial.json',
         'note': '按同源底图声明的等距圆柱投影及117%南北伸长转换；沿用独立湖泊检查，不拟合城市。'},
        {'sourceId': 'natural-earth-registration-lakes', 'locator': shared['lakeFile']+'；四湖独立坐标检查',
         'note': '自然地理位置检查不能证明历史疆界准确。'},
    ]
    feature = {'type': 'Feature', 'geometry': mapping(geometry), 'properties': {
        'id': 'xia-409-partial-reconstruction', 'entityId': 'xia', 'regionIds': ['china-core'],
        'validity': {'start': {'earliest': '0409-01-01', 'latest': '0409-01-01'},
                     'endExclusive': {'earliest': '0410-01-01', 'latest': '0410-01-01'},
                     'precision': 'year', 'label': '409年夏（赫连氏）原图部分范围 · 争议复原；非全年实控'},
        'temporalSupport': 'snapshot', 'snapshotYear': 409, 'relation': 'reconstruction',
        'spatialPrecision': 'disputed', 'interpretationId': config['interpretationId'], 'evidence': evidence,
        'review': {'status': 'verified', 'reviewerKind': 'agent', 'reviewer': 'Codex（原图身份、部分笔画与坐标转换核对；非历史专家审定）', 'checkedAt': config['checkedAt'], 'evidence': evidence},
        'compilation': {'method': '原SVG三条边线的部分范围；按声明投影转换；超过3像素的未连接交接剔除12像素带，不放宽交接门槛、不外推年份。',
                        'sourceScale': None, 'controlPoints': [], 'errorNote': f"四湖独立检查最大{registration['maxCheckErrorKm']:.2f}公里，非历史疆界精度；原图所据书目尚未逐页独立核验。",
                        'extent': 'partial-source', 'extentNote': config['reason'], 'boundaryGeometry': display},
    }}
    report = {'checkedAt': config['checkedAt'], 'featureId': feature['properties']['id'],
              'sourceSha256': source_config['sha256'], 'interpretationId': config['interpretationId'],
              'sourceLabel': config['sourceLabel'], 'boundaryPathIds': config['boundaryPathIds'],
              'junctions': junctions, 'omissionBufferPx': config['omissionBufferPx'],
              'omittedAreaPx2': candidate.area-pixels.area, 'pixelArea': pixels.area,
              'bounds': list(geometry.bounds), 'checks': registration['checks'],
              'maxCheckErrorKm': registration['maxCheckErrorKm'], 'limitations': config['reason']}
    return feature, report, {'candidate': candidate, 'mask': mask, 'pixels': pixels, 'border': border}


if __name__ == '__main__':
    feature, report, _ = extract()
    for path, value in [('data/derived/xia-409-partial.geojson', {'type': 'FeatureCollection', 'features': [feature]}),
                        ('data/audits/xia-409-partial-intake.json', report)]:
        (ROOT/path).write_text(json.dumps(value, ensure_ascii=False, indent=2)+'\n')
    if '--apply' in sys.argv:
        for path in (ROOT/'data/packages').glob('*/package.json'):
            pack = json.loads(path.read_text())
            if not any(p['startYear'] <= 409 <= p['endYear'] for p in pack['coverage']):
                continue
            kept = [f for f in pack['territories'] if f['properties']['interpretationId'] != report['interpretationId']]
            if kept+[feature] != pack['territories']:
                pack['territories'] = kept+[feature]
                path.write_text(json.dumps(pack, ensure_ascii=False, indent=2)+'\n')
    print(json.dumps({k: report[k] for k in ['featureId', 'junctions', 'omittedAreaPx2', 'bounds']}, ensure_ascii=False))
