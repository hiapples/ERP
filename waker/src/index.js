export default {
  // 手動打 Worker 網址時會回 200（測試用）
  async fetch() {
    return new Response('ok', { status: 200 })
  },

  // 由上面 cron 觸發：定時打你的後端 /health
  async scheduled(_event, env, ctx) {
    const url = env.TARGET_URL
    if (!url) return
    ctx.waitUntil(
      fetch(url, { method: 'GET', headers: { 'user-agent': 'erp-cron' } })
        .catch(() => {})   // 喚醒用途：失敗略過
    )
  }
}
