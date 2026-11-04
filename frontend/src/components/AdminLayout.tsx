import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { BarChart3, Boxes, FileText, FolderOpen, Info, LogOut, Menu, Settings as SettingsIcon, X } from 'lucide-react'
import { signOut } from '../services/auth'
import { Helmet } from 'react-helmet-async'
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { requireSupabase } from '../lib/supabaseClient'
import { useRealtimeSync } from '../hooks/useRealtimeSync'
import { useTable } from '../hooks/useCrud'
import { keys } from '../lib/queryKeys'
import type { SiteSettings } from '../lib/types'
import { Toast } from './ui'

const links = [
  ['/admin', 'Dashboard', BarChart3],
  ['/admin/categories', 'Categories', FolderOpen],
  ['/admin/products', 'Products', Boxes],
  ['/admin/about', 'About Us', Info],
  ['/admin/enquiries', 'Enquiries', FileText],
  ['/admin/settings', 'Site Settings', SettingsIcon],
] as const

export function AdminLayout() {
  useRealtimeSync()
  const navigate = useNavigate()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [notice, setNotice] = useState('')

  const { data: settings = [] } = useTable<SiteSettings>('site_settings', keys.settings.all)
  const logo = settings[0]?.logo_url || '/logo.jpeg'

  const { data: unreadCount = 0 } = useQuery({
    queryKey: keys.enquiries.unreadCount(),
    queryFn: async () => {
      const { count } = await requireSupabase()
        .from('enquiries')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'new')
      return count ?? 0
    },
    staleTime: 10_000,
  })

  useEffect(() => {
    const handler = () => setNotice('New enquiry received')
    window.addEventListener('utsav:new-enquiry', handler)
    return () => window.removeEventListener('utsav:new-enquiry', handler)
  }, [])

  async function logout() {
    await signOut()
    navigate('/')
  }

  const navContent = (
    <>
      <div className="logo-badge">
        <img src={logo} alt="Utsav Food Technology" className="sidebar-logo" width="100" height="90" />
      </div>
      <p className="sidebar-label">ADMINISTRATION</p>
      <nav>
        {links.map(([to, label, Icon]) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/admin'}
            onClick={() => setDrawerOpen(false)}
          >
            <Icon size={18} />
            <span>
              {label}
              {label === 'Enquiries' && unreadCount > 0 && (
                <b className="unread-badge">{unreadCount}</b>
              )}
            </span>
          </NavLink>
        ))}
      </nav>
      <button className="logout" onClick={logout} type="button">
        <LogOut size={18} />
        <span>Log out</span>
      </button>
    </>
  )

  return (
    <>
      <Helmet>
        <title>Admin Dashboard | Utsav Food Technology</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <div className="admin-shell">
        {/* Desktop Sidebar */}
        <aside className="sidebar desktop-sidebar">{navContent}</aside>

        {/* Mobile Slide-in Drawer */}
        <div
          className={`sidebar-drawer-overlay ${drawerOpen ? 'open' : ''}`}
          onClick={() => setDrawerOpen(false)}
        >
          <aside className="sidebar mobile-drawer" onClick={(e) => e.stopPropagation()}>
            <button
              className="drawer-close-btn"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close menu"
              type="button"
            >
              <X size={20} />
            </button>
            {navContent}
          </aside>
        </div>

        <main className="admin-main">
          <header className="mobile-admin-header">
            <button
              className="admin-menu-toggle"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation menu"
              type="button"
            >
              <Menu size={22} />
              <span>Admin Menu</span>
            </button>
            {unreadCount > 0 && (
              <span className="mobile-unread-pill">
                {unreadCount} new {unreadCount === 1 ? 'enquiry' : 'enquiries'}
              </span>
            )}
          </header>
          <Outlet />
        </main>
      </div>
      {notice && <Toast message={notice} onClose={() => setNotice('')} />}
    </>
  )
}
