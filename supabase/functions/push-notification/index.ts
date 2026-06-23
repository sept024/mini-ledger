// Mini记账 Web - 方糖推送 Edge Function
// 部署方式：Supabase Dashboard → Edge Functions → 新建 push-notification
// 需要设置环境变量 FANTANG_KEY

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  try {
    const { type, category, amount, record_by, date, note } = await req.json()

    const FANTANG_KEY = Deno.env.get('FANTANG_KEY')
    if (!FANTANG_KEY) {
      return new Response(JSON.stringify({ error: 'FANTANG_KEY not configured' }), { status: 500 })
    }

    const title = `📝 ${record_by} 记了一笔账`
    const desp = [
      `**${record_by}** 记录了一笔 **${type}**`,
      `💰 金额：${amount} 元`,
      `📂 分类：${category}`,
      `📅 日期：${date}`,
      note ? `📝 备注：${note}` : '',
    ].filter(Boolean).join('\n\n')

    const res = await fetch(`https://push.ftqq.com/send/${FANTANG_KEY}.send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, desp }),
    })

    const result = await res.json()
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 })
  }
})
