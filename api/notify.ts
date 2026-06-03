import pool from './db.js';

interface GrabTask {
  booking_date: string;
  cells: Array<{ court?: string; time?: string; price?: number; [key: string]: unknown }>;
  result: string | null;
  user_name: string;
}

export async function sendNotification(openid: string, title: string, desp: string): Promise<void> {
  const [rows] = await pool.execute(
    'SELECT serverchan_key, enabled FROM notify_config WHERE openid = ?',
    [openid],
  );
  const result = rows as Array<{ serverchan_key: string; enabled: number }>;

  if (!result.length || result[0].enabled !== 1 || !result[0].serverchan_key) {
    return;
  }

  const serverchanKey = result[0].serverchan_key;

  try {
    const res = await fetch(`https://sctapi.ftqq.com/${serverchanKey}.send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `title=${encodeURIComponent(title)}&desp=${encodeURIComponent(desp)}`,
    });

    if (res.ok) {
      console.log(`[Notify] Sent to ${openid}: ${title}`);
    } else {
      console.log(`[Notify] Failed for ${openid}: HTTP ${res.status}`);
    }
  } catch (err) {
    console.log(`[Notify] Error sending to ${openid}:`, err);
  }
}

export function buildSuccessMessage(task: GrabTask): { title: string; desp: string } {
  const courtList = Array.isArray(task.cells)
    ? task.cells.map((c) => `- ${c.court ?? ''} ${c.time ?? ''} ¥${c.price ?? 0}`).join('\n')
    : '';
  const totalPrice = Array.isArray(task.cells)
    ? task.cells.reduce((sum, c) => sum + (Number(c.price) || 0), 0)
    : 0;

  const desp = `## 抢场成功\n\n**预约日期：** ${task.booking_date}\n\n**用户：** ${task.user_name}\n\n**场地信息：**\n\n${courtList}\n\n**总价：** ¥${totalPrice}\n\n---\n\n⚠️ 请尽快登录小程序完成付款！`;

  return {
    title: '🏸 抢场成功！请尽快付款',
    desp,
  };
}

export function buildFailureMessage(task: GrabTask, reason: string): { title: string; desp: string } {
  const desp = `## 抢场失败\n\n**预约日期：** ${task.booking_date}\n\n**用户：** ${task.user_name}\n\n**失败原因：** ${reason}`;

  return {
    title: '❌ 抢场失败',
    desp,
  };
}
