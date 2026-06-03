# 🏸 羽毛球抢场神器

中国地质大学（北京）羽毛球场地预约自动化工具。通过逆向微信小程序 API，提供 Web 界面进行场地查看、批量预约和定时抢场。

> 纯 Cloudflare Worker 单文件版本请切换到 [`main`](https://github.com/Aoongu/badminton_booker/tree/main) 分支。

## 功能

- **多种登录方式** — 加密字符串、OpenID、Token 三种登录方式
- **场地总览** — 查看未来 3 天（当日/明天/后天）的场地预约情况
- **价格识别** — 自动识别白天 ¥10/小时、晚场 ¥40/小时，彩色区分
- **状态标记** — 已预约场次红色标记，关闭时段灰色不可选
- **批量选择** — 支持按行（时段）、按列（场地）、按时间段（白天/晚场/全天）快速选择
- **定时抢场** — 设置目标时间和提前毫秒数，倒计时结束后自动并发发送预约请求
- **服务端抢场** — 提交任务到服务端，关闭浏览器也能在后台执行
- **屏幕常亮** — 武装后自动锁定屏幕亮度，防止灭屏

## 项目结构

```
├── src/                          # React 前端
│   ├── pages/
│   │   ├── Login.tsx             # 登录页（3 种登录模式）
│   │   └── Booking.tsx           # 主页面（场地选择 + 抢场）
│   ├── components/
│   │   ├── CountdownFloat.tsx    # 可拖拽浮动倒计时
│   │   ├── LogPanel.tsx          # 实时日志面板
│   │   ├── ServerTaskPanel.tsx   # 服务端任务列表
│   │   ├── TokenArea.tsx         # Token 折叠区域
│   │   └── Toast.tsx             # Toast 通知
│   ├── store/useStore.ts         # Zustand 状态管理
│   └── utils/api.ts              # API 封装 + AES 加解密
│
├── api/                          # Express 后端
│   ├── server.ts                 # 本地开发入口
│   ├── index.ts                  # Vercel Serverless 入口
│   ├── app.ts                    # Express 应用（路由 + 代理）
│   ├── db.ts                     # MySQL 连接池
│   ├── init-db.ts                # 数据库初始化
│   ├── scheduler.ts              # 定时任务调度器（每秒轮询）
│   ├── executor.ts               # 抢场任务执行器
│   ├── aes.ts                    # 服务端 AES 加解密
│   └── routes/grab-tasks.ts      # 抢场任务 CRUD API
│
├── index.html                    # Vite 入口
├── vite.config.ts                # Vite 配置
├── vercel.json                   # Vercel 部署配置
└── package.json
```

## 本地开发

### 环境要求

- Node.js >= 18
- MySQL 数据库

### 安装

```bash
npm install
```

### 配置

在项目根目录创建 `.env` 文件：

```env
DATABASE_URL=mysql://user:password@localhost:3306/badminton_booker
```

### 启动

```bash
npm run dev
```

前端运行在 `http://localhost:5173`，后端运行在 `http://localhost:3001`，Vite 自动代理 `/api` 请求到后端。

## 部署

### Vercel

本项目已配置 `vercel.json`，直接连接 GitHub 仓库即可部署。需在 Vercel 环境变量中设置 `DATABASE_URL`。

## 技术栈

| 层 | 技术 |
|------|------|
| 前端 | React 18 + TypeScript |
| 构建 | Vite 6 |
| 样式 | Tailwind CSS 3 |
| 状态管理 | Zustand 5 |
| 路由 | React Router 7 |
| 后端 | Express 4 (TypeScript) |
| 数据库 | MySQL (mysql2) |
| 加密 | AES-128-CBC (CryptoJS / Node crypto) |
| 部署 | Vercel Serverless |

## 协议

仅限学习用途。
