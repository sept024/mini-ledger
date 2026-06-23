export interface Record {
  id: string
  date: string
  type: 'expense' | 'income'
  category: string
  subcategory: string
  amount: number
  note: string
  record_by: string
  created_at: string
}

export interface Category {
  id: number
  ledger_id: string
  name: string
  type: 'expense' | 'income'
  color: string
  sort_order: number
}

export interface MonthlyStats {
  month: string
  income: number
  expense: number
}

export interface CategoryStat {
  name: string
  value: number
  color: string
}

export function displayType(type: string): string {
  return type === 'expense' ? '支出' : '收入'
}

export function dbType(type: string): 'expense' | 'income' {
  return type === '支出' || type === 'expense' ? 'expense' : 'income'
}
