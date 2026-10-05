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

Original plates remain independently viewable. Since 2026-10-05, the 262 and 572 plates also have dated, disputed administrative derivatives; the 610 and 742 plates remain unregistered. Their creators do not endorse this project. Each license applies to its respective file.

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
- Qualifications: 原图称据《剑桥中国史》第3卷，西部范围因资料缺失以模糊区域表示；淡色现代国界仅供比较。未配准，未独立核对书籍图幅。

### 742: 唐朝疆域与道参考图

- Creator: Yug；Kanguole西部范围修订.
- Source: https://commons.wikimedia.org/wiki/File:China,_742.svg
- Version: 2020-03-12 01:45 UTC恢复的2012修订版.
- License: CC BY-SA 3.0, https://creativecommons.org/licenses/by-sa/3.0/ .
- Stored file: `sources/commons/china-742.svg`.
- SHA-256: `d3dc48a4630d27b0631f995710976faf924840583791cc190cb8627540887d08`.
- Changes: 262 uses the Commons-generated 3840px reduced image; other files are unchanged. Browser sizing and zoom do not alter the stored files.
- Qualifications: 主体据《剑桥中国史》第3卷图11，西部行政范围据图8，西部外缘据Eberhard约750年图。含不同时间口径，未配准、未独立核对原书，不代表742年完整实控边界。

## 2026-10-05 raster derivatives · CC BY-SA 4.0

`data/derived/three-kingdoms-262.geojson` and `data/derived/china-572.geojson`, their published geometries and source overlay adaptations are **CC BY-SA 4.0**. Attribution: Zhoudadudu for 262; SY / Seasonsinthesun and Sgnpkd for 572; registration, digitisation and adaptations by this project. No creator endorsement is implied.

262 changes: group the sixteen province fills by source legend; exclude the legend and outer decorative frame, repair text strokes, preserve blue water; remove isolated components below 16 pixels (tiny islands are incomplete); build shared edges and simplify by 0.8px; fit an affine transform in EPSG:3857 and convert to WGS84. 572 changes: trace bold dashed borders and the Jiangling LIANG outline; share frontier paths; clip to source mainland colour, excluding unassigned islands, Jiaozhi and neighboring polities; fit LCC23/45 plus affine. Original projection is not established by fitting.

The independent check points are not used in fitting. Modern city reference coordinates are GeoNames CC BY 4.0, separately attributed in `../geonames/README.md`. No unshown-year interpolation. Original images and their SHA-256 remain unchanged. Source checks are not historical expert validation. Reproduce with the two `scripts/data/import_*.py` commands recorded in `docs/data/boundary-intake-2026-10-05.md`.
