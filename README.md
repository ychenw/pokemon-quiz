# PokéQuiz

GBA 风格的初代 151 宝可梦看图答题应用，支持中文 / English、经典 151 题、极速 15 题与进阶 50 题。

[在线体验](https://ychenw.github.io/pokemon-quiz/)

## 技术与边界

- 页面：语义化 HTML5。
- 样式：独立 CSS，保留现有视觉与响应式布局。
- 逻辑：原生 JavaScript ES Modules，按功能和数据拆分。
- 素材：本地 PNG 头像；答题精灵图使用 PokeAPI sprites。
- 保存：浏览器 localStorage。昵称档案属于本地演示，不是真实身份认证，不支持跨设备同步。
- 部署：GitHub Pages，静态文件直接发布，无构建步骤。

当前没有后端。真实账户、云端记录与跨设备同步需要独立的认证服务、接口与数据库，不能由 GitHub Pages 本身提供。

## 目录

```text
index.html                    页面结构
assets/
  css/main.css                样式（已清理被覆盖的旧声明）
  images/portraits/            本地头像素材
  js/
    main.js                   入口与答题状态控制
    utils.js                  名称规范化、计时格式化
    data/                     题库、玩法、奖励、语言文案
    features/
      achievements.js         成就判定与训练事件
      collections.js          头像、边框、徽章展示与佩戴
      history.js              多轮训练列表、继续与删除
      i18n.js                 中英文界面切换
      layout.js               一屏适配与面板高度对齐
    services/storage.js       本地保存与旧版数据迁移
tests/app.test.cjs             模块与主要玩法回归检查
package.json                  开发工具与测试命令
```

## 本地运行

在项目根目录启动静态服务：

```bash
python3 -m http.server 8000
```

访问 http://localhost:8000 。ES Modules 需要通过 HTTP 服务加载，不使用 file:// 直接打开。

## 开发检查

Node.js 24；安装开发工具后可统一格式化和运行测试：

```bash
npm install
npm run format
npm run format:check
npm test
```

测试覆盖随机轮次、15 题计分、多轮进度与草稿恢复、记录删除、本地档案、成就佩戴和语言切换。未连接真实认证服务。
