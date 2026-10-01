# 三国至唐末历史互动地图 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立公元220—907年中国历史各政权及周边国家的互动地图，支持逐年浏览、并行时间带、事件点击、来源追溯和明确的资料缺口提示。

**Architecture:** 使用静态历史数据包与单一时间状态驱动网页地图。资料编制模块输出带来源和覆盖状态的数据，查询模块决定该时点能够展示的内容，地图与详情只消费同一份已提交结果。数据编制和应用开发是两条独立验收的工作线，通过下述契约连接。

**Tech Stack:** React、TypeScript、Vite、MapLibre GL JS；Zod负责运行时结构校验，Vitest与Testing Library验证领域逻辑和交互，Playwright用于浏览器验收；Node脚本构建数据，Python与Shapely用于几何有效性检查。版本在执行任务2时核验、精确锁定；本计划不安装依赖。

**Spec:** [已批准设计](../specs/2026-10-01-history-map-design.md)。用户于2026-10-01回复“草案审核通过”。

**Plan status:** 已获用户审阅批准，执行方式A：当前会话连续实施，完成后独立代码审查；任务执行中。审批记录：2026-10-01，用户原话：“审核通过”。

## Global Constraints

- 样板操作范围为公元220—907年；五个历史数据包均在范围内。
- “能够选择年份，不等于该年份所有地区均已完成疆域复原。”
- “同一实体可跨多个包引用；不因分包重复建立政权身份。”
- “默认疆域图层采用已核验的控制范围”。
- “镜头和透明度可平滑过渡；不得通过多边形插值生成中间年份的历史边界。”
- “AI辅助整理不能代替史料核验；正式数据不得混入用于界面演示的虚构样例。”
- “默认隐藏现代行政界线和现代城市标签。”
- “首版不需要账户、社区投稿或在线内容编辑后台。”
- “点击疆域或事件即暂停播放。”
- 所有依赖放项目目录或项目虚拟环境；沿用现有Node，不修改全局运行时、浏览器配置或其他项目。
- 当前目录没有Git仓库。执行时在此项目初始化本地仓库用于可恢复提交；不创建远程、不推送、不部署。若执行前发现已有仓库或新增文件，先保留并适配。
- 发布包含来源核验结果与复核者类型；agent核验不得被标成历史专家或人工审定。

## Review Focus

1. 用户快速拖动且响应乱序：过期请求不能覆盖最新年份，加载失败仍能看旧状态与重试入口。任务5测试。
2. 一年内多次变更或只有约年记录：不能把计算边界当成史实日期，事件时点不匹配必须提示。任务2、4、8测试。
3. 跨包同名异政权或相同编号内容冲突：不能重复着色或悄悄覆盖。任务3、10测试。
4. 无坐标／多地点／跨年事件：列表完整且不重复计数，不能为无地点事件生成伪坐标。任务4、8测试。
5. WebGL不可用、数据包损坏或底图失败：显示具体缺失状态，年份选择和文本列表仍可用。任务5、6、11测试。

## 工作区与文件职责

所有路径相对项目根目录。除已批准设计外，下列文件均为执行时新建。

```text
src/
  app/{App.tsx,App.css,main.tsx}                   页面组合和响应式布局
  domain/{types.ts,schema.ts,time.ts,query.ts}      领域契约、校验、时间与查询
  data/{repository.ts,manifest.ts}                分包加载、缓存、版本验证
  state/{controller.ts,useHistory.ts}             单一时间状态与React订阅
  features/map/{HistoryMap.tsx,layers.ts,style.ts} 地图生命周期、图层和参考底图
  features/timeline/{Timeline.tsx,bands.ts}        年份操作与并行时间带
  features/details/{DetailPanel.tsx,eventModel.ts} 政权、事件与来源阅读
  features/search/{SearchPanel.tsx,index.ts}       异名检索与过滤
  features/coverage/CoveragePanel.tsx              覆盖、冲突、署名与资料状态
data/
  catalog/{sources.json,entities.json,places.json} 共享身份与来源目录
  packages/<packageId>/{territories.geojson,events.json,coverage.json,package.json}
  audits/{source-ledger.csv,coverage-matrix.csv,scope-register.json}
  reviews/<packageId>.json                        记录级复核结果
  raw/                                           保留原始资料，不直接发布
scripts/data/{validate.ts,publish.ts,geometry_check.py}
public/{data/,basemap/}                           仅放构建产物与可再发布底图
tests/{fixtures/,domain/,data/,state/,ui/,e2e/}     虚构测试数据与行为验证
docs/{data/,qa/,superpowers/}                     资料审计、验收证据与规划
```

五个包编号固定为 `three-kingdoms-western-jin`、`eastern-jin-sixteen-kingdoms`、`southern-northern-dynasties`、`sui-early-tang`、`middle-late-tang`。它们是内容组织单位，不是互斥的历史时期；有效期由各条记录决定。

各代码任务的测试步骤按“写出行为测试 → 运行该任务末尾给出的测试命令确认因目标行为缺失而失败 → 实现 → 再运行通过”执行。依赖缺失、错误测试配置和网络失败不算有效的首次失败证据。纯文档与资料整理不编写模仿文件内容的测试。

### Task 1: 完成资料覆盖审计和收录登记

**Files:** 新建 `docs/data/source-audit.md`、`docs/data/editorial-policy.md`、`data/audits/source-ledger.csv`、`data/audits/coverage-matrix.csv`、`data/audits/scope-register.json`。

**Interfaces:** 输入已批准设计；输出每个包的来源候选、可取得状态、使用条件、时空覆盖、明确承诺收录对象和资料缺口。输出供任务3及任务10使用。

- [ ] 阅读以下第一方入口，分别记录网页说明和实际下载版本，不以介绍页代替数据核验。
  - CHGIS：https://chgis.fas.harvard.edu/pages/intro/ 。主要用于地名与行政单位；核对具体图层能否支持目标年代和几何类型。
  - WHG：https://whgazetteer.org/ 。用于地点检索与异名核对，不视为国界来源。
  - OpenHistoricalMap：https://www.openhistoricalmap.org/export 。核对每项来源与许可标签；不能因可下载就视为历史准确。
  - Natural Earth：https://www.naturalearthdata.com/downloads/10m-physical-vectors/ 。只作现代自然地理参考；使用条件：https://www.naturalearthdata.com/about/terms-of-use/ 。
- [ ] 每次处理一个包和一个来源，填入台账，列名固定如下。无法取得的材料记录原因，不绕过登录或购买限制。

```csv
source_id,title,creator,edition,url,accessed_at,locator,license,evidence_of_permission,availability,package_ids,geometry_kind,spatial_scope,temporal_scope,limitations
```

- [ ] 为五个包各建立地区×时段×主题覆盖记录；每项状态只能是 `verified`、`pending`、`missing`。`verified`必须绑定支持该覆盖结论的材料定位。

```csv
coverage_id,package_id,region_id,start_year,end_year,topic,status,source_ids,reason
```

- [ ] 创建收录登记表，列出政权身份、候选边界切片、事件选题和排除理由。文件结构如下；执行时填写实际审计结果，不把空数组称为完成审计。

```json
{
  "version": 1,
  "packages": [],
  "entries": [],
  "decisions": []
}
```

其中每个 `packages` 项有 `id,auditStatus,sourceIds,coverageIds`；每个 `entries` 项有 `id,packageId,kind,title,status,sourceIds,reason`，`status` 为 `candidate|committed|excluded`。范围发生实质变更时将用户决定及原话写入 `decisions`，不得通过减少 `committed` 条目掩盖未完成工作。

- [ ] 编写编辑规范：事件选取依据、实际控制与其他关系的区别、来源冲突处置、绘图误差记录、核验者类型、原始材料保存位置。
- [ ] 人工阅读台账检查五个包均有审计结论；若核心时段完全缺乏可采用边界来源，单独报告可用切片和缺口，执行应用开发可继续，但不能用示意多边形补成真实地图。
- [ ] Git可用后提交本任务文档；没有Git时保留文件，由任务2首次提交一并纳入。

**完成证据:** 五包审计表、可定位的来源清单和实际收录登记。此任务不以某个下载命令成功作为完成依据。

### Task 2: 建立可测试工程与统一时空契约

**Files:** 新建 `package.json`、锁文件、`index.html`、`tsconfig.json`、`vite.config.ts`、`.gitignore`、`src/domain/{types.ts,schema.ts,time.ts}`、`tests/fixtures/make.ts`、`tests/domain/time.test.ts`、`tests/domain/schema.test.ts`。

**Interfaces:** 输出以下全项目共享契约。导入 `Polygon,MultiPolygon,Point,Feature,FeatureCollection` 自 `geojson`；日期统一采用四位年 `YYYY-MM-DD`，不将浏览器时区参与历史日期比较。

```ts
export type Id = string;
export type Day = string;
export type Precision = 'day' | 'month' | 'year' | 'range';
export interface Bound { earliest: Day; latest: Day }
export interface Validity {
  start: Bound;
  endExclusive: Bound;
  precision: Precision;
  label: string; // 面向读者的真实日期表述
}
export type Relation = 'control' | 'administration' | 'vassal' | 'influence' | 'claim';
export interface Evidence { sourceId: Id; locator: string; note: string }
export interface Review {
  status: 'pending' | 'verified' | 'rejected';
  reviewerKind: 'human' | 'agent';
  reviewer: string; checkedAt: string; evidence: Evidence[];
}
export interface Source {
  id: Id; title: string; creator: string; edition: string;
  url: string | null; accessedAt: string; license: string;
  redistribution: 'allowed' | 'unknown' | 'denied'; permissionEvidence: string;
}
export interface Entity {
  id: Id; kind: 'polity' | 'local-power' | 'confederation' | 'administration';
  names: { text: string; validity: Validity; evidence: Evidence[] }[];
  existence: Validity; color: string; regionIds: Id[];
  capitals: { placeId: Id; validity: Validity; evidence: Evidence[] }[];
}
export interface Place {
  id: Id; names: { text: string; validity: Validity; evidence: Evidence[] }[];
  locations: { geometry: Point | Polygon | MultiPolygon; validity: Validity;
    spatialPrecision: 'specified' | 'approximate'; evidence: Evidence[] }[];
}
export interface TerritoryProperties {
  id: Id; entityId: Id; regionIds: Id[]; validity: Validity;
  temporalSupport: 'interval' | 'snapshot'; snapshotYear: number | null;
  relation: Relation; spatialPrecision: 'specified' | 'approximate' | 'disputed';
  interpretationId: Id; evidence: Evidence[]; review: Review;
  compilation: { method: string; sourceScale: string | null;
    controlPoints: [number, number][]; errorNote: string };
}
export type Territory = Feature<Polygon | MultiPolygon, TerritoryProperties>;
export type EventKind = 'military' | 'political' | 'diplomatic' | 'migration' | 'culture' | 'disaster';
export interface HistoricalEvent {
  id: Id; title: string; validity: Validity; kind: EventKind;
  placeIds: Id[]; entityIds: Id[]; summary: string; account: string;
  interpretation: string; evidence: Evidence[]; review: Review;
}
export interface Coverage {
  id: Id; regionId: Id; startYear: number; endYear: number;
  topic: 'territory' | 'event' | 'place';
  status: 'verified' | 'pending' | 'missing'; evidence: Evidence[]; reason: string;
}
export interface Catalog { sources: Source[]; entities: Entity[]; places: Place[] }
export interface DataPackage {
  id: Id; version: string; territories: Territory[];
  events: HistoricalEvent[]; coverage: Coverage[];
}
export interface Filters {
  regionIds: Id[]; entityIds: Id[]; eventKinds: EventKind[];
  relations: Relation[]; interpretationIds: Id[]; nearbyReference: boolean;
}
export interface Query { year: number; at: Day | null; filters: Filters }
export interface Scene {
  query: Query; referenceAt: Day; catalog: Catalog;
  territories: Territory[]; events: HistoricalEvent[]; coverage: Coverage[];
  uncertainTerritoryIds: Id[]; referenceYears: number[];
  territoryTimeLabels: Record<Id, string>; warnings: string[];
}
```

每条精确有效区间使用起点包含、终点不包含。只知某年开始时，起点范围可编码为当年首日至末日，`precision='year'`；这仅是计算约束，详情使用 `label`。精确单日事件编码为该日至次日。原始记录不靠技术编码推导史实。

- [ ] 执行前检查工作区和Node版本。2026-10-01已观测Node `22.23.2`、npm `10.9.8`；Vite官方当前要求Node `20.19+` 或 `22.12+`：[依据](https://vite.dev/guide/)。若版本变化先核对兼容性。
- [ ] 手动创建最小工程文件，避免脚手架覆盖已有docs；安装均为项目本地，执行时核验并保存精确版本。

```sh
npm install --save-exact react react-dom maplibre-gl zod
npm install --save-dev --save-exact vite @vitejs/plugin-react typescript vitest jsdom tsx @types/node @types/react @types/react-dom @types/geojson @testing-library/react @testing-library/user-event @testing-library/jest-dom @playwright/test
```

`package.json`设置 `type:module` 和以下脚本，Vitest配置在 `vite.config.ts` 中按测试目录区分node／jsdom环境。

```json
{
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "build": "tsc --noEmit && vite build",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:e2e": "playwright test",
    "data:validate": "tsx scripts/data/validate.ts",
    "data:publish": "tsx scripts/data/publish.ts"
  }
}
```

- [ ] 编写失败测试，再实现 `classifyAt(v:Validity,at:Day):'certain'|'possible'|'outside'` 和 `parseDay(value:string):Day`。日期有效性检查包括闰年、月日范围；只允许有效四位年日期。测试数据使用明确的虚构名称和局部矩形，不模拟真实国界。

```ts
it('不把年精度的开始日期当作确定的一月一日', () => {
  const v = {
    start: { earliest: '0304-01-01', latest: '0304-12-31' },
    endExclusive: { earliest: '0320-01-01', latest: '0320-01-01' },
    precision: 'year', label: '某年开始，确日不详',
  } satisfies Validity;
  expect(classifyAt(v, '0303-12-31')).toBe('outside');
  expect(classifyAt(v, '0304-06-01')).toBe('possible');
  expect(classifyAt(v, '0305-01-01')).toBe('certain');
  expect(classifyAt(v, '0320-01-01')).toBe('outside');
  expect(() => parseDay('0300-02-29')).toThrow();
});
```

实现判定核心如下；schema另需保证边界顺序存在合法解。

```ts
if (at < v.start.earliest || at >= v.endExclusive.latest) return 'outside';
if (at >= v.start.latest && at < v.endExclusive.earliest) return 'certain';
return 'possible';
```

- [ ] 在 `schema.ts` 中用Zod为全部契约建立严格校验，拒绝额外字段、无效日期、倒置界限、无来源的正式记录。Zod模式是运行时边界，TypeScript接口是编译边界，增加赋值类型检查避免二者漂移。
- [ ] 测试 `schema` 对起点范围倒置和外键空值拒绝，不将合理不确定时段误拒绝；`snapshot`必须带 `snapshotYear`，`interval`不得带非空快照年。
- [ ] 运行 `npm test -- tests/domain/time.test.ts tests/domain/schema.test.ts`，预期通过；运行 `npm run typecheck`。
- [ ] `.gitignore` 排除 `node_modules/`、`.venv/`、`dist/`、`data/raw/`、测试截图和浏览器缓存；初始化本地Git并提交设计、计划和本任务代码，逐个列明文件，不使用不加检查的全目录暂存。

### Task 3: 建立数据验证、几何检查与可追溯发布

**Files:** 新建 `scripts/data/{validate.ts,publish.ts,geometry_check.py}`、`requirements-data.txt`、`src/data/manifest.ts`、`tests/data/{validate.test.ts,publish.test.ts}`、`tests/fixtures/{catalog.json,invalid-territories.geojson}`。

**Interfaces:** 消费任务2契约；输出 `validateDataset(catalog:Catalog,packs:DataPackage[]):Issue[]`、`publishDataset(inputRoot:string,outputRoot:string):Promise<Manifest>`。`Issue={code:string,recordId:string,message:string,severity:'error'|'warning'}`。`Manifest={version:string,catalog:{path:string,sha256:string},packages:{id:string,version:string,path:string,sha256:string,startYear:number,endYear:number,regionIds:Id[]}[],defaultInterpretationIds:Id[],scopeVersion:string}`。

Manifest还必须包含 `searchIndex:{path:string,sha256:string}` 和 `interpretations:{id:Id,label:string,reason:string,evidence:Evidence[]}[]`。发布器输出轻量搜索索引文件供任务9使用，其 `SearchEntry` 契约在任务9定义；无坐标文本条目也应进入索引。默认解释版本的选择理由来自 `interpretations`，不能由UI自动生成。

- [ ] 写失败测试，锁定断裂来源引用、重复编号冲突、缺来源定位、许可不明几何、测试样例误入生产的阻断行为。

```ts
it('同编号不同内容必须阻断，不能被后一个包覆盖', () => {
  const a = makePackage('a');
  const b = makePackage('b');
  b.events = [{ ...a.events[0], title: '不同的虚构内容' }];
  expect(validateDataset(makeCatalog(), [a, b]))
    .toEqual(expect.arrayContaining([expect.objectContaining({ code: 'ID_CONFLICT' })]));
});
```

`makeCatalog()`和 `makePackage(id)`在任务2的 `tests/fixtures/make.ts` 定义，返回引用闭合、名称以“测试”开头的虚构数据。生产发布器拒绝测试根目录和测试身份前缀。

- [ ] 校验引用、有效期、证据、复核记录和再发布条件；规范JSON字段排序后比较同编号对象，相同内容去重，不同内容报错。同名不同编号允许存在。事件文字引用书籍不等于再发布书籍；许可阻断针对实际复制的几何、图像和文本，独立撰写的事实摘要记录编制与引用依据。
- [ ] 在项目 `.venv` 安装并锁定Shapely。`geometry_check.py`按stdin GeoJSON输出记录编号及问题列表，使用 `shapely.geometry.shape`、`shapely.is_valid`、`shapely.validation.explain_validity`；拒绝未闭环、非法经纬度、自交等无效几何。不自动修复成另一种疆域。
- [ ] 对邻接重叠／缝隙只出检查报告；有历史依据的重叠不作为自动删除条件。报告要求编辑人员逐条说明，合法争议采用同一 `interpretationId` 体系表达。
- [ ] 发布器先写临时构建目录，全部验证通过后生成带SHA-256的不可变版本资源，最后替换manifest。检查路径不能越出指定输出根；任务失败时保留上一次manifest和旧资源。

```ts
it('验证失败保留上一个发布清单', async () => {
  const before = await readFile(outputManifest, 'utf8');
  await expect(publishDataset(invalidInputRoot, outputRoot)).rejects.toThrow();
  expect(await readFile(outputManifest, 'utf8')).toBe(before);
});
```

上述路径由测试的 `beforeEach` 在临时目录创建，测试结束只清理该测试目录。

- [ ] 运行 `npm test -- tests/data/validate.test.ts tests/data/publish.test.ts`；对无效几何样例运行几何检查，预期返回明确记录编号且退出非零。
- [ ] 提交脚本、契约、依赖锁和测试；原始受限资料不提交。

### Task 4: 实现历史时间查询和资料缺口规则

**Files:** 新建 `src/domain/query.ts`、`tests/domain/query.test.ts`。

**Interfaces:** 消费 `Catalog,DataPackage,Query`；输出 `queryScene(catalog:Catalog,packs:DataPackage[],query:Query):Scene`、`eventMatchesYear(event:HistoricalEvent,year:number):boolean`。`query.at===null`采用年度参考时点 `${year补足四位}-12-31`，UI必须称“年末参考时点”，不能暗示所有数据都精确到日。

- [ ] 写失败测试，验证快照不自动跨年、可能有效与确定有效分开、默认仅control图层、未知地点事件仍在列表。

```ts
it('只有单年切片时，后一年不能自动沿用', () => {
  const pack = makePackage('a');
  pack.territories[0].properties.temporalSupport = 'snapshot';
  pack.territories[0].properties.snapshotYear = 300;
  const scene = queryScene(makeCatalog(), [pack], makeQuery(301));
  expect(scene.territories).toHaveLength(0);
  expect(scene.warnings).toContain('当前年份缺少可用疆域资料');
});
it('无可靠地点的当年事件仍保留在事件列表', () => {
  const pack = makePackage('a');
  pack.events[0].placeIds = [];
  expect(queryScene(makeCatalog(), [pack], makeQuery(300)).events).toHaveLength(1);
});
```

`makeQuery(year)`在fixture中返回空实体／地区／事件筛选、`relations:['control']`、fixture默认解释版本、`nearbyReference:false`。fixture年份默认为300，时间区间覆盖该年。

- [ ] 实现查询：先按有效性与复核状态过滤，再按关系、解释版本、地区和用户筛选过滤。有效性为possible的记录放入不确定列表并以图例表达。年度事件使用与整年相交规则，不能只看年末仍在持续的事件。
- [ ] 附带当前地区的覆盖清单；无覆盖记录也属于未知，不能推断完整。数据待核验、数据缺失、用户筛选为空三种情况分别提示。
- [ ] 年度模式可呈现所选年内的切片，但必须把切片自身的 `validity.label` 写入 `territoryTimeLabels`，不能统一标成“年末疆域”。`referenceAt`是查询锚点，不是每条几何都在该日有效的证明；混合参考时段时，标题显示“本年资料，参考时点不一”，每个详情显示实际时段。具体日查询不自动采用该年其他日期的切片。增加年中快照在年度模式可见、精确年末查询不可冒用的测试。
- [ ] 主动启用邻近年份参考时才加载候选切片，按实体、关系和解释版本选择最近有效切片；距离并列时取较早年份并保留版本选择，不拼接冲突几何。所有参考切片列出年份，不能用一个标签掩盖混合年份。
- [ ] 对明确的具体时点请求，仅在有效区间支持时返回当前疆域；测试同一年先后两次变更分别选中正确状态。未知确日事件只提供时间精度和提示，不自动生成精确节点。
- [ ] 运行 `npm test -- tests/domain/query.test.ts`；提交查询实现与行为测试。

### Task 5: 实现分包加载、取消过期请求与统一状态

**Files:** 新建 `src/data/repository.ts`、`src/state/{controller.ts,useHistory.ts}`、`tests/data/repository.test.ts`、`tests/state/controller.test.ts`。

**Interfaces:**

```ts
export interface HistoryRepository {
  loadScene(query: Query, signal: AbortSignal): Promise<Scene>;
}
export interface Selection { kind: 'entity' | 'event'; id: Id }
export interface HistoryState {
  previewYear: number;
  committed: Scene | null;
  pending: { requestId: number; scene: Scene } | null;
  selection: Selection | null;
  playing: boolean;
  status: 'idle' | 'loading' | 'staging' | 'ready' | 'error';
  error: string | null;
}
export interface HistoryController {
  getSnapshot(): HistoryState;
  subscribe(listener: () => void): () => void;
  preview(year: number): void;
  request(query: Query): Promise<void>;
  acceptRendered(requestId: number): void;
  select(value: Selection | null): void;
  setPlaying(value: boolean): void;
  dispose(): void;
}
export function createHistoryController(repository: HistoryRepository): HistoryController;
```

`useHistory(controller)`通过 `useSyncExternalStore`读取同一状态。年份预览不能直接改已提交标题。地图先在加载遮罩下更新到pending，完成当前请求的渲染后再调用 `acceptRendered` 提交地图、标题和详情；文字降级模式由App在确认无法用地图后接收同一请求。

- [ ] 编写响应乱序失败测试。测试工具 `deferred<T>()`返回 `{promise,resolve,reject}`，用 `new Promise<T>((resolve,reject)=>...)`实现并在本测试文件定义。

```ts
it('较早请求最后返回也不能改掉最新年份', async () => {
  const a = deferred<Scene>();
  const b = deferred<Scene>();
  const repository = { loadScene: vi.fn().mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise) };
  const c = createHistoryController(repository);
  const first = c.request(makeQuery(300));
  const second = c.request(makeQuery(400));
  b.resolve(makeScene(400)); await second;
  const token = c.getSnapshot().pending!.requestId;
  c.acceptRendered(token);
  a.resolve(makeScene(300)); await first;
  expect(c.getSnapshot().committed!.query.year).toBe(400);
});
```

`makeScene(year)`在fixture中调用 `queryScene(makeCatalog(),[makePackage('a')],makeQuery(year))`；没有疆域时仍返回完整Scene。

- [ ] repository加载manifest与共享catalog，以内容hash缓存不可变资源；按年份、地区和筛选加载相关包，近邻参考开启时允许查询邻近切片包。用manifest摘要避免单凭文件名猜测内容。
- [ ] 响应需 `response.ok`、JSON结构、SHA-256及数据版本均通过。任何必需包失败则请求失败，不拿缺包结果伪装完整；保留旧已提交Scene，并列出失败包和重试按钮。
- [ ] controller使用AbortController和单调requestId两层防护。旧请求的成功、失败、地图回调都必须检查requestId。`request`失败不清空旧Scene；播放发生错误即停止。`dispose`取消请求并清理订阅。
- [ ] 增加旧请求失败晚到、损坏JSON、hash不匹配、选中即暂停、过期 `acceptRendered` 无效的测试。
- [ ] 运行 `npm test -- tests/data/repository.test.ts tests/state/controller.test.ts`；提交状态、加载器和测试。

### Task 6: 实现地理底图、疆域图层和失败降级

**Files:** 新建 `src/features/map/{HistoryMap.tsx,layers.ts,style.ts}`、`src/app/{App.tsx,App.css,main.tsx}`、`public/basemap/attribution.json`、`tests/ui/map.test.tsx`。

**Interfaces:** `HistoryMap({scene:Scene|null,pending:{requestId:number,scene:Scene}|null,onRendered:(id:number)=>void,onSelect:(selection:Selection)=>void,onUnavailable:(reason:string)=>void})`。`buildTerritoryLayers(scene:Scene):FeatureCollection<Polygon|MultiPolygon,TerritoryProperties>`将当前已选解释版本的几何提供给MapLibre。

- [ ] 获取任务1确认可使用的自然地理数据，保留来源、版本和校验值；不下载现代政治边界用于代替历史疆域。初期本地底图采用陆地、海洋、河流与可获得的地形阴影，署名明确“现代自然地理参考”。缺历史河道资料的地区保留说明。
- [ ] 写UI失败测试：没有WebGL时出现“地图暂不可用”，年份控件与当年事件列表仍可操作；底图资源失败与历史资料缺失使用不同提示。
- [ ] 实现地图组件生命周期，只创建一个地图实例并在卸载时销毁；监听resize；不在每年切换时重建地图。核心图层结构如下，颜色取实体稳定颜色并在构建Feature时加入绘制属性。

```ts
map.addSource('territories', { type: 'geojson', data: emptyFeatureCollection });
map.addLayer({
  id: 'territory-fill', type: 'fill', source: 'territories',
  paint: { 'fill-color': ['get', 'displayColor'], 'fill-opacity': 0.32 },
});
map.addLayer({
  id: 'territory-border', type: 'line', source: 'territories',
  paint: { 'line-color': ['get', 'displayColor'], 'line-width': 1.5 },
});
```

`emptyFeatureCollection={type:'FeatureCollection',features:[]}`；显示属性只存在渲染Feature中，不写回历史记录。争议／近似几何通过独立线图层过滤并使用虚线，不能因缺 `displayColor` 随机变化。
- [ ] 疆域国名与都城使用许可明确、项目内可用的中文字体资源；不可用时使用系统中文字体。若符号图层需要外部字形服务，改为受控数量的DOM标签，并随地图视野更新；禁止静默依赖公共演示字形服务。国名锚点属于排版位置，不能作都城坐标。
- [ ] pending状态显示“正在切换到××年”遮罩；更新全部来源后，等待本次来源加载和地图渲染事件再回调 `onRendered`。晚到回调由任务5再次拒绝。地图初始化失败时显式进入文字降级模式。
- [ ] 默认隐藏现代行政与城市；现代参考开关仅在有独立参考资料时启用；没有数据时禁用并解释。关系图层保持分离，不将属国并入宗主国同色区域。
- [ ] 用小型虚构多边形验证点击选择、近似边界样式和图层开关；任何开发演示必须显示“交互测试数据，不代表历史疆域”。生产构建不包含测试模式入口。
- [ ] 运行 `npm test -- tests/ui/map.test.tsx` 和 `npm run build`；浏览器确认缩放和平移；提交界面与地图文件，底图来源说明一并提交。

### Task 7: 实现年份操作、播放和并行时间带

**Files:** 新建 `src/features/timeline/{Timeline.tsx,bands.ts}`、`tests/ui/timeline.test.tsx`、`tests/domain/bands.test.ts`；修改 `src/app/App.tsx`。

**Interfaces:** `Timeline({state:HistoryState,catalog:Catalog,onPreview:(year:number)=>void,onRequest:(query:Query)=>void,onPlaying:(playing:boolean)=>void})`；`buildBands(entities:Entity[],filters:Filters):{entityId:Id,label:string,startYear:number,endYear:number,uncertain:boolean}[]`。时期导航固定标签使用重叠区间，政权带使用实体来源记录。

- [ ] 写失败测试：220和907可选，219和908拒绝并提示；空输入不变成0，非法字符串不触发请求。

```tsx
it('输入超出样板范围的年份不会触发加载', async () => {
  const request = vi.fn();
  render(<Timeline state={makeReadyState(300)} catalog={makeCatalog()}
    onPreview={vi.fn()} onRequest={request} onPlaying={vi.fn()} />);
  const input = screen.getByRole('spinbutton', { name: '年份' });
  await userEvent.clear(input);
  await userEvent.type(input, '908{Enter}');
  expect(request).not.toHaveBeenCalled();
  expect(screen.getByText('请输入220至907之间的年份')).toBeVisible();
});
```

`makeReadyState(year)`在fixture中返回任务5定义的状态，`committed=makeScene(year)`、`pending=null`、`status='ready'`。

- [ ] 接入范围滑块与数字输入，拖动预览不提交页面标题；停止拖动或键盘完成操作后加载，播放逐年请求。在一帧未完成前不排队追加年份，播放至907停止。
- [ ] 播放设置提供1、2、5年／秒选择；慢于设定速度时等待实际加载完成。重大事件／疆域变化暂停默认开启，可关闭；暂停依据数据中的已核验节点，不靠朝代名称猜测。
- [ ] 事件跳转取筛选范围内上一／下一事件年份；若已在同年则允许展开该年事件选择。仅年精度事件不能跳到虚构确日。
- [ ] 并行时间带按地区和政权展开，重叠记录保持独立行；长名称提供可访问全称。测试两个同年并存的虚构政权都存在，不能只显示一个“当前朝代”。
- [ ] 使用假计时器验证加载期间不堆积请求、选中对象后暂停、到907停止；验证方向键和Enter操作。
- [ ] 运行 `npm test -- tests/ui/timeline.test.tsx tests/domain/bands.test.ts`；提交时间轴组件和测试。

### Task 8: 实现事件亮点与可追溯详情

**Files:** 新建 `src/features/details/{DetailPanel.tsx,eventModel.ts}`、`tests/domain/event-model.test.ts`、`tests/ui/details.test.tsx`；修改 `src/features/map/{HistoryMap.tsx,layers.ts}`、`src/app/App.tsx`。

**Interfaces:** `buildEventLocations(scene:Scene):{features:FeatureCollection<Point,{eventId:Id,placeId:Id,kind:EventKind,approximate:boolean}>,unlocatedEventIds:Id[],areaFeatures:FeatureCollection<Polygon|MultiPolygon,{eventId:Id,placeId:Id}>}`；`DetailPanel({scene:Scene,selection:Selection|null,onSelect,onRequest,onClose})`，回调类型沿用任务5。

- [ ] 写失败测试，无地点事件只在列表；一个事件有两个地点时列表只算一个事件，地图可有两个关联标记。

```ts
it('不为没有坐标的事件生成默认原点', () => {
  const scene = makeScene(300);
  scene.events[0].placeIds = [];
  const locations = buildEventLocations(scene);
  expect(locations.features.features).toHaveLength(0);
  expect(locations.unlocatedEventIds).toContain(scene.events[0].id);
});
```

- [ ] 地点位置按事件有效时段匹配，不能仅用今天的位置。只有区域几何的事件展示区域；若需要点击锚点，标为区域代表位置并保留区域轮廓。多处异说通过来源版本展示。
- [ ] 点图层使用事件类型颜色与图标、有限光晕；同位置和近距离聚合后显示数量，点击展开可选择列表。事件唯一数与地理标记数分别计算并标注，不能把多地点事件重复计为多个历史事件。
- [ ] 详情展示日期原文标签、地点精度、事实摘要、经过、解释、关联对象与逐项来源。来源链接只允许http(s)，文本按普通字符串渲染；本地材料提供题名、页码和图号，不暴露私有路径。
- [ ] 选中事件即暂停播放；日期精确且疆域支持时申请对应时点，其他情况显示“当前疆域参考时点与事件时点不同”或日期精度说明。跨年持续事件区分开始、持续、结束，播放暂停同一事件一次后不逐年重复触发，手动回跳可重新触发。
- [ ] 政权详情显示当时名称、都城、性质、参考时点、前后变化和证据；实体不再存在时保持说明并提供存续期跳转，事件离开当年后移除高亮并保留返回入口。
- [ ] 测试悬停可用但非必需、键盘Enter打开、Escape关闭并归还焦点、手机抽屉可关闭、降低动效时不脉冲。
- [ ] 运行 `npm test -- tests/domain/event-model.test.ts tests/ui/details.test.tsx`；提交事件与详情实现。

### Task 9: 实现异名搜索、筛选、覆盖说明与移动布局

**Files:** 新建 `src/features/search/{SearchPanel.tsx,index.ts}`、`src/features/coverage/CoveragePanel.tsx`、`tests/domain/search.test.ts`、`tests/ui/navigation.test.tsx`；修改 `src/app/{App.tsx,App.css}`。

**Interfaces:** `buildSearchIndex(catalog:Catalog,events:HistoricalEvent[]):SearchEntry[]`、`searchEntries(entries:SearchEntry[],text:string,year:number):SearchEntry[]`。`SearchEntry={id:Id,kind:'entity'|'event'|'place',label:string,aliases:string[],startYear:number,endYear:number,regionIds:Id[]}`。`CoveragePanel({scene:Scene})`。

- [ ] 写失败测试，同名不同政权分别展示存续期和地区，古今异名可找到同一地点，不会因同名覆盖身份。

```ts
it('同名对象保留独立结果及时代信息', () => {
  const entries = [
    { id:'test-a',kind:'entity',label:'测试国',aliases:[],startYear:300,endYear:320,regionIds:['r1'] },
    { id:'test-b',kind:'entity',label:'测试国',aliases:[],startYear:500,endYear:520,regionIds:['r2'] },
  ] satisfies SearchEntry[];
  expect(searchEntries(entries, '测试国', 310).map(x => x.id)).toEqual(['test-a', 'test-b']);
});
```

- [ ] 索引覆盖已发布全部数据包的轻量条目，不为搜索下载全部几何；按当前年份相关性排序，保留非当前年代结果并提供明确年份跳转。点击未有可定位几何的地点只展示详情，不生成坐标。
- [ ] 区域、政权、事件类型和关系筛选全部更新Query；展示正在生效的筛选和“清除”按钮。某政权已灭亡与被筛选掉使用不同文案。
- [ ] 覆盖面板按地区、时段、主题展示verified／pending／missing；来源冲突提供版本选择，显示版本采用理由。图例同时解释近似边界、参考切片和各种关系。
- [ ] 采用CSS Grid实现主布局，窄屏收起侧栏并使用详情抽屉；时间轴不被抽屉永久遮挡。保留系统字体回退、清晰焦点状态、足够大的触控目标。

```css
.app { display:grid; grid-template-rows:auto minmax(0,1fr) auto; height:100dvh; }
.workspace { display:grid; grid-template-columns:16rem minmax(0,1fr) 22rem; min-height:0; }
@media (max-width: 760px) {
  .workspace { grid-template-columns:minmax(0,1fr); }
  .detail-panel { position:fixed; inset:30% 0 var(--timeline-height) 0; overflow:auto; }
}
@media (prefers-reduced-motion: reduce) {
  .event-glow { animation:none; }
}
```

`--timeline-height`由实际时间轴容器尺寸更新，避免固定像素与不同屏幕冲突。
- [ ] 运行 `npm test -- tests/domain/search.test.ts tests/ui/navigation.test.tsx`，并在桌面与390px宽窄屏检查页面；提交导航与布局。

### Task 10: 完成五个历史数据包的内容生产与发布

**Files:** 新建／填充 `data/catalog/{sources.json,entities.json,places.json}`、五个 `data/packages/<packageId>/`、五个 `data/reviews/<packageId>.json`、`docs/data/package-reports/<packageId>.md`；更新任务1审计台账与收录登记。

**Interfaces:** 输入任务1收录登记、任务2数据契约和任务3发布器；输出五个经审计的数据包、共享身份目录、记录级证据与版本报告。该任务是内容制作，不能用增加测试样例代替。

- [ ] 按以下顺序建立五个包的记录级工作清单；来源不足的项目写入缺口，而非虚构边界。

| 包 | 需要逐项核验的内容 | 交接检查 |
| --- | --- | --- |
| three-kingdoms-western-jin | 三国各政权、晋的变化、相关周边政权、都城及重大事件 | 与东晋／十六国包共用晋及相关地点身份 |
| eastern-jin-sixteen-kingdoms | 东晋与北方并存政权、名称冲突、边界变更及交往事件 | 前后包同编号同内容，政权别名不混淆 |
| southern-northern-dynasties | 南北各政权并行更替、周边关系与关键事件 | 与北方前期和隋时期的边界节点衔接 |
| sui-early-tang | 隋统一过程、隋末并存势力、唐初与周边 | 年内变更与后续唐包解释版本一致 |
| middle-late-tang | 唐中后期实际控制、边疆、周边国家和唐末转折 | 唐身份连续，907年内变化有明确时点说明 |

- [ ] 每次制作一个有明确来源的疆域切片或事件：记录资料版本／页码／图号，提取日期与关系性质；空间资料配准时保存控制点、原始比例尺、误差解释和未经简化原稿。无绘制依据时停止该条几何生产，继续其他有据条目。
- [ ] 完成后逐条复核：来源是否支持这条具体主张、位置与时间精度是否夸大、关系类型是否混淆、几何是否有效、文字是否区分事实与解释。复核记录写实际执行者类型和方法；程序校验通过不能自动设置 `review.status='verified'`。
- [ ] 对共享政权／地点先查询目录再创建编号。同名异政权保留独立编号；同一政权跨包引用相同版本，冲突解释保留独立 `interpretationId` 并附采用理由。
- [ ] 为每个包生成发布报告：已收录清单、承诺条目完成情况、支持的年份／地区、缺口、异说、许可限制和复核方式。初始范围登记保留版本，不用后期删条目制造“全部完成”。
- [ ] 每包完成后分别执行验证，CLI的 `--package` 参数只限定报告对象，仍加载全局目录验证外键及跨包冲突。

```sh
npm run data:validate -- --package three-kingdoms-western-jin
npm run data:validate -- --package eastern-jin-sixteen-kingdoms
npm run data:validate -- --package southern-northern-dynasties
npm run data:validate -- --package sui-early-tang
npm run data:validate -- --package middle-late-tang
```

- [ ] 每个包通过验证后运行 `npm run data:publish -- --input data --output public/data`，检查manifest只引用通过核验且允许发布的记录；pending记录留在编制数据中，通过coverage表达缺口，不伪装成正式几何。
- [ ] 在应用中查看每包的首尾年份、所有已收录疆域变化点和事件密集年份；与来源逐项对照，检查国名位置、都城、关系和范围。把截图与具体记录编号写入包报告。
- [ ] 每个包单独提交可再发布的结构化数据和证据说明，保留原始资料路径于本地审计记录，不将受限材料直接打包发布。

**完成边界:** 五包都完成审计，所有登记为committed的条目核验并接入，剩余缺口具名记录。若某包核心疆域无法取得可靠资料，应用仍能运行，但本任务及整个历史样板保持未完成，并报告具体所需资料或范围决策。

### Task 11: 完成真实浏览器验收与交付说明

**Files:** 新建 `playwright.config.ts`、`tests/e2e/history-map.spec.ts`、`docs/qa/acceptance.md`、`README.md`；修复本任务发现的相关实现问题。

**Interfaces:** 消费正式构建、发布manifest和五包报告；输出可复现运行说明、截图、测试结果及明确的内容完成状态。

- [ ] Playwright浏览器只使用现有可用运行时或项目专属安装，不修改用户日常浏览器资料。配置webServer启动 `npm run dev -- --port 4173`；端口占用时换空闲端口，不能结束无关进程。
- [ ] 使用测试路由提供固定的虚构目录与包，锁定关键交互；测试入口仅在测试服务器启用。示例端点测试如下。

```ts
test('可浏览样板两端并保持年份与页面状态一致', async ({ page }) => {
  await page.goto('/');
  const year = page.getByRole('spinbutton', { name: '年份' });
  for (const value of ['220', '907']) {
    await year.fill(value);
    await year.press('Enter');
    await expect(page.getByTestId('committed-year')).toHaveText(value);
    await expect(page.getByTestId('scene-status')).toHaveText('已更新');
  }
});
```

测试setup用 `page.route`注入fixture manifest、catalog和包，并正确生成测试资源hash。生产资源测试另行执行，不将fixture通过当作史料核验。
- [ ] 端到端测试覆盖：快速跨年份且网络响应乱序、打开事件暂停播放、无地点事件、参考时点提示、同名搜索、清除筛选、数据损坏重试、WebGL失败文本降级、移动抽屉与键盘操作。
- [ ] 运行必要命令；若失败只针对具体风险修复和重跑，不进行无依据的重复全量测试。

```sh
npm run typecheck
npm test
npm run data:validate -- --all
npm run build
npm run test:e2e
```

- [ ] 生产发布边界检查：扫描 `dist/` 与 `public/data/`，确认不包含测试政权／事件、测试模式入口或原始受限材料；fixture端到端通过不能替代这一步。

- [ ] 对正式数据额外检查220、907、五包交接节点、全部疆域变更节点与各包事件密集年份。每张截图记录所选年、实际参考时点、来源版本和记录编号；执行者必须实际查看截图。
- [ ] 记录首次加载、连续拖动和播放的实际体验及测试设备，不凭开发机器推断所有设备性能。确认加载中反馈、超时后的重试、旧数据保留和降低动效行为。
- [ ] README写清 `npm ci`、`npm run dev`、`npm run build` 的运行方式，数据构建所需项目虚拟环境，范围与来源、原始资料获取条件、已知缺口和后续维护流程。
- [ ] `docs/qa/acceptance.md` 分别列应用功能完成情况、历史内容完成情况和未解决项。内容未完成时交付应称“可用应用／阶段性历史内容”，不称“完整真实逐年疆域”。
- [ ] 提交验收文档和相关修复；本地展示结果，不自动部署到公网。

## 依赖顺序与阶段产物

```text
任务1：资料审计 ───────────────┐
任务2：契约与工程 → 任务3：发布校验 ├→ 任务10：五包内容 → 任务11：联合验收
                  任务4：查询 → 任务5：状态 → 任务6：地图
                                             └→ 任务7：时间轴 → 任务8：事件 → 任务9：搜索与布局 ─┘
```

- 资料审计产物：五包的可行性、覆盖与收录登记，不是已完成的疆域库。
- 应用阶段产物：可运行的220—907年交互系统，测试数据明确标识，正式数据缺口可见。
- 历史样板产物：五包正式内容接入并通过记录级核验和全时段验收。

任务10可以在任务3完成后开始资料制作，但应用中的视觉核验依赖任务6—9。实现期间若采用子代理，跨任务的类型契约先由主代理统一，避免多代理同时改动共享catalog。

## 自查与需求对应

| 已批准设计要求 | 实施任务 |
| --- | --- |
| 220—907、五包、周边政权与未来扩展身份 | 1、2、10 |
| 时间重叠与并行政权带 | 2、4、7 |
| 控制／臣属／影响及争议版本 | 2、4、6、9、10 |
| 年内变化、时间精度与快照缺口 | 2、4、8 |
| 同步状态、播放和过期响应 | 5、6、7 |
| 事件亮点、持续／多地点／无地点事件 | 4、8 |
| 都城、当时名称、来源与前后变化 | 2、8、10 |
| 异名检索、筛选、覆盖图例 | 9 |
| 现代底图说明、移动端与无障碍 | 6、8、9、11 |
| 证据、权限、几何检查与包交接 | 1、3、10 |
| 五包完整验收而非仅完成骨架 | 10、11 |

计划自查记录（2026-10-01）：已逐节对照设计要求；补充了年中切片与年末参考时点的区别、轻量检索索引的发布契约及解释版本选择理由。上述自查仅针对计划一致性，不表示产品测试或历史数据核验已经完成。

执行前只需审阅本计划并选择执行方式。推荐在当前会话连续实现，关键任务运行对应测试，完成后由独立代理做代码审查；历史来源核验按任务1、10单独进行，代码审查不能替代历史事实核验。另一选择为每个任务分别由实施代理和审查代理处理，适合希望增加逐任务独立审查的情况。
