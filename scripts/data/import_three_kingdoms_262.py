"""Group the 262 source's sixteen province colours into Wei, Shu and Wu.

CC BY-SA 4.0 derivative of Zhoudadudu's map. This reproduces administrative
regions in ONE dated plate; it does not establish actual control or other years.
Modern city coordinates are used only as approximate registration references.
"""
import hashlib
import json
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage
from shapely import coverage_simplify, coverage_is_valid
from shapely.geometry import box, mapping
from shapely.ops import unary_union, transform, polygonize
from registration import Registration

ROOT = Path(__file__).resolve().parents[2]
CONFIG = ROOT / "data/registration/three-kingdoms-262.json"
SOURCE = "commons-three-kingdoms-262"
VERSION = "zhoudadudu-262-administration"
# Exact RGB fills sampled inside the source legend, in legend order.
PROVINCES = [
    ("You", (233,255,190), 1), ("Ji", (232,190,255), 1),
    ("Bing", (190,255,232), 1), ("Yan", (190,232,255), 1),
    ("Yu", (255,190,232), 1), ("Qing", (255,255,190), 1),
    ("Xu", (204,204,204), 1), ("Sili", (245,245,122), 1),
    ("Yong", (255,190,190), 1), ("Liang", (255,235,190), 1),
    ("Jing (Wei)", (255,170,0), 1), ("Jing (Wu)", (255,211,127), 3),
    ("Yang (Wei)", (152,230,0), 1), ("Yang (Wu)", (209,255,115), 3),
    ("Yi", (158,187,215), 2), ("Jiao", (215,176,158), 3),
]


def classify_image(image):
    rgb = np.asarray(image.convert("RGB"), dtype=np.int16)
    labels = np.zeros(rgb.shape[:2], dtype=np.uint8)
    for _, colour, entity in PROVINCES:
        seed = np.max(np.abs(rgb-colour), axis=2) <= 8
        seed[1440:, 3150:] = False
        # The grey source frame also matches Xu's fill. It is decoration,
        # never a province seed; remove it before repairing enclosed holes.
        seed[:4, :] = False
        seed[-4:, :] = False
        seed[:, :4] = False
        seed[:, -4:] = False
        components, _ = ndimage.label(seed)
        sizes = np.bincount(components.ravel())
        # Grey antialiasing on unrelated lettering also matches Xu's fill.
        # Only substantial connected colour regions can seed province areas.
        keep = sizes >= 200
        keep[0] = False
        labels[keep[components]] = entity
    # The original legend contains the same colours. Never interpret it as land.
    labels[1440:, 3150:] = 0
    labels[:4, :] = labels[-4:, :] = 0
    labels[:, :4] = labels[:, -4:] = 0
    known = labels > 0
    distance, nearest = ndimage.distance_transform_edt(~known, return_indices=True)
    # Fill enclosed text/seat symbols, plus <=2px dark boundary strokes.
    # Blue lakes/rivers and outside white remain unassigned.
    inside = ndimage.binary_fill_holes(ndimage.binary_closing(known, iterations=3))
    dark = np.max(rgb, axis=2) < 150
    water = (rgb[:,:,2] > 180) & (rgb[:,:,0] < 100) & (rgb[:,:,1] < 180)
    repair = ((inside & ~water) | ((distance <= 2) & dark)) & ~known
    labels[repair] = labels[tuple(nearest[:,repair])]
    labels[1440:, 3150:] = 0
    labels[:4, :] = labels[-4:, :] = 0
    labels[:, :4] = labels[:, -4:] = 0
    for entity in [1,2,3]:
        components, _ = ndimage.label(labels == entity)
        sizes = np.bincount(components.ravel())
        remove = sizes < 16
        remove[0] = False
        labels[remove[components]] = 0
    return labels


def vectorize(labels, entity):
    # Contiguous runs preserve pixel borders shared by neighbouring polities.
    rectangles = []
    for y, row in enumerate(labels == entity):
        changes = np.flatnonzero(np.diff(np.pad(row.astype(np.int8), (1,1))))
        rectangles.extend(box(int(a), y, int(b), y+1) for a,b in zip(changes[::2],changes[1::2]))
    g = unary_union(rectangles)
    if g.is_empty or not g.is_valid:
        raise ValueError("Raster polygonisation failed")
    return g


def extract():
    config = json.loads(CONFIG.read_text())
    path = ROOT / "data" / config["input"]
    if hashlib.sha256(path.read_bytes()).hexdigest() != config["sha256"]:
        raise ValueError("Source revision changed; recheck legend and registration")
    reg = Registration(config["controls"], max_check_km=config["maxCheckErrorKm"])
    labels = classify_image(Image.open(path))
    pixel_geometries = [vectorize(labels, n) for n in [1,2,3]]
    # Insert the same vertices on both sides of T junctions before simplifying.
    network = unary_union([g.boundary for g in pixel_geometries])
    cells = [[], [], []]
    for cell in polygonize(network):
        p = cell.representative_point()
        owner = int(labels[int(p.y), int(p.x)])
        if owner:
            cells[owner-1].append(cell)
    pixel_geometries = [unary_union(group) for group in cells]
    if not coverage_is_valid(pixel_geometries):
        raise ValueError("Polities have overlapping pixel boundaries")
    # Coverage simplification keeps coincident shared edges coincident.
    pixel_geometries = coverage_simplify(pixel_geometries, 0.8)
    features = []
    for g, entity, label in zip(pixel_geometries, ["cao-wei","shu-han","sun-wu"], ["魏","蜀汉","吴"]):
        g = transform(reg.to_lonlat, g)
        if not g.is_valid:
            raise ValueError("Converted geometry invalid")
        evidence = [
            {"sourceId": SOURCE, "locator": "262年州郡图及右下16项颜色图例", "note": "按州域归并政权，保留魏／吴荆州、扬州的区分；州郡图不是实控边界证明，未独立核对原地图集。"},
            {"sourceId": "geonames-registration-cities", "locator": "六个配准点、四个独立检查点；data/registration/three-kingdoms-262.json", "note": "现代城市近似位置仅作图幅配准；未据现代行政疆界编造古代疆域。"},
        ]
        features.append({"type":"Feature", "geometry":mapping(g), "properties":{
            "id":f"{entity}-262-administration", "entityId":entity,
            "regionIds":["china-core","korea"] if entity == "cao-wei" else ["china-core","southeast-asia"] if entity == "sun-wu" else ["china-core"],
            "validity":{"start":{"earliest":"0262-01-01","latest":"0262-01-01"},"endExclusive":{"earliest":"0263-01-01","latest":"0263-01-01"},"precision":"year","label":f"262年州郡图 · {label}行政区划参考；不代表全年持续实控"},
            "temporalSupport":"snapshot", "snapshotYear":262, "relation":"administration", "spatialPrecision":"disputed", "interpretationId":VERSION,
            "evidence":evidence,
            "review":{"status":"verified","reviewerKind":"agent","reviewer":"Codex（来源图幅、图例归并与配准一致性复核，非历史真实性定论）","checkedAt":"2026-10-05","evidence":evidence},
            "compilation":{"method":"按原图州域颜色归并魏蜀吴；排除图例和4像素外框；文字及边线遮挡按最近颜色修补，保留蓝色水域；剔除小于16像素的孤立块（微小岛屿不完整）；覆盖拓扑共同简化0.8像素，经EPSG:3857与六参数仿射转换至WGS84；不插值。","sourceScale":"原图标有1000公里比例尺；使用3840px Commons缩略版", "controlPoints":[p["coordinates"] for p in config["controls"]], "errorNote":f"独立检查点最大残差{reg.max_check_km:.1f}公里，包含古今城址移动；不构成历史疆界误差上限。原图州域及辽东、交州等边缘范围待专家复核；周边政权缺失。"}
        }})
    report = {"sourceId":SOURCE,"input":config["input"],"sha256":config["sha256"],"interpretationId":VERSION,
              "year":262,"features":len(features),"relations":["administration"],"registration":reg.report(),
              "provinceGrouping":[{"province":n,"rgb":c,"entityId":{1:"cao-wei",2:"shu-han",3:"sun-wu"}[v]} for n,c,v in PROVINCES],
              "pixelAreas":{e:int(np.sum(labels==n)) for n,e in [(1,"cao-wei"),(2,"shu-han"),(3,"sun-wu")]},
              "historicalAccuracy":"原图州域解释参考，非专家审定的实控疆域", "checked":"source legend grouping, geometry and registration only"}
    return features, report, labels


if __name__ == "__main__":
    features, report, labels = extract()
    (ROOT/"data/derived/three-kingdoms-262.geojson").write_text(json.dumps({"type":"FeatureCollection","features":features},ensure_ascii=False,indent=2)+"\n")
    (ROOT/"data/audits/three-kingdoms-262-intake.json").write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n")
    palette=np.array([[255,255,255],[120,150,215],[100,170,135],[224,165,91]],dtype=np.uint8)
    (ROOT/"data/raw").mkdir(exist_ok=True)
    Image.fromarray(palette[labels]).resize((1920,1358)).save(ROOT/"data/raw/262-grouped.png")
    print(json.dumps({"features":len(features),"registration":report["registration"],"pixelAreas":report["pixelAreas"]},ensure_ascii=False))
