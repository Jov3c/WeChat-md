# WeChat MD

本地优先的微信公众号 Markdown 编辑、排版、风格提取与发布辅助工具。

当前已完成第一阶段 UI 组件库与四栏编辑器框架。

## 产品方向

- Markdown 编辑与公众号实时预览
- 编辑区与预览区双向智能同步
- 文章风格与模板管理
- 公众号文章样式提取与复用
- 富文本复制到微信公众号编辑器
- Windows 本地文章、图片和版本管理

计划采用 React、TypeScript、Vite 与 Tauri 2 构建，桌面端使用 SQLite，Web 端使用 IndexedDB。

## 本地运行

需要 Node.js 24 或更高版本。

```bash
npm install
npm run dev
```

- 编辑器框架：`http://localhost:5173/`
- UI 组件库：`http://localhost:5173/?view=components`

测试与构建：

```bash
npm run test:run
npm run typecheck
npm run build
```
