
# 羽毛球抢场神器

羽毛球场地预约自动化工具。通过逆向微信小程序 API，提供 Web 界面进行场地查看、批量预约和定时抢场。

纯 Cloudflare Worker 单文件版本请切换到 main 分支。

## 项目概述

这是一个全栈羽毛球场地预约工具，主要功能包括：

- 多种登录方式：加密字符串、OpenID、Token 三种登录方式
- 场地总览：查看未来 3 天（当日、明天、后天）的场地预约情况
- 价格识别：自动识别并显示场地价格
- 状态标记：已预约场次红色标记，关闭时段灰色不可选
- 批量选择：支持按行（时段）、按列（场地）、按时间段快速选择
- 浏览器定时抢场：设置目标时间，倒计时结束后自动并发发送预约请求
- 服务端抢场：提交任务到服务端，关闭浏览器也能在后台执行

主要特性：
- 服务端任务持久化存储到 MySQL 数据库
- 定时调度器每秒轮询检查待执行任务
- 随机延迟策略防止提前请求被服务器拒绝
- AES-128-CBC 加密通信与微信小程序保持一致
- 可拖拽浮动倒计时组件

## 技术栈

### 前端
- React
- TypeScript
- Tailwind CSS
- Zustand（状态管理）
- React Router（路由）
- Vite（构建工具）
- CryptoJS（前端加密）

### 后端
- Express（Web 框架）
- TypeScript
- Node.js 标准库 crypto（服务端加密）
- mysql2（数据库驱动）

### 数据库
- MySQL

### 开发部署
- Docker（CloudBase 部署）
- Cloudflare Pages（前端部署）
- 腾讯云 CloudBase（后端部署）

## 项目架构

### 整体架构

```
用户浏览器 
  |
  v
Cloudflare Pages（前端静态资源）
  |
  v
腾讯云 CloudBase（Express 后端）
  |
  +--&gt; 腾讯云 MySQL（抢场任务存储）
  |
  +--&gt; 微信小程序校园网 API（代理请求）
```

### 数据流向

1. 前端通过 Vite 构建，部署在 Cloudflare Pages
2. 用户通过前端登录，获取 token 和个人信息
3. 前端请求通过 Express 后端代理转发到校园网 API
4. 提交服务端抢场任务时，任务信息写入 MySQL 数据库
5. 服务端调度器每秒检查数据库中的待执行任务
6. 到达目标时间时，执行器并发发送预约请求
7. 执行结果更新回数据库，前端可通过 API 查询任务状态

### 模块关系

- 前端页面：Login（登录）、Booking（主界面）
- 前端组件：倒计时、日志面板、任务列表、Toast 通知
- 后端路由：grab-tasks（任务 CRUD）
- 后端服务：scheduler（调度器）、executor（执行器）
- 数据库：grab_tasks 表存储所有任务

## 目录结构

```
badmintonbooker_fullstack/
├── api/                          # Express 后端
│   ├── routes/
│   │   └── grab-tasks.ts         # 抢场任务 CRUD API
│   ├── aes.ts                    # AES-128-CBC 加解密
│   ├── app.ts                    # Express 应用主文件（路由+代理）
│   ├── db.ts                     # MySQL 数据库连接池
│   ├── executor.ts               # 抢场任务执行器
│   ├── init-db.ts                # 数据库初始化建表
│   ├── scheduler.ts              # 定时任务调度器（每秒轮询）
│   ├── server.ts                 # 服务启动入口
│   └── index.ts                  # （备用）Vercel Serverless 入口
│
├── src/                          # React 前端
│   ├── pages/
│   │   ├── Login.tsx             # 登录页面（3种登录模式）
│   │   └── Booking.tsx           # 主预约页面（核心业务逻辑）
│   ├── components/
│   │   ├── CountdownFloat.tsx    # 可拖拽浮动倒计时
│   │   ├── LogPanel.tsx          # 实时日志面板
│   │   ├── ServerTaskPanel.tsx   # 服务端任务列表面板
│   │   ├── TokenArea.tsx         # Token 输入折叠区域
│   │   ├── Empty.tsx             # 空状态组件
│   │   └── Toast.tsx             # Toast 通知组件
│   ├── hooks/
│   │   └── useTheme.ts           # 主题 Hook
│   ├── store/
│   │   └── useStore.ts           # Zustand 全局状态管理
│   ├── utils/
│   │   └── api.ts                # API 请求封装 + 前端加密
│   ├── lib/
│   │   └── utils.ts              # 通用工具函数
│   ├── App.tsx                   # 根组件（路由配置）
│   ├── main.tsx                  # React 入口
│   ├── index.css                 # 全局样式（Tailwind）
│   └── vite-env.d.ts             # Vite 环境类型声明
│
├── public/
│   ├── favicon.svg               # 网站图标
│   └── _redirects                # Cloudflare Pages 重定向规则
│
├── Dockerfile                    # CloudBase 部署 Docker 配置
├── .dockerignore                 # Docker 构建忽略文件
├── vite.config.ts                # Vite 构建配置
├── tailwind.config.js            # Tailwind CSS 配置
├── postcss.config.js             # PostCSS 配置
├── tsconfig.json                 # TypeScript 配置
├── eslint.config.js              # ESLint 配置
├── nodemon.json                  # Nodemon 配置
├── package.json                  # 项目依赖和脚本
└── index.html                    # Vite HTML 入口
```

## 核心文件说明

### 入口和配置文件

- `index.html` - Vite HTML 入口文件
- `vite.config.ts` - Vite 构建工具配置，本地开发时代理 `/api` 请求到后端
- `Dockerfile` - 腾讯云 CloudBase 云托管部署用的 Docker 配置，使用 Node.js 22-slim 镜像
- `package.json` - 项目依赖声明和启动脚本：
  - `dev` - 同时启动前后端
  - `client:dev` - 仅启动前端
  - `server:dev` - 仅启动后端
  - `build` - 构建前端

### 前端核心业务逻辑

- `src/pages/Login.tsx` - 登录页面，支持三种登录模式：加密字符串、OpenID、Token
- `src/pages/Booking.tsx` - 主预约页面，包含：
  - 场地日历表格渲染
  - 场地选择逻辑（单格选择、整行选择、快速选择模式）
  - 浏览器定时抢场逻辑
  - 服务端任务提交
  - 倒计时计算和显示
  - 日志面板
- `src/utils/api.ts` - API 请求封装，包含 AES-128-CBC 加密实现，以及根据环境自动切换 API 主机
- `src/store/useStore.ts` - Zustand 全局状态管理，存储登录信息、Token、场地数据、选择状态等

### 前端组件

- `src/components/CountdownFloat.tsx` - 可拖拽浮动倒计时组件，精确到秒
- `src/components/ServerTaskPanel.tsx` - 服务端任务列表，支持刷新、删除任务
- `src/components/LogPanel.tsx` - 实时日志面板，显示抢场过程信息
- `src/components/TokenArea.tsx` - Token 信息展示区域
- `src/components/Toast.tsx` - Toast 通知组件

### 后端核心业务逻辑

- `api/app.ts` - Express 应用主文件，包含：
  - CORS 配置
  - 校园网 API 代理（添加微信小程序 UA）
  - 路由注册（`/api/grab-tasks`）
- `api/server.ts` - 服务启动入口，先启动服务器，再初始化数据库和调度器
- `api/routes/grab-tasks.ts` - 抢场任务 CRUD API：
  - GET `/api/grab-tasks` - 获取任务列表
  - POST `/api/grab-tasks` - 创建任务
  - DELETE `/api/grab-tasks/:id` - 删除任务
  - PUT `/api/grab-tasks/:id/cancel` - 取消任务
- `api/scheduler.ts` - 定时任务调度器，每秒轮询数据库，查找待执行任务，到达目标时间后调用执行器，支持随机延迟策略
- `api/executor.ts` - 抢场任务执行器，接收任务信息，按场地分组并发发送预约请求到校园网 API
- `api/db.ts` - MySQL 数据库连接池，支持通过 `DATABASE_URL` 环境变量配置
- `api/init-db.ts` - 数据库初始化，自动创建 `grab_tasks` 表（如果不存在）
- `api/aes.ts` - 服务端 AES-128-CBC 加解密实现，与前端 crypto-js 保持一致

## 本地开发

### 环境要求

- Node.js &gt;= 18
- MySQL 数据库

### 安装依赖

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

### 前端部署（Cloudflare Pages）

项目已配置 `public/_redirects`，直接连接 GitHub 仓库即可部署。

### 后端部署（腾讯云 CloudBase）

使用 Dockerfile 部署到腾讯云 CloudBase 云托管，需要在环境变量中配置 `DATABASE_URL`。

### 数据库

使用腾讯云 MySQL 或自建 MySQL 数据库，需要确保数据库可以被 CloudBase 后端访问。

创建数据库表的 SQL 在 `api/init-db.ts` 中定义，后端启动时会自动尝试创建表。

## 协议

仅限学习用途。
