# 🏸 羽毛球抢场神器

中国地质大学（北京）羽毛球场地预约工具，基于 Cloudflare Worker 代理 + React 前端实现。

## 功能

- 🔐 微信小程序登录认证
- 📅 查看未来 4 天场地预约情况
- 💰 自动识别 10 元/40 元时段
- 🔴 已预约场次红色标记（不可选）
- ⬜ 关闭时段灰色标记（不可选）
- ✅ 一键多选批量预约

## 项目结构

```
├── src/                    # React 前端源码
│   ├── pages/
│   │   ├── Login.tsx       # 登录页
│   │   ├── Booking.tsx     # 场地预约页
│   │   ├── AutoGrab.tsx    # 自动抢场页
│   │   └── Home.tsx        # 首页
│   ├── store/              # Zustand 状态管理
│   └── utils/api.ts        # API 封装（AES 加密）
├── api/                    # Express 后端
├── cloudflare-worker/      # Cloudflare Pages 部署
├── worker_v6.js ~ v16.js   # Cloudflare Worker 独立版本
└── _build_v*.cjs           # Worker 版本构建脚本
```

## Worker 版本演进

| 版本 | 说明 |
|------|------|
| v6 | 原始可用版本，直接代理 |
| v7 | 修复 API 路径 `bookingBytime` → `bookingByTime` |
| v8 | 修复双斜杠 URL bug |
| v9 | 动态获取场次和时间 |
| v10 | 修复 `common_error`，正确使用 `selectdate` 参数 |
| v11 | Hex key 解密尝试（失败） |
| v12 | 稳定版本，UTF-8 key 正确加解密 |
| v13 | 添加已预约/关闭场次显示 |
| v14 | 修复 x/y 轴互换 + conflictList 处理 |
| v15 | 修复 22-22 多余行 |
| v16 | 修复 buildGrid 未检查 bookedSet 的 bug |

## 部署

### Cloudflare Worker

1. 打开 [Cloudflare Dashboard](https://dash.cloudflare.com/) → Workers & Pages
2. 创建新 Worker → 编辑代码
3. 将 `worker_v16.js` 内容全选替换
4. Save and Deploy

### 前端开发

```bash
npm install
npm run dev
```

## 技术栈

- **前端**: React + TypeScript + Vite + Tailwind CSS + Zustand
- **后端**: Express.js + Cloudflare Worker
- **加密**: AES-128-CBC（CryptoJS）
- **认证**: 微信小程序 JWT Token

## 协议

仅限学习用途，请勿滥用。