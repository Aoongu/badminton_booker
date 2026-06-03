# Tasks

- [x] Task 1: 重写 API 工具层（`src/utils/api.ts`）
  - [x] SubTask 1.1: 实现 AES-CBC 加密/解密函数（key/iv = "0102030405060708"），与 worker_v20 保持一致
  - [x] SubTask 1.2: 实现通用 request 函数，自动加密请求体、解密响应体、携带 token Header
  - [x] SubTask 1.3: 实现 Token 自动刷新逻辑（响应为 HTML 时用 openid 重新登录重试）
  - [x] SubTask 1.4: 实现所有 API 函数：wxLogin、getUserInfo、checkBlackList、bookingByTime、getPayPrice、createBookingBytime
  - [x] SubTask 1.5: 移除旧的 login/getBookingNode/getPaywayList/payOrderForPhone 等不再需要的函数

- [x] Task 2: 重写状态管理（`src/store/useStore.ts`）
  - [x] SubTask 2.1: 新增 openid 字段及持久化（localStorage key: cugb_openid）
  - [x] SubTask 2.2: 新增 userName 字段及持久化（localStorage key: cugb_name）
  - [x] SubTask 2.3: token 持久化改用 localStorage key: cugb_token
  - [x] SubTask 2.4: 新增抢场配置字段：armed（武装状态）、firing（正在抢场）、leadMs（提前量毫秒）、openTime（目标时间）
  - [x] SubTask 2.5: 新增日志系统：grabLogs 数组、addGrabLog（带时间戳）、clearGrabLogs
  - [x] SubTask 2.6: 移除旧的 autoGrabConfig 中的 nodeid/sitename/timeSlots 硬编码字段，改为 selectedCells（Set<string>）

- [x] Task 3: 重写后端代理（`api/app.ts`）
  - [x] SubTask 3.1: 修改代理逻辑，将 `x-token` Header 映射为 `token` Header 转发给上游
  - [x] SubTask 3.2: 更新微信 User-Agent 为 worker_v20 中的 Android 微信 UA
  - [x] SubTask 3.3: 代理支持所有 HTTP 方法（GET/POST），正确转发请求体
  - [x] SubTask 3.4: 移除路由前缀映射逻辑，改为通用代理（`/api/*` → 上游对应路径）

- [x] Task 4: 重写登录组件（`src/pages/Login.tsx`）
  - [x] SubTask 4.1: 支持粘贴加密字符串（`{"item":"..."}`）自动解密获取 openid 并登录
  - [x] SubTask 4.2: 支持直接输入 openid 登录
  - [x] SubTask 4.3: 支持手动输入 Token 登录
  - [x] SubTask 4.4: 登录成功后保存 openid 到 localStorage，自动跳转到主页
  - [x] SubTask 4.5: 登录成功后保存用户名到 localStorage

- [x] Task 5: 重写场地查询与预约页面（`src/pages/Booking.tsx`）
  - [x] SubTask 5.1: 实现动态场地矩阵，根据 nodeList 和 timeList 动态渲染行和列
  - [x] SubTask 5.2: 根据 priceList 显示每个格子的价格，按价格区分颜色（1000分=绿色/10元，4000分=橙色/40元）
  - [x] SubTask 5.3: 根据 conflictList 标记已约格子
  - [x] SubTask 5.4: 实现格子点击选择/取消选择
  - [x] SubTask 5.5: 实现行选择（点击时段标签选择整行）
  - [x] SubTask 5.6: 实现列选择（点击场地标题选择整列）
  - [x] SubTask 5.7: 实现时段范围快速选择按钮（如"全天"/"晚场"等）
  - [x] SubTask 5.8: 实现日期切换（当日/明天/后天），默认后天
  - [x] SubTask 5.9: 实现预约流程：检查黑名单 → 获取价格 → 提交预约
  - [x] SubTask 5.10: 实现并发预约（按场地分组，每个场地一个独立请求，Promise.allSettled）
  - [x] SubTask 5.11: 实现底部汇总栏（已选数量、场地数、时段数、总价）

- [x] Task 6: 实现武装模式定时抢场（`src/pages/Booking.tsx` 内或独立组件）
  - [x] SubTask 6.1: 实现武装模式开关（需已选格子 + 已填 Token 才能启动）
  - [x] SubTask 6.2: 实现倒计时逻辑（200ms 刷新频率），考虑 lead time 提前量
  - [x] SubTask 6.3: 实现倒计时到达时自动触发并发抢场
  - [x] SubTask 6.4: 实现 WakeLock API 集成（武装时请求，取消时释放）
  - [x] SubTask 6.5: 实现屏幕唤醒后补发逻辑（visibilitychange 事件，30秒内补发）
  - [x] SubTask 6.6: 实现目标时间配置输入框（默认 07:30）
  - [x] SubTask 6.7: 实现提前量（lead time）配置输入框（默认 0ms）

- [x] Task 7: 实现 UI 组件
  - [x] SubTask 7.1: 实现可拖拽倒计时浮动组件（pointer events 拖拽）
  - [x] SubTask 7.2: 实现 Toast 通知组件（成功/失败，自动消失）
  - [x] SubTask 7.3: 实现实时日志面板（info/ok/warn/error 四种类型着色，150条上限）
  - [x] SubTask 7.4: 实现 Token 输入区域（可折叠显示/隐藏）
  - [x] SubTask 7.5: 实现登出功能（清除 token/openid/name）

- [x] Task 8: 重写路由与页面结构（`src/App.tsx`）
  - [x] SubTask 8.1: 合并登录和预约为单页设计，登录区域在预约页内可折叠
  - [x] SubTask 8.2: 移除独立的 AutoGrab 页面，抢场功能集成到预约页
  - [x] SubTask 8.3: 简化路由：`/` 为主页（含登录+预约+抢场），无需多页面跳转

- [x] Task 9: 清理与样式
  - [x] SubTask 9.1: 删除 `src/pages/AutoGrab.tsx`（功能已合并到 Booking）
  - [x] SubTask 9.2: 删除 `src/pages/Home.tsx`（空组件）
  - [x] SubTask 9.3: 保留 `cloudflare-worker/` 目录（用户要求保留）
  - [x] SubTask 9.4: 删除 `api/routes/auth.ts`（空路由文件）
  - [x] SubTask 9.5: 调整全局样式，采用深色主题（参考 worker_v20 的 CSS 变量）

# Task Dependencies
- [Task 2] depends on [Task 1]（store 需要 API 函数）
- [Task 4] depends on [Task 1]（登录需要 API 函数）
- [Task 5] depends on [Task 1, Task 2]（预约页面需要 API 和 Store）
- [Task 6] depends on [Task 5]（抢场依赖预约页面的选择和预约逻辑）
- [Task 7] depends on [Task 2]（UI 组件需要 Store 的日志系统）
- [Task 8] depends on [Task 4, Task 5, Task 6]（路由依赖页面组件）
- [Task 9] depends on [Task 8]（清理依赖新结构就位）
- [Task 3] 无依赖，可与 Task 1 并行
