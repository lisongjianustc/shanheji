# Natural Earth 湖泊配准子集

`registration-lakes.geojson` 保留 `ne_50m_lakes.geojson` 中10处湖泊的原始几何，属性缩减为名称与来源。

- 原始数据：[Natural Earth 1:50m Lakes](https://www.naturalearthdata.com/downloads/50m-physical-vectors/50m-lakes-reservoirs/)。
- 原始GeoJSON：[维护者仓库](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_50m_lakes.geojson)，固定本地文件SHA-256记在子集 `originalSha256`，不声称分支永久固定。
- 作者：Natural Earth，Tom Patterson、Nathaniel Vaughn Kelso及贡献者。
- 许可：[Public Domain](https://www.naturalearthdata.com/about/terms-of-use/)，允许修改与电子传播。子集许可相同。
- 子集SHA-256固定在 `data/registration/sui-610.json`；任一输入变化时导入器拒绝继续。

现代湖泊只用于近似配准。重心先在LCC 23°/45°投影中计算，再与原SVG同名湖泊几何重心对应；不是历史城市点，也不提供隋朝政治边界。六个点拟合、四个点独立检查，所有检查均保留。斋桑湖误差约47.2公里，比其他点大；图幅概化、参照选择及水域变化都可能影响配准，尚未分别确定原因。没有把该点删去以降低统计残差。

拟合湖泊：巴尔喀什湖、伊塞克湖、青海湖、兴凯湖、库苏古尔湖、呼伦湖。检查湖泊：乌布苏湖、斋桑湖、太湖、洪泽湖。原图湖泊路径ID与像素重心见配准文件。

## 东晋原底图的独立检查子集

`eastern-relief-check-lakes.geojson`保留同一份固定原始50m湖泊文件中的青海湖、太湖、洪泽湖、鄱阳湖，原始几何未修改，属性缩减为名称。公共领域；原始文件哈希同上。本子集仅核对Kanguole等距圆柱原底图的坐标方向与位置，四湖均未参与拟合；不提供历史政治边界。
