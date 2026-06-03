# Tasks

- [x] Task 1: 安装依赖并配置 MySQL 连接
  - [x] SubTask 1.1: 安装 `mysql2` 和 `node-cron` 依赖
  - [x] SubTask 1.2: 创建 `api/db.ts`，使用 `mysql2/promise` 建立连接池，从环境变量读取 DATABASE_URL
  - [x] SubTask 1.3: 创建 `api/init-db.ts`，包含建表 SQL（grab_tasks 和 notify_config），导出 `initDB()` 函数
  - [x] SubTask 1.4: 在 `api/server.ts` 中调用 `initDB()` 确保启动时表存在

- [x] Task 2: 实现后端任务 API 路由
  - [x] SubTask 2.1: 创建 `api/routes/grab-tasks.ts`，实现 POST /api/grab-tasks（创建任务）
  - [x] SubTask 2.2: 实现 GET /api/grab-tasks（查询任务列表，按 openid 过滤）
  - [x] SubTask 2.3: 实现 PATCH /api/grab-tasks/:id/cancel（取消任务）
  - [x] SubTask 2.4: 实现 DELETE /api/grab-tasks/:id（删除任务）
  - [x] SubTask 2.5: 创建 `api/routes/notify-config.ts`，实现 POST /api/notify-config（保存配置）和 GET /api/notify-config（查询配置）
  - [x] SubTask 2.6: 在 `api/app.ts` 中注册新路由

- [x] Task 3: 实现服务端 AES 加密工具
  - [x] SubTask 3.1: 创建 `api/aes.ts`，使用 Node.js 内置 `crypto` 模块实现 AES-CBC 加密（key/iv = "0102030405060708"），与前端 crypto-js 行为一致
  - [x] SubTask 3.2: 实现 `aesEncrypt(obj)` 和 `aesDecrypt(hexStr)` 函数

- [x] Task 4: 实现服务端抢场执行器
  - [x] SubTask 4.1: 创建 `api/executor.ts`，实现 `executeGrabTask(task)` 函数
  - [x] SubTask 4.2: 从 task.schedule_snapshot 中提取 nodeList、timeList、priceMap 等数据
  - [x] SubTask 4.3: 按 cells 中的场地分组，构造预约请求体（与前端 fireBooking 逻辑一致）
  - [x] SubTask 4.4: 使用 aesEncrypt 加密请求体，发送 POST 到上游 createBookingBytime 接口
  - [x] SubTask 4.5: 使用 Promise.allSettled 并发发送，收集结果
  - [x] SubTask 4.6: 更新任务状态为 success/failed，记录结果到 result 字段

- [x] Task 5: 实现服务端定时调度器
  - [x] SubTask 5.1: 创建 `api/scheduler.ts`，使用 setInterval（每秒）检查 pending 任务
  - [x] SubTask 5.2: 查询 status='pending' 且 target_time - lead_ms <= now 的任务
  - [x] SubTask 5.3: 对匹配任务调用 executeGrabTask
  - [x] SubTask 5.4: 清理过期任务（target_time 过 30 分钟仍为 pending 的设为 cancelled）
  - [x] SubTask 5.5: 在 `api/server.ts` 中启动调度器

- [x] Task 6: 实现 Server酱微信推送
  - [x] SubTask 6.1: 创建 `api/notify.ts`，实现 `sendNotification(openid, title, desp)` 函数
  - [x] SubTask 6.2: 查询 notify_config 获取 serverchan_key
  - [x] SubTask 6.3: 调用 `https://sctapi.ftqq.com/{key}.send` POST 接口
  - [x] SubTask 6.4: 在 executor 完成后调用 sendNotification

- [x] Task 7: 修改前端 — 服务端抢场入口
  - [x] SubTask 7.1: 在 `src/utils/api.ts` 中新增 API 函数：createGrabTask、getGrabTasks、cancelGrabTask、deleteGrabTask、saveNotifyConfig、getNotifyConfig
  - [x] SubTask 7.2: 在 `src/store/useStore.ts` 中新增 grabMode ('browser'|'server')、serverTasks 数组、notifyConfig 等状态
  - [x] SubTask 7.3: 修改 `src/pages/Booking.tsx`：新增抢场模式切换（浏览器/服务端）
  - [x] SubTask 7.4: 服务端模式下点击"启动抢场"提交任务到后端
  - [x] SubTask 7.5: 新增"我的任务"面板组件，展示服务端任务列表及状态
  - [x] SubTask 7.6: 新增通知配置组件，输入 Server酱 SendKey 并保存

# Task Dependencies
- [Task 2] depends on [Task 1]（路由需要数据库连接）
- [Task 4] depends on [Task 3]（执行器需要 AES 加密）
- [Task 5] depends on [Task 4]（调度器调用执行器）
- [Task 6] depends on [Task 1]（通知需要查询 notify_config）
- [Task 4] depends on [Task 6]（执行器完成后触发通知）— 可先实现执行器，通知后补
- [Task 7] depends on [Task 2]（前端需要后端 API）
- [Task 3] 无依赖，可与 Task 1 并行
