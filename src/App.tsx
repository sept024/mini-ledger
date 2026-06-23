import { useState } from 'react'
import Dashboard from './components/Dashboard'
import Statistics from './components/Statistics'
import RecordForm from './components/RecordForm'
import RecordList from './components/RecordList'

const USER_KEY = 'mini_ledger_user'
const AVATAR_KEY = 'mini_ledger_avatar'

type Tab = 'overview' | 'stats' | 'add' | 'bills' | 'profile'

const navConfig: { key: Tab; label: string; icon: string }[] = [
  { key: 'overview', label: '概况', icon: '🏠' },
  { key: 'stats', label: '统计', icon: '📊' },
  { key: 'add', label: '记账', icon: '' },
  { key: 'bills', label: '账单', icon: '📋' },
  { key: 'profile', label: '我的', icon: '👤' },
]

function UserSelector({ onSelect }: { onSelect: (name: string) => void }) {
  return (
    <div className="user-selector">
      <h2>💰 家庭记账</h2>
      <p>选择你的名字开始记账</p>
      <div className="user-grid">
        <button className="user-btn" onClick={() => onSelect('小明')}>
          <span className="user-avatar">👦</span>
          <span className="user-name">小明</span>
        </button>
        <button className="user-btn" onClick={() => onSelect('小红')}>
          <span className="user-avatar">👧</span>
          <span className="user-name">小红</span>
        </button>
      </div>
    </div>
  )
}

const BUILTIN_AVATARS = ['👦', '👧', '👨', '👩', '🧑', '👴', '👵', '🧒', '👶', '🧔']

function Profile({ user, avatar, onUpdateUser, onLogout }: {
  user: string; avatar: string; onUpdateUser: (name: string, avatar: string) => void; onLogout: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(user)

  return (
    <div>
      <div className="profile-header">
        <div className={`profile-avatar-wrapper ${editing ? 'editing' : ''}`} onClick={() => setEditing(!editing)}>
          {avatar.startsWith('/') ? (
            <img src={avatar} className="profile-avatar-img" alt="avatar" />
          ) : (
            <span className="profile-avatar">{avatar}</span>
          )}
          {editing && <span className="profile-avatar-edit">更换</span>}
        </div>
        {editing ? (
          <input className="profile-name-input" value={name} onChange={e => setName(e.target.value)}
            onBlur={() => { if (name.trim()) onUpdateUser(name.trim(), avatar) }}
            onKeyDown={e => { if (e.key === 'Enter' && name.trim()) onUpdateUser(name.trim(), avatar) }}
            autoFocus />
        ) : (
          <div className="profile-name clickable" onClick={() => { setName(user); setEditing(true) }}>{user}</div>
        )}
        <div className="profile-hint">点击名称或头像编辑</div>
      </div>

      {editing && (
        <div className="card">
          <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>选择头像</h4>
          <div className="avatar-grid">
            {BUILTIN_AVATARS.map(a => (
              <button key={a} className={`avatar-option ${avatar === a ? 'selected' : ''}`} onClick={() => { onUpdateUser(name, a); setEditing(false) }}>
                <span className="avatar-option-icon">{a}</span>
              </button>
            ))}
            <button className={`avatar-option ${avatar === '/avatars/custom.jpg' ? 'selected' : ''}`} onClick={() => { onUpdateUser(name, '/avatars/custom.jpg'); setEditing(false) }}>
              <img src="/avatars/custom.jpg" className="avatar-option-img" alt="custom" />
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="profile-menu-item" onClick={onLogout}>
          <span>退出登录</span>
          <span>→</span>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState<string | null>(() => localStorage.getItem(USER_KEY))
  const [avatar, setAvatar] = useState<string>(() => localStorage.getItem(AVATAR_KEY) || (localStorage.getItem(USER_KEY) === '小红' ? '👧' : '👦'))
  const [tab, setTab] = useState<Tab>('overview')
  const [refreshKey, setRefreshKey] = useState(0)
  const [editingRecord, setEditingRecord] = useState<any>(null)
  const [toast, setToast] = useState('')

  const selectUser = (name: string) => {
    localStorage.setItem(USER_KEY, name)
    setUser(name)
    const defaultAvatar = name === '小红' ? '👧' : '👦'
    localStorage.setItem(AVATAR_KEY, defaultAvatar)
    setAvatar(defaultAvatar)
  }

  const updateUser = (name: string, newAvatar: string) => {
    localStorage.setItem(USER_KEY, name)
    localStorage.setItem(AVATAR_KEY, newAvatar)
    setUser(name)
    setAvatar(newAvatar)
  }

  const logout = () => {
    localStorage.removeItem(USER_KEY)
    localStorage.removeItem(AVATAR_KEY)
    setUser(null)
  }

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

  if (!user) {
    return (
      <div className="app-container">
        <UserSelector onSelect={selectUser} />
      </div>
    )
  }

  return (
    <div className="app-container">
      {toast && <div className="toast">{toast}</div>}

      {tab === 'overview' && <Dashboard key={refreshKey} onEdit={handleEdit} />}
      {tab === 'stats' && <Statistics key={refreshKey} onEdit={handleEdit} />}
      {tab === 'bills' && <RecordList key={refreshKey} onEdit={handleEdit} />}
      {tab === 'add' && <RecordForm user={user} onDone={handleDone} showToast={showToast} editRecord={editingRecord} />}
      {tab === 'profile' && <Profile user={user} avatar={avatar} onUpdateUser={updateUser} onLogout={logout} />}

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
                <span className="fab-label">记账</span>
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
