# CUGB 羽毛球抢场神器 — 全栈项目

中国地质大学（北京）羽毛球场地预约工具，包含前端 React 页面 + Express 后端 + Cloudflare Pages 部署。

> 纯 Cloudflare Worker 单文件版本请切换到 [`main`](https://github.com/Aoongu/badminton_booker/tree/main) 分支。

## 功能

- 微信小程序登录认证
- 查看未来 4 天场地预约情况
- 自动识别 ¥10/¥40 价格
- 已预约场次红色标记，不可选
- 关闭时段灰色标记，不可选
- 一键多选批量预约
- 自动抢场（定时并发预约）

## 项目结构

```
├── src/                    # React 前端
│   ├── pages/
│   │   ├── Login.tsx       # 微信登录页
│   │   ├── Booking.tsx     # 场地预约页
│   │   ├── AutoGrab.tsx    # 自动抢场页
│   │   └── Home.tsx        # 首页
│   ├── store/              # Zustand 状态管理
│   └── utils/api.ts        # API 封装（AES 加密）
├── api/                    # Express 后端
├── cloudflare-worker/      # Cloudflare Pages Functions
├── index.html              # Vite 入口
└── package.json            # 前端依赖
```

## 本地开发

```bash
npm install
npm run dev
```

## 部署

### Cloudflare Pages

1. 在 Cloudflare Dashboard → Pages 创建项目
2. 连接 GitHub 仓库，框架选择 Vite
3. 构建命令：`npm run build`
4. 输出目录：`dist`

### Vercel

本仓库已配置 `vercel.json`，直接连接 Vercel 即可部署。

## 技术栈

| 层 | 技术 |
|------|------|
| 前端框架 | React + TypeScript |
| 构建工具 | Vite |
| 样式 | Tailwind CSS |
| 状态管理 | Zustand |
| 路由 | React Router |
| 后端 | Express.js |
| 部署 | Cloudflare Pages / Vercel |
| 加密 | AES-128-CBC (CryptoJS) |

## 协议

仅限学习用途。