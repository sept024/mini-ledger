import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Category } from '../types'
import { format } from 'date-fns'

interface Props {
  user: string
  onDone: () => void
  showToast: (msg: string) => void
  editRecord?: { id: string; date: string; type: string; category: string; subcategory: string; amount: number; note: string } | null
}

const CATEGORY_ICONS: Record<string, string> = {
  '餐饮': '🍽️', '购物': '🛒', '交通': '🚌', '买菜': '🥬', '水果': '🍎',
  '休闲': '🎯', '娱乐': '🎮', '通讯': '📱', '美容': '💄', '家居': '🏠',
  '人情': '🎁', '汽车': '🚗', '医疗': '💊', '住房': '🏠', '教育': '📚',
  '零食': '🍪', '其他': '📋', '工资': '💰', '兼职': '💼', '奖金': '🏆',
  '投资': '📈', '红包': '🧧',
}

const CATEGORY_COLORS: Record<string, string> = {
  '餐饮': '#FF6B6B', '购物': '#4ECDC4', '交通': '#45B7D1', '买菜': '#96CEB4',
  '水果': '#FFEAA7', '休闲': '#DDA0DD', '娱乐': '#98D8C8', '通讯': '#85C1E9',
  '美容': '#F0B27A', '家居': '#82E0AA', '人情': '#F1948A', '汽车': '#85929E',
  '医疗': '#73C6B6', '住房': '#BB8FCE', '教育': '#F7DC6F', '零食': '#E8DAEF',
  '其他': '#BDC3C7', '工资': '#2ECC71', '兼职': '#3498DB', '奖金': '#F1C40F',
  '投资': '#9B59B6', '红包': '#E74C3C',
}

export default function RecordForm({ user, onDone, showToast, editRecord }: Props) {
  const [type, setType] = useState<'expense' | 'income'>((editRecord?.type as 'expense' | 'income') || 'expense')
  const [date, setDate] = useState(editRecord?.date || format(new Date(), 'yyyy-MM-dd'))
  const [time, setTime] = useState(editRecord && 'time' in editRecord ? (editRecord as any).time : format(new Date(), 'HH:mm'))
  const [category, setCategory] = useState(editRecord?.category || '餐饮')
  const [amount, setAmount] = useState(editRecord?.amount?.toString() || '')
  const [note, setNote] = useState(editRecord?.note || '')
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [showNote, setShowNote] = useState(!!editRecord?.note)
  const [showDatePicker, setShowDatePicker] = useState(false)

  useEffect(() => {
    loadCategories()
  }, [type])

  useEffect(() => {
    if (categories.length > 0 && !categories.find(c => c.name === category)) {
      setCategory(categories[0].name)
    }
  }, [categories])

  useEffect(() => {
    if (!editRecord) setCategory('餐饮')
  }, [type])

  const loadCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('type', type)
      .order('sort_order')
    setCategories((data || []) as Category[])
  }

  const saveRecord = async (stay: boolean) => {
    if (!amount || !category) { showToast('请选择分类并输入金额'); return }
    setLoading(true)
    const record = {
      date,
      time,
      type,
      category,
      amount: parseFloat(amount),
      note,
      record_by: user,
    }
    let error
    if (editRecord) {
      ({ error } = await supabase.from('records').update(record).eq('id', editRecord.id))
    } else {
      ({ error } = await supabase.from('records').insert(record))
    }
    setLoading(false)
    if (error) {
      showToast('保存失败：' + error.message)
    } else {
      showToast(editRecord ? '✅ 已更新' : '✅ 已保存')
      if (stay) {
        setAmount('')
        setNote('')
        setShowNote(false)
      } else {
        onDone()
      }
    }
  }

  const handleKeyPress = (key: string) => {
    if (key === 'backspace') {
      setAmount(prev => prev.slice(0, -1))
    } else if (key === '.') {
      if (!amount.includes('.')) setAmount(prev => prev + '.')
    } else if (key === '+/-') {
      setAmount(prev => prev.startsWith('-') ? prev.slice(1) : '-' + prev)
    } else {
      const newVal = amount + key
      if (!newVal.match(/^\d*\.?\d{0,2}$/)) return
      setAmount(newVal)
    }
  }

  const keys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['.', '0', 'backspace'],
  ]

  return (
    <div className="record-form-page">
      <div className="rf-top">
        <div className="rf-type-tabs">
          <button className={`rf-type-tab ${type === 'expense' ? 'active' : ''}`} onClick={() => setType('expense')}>支出</button>
          <button className={`rf-type-tab ${type === 'income' ? 'active' : ''}`} onClick={() => setType('income')}>收入</button>
          <button className="rf-type-tab disabled">转账</button>
        </div>
        <button className="rf-mgmt-btn" onClick={() => {}} title="分类管理">•••</button>
      </div>

      <div className="rf-amount-display">
        <span className="rf-currency">¥</span>
        <span className="rf-amount-value">{amount || '0'}</span>
        <span className="rf-currency-type">CNY</span>
      </div>

      <div className="rf-category-grid">
        {categories.slice(0, 14).map(c => (
          <button
            key={c.id}
            className={`rf-cat-btn ${category === c.name ? 'selected' : ''}`}
            onClick={() => setCategory(c.name)}
          >
            <span className="rf-cat-icon" style={{ background: category === c.name ? (CATEGORY_COLORS[c.name] || '#4CAF50') : '#f0f0f0' }}>
              {CATEGORY_ICONS[c.name] || '📋'}
            </span>
            <span className="rf-cat-name">{c.name}</span>
          </button>
        ))}
      </div>

      <div className="rf-extras">
        <div className="rf-extra-left">
          <div className="rf-note-btn" onClick={() => setShowNote(!showNote)}>
            <span className="rf-extra-icon">📝</span>
            <span>{note || '点击输入备注'}</span>
          </div>
          {showNote && (
            <input className="rf-note-input" value={note} onChange={e => setNote(e.target.value)} placeholder="输入备注..." autoFocus />
          )}
        </div>
        <div className="rf-extra-right">
          <button className="rf-extra-icon-btn" title={date + ' ' + time} onClick={() => setShowDatePicker(!showDatePicker)}>
            📅
          </button>
          <button className="rf-extra-icon-btn" title="图片上传">
            🖼️
          </button>
        </div>
      </div>

      {showDatePicker && (
        <div className="rf-date-row">
          <button className="rf-date-preset" onClick={() => { setDate(format(new Date(), 'yyyy-MM-dd')); setTime(format(new Date(), 'HH:mm')); setShowDatePicker(false) }}>今天</button>
          <input type="date" className="rf-date-input" value={date} onChange={e => { setDate(e.target.value); setShowDatePicker(false) }} />
          <input type="time" className="rf-time-input" value={time} onChange={e => setTime(e.target.value)} />
        </div>
      )}

      <div className="rf-keypad">
        {keys.map((row, i) => (
          <div key={i} className="rf-key-row">
            {row.map(k => (
              <button key={k} className="rf-key" onClick={() => handleKeyPress(k)}>
                {k === 'backspace' ? '⌫' : k}
              </button>
            ))}
          </div>
        ))}
        <div className="rf-key-row rf-action-row">
          <button className="rf-action-btn rf-btn-save" onClick={() => saveRecord(true)} disabled={loading}>
            {loading ? '...' : '再记'}
          </button>
          <button className="rf-action-btn rf-btn-done" onClick={() => saveRecord(false)} disabled={loading}>
            {loading ? '...' : '完成'}
          </button>
        </div>
      </div>
    </div>
  )
}
