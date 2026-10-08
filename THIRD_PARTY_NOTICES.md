# 许可范围与第三方资料

## 本项目代码

本项目原创程序代码（`src/`、`scripts/`、`tests/`、构建配置）和原创说明文档采用根目录 [MIT License](LICENSE)。第三方材料的转载、引用或改编部分保留各自许可。`package.json` 的 MIT 标识指程序代码，不将地图、来源原图或整个混合数据集改为 MIT。

## 历史数据与图像

历史范围、来源图、地理底图、配准参照及含这些材料的截图，应按各项来源记录使用。相同 JSON 文件可能包含不同来源的几何；下载或再发布数据时须保留逐项来源、作者、许可及修改说明。

| 内容 | 许可和归属记录 |
| --- | --- |
| Commons 原图、相应衍生几何及叠加图像 | 按各文件保留 CC BY-SA 4.0、CC BY-SA 3.0、CC BY-SA 3.0 CZ、CC BY 3.0 或 CC0；逐项作者、来源、许可链接和修改记录见 [Commons 说明](data/sources/commons/README.md) |
| Cliopatria 年份区间复原 | CC BY 4.0；见 [原数据许可证](data/sources/cliopatria/LICENSE.md)、[来源目录](data/catalog/sources.json)和各条记录的证据 |
| GeoNames 配准及事件地区参照 | CC BY 4.0；见 [GeoNames 说明](data/sources/geonames/README.md) |
| Natural Earth 地理底图及湖泊参照 | Public Domain；见 [底图归属](public/basemap/attribution.json)和[配准子集说明](data/sources/natural-earth/README.md) |
| 机构网页、论文、古籍等事实依据 | 链接及引用不授予原文或图像再分发权；本项目只整理事实、独立摘要与定位信息，见 [来源目录](data/catalog/sources.json) |

清1820年 Commons 原图的作者声明为 CC BY-SA 4.0，其所据 CHGIS V6 底层数据的许可口径仍待澄清。本项目没有下载或发布 CHGIS 原始矢量，几何转换已暂停；此项情况与原图归属见 [现有审查记录](data/audits/chgis-v6-1820-license-review.json)。本项目的 MIT 许可不对第三方权利作额外授权或保证。

## 软件依赖

React、MapLibre GL JS、Vite 和其他依赖保留其各自许可证。版本见 `package-lock.json`；再分发依赖或生产构建时应保留对应包的版权及许可声明。依赖目录不随本项目源码提交。

## 贡献资料

提交来源材料前请说明作者、来源 URL、许可版本、图幅或页码、适用年代及所作修改。未获再分发许可的原文、原图、矢量和个人敏感信息不应上传；可提交公开来源链接和独立编制记录。
