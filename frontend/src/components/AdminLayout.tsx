import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { BarChart3, Boxes, FileText, FolderOpen, Info, LogOut, Settings } from 'lucide-react'
import { signOut } from '../services/auth'
import { Helmet } from 'react-helmet-async'
import { useEffect, useState } from 'react'
import { useTable } from '../hooks/useCrud'
import type { Enquiry } from '../lib/types'
import { Toast } from './ui'

const links = [
  ['/admin', 'Dashboard', BarChart3],
  ['/admin/categories', 'Categories', FolderOpen],
  ['/admin/products', 'Products', Boxes],
  ['/admin/about', 'About Us', Info],
  ['/admin/enquiries', 'Enquiries', FileText],
  ['/admin/settings', 'Site Settings', Settings],
] as const

export function AdminLayout() {
  const navigate = useNavigate()
  const { data: enquiries = [] } = useTable<Enquiry>('enquiries', 'admin-enquiries-badge', { order: 'created_at' })
  const [notice, setNotice] = useState('')
  useEffect(() => {
    const handler = () => setNotice('New enquiry received')
    window.addEventListener('utsav:new-enquiry', handler)
    return () => window.removeEventListener('utsav:new-enquiry', handler)
  }, [])
  async function logout() {
    await signOut()
    navigate('/')
  }
  return <><Helmet><meta name="robots" content="noindex,nofollow" /></Helmet><div className="admin-shell"><aside className="sidebar"><div className="logo-badge"><img src="/logo.jpeg" alt="Utsav Papad Machine" className="sidebar-logo" /></div><p className="sidebar-label">ADMINISTRATION</p><nav>{links.map(([to, label, Icon]) => <NavLink key={to} to={to} end={to === '/admin'}><Icon size={18} /><span>{label}{label === 'Enquiries' && enquiries.filter((item) => item.status === 'new').length > 0 && <b className="unread-badge">{enquiries.filter((item) => item.status === 'new').length}</b>}</span></NavLink>)}</nav><button className="logout" onClick={logout}><LogOut size={18} /><span>Log out</span></button></aside><main className="admin-main"><Outlet /></main></div>{notice && <Toast message={notice} onClose={() => setNotice('')} />}</>
}
