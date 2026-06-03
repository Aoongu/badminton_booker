# 基于 worker_v20.js 重写全栈项目 Spec

## Why
当前全栈项目（React + Express）功能不完整、无法正常使用，需要根据已验证可用的 `worker_v20.js`（Cloudflare Worker 单文件版本）重新实现，将其中所有核心逻辑和 UI 功能迁移到 React + Express 全栈架构中。

## What Changes
- **BREAKING**: 重写登录流程，支持 openid 自动登录（wxLogin）+ 手动 Token 输入双模式
- **BREAKING**: 重写场地查询页面，使用动态数据构建场地矩阵（替代硬编码场地列表）
- **BREAKING**: 重写自动抢场功能，支持武装模式、提前量（lead time）、并发抢场、WakeLock
- 重写 API 层，AES 加密/解密在前端完成，后端仅做代理转发
- 新增 Token 自动刷新机制（Token 过期时用 openid 自动重新登录）
- 新增可拖拽倒计时浮动组件
- 新增 Toast 通知组件
- 新增实时日志面板
- 新增快速选择功能（按行/列/时段范围选择）
- 移除 Cloudflare Worker 部署方式，仅保留 Express 代理 + React 前端

## Impact
- Affected specs: 登录、场地查询、预约、自动抢场全部重写
- Affected code: `src/utils/api.ts`, `src/store/useStore.ts`, `src/pages/Login.tsx`, `src/pages/Booking.tsx`, `src/pages/AutoGrab.tsx`, `api/app.ts`, `src/App.tsx`

## ADDED Requirements

### Requirement: OpenID 自动登录
系统 SHALL 支持通过 openid 调用 wxLogin 接口自动获取 Token，实现免手动输入登录。

#### Scenario: 用户粘贴加密字符串自动登录
- **WHEN** 用户粘贴抓包获得的加密字符串（如 `{"item":"75A6..."}`）到登录输入框
- **THEN** 系统自动解密获取 openid，调用 wxLogin 接口，获取 Token 并自动填入

#### Scenario: 用户直接输入 openid
- **WHEN** 用户直接输入 openid 字符串
- **THEN** 系统调用 wxLogin 接口，获取 Token 并自动填入

#### Scenario: openid 自动重登录
- **WHEN** 已保存 openid 的用户再次访问，Token 为空或已过期
- **THEN** 系统自动使用保存的 openid 调用 wxLogin 获取新 Token

### Requirement: Token 自动刷新
系统 SHALL 在 API 请求返回 HTML 响应（Token 过期标志）时，自动使用保存的 openid 重新登录并重试请求。

#### Scenario: Token 过期自动刷新
- **WHEN** API 请求返回的响应以 `<` 开头（HTML 响应，表示 Token 失效）
- **THEN** 系统自动使用 localStorage 中保存的 openid 重新登录，获取新 Token 后重试原请求

### Requirement: 动态场地矩阵
系统 SHALL 根据后端返回的 `nodeList` 动态构建场地列，根据 `timeList` 动态构建时段行，不硬编码场地列表。

#### Scenario: 加载场地数据
- **WHEN** 用户查询某日空位
- **THEN** 系统从 `bookingByTime` 接口获取 `nodeList` 和 `timeList`，动态渲染场地×时段矩阵

#### Scenario: 显示价格和状态
- **WHEN** 场地矩阵渲染完成
- **THEN** 每个格子显示价格（来自 `priceList`），已约格子显示"已约"，不可订格子显示灰色，可约格子按价格区分颜色（白天10元=绿色，晚上40元=橙色）

### Requirement: 快速选择功能
系统 SHALL 支持按行、按列、按时段范围快速选择场地格子。

#### Scenario: 点击时段标签选择整行
- **WHEN** 用户点击某时段行标签
- **THEN** 该行所有可约格子被选中（若已全选则取消全选）

#### Scenario: 点击场地列标题选择整列
- **WHEN** 用户点击某场地列标题
- **THEN** 该列所有可约格子被选中（若已全选则取消全选）

#### Scenario: 时段范围快速选择
- **WHEN** 用户点击快捷时段按钮（如"晚场"）
- **THEN** 对应时段范围内所有可约格子被选中

### Requirement: 武装模式定时抢场
系统 SHALL 支持武装模式，在指定时间自动并发发送预约请求。

#### Scenario: 启动武装模式
- **WHEN** 用户已选择至少一个格子，点击"启动定时抢场"按钮
- **THEN** 系统进入武装状态，显示倒计时，请求 WakeLock 保持屏幕常亮

#### Scenario: 倒计时到达自动抢场
- **WHEN** 倒计时归零（考虑提前量 lead time）
- **THEN** 系统按场地分组并发发送预约请求，每个场地一个独立请求

#### Scenario: 并发抢场请求
- **WHEN** 抢场触发
- **THEN** 系统对每个选中的场地同时发送独立的 `createBookingBytime` 请求，使用 `Promise.allSettled` 等待所有结果

#### Scenario: 屏幕唤醒后补发
- **WHEN** 设备从休眠唤醒，且距目标时间不超过30秒，且处于武装状态
- **THEN** 系统自动触发抢场

### Requirement: 提前量（Lead Time）配置
系统 SHALL 支持配置提前量（毫秒），使抢场请求在目标时间之前提前发出。

#### Scenario: 设置提前量
- **WHEN** 用户设置提前量为 500ms
- **THEN** 倒计时在距离目标时间 500ms 时触发抢场请求

### Requirement: WakeLock 屏幕常亮
系统 SHALL 在武装模式激活时请求 WakeLock API 保持屏幕常亮，武装取消时释放。

#### Scenario: 武装模式激活 WakeLock
- **WHEN** 用户启动武装模式
- **THEN** 系统调用 `navigator.wakeLock.request('screen')` 请求屏幕常亮

#### Scenario: 武装取消释放 WakeLock
- **WHEN** 用户取消武装模式
- **THEN** 系统释放 WakeLock

### Requirement: 可拖拽倒计时组件
系统 SHALL 提供一个可拖拽的浮动倒计时组件，显示距离抢场时间。

#### Scenario: 拖拽倒计时
- **WHEN** 用户拖拽倒计时组件
- **THEN** 组件跟随手指/鼠标移动到新位置

#### Scenario: 倒计时状态变化
- **WHEN** 距离目标时间 < 1分钟
- **THEN** 倒计时显示为警告色并闪烁
- **WHEN** 距离目标时间 < 5分钟
- **THEN** 倒计时显示为活跃色并带发光效果

### Requirement: Toast 通知
系统 SHALL 提供 Toast 通知组件，用于显示操作结果。

#### Scenario: 显示成功 Toast
- **WHEN** 预约成功
- **THEN** 显示绿色成功 Toast，3秒后自动消失

#### Scenario: 显示失败 Toast
- **WHEN** 预约失败
- **THEN** 显示红色失败 Toast，3秒后自动消失

### Requirement: 实时日志面板
系统 SHALL 提供实时日志面板，记录所有操作和请求结果。

#### Scenario: 日志记录
- **WHEN** 任何操作发生（登录、查询、预约等）
- **THEN** 在日志面板中添加带时间戳的日志条目，按类型（info/ok/warn/error）着色

#### Scenario: 日志上限
- **WHEN** 日志条目超过 150 条
- **THEN** 自动移除最早的日志条目

### Requirement: 日期选择
系统 SHALL 支持当日、明天、后天三个日期快速切换，默认选中后天。

#### Scenario: 日期切换
- **WHEN** 用户点击日期标签
- **THEN** 切换到对应日期，自动查询该日空位数据

### Requirement: AES 加密通信
系统 SHALL 在前端使用 AES-CBC 加密所有 API 请求体，解密所有 API 响应体。

#### Scenario: 请求加密
- **WHEN** 发送 API 请求
- **THEN** 请求体格式为 `{"item": "<AES加密后的十六进制大写字符串>"}`

#### Scenario: 响应解密
- **WHEN** 收到包含 `item` 字段的 API 响应
- **THEN** 使用 AES 解密 `item` 字段，解析 JSON 获取实际数据

## MODIFIED Requirements

### Requirement: 后端代理
后端 Express 代理 SHALL 仅做请求转发，添加微信 User-Agent 和必要 Header，不处理加密/解密逻辑。所有加密/解密在前端完成。

#### Scenario: 代理转发
- **WHEN** 前端发送 POST 请求到 `/api/*`
- **THEN** 后端将请求转发到 `https://bdtyg.cugb.edu.cn` 对应路径，添加微信 UA、Origin、Referer、token Header

### Requirement: 预约请求格式
预约请求 SHALL 使用 `payway: '77'`（worker_v20 中的值），并发送加密后的请求体。

#### Scenario: 发送预约请求
- **WHEN** 用户提交预约
- **THEN** 前端构造预约数据，AES 加密后通过代理发送到 `createBookingBytime` 接口

## REMOVED Requirements

### Requirement: Cloudflare Worker 部署
**Reason**: 全栈项目使用 Express 代理，不再需要 Cloudflare Worker
**Migration**: 删除 `cloudflare-worker/` 目录，所有代理逻辑由 Express 处理

### Requirement: 硬编码场地列表
**Reason**: worker_v20 使用动态 `nodeList` 构建场地，无需硬编码
**Migration**: 移除 AutoGrab.tsx 中的 COURTS 常量，改为从 bookingByTime 接口动态获取

### Requirement: 分离的登录页和预约页
**Reason**: worker_v20 采用单页设计，登录和预约在同一页面
**Migration**: 合并登录和预约为同一页面，Token 输入区域可折叠
