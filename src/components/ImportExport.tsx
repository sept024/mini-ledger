import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

interface Props {
  onDone: () => void
  showToast: (msg: string) => void
}

export default function ImportExport({ onDone, showToast }: Props) {
  const [importing, setImporting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleExport = async () => {
    const { data } = await supabase.from('records').select('*').order('date', { ascending: false })
    if (!data || data.length === 0) {
      showToast('暂无数据可导出')
      return
    }
    const header = '日期,类型,一级分类,二级分类,金额,备注,记录人'
    const rows = data.map((r: any) =>
      [r.date, r.type, r.category, r.subcategory || '', r.amount, (r.note || '').replace(/,/g, '，'), r.record_by].join(',')
    )
    const csv = '\uFEFF' + [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `记账导出_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    showToast('✅ 导出成功')
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const text = await file.text()
      const lines = text.split('\n').filter(l => l.trim())
      if (lines.length < 2) { showToast('CSV 格式错误'); return }

      const records: any[] = []
      let errors = 0

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',')
        if (cols.length < 5) { errors++; continue }
        const date = cols[0].trim()
        const type = cols[1].trim() === '收入' ? 'income' : 'expense'
        const category = cols[2].trim()
        const subcategory = (cols[3] || '').trim()
        const amount = parseFloat(cols[4].trim())
        const note = (cols[8] || '').trim()

        if (!date || isNaN(amount)) { errors++; continue }
        records.push({ date, type, category, subcategory, amount, note, record_by: '导入' })
      }

      if (records.length > 0) {
        // Insert in batches of 100
        for (let i = 0; i < records.length; i += 100) {
          const batch = records.slice(i, i + 100)
          const { error } = await supabase.from('records').insert(batch)
          if (error) { showToast('导入失败：' + error.message); return }
        }
        const msg = errors > 0
          ? `✅ 成功导入 ${records.length} 条，跳过 ${errors} 条`
          : `✅ 成功导入 ${records.length} 条`
        showToast(msg)
        onDone()
      } else {
        showToast('没有可导入的数据')
      }
    } catch (err: any) {
      showToast('导入出错：' + err.message)
    }
    setImporting(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div>
      <div className="card io-section">
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>📤 导出数据</h3>
        <p>导出为 CSV 格式，兼容 Mini记账 模板</p>
        <button className="btn btn-primary" onClick={handleExport}>导出 CSV</button>
      </div>

      <div className="card io-section">
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>📥 导入数据</h3>
        <p>支持 Mini记账 导出的 CSV 格式（含中文表头）</p>
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          onChange={handleImport}
          disabled={importing}
        />
        {importing && <p style={{ marginTop: 8, color: '#4CAF50' }}>⏳ 正在导入...</p>}
      </div>
    </div>
  )
}
