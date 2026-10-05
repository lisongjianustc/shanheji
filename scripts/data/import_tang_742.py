"""Compile only the dated eastern portion of Yug/Kanguole's 742 circuit map.

CC BY-SA 3.0 derivative. West of 105E is excluded because the source combines
742 with Gaozong-period administration and an approximately 750 empire map.
The meridian clipping edge is a data limit, never emitted as a national border.
"""
import hashlib, json, xml.etree.ElementTree as ET
from pathlib import Path
from shapely.geometry import box, MultiLineString, mapping, Point
from shapely.ops import unary_union, transform
from registration import Registration
from svg_paths import svg_polygon_relative
ROOT = Path(__file__).resolve().parents[2]
SOURCE = 'commons-china-742'
VERSION = 'yug-742-eastern-administration'
CONFIG = ROOT/'data/registration/tang-742.json'
WEST_LIMIT = 105


def load_config():
    c = json.loads(CONFIG.read_text())
    for path, expected in [(ROOT/'data'/c['input'], c['sha256']),
                           (ROOT/'data/sources/natural-earth/registration-lakes.geojson', c['referenceSha256'])]:
        if hashlib.sha256(path.read_bytes()).hexdigest() != expected:
            raise ValueError('Source revision changed; review its geometry and registration')
    return c


def source_geometries():
    c = load_config()
    root = ET.parse(ROOT/'data'/c['input']).getroot()
    layers = {e.get('id'): e for e in root.iter() if e.get('id')}
    # No provincial or modern political border paths are imported.
    candidate = unary_union([svg_polygon_relative(layers[k].get('d')) for k in ['Tang742', 'path6536']])
    land = unary_union([svg_polygon_relative(e.get('d')) for e in layers['land background'].iter() if e.get('d')])
    water = unary_union([svg_polygon_relative(e.get('d')) for e in layers['waterways'].iter()
                        if e.get('d') and 'fill:#9ec7f3' in e.get('style', '')
                        and e.get('d').rstrip().endswith(('z', 'Z'))])
    # Canvas cropping occurs after the border is obtained, to avoid artificial outlines.
    return candidate.intersection(land).difference(water).simplify(.1, preserve_topology=True)


def load_registration():
    c = load_config()
    root = ET.parse(ROOT/'data'/c['input']).getroot()
    layers = {e.get('id'): e for e in root.iter() if e.get('id')}
    for point in c['controls']:
        p = svg_polygon_relative(layers[point['sourcePathId']].get('d')).centroid
        if p.distance(Point(point['pixel'])) > .01:
            raise ValueError('Registration landmark moved in SVG')
    return Registration(c['controls'], c['crs'], c['maxCheckErrorKm'])


def rounded(g):
    return json.loads(json.dumps(mapping(g)), parse_float=lambda n: round(float(n), 6))


def extract():
    c = load_config()
    reg = load_registration()
    base = source_geometries()
    canvas = transform(reg.to_lonlat, box(0, 0, 1000, 850))
    full = transform(reg.to_lonlat, base)
    extent = canvas.intersection(box(WEST_LIMIT, -80, 180, 80))
    geometry = full.intersection(extent)
    border = full.boundary.intersection(extent)
    lines = [border] if border.geom_type == 'LineString' else [g for g in border.geoms if g.geom_type == 'LineString']
    border = MultiLineString(lines)
    if geometry.is_empty or not geometry.is_valid or border.is_empty:
        raise ValueError('Invalid eastern source geometry')
    evidence = [
        {'sourceId': SOURCE, 'locator': 'Commons Summary: main part, Cambridge History Vol.3 map11 p.403; SVG Tang742/path6536',
         'note': '仅105°E以东来源行政参考；西部采用图8和约750年地图，全部排除。105°E是编制裁切限度，不是历史边界。未独立核对原书。'},
        {'sourceId': 'natural-earth-registration-lakes', 'locator': 'data/registration/tang-742.json；六湖拟合、四湖独立检查',
         'note': '逐湖重读本SVG重心；现代湖泊只作配准，不生成历史边界。'}]
    feature = {'type': 'Feature', 'geometry': rounded(geometry), 'properties': {
        'id': 'tang-742-eastern-administration', 'entityId': 'tang', 'regionIds': ['china-core', 'southeast-asia'],
        'validity': {'start': {'earliest': '0742-01-01', 'latest': '0742-01-01'},
                     'endExclusive': {'earliest': '0743-01-01', 'latest': '0743-01-01'},
                     'precision': 'year', 'label': '742年图幅 · 唐代东部行政参考（105°E以东；不代表全年实控）'},
        'temporalSupport': 'snapshot', 'snapshotYear': 742, 'relation': 'administration',
        'spatialPrecision': 'disputed', 'interpretationId': VERSION, 'evidence': evidence,
        'review': {'status': 'verified', 'reviewerKind': 'agent', 'reviewer': 'Codex（原图轮廓与配准一致性复核，非历史专家审定）',
                   'checkedAt': '2026-10-05', 'evidence': evidence},
        'compilation': {'method': '相对及绝对M/L/C/Z显式转换；原填色路径、陆地与湖泊遮罩；0.1px保拓扑简化；LCC23/45仿射转换；仅105°E以东与画布内。边线取裁切前来源轮廓，人工裁切线不描边。',
                        'sourceScale': None, 'controlPoints': [p['coordinates'] for p in c['controls'] if p['role'] == 'fit'],
                        'errorNote': f'部分来源范围：105°E以西及画布外未录入，裁切限度不作为国界。四湖独立配准检查最大残差{reg.max_check_km:.1f}公里；不是全图误差上限或历史精度。西部不使用异时资料拼接，邻国及原书史实仍待专家复核。',
                        'extent': 'partial-source', 'boundaryGeometry': rounded(border)}}}
    report = {'sourceId': SOURCE, 'sha256': c['sha256'], 'interpretationId': VERSION, 'features': 1, 'year': 742,
              'scope': 'partial-source', 'westLongitudeLimit': WEST_LIMIT,
              'excluded': '105°E以西、原图外、所有现代政治及省界、道内界；人工裁切线不输出国界',
              'registration': reg.report(), 'historicalAccuracy': 'disputed; source consistency only; no historical expert validation',
              'output': 'data/derived/tang-742.geojson'}
    report['registration']['accuracyMeaning'] = '现代湖泊及原底图概化导致配准残差；不表示历史疆界精度或全图误差上限'
    return [feature], report


if __name__ == '__main__':
    features, report = extract()
    (ROOT/'data/derived/tang-742.geojson').write_text(json.dumps({'type': 'FeatureCollection', 'features': features}, ensure_ascii=False, indent=2)+'\n')
    (ROOT/'data/audits/tang-742-intake.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')
    print(json.dumps({'features': 1, 'maxCheckErrorKm': report['registration']['maxCheckErrorKm']}, ensure_ascii=False))
