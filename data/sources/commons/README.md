# Tang outline map, 661.svg — source and attribution

- Creator: **Kanguole**.
- Source: https://commons.wikimedia.org/wiki/File:Tang_outline_map,_661.svg
- Original revision: 27 March 2024, 07:48 UTC; accessed 2026-10-03.
- SHA-256 of the stored original: `2c04b2d23d26cbc505d52b4d842f7906395cab4a9f984da44b29b2c8a81bfeee`.
- Chosen license: **Creative Commons Attribution-ShareAlike 4.0 International**, https://creativecommons.org/licenses/by-sa/4.0/ . The source offers this license alongside GFDL; this project uses CC BY-SA 4.0.
- The original SVG is retained unchanged. No endorsement by the creator is implied.

## Derivative GIS data

`data/derived/tang-661.geojson` and the corresponding published feature geometries are adaptations by this project, **also CC BY-SA 4.0**. Changes: invert the source equirectangular projection to geographic coordinates; clip filled regions by the source's ocean/lake masks; retain three separately named relation layers; exclude the Korean client polygon until its relation is separately reviewed. No interpolation or reconstruction of unshown years.

Run `.venv/bin/python scripts/data/import_tang_661.py` to reproduce the derived file. Source shape verification does not validate the historical claims of the source map.

## Historical qualifications

The source page labels the map's historical accuracy as **disputed**. Preserve this label. Civil administration, Anxi military administration and far-western claims are distinct. Neither an administrative area nor a claimed extent is silently converted to actual control. Boundaries are approximate, based on a small-scale historical reconstruction. The original physical masks use modern Natural Earth geography.

The source cites Twitchett (2000), pp.118–119; Blunden and Elvin (1983), pp.26,92–93; and Shin (2014), pp.39,47. This project has checked the SVG and source description, not independently examined these full book pages. They are not registered as independently verified sources.

## Other reference plates · accessed 2026-10-04

Original plates remain independently viewable. Since 2026-10-05, the 262 and 572 plates also have dated, disputed administrative derivatives; the 610 and 742 plates have partial administrative derivatives. Their creators do not endorse this project. Each license applies to its respective file.

### 262: 三国州郡参考图

- Creator: Zhoudadudu.
- Source: https://commons.wikimedia.org/wiki/File:ThreeKingdoms262.png
- Version: 2023-11-24原图的Commons 3840px缩略版；只缩小像素，未修改图形.
- License: CC BY-SA 4.0, https://creativecommons.org/licenses/by-sa/4.0/ .
- Stored file: `sources/commons/three-kingdoms-262.png`.
- SHA-256: `a2092d3bc8b6b7ef05df4e0f4ad691a04050742eeb70840f025f0110dbf981f5`.
- Changes: 262 uses the Commons-generated 3840px reduced image; other files are unchanged. Browser sizing and zoom do not alter the stored files.
- Qualifications: 原作者据《中国历史地图集》及HydroSHEDS绘制州郡与郡治。颜色表示州级区划，不能直接当作魏蜀吴实控边界；现已按图例归并配准，未逐项核对地图集原图。

### 572: 南北朝后期州域参考图

- Creator: SY（Seasonsinthesun）；Sgnpkd修订.
- Source: https://commons.wikimedia.org/wiki/File:China_Divisions_in_572.png
- Version: 2020-04-29 17:54 UTC修订版.
- License: CC BY-SA 4.0, https://creativecommons.org/licenses/by-sa/4.0/ .
- Stored file: `sources/commons/china-572.png`.
- SHA-256: `1e02269e7b9d08b820c8859989422315a2067577d377c6a4af445713a42611ea`.
- Changes: 262 uses the Commons-generated 3840px reduced image; other files are unchanged. Browser sizing and zoom do not alter the stored files.
- Qualifications: 原作者绘制陈、北齐、北周时期州域；2020年修订交趾归属。未标注所据图幅及配准参数，边界与周边范围仍待核对。

### 610: 隋朝疆域与政区参考图

- Creator: Yug；Manlleus等译者.
- Source: https://commons.wikimedia.org/wiki/File:China,_610.svg
- Version: 2026-09-21 08:15 UTC文件版.
- License: CC BY-SA 3.0, https://creativecommons.org/licenses/by-sa/3.0/ .
- Stored file: `sources/commons/china-610.svg`.
- SHA-256: `099c7e9e314f95136fe460e63e779d3a2fa3a598a25dd0cbdea6352abe0d7dd1`.
- Changes: 262 uses the Commons-generated 3840px reduced image; other files are unchanged. Browser sizing and zoom do not alter the stored files.
- Qualifications: 原图称据《剑桥中国史》第3卷，西部范围因资料缺失以模糊区域表示；淡色现代国界仅供比较。已编制约610年部分范围，西部渐隐及画布外排除；未独立核对书籍图幅。

### 742: 唐朝疆域与道参考图

- Creator: Yug；Kanguole西部范围修订.
- Source: https://commons.wikimedia.org/wiki/File:China,_742.svg
- Version: 2020-03-12 01:45 UTC恢复的2012修订版.
- License: CC BY-SA 3.0, https://creativecommons.org/licenses/by-sa/3.0/ .
- Stored file: `sources/commons/china-742.svg`.
- SHA-256: `d3dc48a4630d27b0631f995710976faf924840583791cc190cb8627540887d08`.
- Changes: 262 uses the Commons-generated 3840px reduced image; other files are unchanged. Browser sizing and zoom do not alter the stored files.
- Qualifications: 主体据《剑桥中国史》第3卷图11，西部行政范围据图8，西部外缘据Eberhard约750年图。含不同时间口径；已编制105°E以东部分行政参考，西部全部排除；未独立核对原书，不代表742年完整实控边界。

## 2026-10-05 raster derivatives · CC BY-SA 4.0

`data/derived/three-kingdoms-262.geojson` and `data/derived/china-572.geojson`, their published geometries and source overlay adaptations are **CC BY-SA 4.0**. Attribution: Zhoudadudu for 262; SY / Seasonsinthesun and Sgnpkd for 572; registration, digitisation and adaptations by this project. No creator endorsement is implied.

262 changes: group the sixteen province fills by source legend; exclude the legend and outer decorative frame, repair text strokes, preserve blue water; remove isolated components below 16 pixels (tiny islands are incomplete); build shared edges and simplify by 0.8px; fit an affine transform in EPSG:3857 and convert to WGS84. 572 changes: trace bold dashed borders and the Jiangling LIANG outline; share frontier paths; clip to source mainland colour, excluding unassigned islands, Jiaozhi and neighboring polities; fit LCC23/45 plus affine. Original projection is not established by fitting.

The independent check points are not used in fitting. Modern city reference coordinates are GeoNames CC BY 4.0, separately attributed in `../geonames/README.md`. No unshown-year interpolation. Original images and their SHA-256 remain unchanged. Source checks are not historical expert validation. Reproduce with the two `scripts/data/import_*.py` commands recorded in `docs/data/boundary-intake-2026-10-05.md`.

## 2026-10-05 · 610年部分来源编制

原 `china-610.svg` 保留不变。`data/derived/sui-610.geojson`、正式包内对应范围和独立边线为本项目修改版本，沿用 **CC BY-SA 3.0**，署名 Yug、Manlleus等译者；不暗示作者认可。

修改：显式解析M/L/C/Z路径，采样贝塞尔曲线；用原图陆地与湖泊裁切并保拓扑简化；只保留填充和描边渐隐梯度都完全不透明、且在画布内的部分；湖泊重心近似配准；裁切前源轮廓边线独立保存，人工闭合线不绘制国界。西部渐隐未重建，现代国界、省界、文字标签和邻国疆域未导入。

配准参照使用单独的Natural Earth公共领域子集，见[配准子集说明](../natural-earth/README.md)。约610年是原图的近似年代，非确日或全年持续实控证明。原书图幅未独立核查，历史准确性保留争议。

## 2026-10-05 · 秦、明、清来源原图

以下SVG原样保存；浏览器缩放未修改文件。没有发布对应的地理疆域衍生数据，不暗示作者认可本项目。

### 秦代郡县参考图

- 作者：Ian Remsen。
- 来源：https://commons.wikimedia.org/wiki/File:Qin_dynasty_territory.svg
- 版本：Commons原始SVG；2026-10-05下载，保留原图。
- 许可：CC0 1.0，https://creativecommons.org/publicdomain/zero/1.0/
- 原文件：`sources/commons/qin-dynasty.svg`。
- SHA-256：`c37befe576d20479eb9dfde09179b562a17e918734812e256274642bde6f75d5`。
- 限度：未配准。来源描绘整个秦代（前221—前206），没有标明单一年份；不能作为前221年快照。不得把秦代汇总范围外推到每个年份。

### 明代约1580年参考图

- 作者：Michal Klajban；Jann；Manlleus等译者。
- 来源：https://commons.wikimedia.org/wiki/File:Ming_Empire_cca_1580_(en).svg
- 版本：Commons原始SVG；2026-10-05下载，保留原图。
- 许可：CC BY-SA 3.0 CZ，https://creativecommons.org/licenses/by-sa/3.0/cz/
- 原文件：`sources/commons/ming-1580.svg`。
- SHA-256：`103d0758f0230404b43e0f1f7fc30595b76bc0aa8f9452d88b99e5f87f74074e`。
- 限度：来源据《剑桥中国史》第7卷图1及Timothy Brook图6；试配准拟合点最大残差约76公里未采用，尚无叠加边界；未独立核对原书，年份为约数，不能替代明代全年实控。

### 清代1820年行政参考图

- 作者：瑞丽江的河水。
- 来源：https://commons.wikimedia.org/wiki/File:Qing_Dynasty_blank_map_1820.svg
- 版本：Commons原始SVG；2026-10-05下载，保留原图。
- 许可：CC BY-SA 4.0，https://creativecommons.org/licenses/by-sa/4.0/
- 原文件：`sources/commons/qing-1820.svg`。
- SHA-256：`1bf6bdb1ad31dbeb989ac35e017cd3a5f5e5bab88a3ab97676fab74624971a92`。
- 限度：来源作者声明据CHGIS V6 1820及Natural Earth绘制；尚未配准、未独立核验原始数据，行政范围不能直接证明实控，不外推到其他清代年份。

清1820年试配准未通过检查。失败记录见`data/audits/qing-1820-registration-attempt.json`；未采用该变换，未发布其地理边界。

## 2026-10-05 · 742年东部来源编制 · CC BY-SA 3.0

`data/derived/tang-742.geojson`、包内对应几何、独立边线及`docs/qa/screenshots/742-source-overlay.png`为本项目衍生版本，许可 **CC BY-SA 3.0**（https://creativecommons.org/licenses/by-sa/3.0/），署名Yug、Kanguole；配准与裁切由本项目完成，不暗示作者认可。原SVG保留原样，哈希不变。

修改：将相对M/L/C/Z转为绝对路径、采样曲线；合并原唐填色及海南，按原陆地／湖泊裁切、0.1px简化；六湖拟合四湖检查，LCC23/45仿射转为WGS84。仅105°E以东和画布内，西部高宗及约750年异时部分排除。裁切前边线独立保存，105°E及画布截断处不描为国界；没有导入现代政治边界、道内界或邻国轮廓。

独立检查最大47.2公里不是历史精度。原书未独立核验，行政范围不等于实控。复现及完整残差见`docs/data/boundary-intake-tang742-2026-10-05.md`。

## 2026-10-05 · 清代底层资料许可待澄清

只读核对CHGIS V6官方Dataverse元数据、EULA及README。元数据为CC0，包内和项目页却限制非商业学术使用及电子再分发，详见`data/audits/chgis-v6-1820-license-review.json`。未下载CHGIS矢量、未接受协议。Commons清SVG作者许可声明保留，但不能据此独立确认其底层数据权利；后续几何转换暂停，界面增加此说明。既有原SVG不变。

## 2026-10-06 · 东晋与前秦376年原图

- 作者：Ian Kiu。
- 来源：[Eastern Jin Dynasty 376 CE.png](https://commons.wikimedia.org/wiki/File:Eastern_Jin_Dynasty_376_CE.png)。
- 版本：2007-11-06 12:52 UTC，556×537原始PNG；2026-10-06核对。
- 许可：采用作者提供的[CC BY 3.0](https://creativecommons.org/licenses/by/3.0/)；原图未修改，不暗示作者认可本项目。
- 文件：`eastern-jin-376.png`。
- SHA-256：`025e9da56a66886953e720d5d8b12c99842418f305d704b7a550140b1ba51a44`。
- 限度：仅来源图查阅，配准仍待复核，未发布对应的东晋疆域；不外推其他年份。原图所据Herrmann1935与小為图未独立核查。
