import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Category } from '../types'

interface Props {
  showToast: (msg: string) => void
}

export default function CategoryManager({ showToast }: Props) {
  const [categories, setCategories] = useState<Category[]>([])
  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [newName, setNewName] = useState('')

  useEffect(() => { load() }, [type])

  const load = async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('type', type)
      .order('sort_order')
    setCategories((data || []) as Category[])
  }

  const add = async () => {
    if (!newName.trim()) return
    const maxSort = categories.length > 0 ? Math.max(...categories.map(c => c.sort_order)) : 0
    const { error } = await supabase
      .from('categories')
      .insert({ name: newName.trim(), type, sort_order: maxSort + 1 })
    if (error) {
      showToast('添加失败：' + error.message)
    } else {
      setNewName('')
      load()
      showToast('✅ 已添加')
    }
  }

  const remove = async (id: number) => {
    if (!confirm('确定删除此分类？\n（已有记录不受影响）')) return
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) {
      showToast('删除失败：' + error.message)
    } else {
      load()
      showToast('已删除')
    }
  }

  return (
    <div>
      <div className="card">
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>分类管理</h3>

        <div className="category-type-toggle">
          <button
            className={`btn ${type === 'expense' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setType('expense')}
          >
            💸 支出
          </button>
          <button
            className={`btn ${type === 'income' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setType('income')}
          >
            💰 收入
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="新分类名称"
            onKeyDown={e => e.key === 'Enter' && add()}
            style={{ flex: 1 }}
          />
          <button className="btn btn-primary" onClick={add} style={{ whiteSpace: 'nowrap' }}>
            添加
          </button>
        </div>

        {categories.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🏷️</div>
            <div className="empty-text">暂无分类</div>
          </div>
        ) : (
          categories.map(c => (
            <div key={c.id} className="category-item">
              <span className="category-name">{c.name}</span>
              <button className="btn btn-sm btn-danger" onClick={() => remove(c.id)}>删除</button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
