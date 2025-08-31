const sleep = (ms) => new Promise(r => setTimeout(r, ms))

async function pingOnce(u) {
  // 加時間戳避免任何快取
  const ts = Date.now()
  const url = u.includes('?') ? `${u}&ts=${ts}` : `${u}?ts=${ts}`
  try {
    const res = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'user-agent': 'erp-waker',
        'cache-control': 'no-cache',
        'pragma': 'no-cache'
      }
    })
    console.log(`[waker] ${new Date().toISOString()} ${res.status} ${url}`)
  } catch {
    console.log(`[waker] ${new Date().toISOString()} ERROR ${url}`)
  }
}

export default {
  // 手動打 Worker 網址時會回 200（測試用）
  async fetch() {
    return new Response('ok', { status: 200 })
  },

  // 定時觸發：逐一喚醒（每個 URL 連打兩次）
  async scheduled(_event, env, ctx) {
    const raw = (env.TARGET_URL || '').trim()
    if (!raw) return
    const urls = raw.split(',').map(s => s.trim()).filter(Boolean)
    for (const u of urls) {
      ctx.waitUntil((async () => {
        await pingOnce(u)
        await sleep(2000)
        await pingOnce(u)
      })())
    }
  }
}
