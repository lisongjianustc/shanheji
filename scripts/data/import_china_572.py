"""Digitise the dated 572 plate's mainland polities, retaining source limits.

SY / Seasonsinthesun, revision by Sgnpkd; CC BY-SA 4.0. This is a disputed
administrative interpretation, not a reconstruction of verified actual control.
Shared dash traces are stored once; the original raster supplies the coast.
"""
import hashlib
import json
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
from shapely import make_valid
from shapely.geometry import Polygon, mapping
from shapely.ops import unary_union, transform
from registration import Registration
from import_three_kingdoms_262 import vectorize

ROOT = Path(__file__).resolve().parents[2]
VERSION = "sy-572-administration"


def polygonal(g):
    if g.geom_type in ["Polygon", "MultiPolygon"]:
        return g
    return unary_union([p for p in g.geoms if p.geom_type in ["Polygon", "MultiPolygon"]])


def extract():
    config = json.loads((ROOT/"data/registration/china-572.json").read_text())
    traces = json.loads((ROOT/"data/registration/china-572-boundaries.json").read_text())
    path = ROOT/"data"/config["input"]
    if hashlib.sha256(path.read_bytes()).hexdigest() != config["sha256"]:
        raise ValueError("Source revision changed; review traces and coastal mask")
    reg = Registration(config["controls"], config["crs"], config["maxCheckErrorKm"])
    rgb = np.asarray(Image.open(path).convert("RGB"), dtype=np.int16)
    # Source land varies from cream to pale yellow; water is grey. These gates
    # keep the original coastline and avoid the neutral offshore islands.
    land = (rgb[:,:,0] > 246) & (rgb[:,:,1] > 230) & (rgb[:,:,2] < 243) & (rgb[:,:,0]-rgb[:,:,2] > 8)
    land = ndimage.binary_fill_holes(ndimage.binary_closing(land,iterations=2))
    land_geometry = vectorize(land.astype(np.uint8), 1)
    # Taiwan, Hainan and other detached islands have no explicit polity fill.
    # Do not infer their ownership from the neutral land background.
    mainland = max(land_geometry.geoms, key=lambda g:g.area) if hasattr(land_geometry,"geoms") else land_geometry
    west, zq, qc, zc, north = [traces[k] for k in ["northwest","zhou_qi","qi_chen","zhou_chen","qi_north"]]
    rings = {
        "northern-zhou": west + list(reversed(zc)) + list(reversed(zq)),
        "northern-qi": north + [[1134,50],[1150,80],[1220,180],[1260,300],[1280,410]] + list(reversed(qc)) + list(reversed(zq)),
        "chen": qc + [[1380,422],[1380,1110],[940,1110],[830,1040],[800,1005],[799,994],[789,978],[762,977],[737,968],[720,952],[707,930]] + list(reversed(zc)),
        "western-liang-nanbei": traces["liang"],
    }
    geometries = {e:polygonal(make_valid(Polygon(r)).intersection(mainland)) for e,r in rings.items()}
    for entity in ["northern-zhou", "northern-qi", "chen"]:
        g = geometries[entity]
        if hasattr(g, "geoms"):
            geometries[entity] = max(g.geoms, key=lambda p:p.area)
    liang = geometries["western-liang-nanbei"]
    for entity in ["northern-zhou","northern-qi","chen"]:
        geometries[entity] = polygonal(geometries[entity].difference(liang))
    for a,ga in geometries.items():
        if ga.is_empty or not ga.is_valid:
            raise ValueError(f"Invalid digitised polygon {a}")
        for b,gb in geometries.items():
            if a != b and ga.intersection(gb).area > 0.01:
                raise ValueError(f"Source traces overlap: {a}/{b}")
    names={"northern-zhou":"北周","northern-qi":"北齐","chen":"陈","western-liang-nanbei":"西梁（江陵）"}
    features=[]
    for entity,g in geometries.items():
        g = transform(reg.to_lonlat, g.simplify(0, preserve_topology=True))
        if not g.is_valid:
            raise ValueError("Converted polygon invalid")
        evidence=[
            {"sourceId":"commons-china-572","locator":"572年图标题；粗虚线国界；N. ZHOU、N. QI、CHEN及江陵LIANG标签；2020年修订说明","note":"只复核本图大陆范围和政权标签。来源未标注所据历史图幅；虚线之间按近似路径连接，不是历史专家审定的边界。未赋予海南、台湾及图外邻国归属。"},
            {"sourceId":"geonames-registration-cities","locator":"data/registration/china-572.json；六个配准点与三个独立检查点","note":"现代城市近似坐标只用于配准；投影模型为拟合方案，不能据此断言原图投影。"},
        ]
        features.append({"type":"Feature","geometry":mapping(g),"properties":{
            "id":f"{entity}-572-administration","entityId":entity,"regionIds":["china-core"],
            "validity":{"start":{"earliest":"0572-01-01","latest":"0572-01-01"},"endExclusive":{"earliest":"0573-01-01","latest":"0573-01-01"},"precision":"year","label":f"572年州域图 · {names[entity]}大陆行政范围参考；不代表全年持续实控"},
            "temporalSupport":"snapshot","snapshotYear":572,"relation":"administration","spatialPrecision":"disputed","interpretationId":VERSION,"evidence":evidence,
            "review":{"status":"verified","reviewerKind":"agent","reviewer":"Codex（来源轮廓与配准一致性复核，非历史真实性定论）","checkedAt":"2026-10-05","evidence":evidence},
            "compilation":{"method":"手工沿原图粗虚线读点；共用交界路径，江陵西梁单独扣除；按原图陆地色裁切大陆岸线；LCC23/45加六参数仿射转换，不外推至其他年。","sourceScale":None,"controlPoints":[p["coordinates"] for p in config["controls"]],"errorNote":f"三个独立检查点最大残差{reg.max_check_km:.1f}公里，包含古今城址偏差；不是全图或历史边界误差上限。虚线间隙、海岸阴影及小比例尺轮廓存在近似；所据史料及周边政权范围待复核。"}
        }})
    report={"sourceId":config["sourceId"],"input":config["input"],"sha256":config["sha256"],"year":572,"interpretationId":VERSION,"features":4,"relations":["administration"],"registration":reg.report(),"traceFile":"data/registration/china-572-boundaries.json","landColourMask":"R>246 G>230 B<243 R-B>8；闭合2px文字间隙并填内部孔；只取连续大陆", "pixelAreas":{e:g.area for e,g in geometries.items()},"historicalAccuracy":"争议参考版本，来源未给出所据历史图幅；非已证实实控疆域","excluded":"未赋予海南、台湾、交趾及周边政权归属"}
    original=Image.open(path).convert("RGBA")
    overlay=Image.new("RGBA",original.size)
    draw=ImageDraw.Draw(overlay)
    colours=[(130,110,190,70),(105,155,200,70),(110,170,130,70),(215,150,65,150)]
    for (entity,g),c in zip(geometries.items(),colours):
        for p in g.geoms if hasattr(g,"geoms") else [g]:
            draw.polygon(list(p.exterior.coords),fill=c,outline=(200,50,40,200))
            for ring in p.interiors:
                draw.polygon(list(ring.coords),fill=(0,0,0,0),outline=(200,50,40,200))
    (ROOT/"data/raw").mkdir(exist_ok=True)
    Image.alpha_composite(original,overlay).save(ROOT/"data/raw/572-trace-overlay.png")
    return features,report


if __name__ == "__main__":
    features,report=extract()
    (ROOT/"data/derived/china-572.geojson").write_text(json.dumps({"type":"FeatureCollection","features":features},ensure_ascii=False,indent=2)+"\n")
    (ROOT/"data/audits/china-572-intake.json").write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n")
    print(json.dumps({"features":4,"pixelAreas":report["pixelAreas"],"registration":report["registration"]},ensure_ascii=False))
