import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths, isToday, isYesterday } from 'date-fns'
import { zhCN } from 'date-fns/locale'

interface DbRecord {
  id: string
  date: string
  time: string
  type: 'expense' | 'income'
  category: string
  subcategory: string
  amount: number
  note: string
  record_by: string
  created_at: string
}

const CATEGORY_ICONS: Record<string, string> = {
  '餐饮': '🍽️', '购物': '🛒', '交通': '🚌', '住房': '🏠', '娱乐': '🎮',
  '医疗': '💊', '教育': '📚', '通讯': '📱', '美容': '💄', '人情': '🎁',
  '零食': '🍪', '水果': '🍎', '买菜': '🥬', '汽车': '🚗', '其他': '📋',
  '工资': '💰', '兼职': '💼', '奖金': '🏆', '投资': '📈', '红包': '🧧',
}

const BUDGET_KEY = 'mini_ledger_budget'

function loadBudget() {
  try {
    return JSON.parse(localStorage.getItem(BUDGET_KEY) || '{"weekly":500,"daily":100,"monthly":2000}')
  } catch { return { weekly: 500, daily: 100, monthly: 2000 } }
}

function saveBudget(b: { weekly: number; daily: number; monthly: number }) {
  localStorage.setItem(BUDGET_KEY, JSON.stringify(b))
}

export default function Dashboard({ onEdit }: { onEdit?: (record: any) => void }) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [monthRecords, setMonthRecords] = useState<DbRecord[]>([])
  const [budget, setBudget] = useState(loadBudget)
  const [editingBudget, setEditingBudget] = useState<'weekly' | 'daily' | 'monthly' | null>(null)
  const [editValue, setEditValue] = useState('')

  useEffect(() => {
    loadMonthRecords()
  }, [currentMonth])

  const loadMonthRecords = async () => {
    const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd')
    const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd')
    const { data } = await supabase
      .from('records')
      .select('*')
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
    setMonthRecords((data || []) as DbRecord[])
  }

  const totalIncome = monthRecords.filter(r => r.type === 'income').reduce((s, r) => s + Number(r.amount), 0)
  const totalExpense = monthRecords.filter(r => r.type === 'expense').reduce((s, r) => s + Number(r.amount), 0)
  const netBalance = totalIncome - totalExpense
  const spentPercent = totalIncome > 0 ? Math.round((totalExpense / totalIncome) * 100) : 0

  const today = format(new Date(), 'yyyy-MM-dd')
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')

  const weeklyExpense = monthRecords
    .filter(r => r.type === 'expense' && r.date >= weekStart && r.date <= weekEnd)
    .reduce((s, r) => s + Number(r.amount), 0)
  const todayExpense = monthRecords
    .filter(r => r.type === 'expense' && r.date === today)
    .reduce((s, r) => s + Number(r.amount), 0)

  const monthlyExpense = totalExpense
  const weeklyUsedPct = Math.min(Math.round((weeklyExpense / budget.weekly) * 100), 100)
  const weeklyRemaining = Math.max(budget.weekly - weeklyExpense, 0)
  const dailyUsedPct = Math.min(Math.round((todayExpense / budget.daily) * 100), 100)
  const dailyRemaining = Math.max(budget.daily - todayExpense, 0)
  const monthlyUsedPct = Math.min(Math.round((monthlyExpense / budget.monthly) * 100), 100)
  const monthlyRemaining = Math.max(budget.monthly - monthlyExpense, 0)

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const nextMonth = () => {
    const next = new Date(currentMonth)
    next.setMonth(next.getMonth() + 1)
    if (next <= new Date()) setCurrentMonth(next)
  }

  const monthLabel = format(currentMonth, 'M月')
  const yearLabel = format(currentMonth, 'yyyy')

  const groupedByDate: Record<string, DbRecord[]> = {}
  monthRecords.forEach(r => {
    const key = r.date
    if (!groupedByDate[key]) groupedByDate[key] = []
    groupedByDate[key].push(r)
  })

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a))

  const formatDateHeader = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00')
    if (isToday(d)) return '今天 ' + format(d, 'EEEE', { locale: zhCN })
    if (isYesterday(d)) return '昨天 ' + format(d, 'EEEE', { locale: zhCN })
    return format(d, 'M月d日 EEEE', { locale: zhCN })
  }

  const getDayTotal = (records: DbRecord[]) => {
    return records.reduce((s, r) => {
      if (r.type === 'expense') return s - Number(r.amount)
      return s + Number(r.amount)
    }, 0)
  }

  const startBudgetEdit = (type: 'weekly' | 'daily' | 'monthly') => {
    setEditingBudget(type)
    setEditValue(String(budget[type]))
  }

  const confirmBudgetEdit = () => {
    if (!editingBudget) return
    const val = parseFloat(editValue)
    if (isNaN(val) || val <= 0) { setEditingBudget(null); return }
    const newBudget = { ...budget, [editingBudget]: val }
    setBudget(newBudget)
    saveBudget(newBudget)
    setEditingBudget(null)
  }

  return (
    <div>
      <div className="overview-top-bar">
        <div className="ledger-name">默认账本</div>
        <div className="top-actions">
          <div className="month-selector">
            <button className="month-arrow" onClick={prevMonth}>‹</button>
            <div className="month-display">
              <span className="month-text">{monthLabel}</span>
              <span className="year-text">{yearLabel}</span>
            </div>
            <button className="month-arrow" onClick={nextMonth}>›</button>
          </div>
        </div>
      </div>

      <div className="balance-card">
        <div className="balance-header">
          <span className="balance-label">收支盈余</span>
          {totalIncome > 0 && (
            <span className="balance-hint">你花费了 {spentPercent}% 的收入</span>
          )}
        </div>
        <div className="balance-amount">¥{netBalance.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</div>
        <div className="balance-row">
          <div className="balance-item expense-item">
            <div className="balance-icon expense-icon">↓</div>
            <div>
              <div className="balance-item-label">支出</div>
              <div className="balance-item-amount">¥{totalExpense.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</div>
            </div>
          </div>
          <div className="balance-item income-item">
            <div className="balance-icon income-icon">↑</div>
            <div>
              <div className="balance-item-label">收入</div>
              <div className="balance-item-amount">¥{totalIncome.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="budget-section">
        <div className="budget-card">
          <div className="budget-card-header">每周预算</div>
          <div className="budget-progress-row">
            <div className="budget-progress-bar">
              <div className="budget-progress-fill" style={{ width: `${weeklyUsedPct}%` }} />
            </div>
            <span className="budget-progress-label">{weeklyUsedPct}%</span>
          </div>
          {editingBudget === 'weekly' ? (
            <div className="budget-edit">
              <input className="budget-input" type="number" value={editValue}
                onChange={e => setEditValue(e.target.value)}
                onBlur={confirmBudgetEdit}
                onKeyDown={e => { if (e.key === 'Enter') confirmBudgetEdit(); if (e.key === 'Escape') setEditingBudget(null) }}
                autoFocus />
              <span className="budget-edit-unit">/周</span>
            </div>
          ) : (
            <div className="budget-remaining clickable" onClick={() => startBudgetEdit('weekly')}>
              剩余 ¥{weeklyRemaining.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
              <span className="budget-edit-hint">点击编辑</span>
            </div>
          )}
        </div>
        <div className="budget-card">
          <div className="budget-card-header">每日预算</div>
          <div className="budget-progress-row">
            <div className="budget-progress-bar">
              <div className="budget-progress-fill" style={{ width: `${dailyUsedPct}%` }} />
            </div>
            <span className="budget-progress-label">{dailyUsedPct}%</span>
          </div>
          {editingBudget === 'daily' ? (
            <div className="budget-edit">
              <input className="budget-input" type="number" value={editValue}
                onChange={e => setEditValue(e.target.value)}
                onBlur={confirmBudgetEdit}
                onKeyDown={e => { if (e.key === 'Enter') confirmBudgetEdit(); if (e.key === 'Escape') setEditingBudget(null) }}
                autoFocus />
              <span className="budget-edit-unit">/天</span>
            </div>
          ) : (
            <div className="budget-remaining clickable" onClick={() => startBudgetEdit('daily')}>
              剩余 ¥{dailyRemaining.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
              <span className="budget-edit-hint">点击编辑</span>
            </div>
          )}
        </div>
      </div>

      <div className="monthly-budget-card">
        <div className="monthly-budget-header">
          <span className="monthly-budget-title">每月预算</span>
          {editingBudget === 'monthly' ? (
            <div className="budget-edit">
              <input className="budget-input" type="number" value={editValue}
                onChange={e => setEditValue(e.target.value)}
                onBlur={confirmBudgetEdit}
                onKeyDown={e => { if (e.key === 'Enter') confirmBudgetEdit(); if (e.key === 'Escape') setEditingBudget(null) }}
                autoFocus />
              <span className="budget-edit-unit">/月</span>
            </div>
          ) : (
            <span className="monthly-budget-amount clickable" onClick={() => startBudgetEdit('monthly')}>
              ¥{budget.monthly.toLocaleString('zh-CN', { minimumFractionDigits: 0 })}
              <span className="budget-edit-hint">点击编辑</span>
            </span>
          )}
        </div>
        <div className="monthly-progress-row">
          <div className="monthly-progress-bar">
            <div className="monthly-progress-fill" style={{ width: `${monthlyUsedPct}%` }} />
          </div>
          <span className="monthly-progress-label">{monthlyUsedPct}%</span>
        </div>
        <div className="monthly-balance-row">
          <div className="monthly-balance-item">
            <span className="monthly-balance-label">已支出</span>
            <span className="monthly-balance-value expense">¥{monthlyExpense.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="monthly-balance-divider" />
          <div className="monthly-balance-item">
            <span className="monthly-balance-label">月度结余</span>
            <span className="monthly-balance-value income">¥{monthlyRemaining.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      <div className="bills-section">
        <div className="bills-header">
          <span className="bills-title">账单</span>
        </div>

        {sortedDates.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <div className="empty-text">本月暂无记录</div>
          </div>
        ) : (
          sortedDates.map(dateStr => {
            const records = groupedByDate[dateStr]
            const dayTotal = getDayTotal(records)
            return (
              <div key={dateStr} className="day-group">
                <div className="day-header">
                  <span className="day-date">{formatDateHeader(dateStr)}</span>
                  <span className={`day-total ${dayTotal >= 0 ? 'income' : 'expense'}`}>
                    {dayTotal >= 0 ? '收' : '支'} ¥{Math.abs(dayTotal).toLocaleString('zh-CN', { minimumFractionDigits: 1 })}
                  </span>
                </div>
                <div className="day-records">
                  {records.map(r => (
                    <div key={r.id} className="record-item clickable" onClick={() => onEdit?.(r)}>
                      <div className="record-icon">
                        {CATEGORY_ICONS[r.category] || '📋'}
                      </div>
                      <div className="record-info">
                        <div className="record-category">{r.category}</div>
                        <div className="record-meta">
                          <span>{r.time || (r.created_at ? format(new Date(r.created_at), 'HH:mm') : '')}</span>
                          {r.note && <span className="record-note">{r.note}</span>}
                        </div>
                      </div>
                      <div className={`record-amount ${r.type === 'expense' ? 'expense' : 'income'}`}>
                        {r.type === 'expense' ? '-' : '+'}¥{Number(r.amount).toLocaleString('zh-CN', { minimumFractionDigits: 1 })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
