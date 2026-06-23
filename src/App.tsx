import { useState } from 'react'
import Dashboard from './components/Dashboard'
import Statistics from './components/Statistics'
import RecordForm from './components/RecordForm'
import ImportExport from './components/ImportExport'

type Tab = 'overview' | 'stats' | 'add' | 'settings'

const navConfig: { key: Tab; label: string; icon: string }[] = [
  { key: 'overview', label: '概况', icon: '🏠' },
  { key: 'stats', label: '统计', icon: '📊' },
  { key: 'add', label: '记账', icon: '' },
  { key: 'settings', label: '更多', icon: '⚙️' },
]

export default function App() {
  const [tab, setTab] = useState<Tab>('overview')
  const [refreshKey, setRefreshKey] = useState(0)
  const [editingRecord, setEditingRecord] = useState<any>(null)
  const [toast, setToast] = useState('')

  const refresh = () => {
    setRefreshKey(k => k + 1)
    setEditingRecord(null)
  }

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  const handleEdit = (record: any) => {
    setEditingRecord(record)
    setTab('add')
  }

  const handleDone = () => {
    refresh()
    setTab('overview')
  }

  return (
    <div className="app-container">
      {toast && <div className="toast">{toast}</div>}

      {tab === 'overview' && <Dashboard key={refreshKey} onEdit={handleEdit} />}
      {tab === 'stats' && <Statistics key={refreshKey} onEdit={handleEdit} />}
      {tab === 'add' && <RecordForm onDone={handleDone} showToast={showToast} editRecord={editingRecord} />}
      {tab === 'settings' && <ImportExport onDone={refresh} showToast={showToast} />}

      <nav className="bottom-nav">
        {navConfig.map(item => {
          if (item.key === 'add') {
            return (
              <button
                key={item.key}
                className={`nav-item fab-nav ${tab === 'add' ? 'active' : ''}`}
                onClick={() => { setEditingRecord(null); setTab('add') }}
              >
                <span className="fab-icon">+</span>
              </button>
            )
          }
          return (
            <button
              key={item.key}
              className={`nav-item ${tab === item.key ? 'active' : ''}`}
              onClick={() => { setEditingRecord(null); setTab(item.key) }}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
