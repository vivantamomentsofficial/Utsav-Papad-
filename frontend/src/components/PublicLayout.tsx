import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import {
  ChevronDown,
  Facebook,
  Instagram,
  Linkedin,
  Mail,
  Menu,
  MessageCircle,
  Phone,
  X,
  Youtube,
} from 'lucide-react'
import { useTable } from '../hooks/useCrud'
import { Category, SiteSettings } from '../lib/types'
import { useQuery } from '@tanstack/react-query'
import { getSession } from '../services/auth'

export function PublicLayout() {
  const { data: settings = [] } = useTable<SiteSettings>('site_settings', ['site_settings'])
  const { data: categories = [] } = useTable<Category>('categories', ['categories'], {
    order: 'display_order',
  })
  const [open, setOpen] = useState(false)
  const site = settings[0]
  const { data: session } = useQuery({ queryKey: ['public-session'], queryFn: getSession })

  const logo = site?.logo_url || '/logo.jpeg'
  const cleanPhone = site?.phone?.replace(/\s+/g, '') || ''
  const cleanWhatsapp = site?.whatsapp?.replace(/\D/g, '') || ''
  const whatsappUrl = cleanWhatsapp
    ? `https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent('Hello Utsav Food Technology, I am interested in your papad making machines.')}`
    : ''

  const activeCategories = categories.filter((c) => c.is_active)

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      {/* Topbar */}
      <div className="topbar">
        <div className="site-container topbar-inner">
          {site?.phone && (
            <span>
              <Phone size={13} />
              <a href={`tel:${cleanPhone}`}>{site.phone}</a>
            </span>
          )}
          {site?.email && (
            <span>
              <Mail size={13} />
              <a href={`mailto:${site.email}`}>{site.email}</a>
            </span>
          )}
          {site?.catalog_url && (
            <a href={site.catalog_url} target="_blank" rel="noopener noreferrer">
              Download catalogue (PDF)
            </a>
          )}
          {whatsappUrl && (
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
              <MessageCircle size={13} /> WhatsApp
            </a>
          )}
        </div>
      </div>

      {/* Main Header */}
      <header className="public-nav">
        <div className="site-container nav-inner">
          <Link to="/" className="brand-logo" aria-label="Utsav Food Technology Home">
            <img src={logo} alt="Utsav Food Technology" width="72" height="72" />
          </Link>

          <button
            className="mobile-menu"
            onClick={() => setOpen(!open)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="primary-navigation"
            type="button"
          >
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>

          <nav id="primary-navigation" aria-label="Primary navigation" className={open ? 'nav-open' : ''}>
            <NavLink to="/" end onClick={() => setOpen(false)}>
              Home
            </NavLink>

            <div className="nav-dropdown">
              <NavLink to="/products" onClick={() => setOpen(false)}>
                Products {activeCategories.length > 0 && <ChevronDown size={14} />}
              </NavLink>
              {activeCategories.length > 0 && (
                <div className="dropdown-menu">
                  {activeCategories.slice(0, 8).map((category) => (
                    <Link
                      key={category.id}
                      to={`/products?category=${category.slug}`}
                      onClick={() => setOpen(false)}
                    >
                      {category.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <NavLink to="/about" onClick={() => setOpen(false)}>
              About Us
            </NavLink>
            <NavLink to="/contact" onClick={() => setOpen(false)}>
              Contact
            </NavLink>
            <Link className="nav-cta" to="/contact" onClick={() => setOpen(false)}>
              Get Quote
            </Link>
          </nav>
        </div>
      </header>

      <main id="main-content" className="public-main">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="public-footer">
        <div className="site-container footer-grid">
          <div>
            <div className="logo-badge">
              <img src={logo} alt="Utsav Food Technology" width="76" height="76" />
            </div>
            {site?.footer_text && <p>{site.footer_text}</p>}
            <div className="social-links">
              {site?.social_links?.facebook && (
                <a
                  href={site.social_links.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                >
                  <Facebook size={17} />
                </a>
              )}
              {site?.social_links?.instagram && (
                <a
                  href={site.social_links.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                >
                  <Instagram size={17} />
                </a>
              )}
              {site?.social_links?.linkedin && (
                <a
                  href={site.social_links.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LinkedIn"
                >
                  <Linkedin size={17} />
                </a>
              )}
              {site?.social_links?.youtube && (
                <a
                  href={site.social_links.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="YouTube Channel"
                >
                  <Youtube size={17} />
                </a>
              )}
            </div>
          </div>

          <div>
            <h3>Quick links</h3>
            <Link to="/products">Machinery Range</Link>
            <Link to="/about">About Company</Link>
            <Link to="/contact">Factory Location</Link>
            <Link to="/contact">Request Quotation</Link>
            <Link to={session ? '/admin' : '/admin/login'}>
              {session ? 'Admin Dashboard' : 'Admin Login'}
            </Link>
          </div>

          <div>
            <h3>Product categories</h3>
            {activeCategories.slice(0, 6).map((category) => (
              <Link key={category.id} to={`/products?category=${category.slug}`}>
                {category.name}
              </Link>
            ))}
          </div>

          <div>
            <h3>Contact info</h3>
            {site?.address && <p>{site.address}</p>}
            {site?.phone && (
              <p>
                Phone: <a href={`tel:${cleanPhone}`}>{site.phone}</a>
              </p>
            )}
            {site?.email && (
              <p>
                Email: <a href={`mailto:${site.email}`}>{site.email}</a>
              </p>
            )}
          </div>
        </div>

        <div className="footer-bottom site-container">
          <span>UTSAV FOOD TECHNOLOGY · Anand, Gujarat · Since 1989</span>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-label="Scroll back to top"
            type="button"
          >
            Back to top ↑
          </button>
        </div>
      </footer>

      {/* Floating WhatsApp on Desktop */}
      {whatsappUrl && (
        <a
          className="floating-whatsapp"
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat on WhatsApp"
        >
          <MessageCircle size={26} />
        </a>
      )}

      {/* Mobile Action Bar (Only shows buttons that have data) */}
      <div className="mobile-action-bar">
        {cleanPhone ? (
          <a href={`tel:${cleanPhone}`}>
            <Phone size={17} />
            <span>Call</span>
          </a>
        ) : null}

        {whatsappUrl ? (
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
            <MessageCircle size={17} />
            <span>WhatsApp</span>
          </a>
        ) : null}

        <Link to="/contact">
          <Mail size={17} />
          <span>Get Quote</span>
        </Link>
      </div>
    </>
  )
}
