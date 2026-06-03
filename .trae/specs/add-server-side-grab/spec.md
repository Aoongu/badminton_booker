# 服务端定时抢场 + 微信通知 Spec

## Why
当前定时抢场完全依赖浏览器前端运行，关闭网页后抢场任务即失效。需要将抢场任务持久化到数据库，由服务端定时执行，并在抢场成功后通过微信推送通知用户付款。

## What Changes
- 新增 MySQL 数据库，存储抢场任务和通知配置
- 新增服务端定时调度器，到点自动执行抢场请求
- 新增 Server酱 微信推送通知
- 新增后端 API：任务 CRUD、通知配置、任务状态查询
- 修改前端 Booking 页面：武装模式可选"服务端抢场"模式，提交任务到后端
- 新增前端"我的任务"面板，查看服务端任务状态

## Impact
- Affected specs: 定时抢场功能从纯前端扩展为前端+后端协同
- Affected code: `api/app.ts`（新增路由）、`src/pages/Booking.tsx`（新增服务端抢场入口）、`src/store/useStore.ts`（新增任务状态）
- New dependencies: `mysql2`、`node-cron`、`crypto`（Node.js 内置，用于 AES）

## ADDED Requirements

### Requirement: MySQL 数据库
系统 SHALL 使用 MySQL 存储抢场任务和用户通知配置。

#### Scenario: 数据库表结构
- **grab_tasks 表**：
  - id (INT AUTO_INCREMENT PRIMARY KEY)
  - openid (VARCHAR) — 用户标识
  - user_name (VARCHAR) — 用户名
  - token (TEXT) — 登录 Token（AES 加密存储）
  - target_time (DATETIME) — 目标抢场时间
  - lead_ms (INT DEFAULT 0) — 提前量毫秒
  - booking_date (DATE) — 预约日期
  - cells (JSON) — 选中的格子列表 `[{"sitename":"1号场","time":"19:00-20:00","courtIdx":0,"timeIdx":5}]`
  - schedule_snapshot (JSON) — 场地数据快照（nodeList, timeList, priceMap 等）
  - people (INT DEFAULT 5) — 人数
  - status (ENUM: 'pending'|'running'|'success'|'failed'|'cancelled') — 任务状态
  - result (TEXT) — 执行结果
  - created_at (DATETIME)
  - updated_at (DATETIME)

- **notify_config 表**：
  - id (INT AUTO_INCREMENT PRIMARY KEY)
  - openid (VARCHAR UNIQUE) — 用户标识
  - serverchan_key (VARCHAR) — Server酱 SendKey
  - enabled (TINYINT DEFAULT 1) — 是否启用通知
  - created_at (DATETIME)
  - updated_at (DATETIME)

### Requirement: 服务端定时调度器
系统 SHALL 在服务端运行定时调度器，每秒检查是否有需要执行的抢场任务。

#### Scenario: 调度器检查任务
- **WHEN** 当前时间 >= 任务 target_time - lead_ms
- **THEN** 将任务状态设为 `running`，执行抢场逻辑

#### Scenario: 抢场执行逻辑
- **WHEN** 任务开始执行
- **THEN** 按 cells 中的场地分组，并发发送 createBookingBytime 请求到上游
- **THEN** 请求体使用 AES 加密（key/iv = "0102030405060708"），与前端逻辑一致
- **THEN** 所有请求完成后，更新任务状态为 `success` 或 `failed`，记录结果

#### Scenario: 抢场成功通知
- **WHEN** 任务状态变为 `success`
- **THEN** 查询该用户的 notify_config，若启用且配置了 Server酱 Key
- **THEN** 调用 Server酱 API 推送微信通知，内容包含：预约日期、场地、时段、金额、提醒付款

#### Scenario: 抢场失败通知
- **WHEN** 任务状态变为 `failed`
- **THEN** 同样推送微信通知，告知抢场失败及原因

#### Scenario: 过期任务清理
- **WHEN** 任务 target_time 已过 30 分钟且状态仍为 `pending`
- **THEN** 将任务状态设为 `cancelled`

### Requirement: Server酱微信推送
系统 SHALL 通过 Server酱 API 发送微信通知。

#### Scenario: 发送通知
- **WHEN** 需要发送通知
- **THEN** 调用 `https://sctapi.ftqq.com/{sendkey}.send` POST 接口
- **THEN** 请求体包含 `title`（通知标题）和 `desp`（Markdown 格式详情）

#### Scenario: 成功通知内容
- **WHEN** 抢场成功
- **THEN** title: "🏸 抢场成功！请尽快付款"
- **THEN** desp: 包含预约日期、场地列表、时段、总金额、提醒付款

#### Scenario: 失败通知内容
- **WHEN** 抢场失败
- **THEN** title: "❌ 抢场失败"
- **THEN** desp: 包含失败原因

### Requirement: 后端任务 API
系统 SHALL 提供以下 REST API 端点：

#### Scenario: 创建抢场任务
- **POST /api/grab-tasks**
- 请求体：`{ openid, token, userName, targetTime, leadMs, bookingDate, cells, scheduleSnapshot, people }`
- 响应：创建的任务对象（含 id）
- **WHEN** 用户提交抢场任务
- **THEN** 在数据库中创建 status='pending' 的任务

#### Scenario: 查询我的任务
- **GET /api/grab-tasks?openid=xxx**
- 响应：该用户的所有任务列表，按创建时间倒序

#### Scenario: 取消任务
- **PATCH /api/grab-tasks/:id/cancel**
- **WHEN** 任务状态为 `pending`
- **THEN** 将状态设为 `cancelled`

#### Scenario: 删除任务
- **DELETE /api/grab-tasks/:id**
- **WHEN** 任务状态为 `success`/`failed`/`cancelled`
- **THEN** 从数据库删除

#### Scenario: 保存通知配置
- **POST /api/notify-config**
- 请求体：`{ openid, serverchanKey }`
- **THEN** upsert 到 notify_config 表

#### Scenario: 获取通知配置
- **GET /api/notify-config?openid=xxx**
- 响应：该用户的通知配置

### Requirement: 前端服务端抢场入口
前端 Booking 页面 SHALL 支持将抢场任务提交到服务端执行。

#### Scenario: 选择抢场模式
- **WHEN** 用户点击"启动定时抢场"按钮旁的模式切换
- **THEN** 可选择"浏览器抢场"（当前行为）或"服务端抢场"（提交到后端）

#### Scenario: 提交服务端抢场任务
- **WHEN** 用户选择"服务端抢场"并点击提交
- **THEN** 将 openid、token、目标时间、提前量、预约日期、选中格子、场地数据快照、人数发送到 POST /api/grab-tasks
- **THEN** 提交成功后显示 Toast "任务已提交，关闭网页也会在服务端执行"

#### Scenario: 查看我的任务
- **WHEN** 用户点击"我的任务"按钮
- **THEN** 展开任务面板，显示该用户的所有服务端任务及状态

#### Scenario: 取消服务端任务
- **WHEN** 用户在任务面板中点击"取消"按钮（仅 pending 状态可取消）
- **THEN** 调用 PATCH /api/grab-tasks/:id/cancel

### Requirement: 通知配置界面
前端 SHALL 提供通知配置入口。

#### Scenario: 配置 Server酱 Key
- **WHEN** 用户在设置中输入 Server酱 SendKey 并保存
- **THEN** 调用 POST /api/notify-config 保存配置

## MODIFIED Requirements

### Requirement: 定时抢场模式
定时抢场 SHALL 支持两种模式：浏览器前端模式（现有行为不变）和服务端模式（新增）。

#### Scenario: 模式切换
- **WHEN** 用户在抢场控制区切换模式
- **THEN** "浏览器"模式保持现有行为（WakeLock + 前端倒计时）
- **THEN** "服务端"模式提交任务到后端，无需保持网页打开

## REMOVED Requirements

（无移除的需求，现有功能保持不变）
