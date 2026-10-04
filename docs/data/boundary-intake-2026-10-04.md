# 疆界资料接入记录 · 2026-10-03—04

当前发布3条661年来源解释几何、4张待配准参考图。五包及220—907年完整逐年疆界仍未完成，周边政权范围也未补齐。

## 已接入的地理图层

来源：[Kanguole / Tang outline map, 661.svg](https://commons.wikimedia.org/wiki/File:Tang_outline_map,_661.svg)。固定使用2024-03-27 07:48 UTC版本，SHA-256见 `data/audits/tang-661-intake.json`。原始SVG保留于 `data/sources/commons/tang-661.svg`，转换结果和发布几何采用CC BY-SA 4.0。

| 编号 | 关系 | 核对范围 |
| --- | --- | --- |
| tang-661-civil | 行政设置 | 原图民政范围 |
| tang-661-military | 行政设置 | 原图安西军事行政范围 |
| tang-661-western-claim | 主张 | 原图西部主张，不表示实控 |

原图标注历史准确性争议。本轮只复核图形提取和作者图例；未独立查阅其所引书籍全部图页，未经过历史专家审定。`review.status=verified`在这些记录中只表示来源图幅一致性核对，不赋予历史真实性定论。所有记录保留 `spatialPrecision=disputed`，目录、主图和详情明确提示。选择“查看661年图幅”只开启行政设置，主张需另行勾选。

原始SVG以等距圆柱坐标保存几何，按原文件画布和地理范围逆变换：x/18.672076113398028为经度，y/22.263898158654715为纬度。图幅四角范围为61—130°E、16—50°N，已核对角点。按原图海洋／湖泊遮罩裁切；遮罩为现代自然地理，不能据此断言古代海岸准确。没有进行边界插值。

原图的朝鲜半岛单独多边形暂未纳入，其关系含义与西部范围不同，且661年当地情况复杂。图幅年份只作为年精度资料节点：不延用到662年，不直接服务确日事件查询；显式开启近年参考时会标注参考年份，同行政关系的多个组成部分一并保留。

复现：`.venv/bin/python scripts/data/import_tang_661.py`，然后 `npm run data:validate` 与 `npm run data:publish`。转换器检查固定原图哈希，原文件变更时拒绝继续按旧多边形次序提取。

## 待配准参考图

下列原图可以在“疆域图幅”中独立放大查阅，并定位时间轴年份。它们没有进入GeoJSON疆域图层，也没有使资料覆盖变成完成。

| 年份 | 来源、版本和许可 | 内容限度 |
| --- | --- | --- |
| 262 | [Zhoudadudu](https://commons.wikimedia.org/wiki/File:ThreeKingdoms262.png)，2023-11-24原图的3840px Commons缩略版，CC BY-SA 4.0 | 州郡和郡治参考；颜色按州区分，不能直接替代魏蜀吴实控边界；原地图集图页未独立复核 |
| 572 | [SY / Sgnpkd修订](https://commons.wikimedia.org/wiki/File:China_Divisions_in_572.png)，2020-04-29版，CC BY-SA 4.0 | 陈、北齐、北周州域；缺明确所据图幅和配准参数；修订记录指出交趾不属陈 |
| 610 | [Yug及译者](https://commons.wikimedia.org/wiki/File:China,_610.svg)，2026-09-21文件版，CC BY-SA 3.0 | 原作者明确西部范围未获来源支持，用模糊区域表示；淡色现代国界供比较 |
| 742 | [Yug / Kanguole西部修订](https://commons.wikimedia.org/wiki/File:China,_742.svg)，2020-03-12恢复的2012版，CC BY-SA 3.0 | 主体742年、西部外缘约750年，时间口径不同；行政范围不能自动当作实控 |

许可、作者、版本、修改说明、输入SHA-256均登记在 `data/catalog/map-plates.json` 和 `data/sources/commons/README.md`。发布器检查原始字节哈希、来源再分发条件和许可一致性，生成不可变文件名；图幅加载采用普通图片，不能执行SVG脚本。262年图采用缩略版以控制解码内存，其他图未改动字节。

## 本地审计但未发布

- [Shan Ye资料目录](https://yeshan-geo.github.io/pages/geo_data.html)和[geographic_data仓库](https://github.com/yeshancqcq/geographic_data)：三国Shapefile含Shu Han、Wei、Wu三条，Web Mercator；没有明确图幅年代、引用与许可。保留本地原始下载，未发布。
- 使用现代省份分配、未提供可复核边界依据的示意项目仍未导入。
- 742年SVG虽含矢量路径，缺可靠逆投影参数，未按画布任意线性拟合经纬度。

## 下一步资料缺口

优先补齐三国和西晋节点、东晋与十六国多政权并存、南北朝分裂与统一、隋末割据、唐中晚期实控与周边。每条疆界还需要明确年代、关系、图幅或页码、许可及配准误差。来源图展示与几何一致性核对不能代替历史事实复核。
