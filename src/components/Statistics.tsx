import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { format, startOfMonth, endOfMonth, subMonths, eachDayOfInterval, getDaysInMonth, isToday, isYesterday } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

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

const CATEGORY_COLORS = [
  '#4ECDC4', '#FF6B6B', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  '#F0B27A', '#82E0AA', '#F1948A', '#85929E', '#73C6B6',
]

type TimeRange = 'week' | 'month' | 'year'

function CategoryDetail({ category, records, onEdit }: { category: string; records: DbRecord[]; onEdit?: (r: any) => void }) {
  const filtered = records.filter(r => r.type === 'expense' && r.category === category).sort((a, b) => b.date.localeCompare(a.date))
  const grouped: Record<string, DbRecord[]> = {}
  filtered.forEach(r => {
    if (!grouped[r.date]) grouped[r.date] = []
    grouped[r.date].push(r)
  })
  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  const fmtDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00')
    if (isToday(d)) return '今天'
    if (isYesterday(d)) return '昨天'
    return format(d, 'M月d日')
  }
  const fmtWeekday = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00')
    return format(d, 'EEEE', { locale: zhCN })
  }

  return (
    <div className="category-detail-scroll" style={{ maxHeight: 400, overflowY: 'auto' }}>
      {dates.map(dateStr => {
        const dayRecords = grouped[dateStr]
        const dayTotal = dayRecords.reduce((s, r) => s + Number(r.amount), 0)
        return (
          <div key={dateStr} className="day-group">
            <div className="day-header">
              <span className="day-date">{fmtDate(dateStr)} {fmtWeekday(dateStr)}</span>
              <span className="day-total expense">¥{dayTotal.toLocaleString('zh-CN', { minimumFractionDigits: 1 })}</span>
            </div>
            <div className="day-records">
              {dayRecords.map(r => (
                <div key={r.id} className="record-item clickable" onClick={() => onEdit?.(r)}>
                  <div className="record-icon">{CATEGORY_ICONS[r.category] || '📋'}</div>
                  <div className="record-info">
                    <div className="record-category">{r.category}</div>
                    <div className="record-meta">
                      <span>{r.time || (r.created_at ? format(new Date(r.created_at), 'HH:mm') : '')}</span>
                      {r.note && <span className="record-note">{r.note}</span>}
                    </div>
                  </div>
                  <div className="record-amount expense">-¥{Number(r.amount).toLocaleString('zh-CN', { minimumFractionDigits: 1 })}</div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function Statistics({ onEdit }: { onEdit?: (r: any) => void }) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [records, setRecords] = useState<DbRecord[]>([])
  const [timeRange, setTimeRange] = useState<TimeRange>('month')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  useEffect(() => {
    loadRecords()
  }, [currentMonth, timeRange])

  const loadRecords = async () => {
    let start: string, end: string

    if (timeRange === 'month') {
      start = format(startOfMonth(currentMonth), 'yyyy-MM-dd')
      end = format(endOfMonth(currentMonth), 'yyyy-MM-dd')
    } else if (timeRange === 'week') {
      const d = new Date(currentMonth)
      start = format(new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay()), 'yyyy-MM-dd')
      end = format(new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay() + 6), 'yyyy-MM-dd')
    } else {
      start = format(new Date(currentMonth.getFullYear(), 0, 1), 'yyyy-MM-dd')
      end = format(new Date(currentMonth.getFullYear(), 11, 31), 'yyyy-MM-dd')
    }

    const { data } = await supabase
      .from('records')
      .select('*')
      .gte('date', start)
      .lte('date', end)
      .order('date')
    setRecords((data || []) as DbRecord[])
  }

  const totalIncome = records.filter(r => r.type === 'income').reduce((s, r) => s + Number(r.amount), 0)
  const totalExpense = records.filter(r => r.type === 'expense').reduce((s, r) => s + Number(r.amount), 0)
  const netBalance = totalIncome - totalExpense

  const daysInMonth = timeRange === 'month' ? getDaysInMonth(currentMonth) : timeRange === 'week' ? 7 : 365
  const dailyAvg = totalExpense / daysInMonth

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const nextMonth = () => {
    const next = new Date(currentMonth)
    next.setMonth(next.getMonth() + 1)
    if (next <= new Date()) setCurrentMonth(next)
  }

  const monthLabel = format(currentMonth, 'yyyy年M月')

  // Daily expense data for bar chart
  const dailyData = (() => {
    if (timeRange === 'month') {
      const days = getDaysInMonth(currentMonth)
      const result = []
      for (let d = 1; d <= days; d++) {
        const dateStr = format(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d), 'yyyy-MM-dd')
        const dayExpense = records
          .filter(r => r.date === dateStr && r.type === 'expense')
          .reduce((s, r) => s + Number(r.amount), 0)
        result.push({ day: `${currentMonth.getMonth() + 1}.${d}`, amount: dayExpense })
      }
      return result
    } else if (timeRange === 'week') {
      const start = new Date(currentMonth)
      start.setDate(start.getDate() - start.getDay())
      const days = eachDayOfInterval({ start, end: new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6) })
      return days.map(d => {
        const dateStr = format(d, 'yyyy-MM-dd')
        const dayExpense = records
          .filter(r => r.date === dateStr && r.type === 'expense')
          .reduce((s, r) => s + Number(r.amount), 0)
        return { day: `${d.getMonth() + 1}.${d.getDate()}`, amount: dayExpense }
      })
    } else {
      const result = []
      for (let m = 0; m < 12; m++) {
        const monthStart = format(new Date(currentMonth.getFullYear(), m, 1), 'yyyy-MM-dd')
        const monthEnd = format(new Date(currentMonth.getFullYear(), m + 1, 0), 'yyyy-MM-dd')
        const monthExpense = records
          .filter(r => r.date >= monthStart && r.date <= monthEnd && r.type === 'expense')
          .reduce((s, r) => s + Number(r.amount), 0)
        result.push({ day: `${m + 1}月`, amount: monthExpense })
      }
      return result
    }
  })()

  // Category breakdown for donut chart (only expenses)
  const categoryData = (() => {
    const byCat: Record<string, number> = {}
    records.filter(r => r.type === 'expense').forEach(r => {
      byCat[r.category] = (byCat[r.category] || 0) + Number(r.amount)
    })
    return Object.entries(byCat)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 8)
      .map(([name, value], i) => ({
        name,
        value: value as number,
        percent: totalExpense > 0 ? Math.round(((value as number) / totalExpense) * 100) : 0,
        color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
      }))
  })()

  const renderPieLabel = (props: any) => {
    const { cx, cy, midAngle, outerRadius, name } = props
    const RADIAN = Math.PI / 180
    const cat = categoryData.find(c => c.name === name)
    const pct = cat ? cat.percent : 0
    const color = cat ? cat.color : '#ccc'
    if (pct < 4) return null

    const angle = -midAngle * RADIAN
    const r1 = outerRadius
    const r2 = outerRadius + 14
    const x1 = cx + r1 * Math.cos(angle)
    const y1 = cy + r1 * Math.sin(angle)
    const x2 = cx + r2 * Math.cos(angle)
    const y2 = cy + r2 * Math.sin(angle)
    const isRight = x2 >= cx
    const gap = 8
    const x3 = isRight ? x2 + gap : x2 - gap

    return (
      <g>
        <polyline points={`${x1},${y1} ${x2},${y2} ${x3},${y2}`} stroke={color} strokeWidth={2} fill="none" />
        <text x={x3} y={y2 - 5} textAnchor={isRight ? 'start' : 'end'} fontSize={12} fill="#333" fontWeight={500}>
          {name}
        </text>
        <text x={x3} y={y2 + 10} textAnchor={isRight ? 'start' : 'end'} fontSize={12} fill="#999">
          {pct}%
        </text>
      </g>
    )
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="chart-tooltip">
          <div className="tooltip-date">{payload[0].payload.day}</div>
          <div className="tooltip-amount">¥{payload[0].value.toLocaleString('zh-CN', { minimumFractionDigits: 1 })}</div>
        </div>
      )
    }
    return null
  }

  return (
    <div>
      {/* Time range tabs */}
      <div className="stats-tabs">
        {(['week', 'month', 'year'] as TimeRange[]).map(r => (
          <button
            key={r}
            className={`stats-tab ${timeRange === r ? 'active' : ''}`}
            onClick={() => setTimeRange(r)}
          >
            {r === 'week' ? '周' : r === 'month' ? '月' : '年'}
          </button>
        ))}
      </div>

      {/* Month selector */}
      <div className="month-selector stats-month-selector">
        <button className="month-arrow" onClick={prevMonth}>‹</button>
        <span className="month-title">{monthLabel}</span>
        <button className="month-arrow" onClick={nextMonth}>›</button>
      </div>

      {/* Summary card */}
      <div className="stats-summary-card">
        <div className="stats-grid">
          <div className="stats-item">
            <div className="stats-item-label">支出</div>
            <div className="stats-item-value expense">¥{totalExpense.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</div>
          </div>
          <div className="stats-item">
            <div className="stats-item-label">收入</div>
            <div className="stats-item-value income">¥{totalIncome.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</div>
          </div>
          <div className="stats-item">
            <div className="stats-item-label">收支盈余</div>
            <div className="stats-item-value">¥{netBalance.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</div>
          </div>
          <div className="stats-item">
            <div className="stats-item-label">日均支出</div>
            <div className="stats-item-value">¥{dailyAvg.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</div>
          </div>
        </div>
      </div>

      {/* Daily bar chart */}
      <div className="chart-card">
        <div className="chart-header">
          <h3>每日对比</h3>
          <span className="chart-badge expense">支出</span>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={dailyData} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
            <XAxis dataKey="day" axisLine={false} tickLine={false} fontSize={10} interval={timeRange === 'month' ? 4 : 0} />
            <YAxis axisLine={false} tickLine={false} fontSize={10} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(76,175,80,0.1)' }} />
            <Bar dataKey="amount" fill="#4CAF50" radius={[2, 2, 0, 0]} maxBarSize={timeRange === 'month' ? 8 : 30} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Category donut chart */}
      {categoryData.length > 0 && !selectedCategory && (
        <div className="chart-card">
          <div className="chart-header">
            <h3>分类占比</h3>
            <span className="chart-badge expense">支出</span>
          </div>
          <div className="donut-container">
            <ResponsiveContainer width="100%" height={320}>
              <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  label={renderPieLabel}
                  labelLine={false}
                >
                  {categoryData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => `¥${Number(v).toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="donut-center">
              <div className="donut-center-label">共计(¥)</div>
              <div className="donut-center-value">{totalExpense.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</div>
            </div>
          </div>
          <div className="category-detail-list">
            {categoryData.map((c, i) => (
              <div key={i} className="category-detail-row clickable" onClick={() => setSelectedCategory(c.name)}>
                <div className="category-detail-left">
                  <span className="legend-dot" style={{ background: c.color }} />
                  <span className="category-detail-name">{c.name}</span>
                </div>
                <div className="category-detail-right">
                  <span className="category-detail-amount">¥{c.value.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</span>
                  <span className="category-detail-pct">{c.percent}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category detail drill-down */}
      {selectedCategory && (
        <div className="chart-card">
          <div className="chart-header">
            <button className="btn-back" onClick={() => setSelectedCategory(null)}>← 返回</button>
            <h3 style={{ fontSize: 16 }}>{CATEGORY_ICONS[selectedCategory] || '📋'} {selectedCategory}</h3>
            <span className="chart-badge expense">支出</span>
          </div>
          <CategoryDetail category={selectedCategory} records={records} onEdit={onEdit} />
        </div>
      )}
    </div>
  )
}
