# Holo Card Studio · 3D 交互全息闪卡工作台

基于开源项目 [`simeydotme/pokemon-cards-css`](https://github.com/simeydotme/pokemon-cards-css)（GPL-3.0）打造，在完整保留其 **20+ 套物理级 CSS 全息材质与纹理贴图** 的基础上，融合了 **8 层实体金属厚度、流光倒角边框、180° 翻面、任意图片实时加载与智能护脸遮罩**，可零构建直接部署到 Vercel。

---

## 核心特性
- **开箱即用**：打开页面即可拖拽本地图片、`Ctrl+V` 粘贴截图或点击上传，自动适配横屏 / 竖屏 / 正方形比例（所有图片 100% 在本地浏览器渲染，不上传后端）。
- **双轨材质库**：
  - **自研扩展材质（3 种）**：`Neon 霓虹光栅`、`钻石星火高奢`、`纯净棚拍反光`
  - **官方宝可梦级材质（17 种）**：`Cosmos 宇宙星斑`、`Secret Gold 鎏金`、`Rainbow 彩虹闪`、`Radiant 交叉放射`、`VMAX 炫彩纹理`、`V Full Art 浮雕线` 等
- **3D 物理立体增强**：8 层 `translateZ` 金属拉丝侧边、随角度流动的倒角亮边、动态地面悬浮阴影与暗角呼吸光晕。
- **智能主体 / 护脸遮罩**：可选自动生成柔化遮罩，保护人物面部或中央主体不过曝，也可上传自定义黑白/透明遮罩。
- **一键导出 & 网页嵌入**：支持导出单文件交互 HTML，以及通过 `?embed=1` URL 参数以透明 `iframe` 形式嵌入 B2B 独立站、产品详情页或电子名片。

---

## 本地运行
本工程为纯原生静态站点（ES Modules + 原生 CSS），无需 `npm install` 或打包构建：
```bash
python -m http.server 4173 --bind 127.0.0.1
```
然后浏览器访问 `http://127.0.0.1:4173/`。

---

## 如何无限扩展样式表与交互特性（模块化架构说明）
项目采用**上游隔离架构**：上游 `css/cards/` 与 `img/` 保持原封不动，所有扩展都放在独立文件中：

1. **新增全息材质样式**：
   - 在 [`css/custom/shaders.css`](./css/custom/shaders.css) 中新增一条 `.card[data-rarity="custom-xxx"] .card__shine` 规则；
   - 在 [`js/presets.js`](./js/presets.js) 的 `PRESETS` 数组追加一条记录（`group: 'custom'`），侧边栏按钮自动生成。
2. **新增 3D 物理增强特性**：
   - 视觉层样式加在 [`css/enhancements.css`](./css/enhancements.css)；
   - 动画物理或交互状态加在 [`js/card-engine.js`](./js/card-engine.js)（例如添加自动录制导出 GIF/WebM、背面插入二维码或 B2B 购物车按钮等）。

---

## `?embed=1` URL 嵌入参数说明
可直接将部署后的线上 URL 作为 `iframe` 嵌入任意网站（`embed=1` 会隐藏侧边栏和顶栏）：
```html
<iframe
  src="https://你的域名.vercel.app/?embed=1&preset=secret-gold&slab=1&bevel=1&full=1&idle=1"
  width="480"
  height="620"
  style="border:0;background:transparent;"
  allowtransparency="true"
></iframe>
```
常用参数：`preset`、`foil`、`slab=1|0`、`bevel=1|0`、`full=1|0`、`idle=1|0`、`intensity=0..150`、`tilt=5..30`、`radius=0..36`、`img=<图片URL>`、`title=<背面标题>`。

---

## 开源致谢
- 全息着色器 CSS 样式表（`css/cards/*.css`）与纹理贴图（`img/*`）源自 [simeydotme/pokemon-cards-css](https://github.com/simeydotme/pokemon-cards-css)，遵循 [GNU GPL v3.0](./LICENSE-pokemon-cards-css) 开源协议。
