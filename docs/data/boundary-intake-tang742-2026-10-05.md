# 742年唐代东部范围与明清资料检查 · 2026-10-05

## 本轮发布

新增1条742年唐代东部行政来源几何。当前共有12条疆域解释，支持262、572、约610、661、742节点；并非逐年完整疆界。新增范围放在581—755年的隋唐前期包，默认解释加入`yug-742-eastern-administration`。

来源：[China, 742.svg](https://commons.wikimedia.org/wiki/File:China,_742.svg)，Yug、Kanguole西部范围修订；2020-03-12文件版，SHA-256 `d3dc48a4630d27b0631f995710976faf924840583791cc190cb8627540887d08`。原SVG不变；衍生GeoJSON、包内几何和源图叠加检查沿用CC BY-SA 3.0，署名及修改说明见`data/sources/commons/README.md`。

## 年代与范围选择

来源页将主体标为《剑桥中国史》第3卷图11、403页“742年唐代中国”；西部行政设置采用图8、高宗时期，西部外缘采用Eberhard约750年图。没有把异时资料拼为742年全唐疆域。

编制保守排除105°E以西及原画布之外。105°E为本项目资料裁切限度，不是历史边界。东侧原行政参考也不等于已证明实控或全年持续状态；未独立核对原书，保留争议。现代国界、省界、道内界和邻国范围均未导入；周边完整分布仍缺。

## 可复现编制与配准

1. 新增显式相对M/L/C/Z转换，保留既有严格绝对路径解析器；拒绝未支持指令、未闭合环或缺坐标。
2. 合并原SVG `Tang742`及海南`path6536`填色；以原陆地和湖泊遮罩裁切，0.1px保拓扑简化。
3. 原图底图与610图湖泊轮廓相同，但重新读取742 SVG十处湖泊重心并核对输入哈希。六湖拟合、四湖独立检查；LCC23/45＋仿射，Natural Earth公共领域湖泊只用于配准。
4. 四个独立检查最大残差47.194公里，未超过同系列底图50公里门槛。不是历史边界精度、全图误差上限或已确定原始投影。参数、全部残差在`data/registration/tang-742.json`、`data/audits/tang-742-intake.json`。
5. 填色裁切后保存范围；边线取裁切前轮廓与资料范围的交集，人工闭合线不绘制国界。对应几何检查确认105°E线没有作为疆界，西部、台湾、海洋及太湖不赋唐归属。
6. `742-source-overlay.png`红线对照编制边线，蓝线仅表示105°E资料裁切。原图一致性由agent检查，未经历史专家审定。

```sh
.venv/bin/python scripts/data/import_tang_742.py
.venv/bin/python -m unittest discover -s scripts/data/tests
node scripts/qa/render-tang742-source.mjs
.venv/bin/python scripts/qa/overlay_tang742.py
npm run data:validate
npm run data:publish
npm test
npm run build
npm run test:e2e
node scripts/qa/verify-built.mjs # 先运行4174本地生产预览
```

只支持742年度来源切片。确日查询及741、743年不自动使用；用户显式开启近年参考时仍保留原来源年代。输入、绿色资料节点、播放到742均驱动真实地图绘制；仅105°E以东、部分范围及争议说明在主图和详情可见。

## 本轮未发布的尝试

### 明约1580年

从原SVG的嵌入PNG读取15个城市点，参照GeoNames配准子集；8点拟合、7点独立检查。候选投影按拟合像素残差选择，没有用检查点优化。最佳候选的独立检查最大残差23.84公里，但拟合点南京76.19公里、北京55.76公里异常，未采用其变换、未发布疆域。

详见`data/audits/ming-1580-registration-attempt.json`。原图渐隐范围与城市点位置仍需核实；保留来源原图并在界面说明失败情况。25公里拟议门槛没有放宽。

### 清1820年／CHGIS V6

此前清原图试配准64.10公里未通过。本轮只读取得[官方Dataverse数据集](https://doi.org/10.7910/DVN/ST5KKM)元数据与EULA/README：元数据写CC0 1.0，但包内说明和[官方项目页](https://chgis.fas.harvard.edu/data/chgis/v6/)限制非商业学术使用，并要求电子数据再分发的书面协议。许可说明不一致，不能据元数据直接认定可再分发。

未下载CHGIS矢量、未接受协议、未发布CHGIS数据；清原图作者也声称以CHGIS绘制，其后续几何转换暂停。此前Commons原SVG保持原样，保留作者许可声明，并增加底层来源待澄清提示；不把作者声明当作本项目独立确认。审计记录`data/audits/chgis-v6-1820-license-review.json`保留版本、官方API、文件ID及MD5。

## 仍待补齐

742年完整西部和周边；其他年份可靠切片；秦代明确年度、明代可靠配准、清代许可一致且配准合格的数据；夏商周考古范围与国家疆界的区分。九包全部保持未完成状态。
