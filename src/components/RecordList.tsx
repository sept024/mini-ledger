import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

interface DbRecord {
  id: string
  date: string
  type: 'income' | 'expense'
  category: string
  subcategory: string
  amount: number
  note: string
  record_by: string
  created_at: string
}

interface Props {
  onEdit: (record: any) => void
}

export default function RecordList({ onEdit }: Props) {
  const [records, setRecords] = useState<DbRecord[]>([])
  const [filterType, setFilterType] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterPerson, setFilterPerson] = useState('')
  const [searchMonth, setSearchMonth] = useState(new Date().toISOString().slice(0, 7))

  const load = useCallback(async () => {
    let query = supabase.from('records').select('*').order('date', { ascending: false })
    if (filterType) query = query.eq('type', filterType)
    if (filterCategory) query = query.eq('category', filterCategory)
    if (filterPerson) query = query.eq('record_by', filterPerson)
    if (searchMonth) {
      const start = searchMonth + '-01'
      const [y, m] = searchMonth.split('-')
      const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate()
      const end = searchMonth + '-' + String(lastDay).padStart(2, '0')
      query = query.gte('date', start).lte('date', end)
    }
    const { data } = await query
    setRecords((data || []) as DbRecord[])
  }, [filterType, filterCategory, filterPerson, searchMonth])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const sub = supabase
      .channel('records-list-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'records' }, () => load())
      .subscribe()
    return () => { supabase.removeChannel(sub) }
  }, [load])

  const deleteRecord = async (id: string) => {
    if (!confirm('确定删除这条记录？')) return
    await supabase.from('records').delete().eq('id', id)
    load()
  }

  const totalIncome = records.filter(r => r.type === 'income').reduce((s, r) => s + Number(r.amount), 0)
  const totalExpense = records.filter(r => r.type === 'expense').reduce((s, r) => s + Number(r.amount), 0)

  const persons = [...new Set(records.map(r => r.record_by))]
  const categories = [...new Set(records.map(r => r.category))]

  return (
    <div>
      <div className="card">
        <div style={{ fontSize: 14, marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
          <span>收入 <strong style={{ color: '#4CAF50' }}>{totalIncome.toFixed(2)}</strong></span>
          <span>支出 <strong style={{ color: '#f44336' }}>{totalExpense.toFixed(2)}</strong></span>
          <span>结余 <strong style={{ color: totalIncome - totalExpense >= 0 ? '#4CAF50' : '#f44336' }}>
            {(totalIncome - totalExpense).toFixed(2)}
          </strong></span>
        </div>

        <div className="filter-bar">
          <input
            type="month"
            value={searchMonth}
            onChange={e => setSearchMonth(e.target.value)}
            style={{ minWidth: 120 }}
          />
          <select value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">全部类型</option>
            <option value="支出">支出</option>
            <option value="收入">收入</option>
          </select>
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
            <option value="">全部分类</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filterPerson} onChange={e => setFilterPerson(e.target.value)}>
            <option value="">全部成员</option>
            {persons.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        {records.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <div className="empty-text">暂无记录</div>
          </div>
        ) : (
          records.map(r => (
            <div key={r.id} className="record-item">
              <div className={`record-icon ${r.type === 'expense' ? 'expense-bg' : 'income-bg'}`}>
                {r.type === 'expense' ? '💸' : '💰'}
              </div>
              <div className="record-info">
                <div className="record-category">
                  {r.category}{r.subcategory ? ` / ${r.subcategory}` : ''}
                </div>
                <div className="record-meta">
                  <span>{r.date}</span>
                  <span className={`type-badge ${r.type === 'income' ? 'income' : 'expense'}`}>{r.type === 'income' ? '收入' : '支出'}</span>
                  <span>{r.record_by}</span>
                  {r.note && <span>{r.note}</span>}
                </div>
              </div>
              <div className={`record-amount ${r.type === 'expense' ? 'expense' : 'income'}`}>
                {r.type === 'expense' ? '-' : '+'}{Number(r.amount).toFixed(2)}
              </div>
              <div className="record-actions">
                <button className="btn btn-ghost" onClick={() => onEdit(r)}>✏️</button>
                <button className="btn btn-ghost" onClick={() => deleteRecord(r.id)}>🗑️</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
