import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import {
  ArrowRight,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Search,
  X,
  ZoomIn,
} from 'lucide-react'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import { useTable } from '../hooks/useCrud'
import {
  AboutContent,
  Category,
  FactSheet,
  ProcessStep,
  Product,
  SiteSettings,
  SiteStat,
  TimelineItem,
  WhyChooseUs,
} from '../lib/types'
import { Button, EmptyState, Input } from '../components/ui'
import { FormattedText } from '../components/FormattedText'
import { createEnquiry } from '../services/enquiries'
import { requireSupabase } from '../lib/supabaseClient'
import useEmblaCarousel from 'embla-carousel-react'
import Autoplay from 'embla-carousel-autoplay'

const siteUrl = (import.meta.env.VITE_SITE_URL || 'https://utsavpapad.vercel.app').replace(/\/$/, '')

function getAbsoluteUrl(path: string): string {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return siteUrl ? `${siteUrl}${path.startsWith('/') ? '' : '/'}${path}` : path
}

function PageTitle({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
  return (
    <div className="public-page-title">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      {text && <p>{text}</p>}
    </div>
  )
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="section-heading">
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
    </div>
  )
}

function ProductPlaceholder({ name }: { name: string }) {
  return (
    <div className="product-placeholder" aria-label={`${name} image placeholder`}>
      <svg
        viewBox="0 0 160 90"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M22 65h116M35 65V42h90v23M45 42V27h70v15M58 27v-9h44v9M68 65V52h24v13M25 72h110" />
      </svg>
      <span>{name}</span>
    </div>
  )
}

function ProductCard({ product, category }: { product: Product; category?: string }) {
  return (
    <article className="product-card">
      <Link to={`/products/${product.slug}`} className="product-image">
        {product.images?.[0] ? (
          <img src={product.images[0]} alt={product.name} loading="lazy" width="600" height="450" />
        ) : (
          <ProductPlaceholder name={product.name} />
        )}
      </Link>
      <div className="product-card-body">
        <span className="category-label">{category || product.categories?.name}</span>
        <h3>
          <Link to={`/products/${product.slug}`}>{product.name}</Link>
        </h3>
        <p>{product.short_description}</p>
        <div className="product-actions">
          {Object.entries(product.specifications || {})
            .slice(0, 2)
            .map(([key, value]) => (
              <span className="mini-spec" key={key}>
                {key}: {String(value || 'On request')}
              </span>
            ))}
        </div>
        <div className="product-actions">
          <Link to={`/products/${product.slug}`}>
            View details <ArrowRight size={14} />
          </Link>
          <Link to={`/contact?product=${product.slug}`}>Enquire</Link>
        </div>
      </div>
    </article>
  )
}

// ==========================================
// A1. ENQUIRY FORM (HARDENED)
// ==========================================
const enquirySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(120, 'Name cannot exceed 120 characters'),
  email: z.string().trim().email('Please enter a valid email address'),
  phone: z
    .string()
    .trim()
    .max(40, 'Phone cannot exceed 40 characters')
    .refine((v) => !v || /^[\d+\-\s()]+$/.test(v), 'Phone can only contain digits, +, -, and spaces')
    .optional()
    .nullable(),
  country: z.string().trim().max(80, 'Country cannot exceed 80 characters').optional().nullable(),
  message: z
    .string()
    .trim()
    .min(2, 'Message must be at least 2 characters')
    .max(3000, 'Message cannot exceed 3000 characters'),
})

let lastEnquirySubmittedAt = 0

function EnquiryForm({ product, onSuccess }: { product?: Product; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const mountedAt = useRef(Date.now())

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrors({})
    setFormError('')

    const form = event.currentTarget
    const formData = new FormData(form)
    const honeypot = String(formData.get('website') || '').trim()

    // Anti-spam 1: honeypot filled
    if (honeypot) {
      form.reset()
      onSuccess()
      return
    }

    // Anti-spam 2: submitted under 3 seconds
    if (Date.now() - mountedAt.current < 3000) {
      form.reset()
      onSuccess()
      return
    }

    // Anti-spam 3: 30-second client cooldown
    const now = Date.now()
    if (now - lastEnquirySubmittedAt < 30_000) {
      const waitSec = Math.ceil((30_000 - (now - lastEnquirySubmittedAt)) / 1000)
      setFormError(`Please wait ${waitSec} seconds before submitting another enquiry.`)
      return
    }

    const rawValues = {
      name: String(formData.get('name') || ''),
      email: String(formData.get('email') || ''),
      phone: String(formData.get('phone') || '').trim() || null,
      country: String(formData.get('country') || '').trim() || null,
      message: String(formData.get('message') || ''),
    }

    const validation = enquirySchema.safeParse(rawValues)
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {}
      validation.error.issues.forEach((err) => {
        const fieldName = String(err.path[0])
        fieldErrors[fieldName] = err.message
      })
      setErrors(fieldErrors)
      return
    }

    setLoading(true)
    try {
      // Send ONLY name, email, phone, country, message, product_id
      await createEnquiry({
        name: validation.data.name,
        email: validation.data.email,
        phone: validation.data.phone,
        country: validation.data.country,
        message: validation.data.message,
        product_id: product?.id ?? null,
      })

      lastEnquirySubmittedAt = Date.now()
      form.reset()
      onSuccess()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not submit enquiry. Please try again.'
      setFormError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="enquiry-form" onSubmit={(e) => void submit(e)} noValidate>
      {/* Invisible Honeypot */}
      <input name="website" tabIndex={-1} autoComplete="off" className="honeypot" />

      {formError && <div className="form-alert-error">{formError}</div>}

      <div className="two-col">
        <Input
          label="Your Name *"
          name="name"
          required
          error={errors.name}
          placeholder="e.g. Rajesh Patel"
        />
        <Input
          label="Email Address *"
          name="email"
          type="email"
          required
          error={errors.email}
          placeholder="name@company.com"
        />
        <Input
          label="Phone / WhatsApp"
          name="phone"
          error={errors.phone}
          placeholder="+91 98250 12345"
        />
        <Input
          label="Country / City"
          name="country"
          error={errors.country}
          placeholder="e.g. India or USA"
        />
      </div>

      <label className="field">
        <span>Requirement Details *</span>
        <textarea
          name="message"
          rows={5}
          required
          defaultValue={product ? `I would like to enquire about the ${product.name} (pricing and specs).` : ''}
          placeholder="Please describe your daily production capacity requirement, space available, or questions…"
        />
        {errors.message && <small className="error-text">{errors.message}</small>}
      </label>

      <Button type="submit" disabled={loading}>
        {loading ? 'Submitting enquiry…' : 'Send enquiry'}
      </Button>
    </form>
  )
}

// ==========================================
// D1. HERO CAROUSEL WITH TIMED PROGRESS & ACCESSIBILITY
// ==========================================
function HeroCarousel({ products, site }: { products: Product[]; site?: SiteSettings }) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const heroRef = useRef<HTMLElement>(null)

  const items = useMemo(() => {
    const heroSlides = products
      .filter((item) => item.is_active && item.show_in_hero)
      .sort((a, b) => (a.hero_order ?? 0) - (b.hero_order ?? 0))
      .slice(0, 5)
    if (heroSlides.length) return heroSlides

    const featured = products.filter((item) => item.is_active && item.is_featured).slice(0, 5)
    if (featured.length) return featured

    // Auto-fallback: If no products marked as hero/featured, show active products with images
    const withImages = products.filter((item) => item.is_active && item.images && item.images.length > 0).slice(0, 5)
    if (withImages.length) return withImages

    return products.filter((item) => item.is_active).slice(0, 5)
  }, [products])

  const prefersReducedMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  )

  const autoplay = useMemo(
    () =>
      Autoplay({
        delay: 6000,
        stopOnInteraction: false,
        active: !prefersReducedMotion,
      }),
    [prefersReducedMotion]
  )

  const [viewportRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'start' }, [autoplay])

  useEffect(() => {
    if (!emblaApi) return
    const onSelect = () => {
      setSelectedIndex(emblaApi.selectedScrollSnap())
      setProgress(0)
    }
    onSelect()
    emblaApi.on('select', onSelect)
    return () => {
      emblaApi.off('select', onSelect)
    }
  }, [emblaApi])

  // Progress bar animation timer
  useEffect(() => {
    if (isPaused || prefersReducedMotion || !items.length) return
    const interval = 60
    const step = (interval / 6000) * 100
    const timer = setInterval(() => {
      setProgress((prev) => (prev >= 100 ? 0 : prev + step))
    }, interval)
    return () => clearInterval(timer)
  }, [isPaused, prefersReducedMotion, selectedIndex, items.length])

  // Pause on visibility change (tab hidden)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        autoplay.stop()
        setIsPaused(true)
      } else if (!prefersReducedMotion) {
        autoplay.play()
        setIsPaused(false)
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [autoplay, prefersReducedMotion])

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        emblaApi?.scrollPrev()
      } else if (e.key === 'ArrowRight') {
        emblaApi?.scrollNext()
      }
    },
    [emblaApi]
  )

  if (!items.length) {
    return (
      <section className="hero hero-carousel hero-brand-fallback">
        <div className="site-container hero-brand-inner">
          <div className="hero-brand-copy">
            <span className="eyebrow">Since 1989 · Anand, Gujarat</span>
            <h1>{site?.company_name || 'UTSAV FOOD TECHNOLOGY'}</h1>
            <p>{site?.tagline || 'Papad and food processing machinery since 1989'}</p>
            <Link className="button button-primary" to="/products">
              View our machines
            </Link>
          </div>
          <div className="hero-brand-logo">
            <img src={site?.logo_url || '/logo.jpeg'} alt="Utsav Food Technology" width="340" height="340" />
          </div>
        </div>
      </section>
    )
  }

  return (
    <section
      className="hero hero-carousel"
      ref={heroRef}
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured food processing machines"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => {
        autoplay.stop()
        setIsPaused(true)
      }}
      onMouseLeave={() => {
        if (!prefersReducedMotion) {
          autoplay.play()
          setIsPaused(false)
        }
      }}
      onFocus={() => {
        autoplay.stop()
        setIsPaused(true)
      }}
      onBlur={() => {
        if (!prefersReducedMotion) {
          autoplay.play()
          setIsPaused(false)
        }
      }}
    >
      {/* Visual Progress bar */}
      {!prefersReducedMotion && (
        <div className="hero-progress-track">
          <div className="hero-progress-fill" style={{ width: `${Math.min(100, progress)}%` }} />
        </div>
      )}

      <div className="hero-viewport" ref={viewportRef}>
        <div className="hero-embla" aria-live={isPaused ? 'polite' : 'off'}>
          {items.map((product, index) => (
            <div
              className="hero-slide"
              key={product.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} of ${items.length}`}
            >
              <div className="site-container hero-slide-inner">
                <div className="hero-slide-copy">
                  <span className="eyebrow">Since 1989 · Anand, Gujarat</span>
                  <span className="category-label">
                    {product.categories?.name ? product.categories.name.trim() : 'UTSAV FOOD TECHNOLOGY'}
                  </span>
                  <h1>{product.name}</h1>
                  <p className="hero-text">{product.short_description}</p>
                  <div className="spec-chips">
                    {Object.entries(product.specifications || {})
                      .slice(0, 3)
                      .map(([key, value]) => (
                        <span key={key}>
                          {key}: {String(value || 'On request')}
                        </span>
                      ))}
                  </div>
                  <div className="hero-actions">
                    <Link
                      className="button button-primary"
                      to={product.slug ? `/products/${product.slug}` : '/products'}
                    >
                      View details
                    </Link>
                    <Link className="button button-secondary" to="/contact">
                      Get a quote
                    </Link>
                  </div>
                </div>

                <div className="hero-slide-visual">
                  <div className="hero-image-stage">
                    {product.images?.[0] ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="hero-machine-img"
                        width="800"
                        height="550"
                        fetchPriority={index === 0 ? 'high' : undefined}
                        loading={index === 0 ? 'eager' : 'lazy'}
                      />
                    ) : (
                      <ProductPlaceholder name={product.name} />
                    )}
                  </div>
                </div>

                <strong className="slide-index">
                  {String(index + 1).padStart(2, '0')}
                  <small>/{String(items.length).padStart(2, '0')}</small>
                </strong>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="hero-controls site-container">
        <div className="hero-arrow-group">
          <button onClick={() => emblaApi?.scrollPrev()} aria-label="Previous slide" type="button">
            <ChevronLeft size={18} />
          </button>
          <button onClick={() => emblaApi?.scrollNext()} aria-label="Next slide" type="button">
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="hero-dots" aria-label="Choose featured machine">
          {items.map((item, index) => (
            <button
              key={item.id}
              className={index === selectedIndex ? 'active' : ''}
              onClick={() => emblaApi?.scrollTo(index)}
              aria-label={`Show ${item.name}`}
              aria-current={index === selectedIndex ? 'true' : undefined}
              type="button"
            />
          ))}
        </div>
      </div>
    </section>
  )
}

// ==========================================
// D5. ANIMATED STATS STRIP ON SCROLL
// ==========================================
function AnimatedStat({ label, value }: { label: string; value: string }) {
  const [displayValue, setDisplayValue] = useState(value)
  const ref = useRef<HTMLDivElement>(null)
  const animated = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined' || animated.current) return
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) return

    const numMatch = value.match(/\d+/)
    if (!numMatch) return
    const targetNum = parseInt(numMatch[0], 10)
    const suffix = value.replace(numMatch[0], '')

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !animated.current) {
          animated.current = true
          let current = 0
          const duration = 1200
          const startTime = performance.now()

          const update = (now: number) => {
            const elapsed = now - startTime
            const progress = Math.min(1, elapsed / duration)
            current = Math.floor(progress * targetNum)
            setDisplayValue(`${current}${suffix}`)
            if (progress < 1) {
              requestAnimationFrame(update)
            } else {
              setDisplayValue(value)
            }
          }
          requestAnimationFrame(update)
        }
      },
      { threshold: 0.2 }
    )

    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [value])

  return (
    <div ref={ref}>
      <strong>{displayValue}</strong>
      <span>{label}</span>
    </div>
  )
}

// ==========================================
// HOME PAGE
// ==========================================
export function Home() {
  const { data: settings = [] } = useTable<SiteSettings>('site_settings', ['site_settings'])
  const { data: stats = [] } = useTable<SiteStat>('site_stats', ['site_stats'], { order: 'display_order' })
  const { data: categories = [] } = useTable<Category>('categories', ['categories'], {
    order: 'display_order',
  })
  const { data: products = [] } = useTable<Product>('products', ['products'], {
    order: 'created_at',
    select: '*, categories(name)',
  })
  const { data: why = [] } = useTable<WhyChooseUs>('why_choose_us', ['why_choose_us'], {
    order: 'display_order',
  })
  const { data: process = [] } = useTable<ProcessStep>('process_steps', ['process_steps'], {
    order: 'display_order',
  })
  const { data: aboutSections = [] } = useTable<AboutContent>('about_content', ['about_content'])

  const site = settings[0]
  const whyIntro =
    aboutSections.find((item) => item.section_key === 'why_intro')?.content ||
    'Since 1989, our team has worked with food processing units that need reliable equipment, clear specifications and responsive support.'

  // C2: Export markets from database
  const exportMarkets = site?.export_markets?.length
    ? site.export_markets
    : ['USA', 'Canada', 'UK', 'Sri Lanka', 'Africa', 'New Zealand', 'Australia']

  const activeCategories = useMemo(() => categories.filter((c) => c.is_active), [categories])
  const featuredProducts = useMemo(() => {
    const featured = products.filter((p) => p.is_active && p.is_featured).slice(0, 3)
    if (featured.length) return featured
    return products.filter((p) => p.is_active).slice(0, 3)
  }, [products])

  const orgJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: site?.company_name || 'Utsav Food Technology',
    url: siteUrl || 'https://utsavpapad.vercel.app',
    logo: getAbsoluteUrl(site?.logo_url || '/logo.jpeg'),
    telephone: site?.phone || '+91 98250 12345',
    email: site?.email || 'info@utsavpapadmachine.com',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Anand',
      addressRegion: 'Gujarat',
      addressCountry: 'India',
    },
    sameAs: Object.values(site?.social_links || {}).filter(Boolean),
  }

  return (
    <>
      <Helmet>
        <title>{site?.seo_title || 'Papad Machine Manufacturer | Utsav Food Technology'}</title>
        <meta
          name="description"
          content={
            site?.seo_description ||
            'Manufacturer and exporter of automatic and semi-automatic papad making machines from Anand, Gujarat since 1989.'
          }
        />
        <link rel="canonical" href={getAbsoluteUrl('/')} />
        <meta property="og:title" content={site?.seo_title || 'Utsav Food Technology'} />
        <meta
          property="og:description"
          content={
            site?.seo_description ||
            'Manufacturer and exporter of automatic and semi-automatic papad making machines since 1989.'
          }
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={getAbsoluteUrl('/')} />
        <meta property="og:image" content={getAbsoluteUrl(site?.logo_url || '/logo.jpeg')} />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">{JSON.stringify(orgJsonLd)}</script>
        <meta
          name="keywords"
          content="papad machine manufacturer, papad making machine, food processing machinery, automatic papad machine, papad plant India, food machinery exporter"
        />
      </Helmet>

      <HeroCarousel products={products} site={site} />

      {/* C2: Dynamic Trust Strip */}
      <section className="trust-strip">
        <div className="site-container">
          <strong>Exporting to</strong>
          {exportMarkets.map((market) => (
            <span key={market}>{market}</span>
          ))}
          <span>Since 1989</span>
        </div>
      </section>

      {/* D5: Animated Stats Strip */}
      <section className="stats-strip">
        <div className="site-container stats-row">
          {stats.map((stat) => (
            <AnimatedStat key={stat.id} label={stat.label} value={stat.value} />
          ))}
        </div>
      </section>

      <section className="public-section">
        <div className="site-container">
          <SectionHeading eyebrow="OUR RANGE" title="Equipment for food processing units" />
          {activeCategories.length ? (
            <div className="category-grid">
              {activeCategories.map((category) => {
                const categoryCleanName = category.name.trim()
                const categoryImage =
                  category.image_url ||
                  products.find((p) => p.category_id === category.id && p.images?.[0])?.images?.[0] ||
                  products.find(
                    (p) =>
                      p.name.toLowerCase().includes(categoryCleanName.toLowerCase().split(' ')[0]) &&
                      p.images?.[0]
                  )?.images?.[0]

                return (
                  <Link
                    className="category-block"
                    to={`/products?category=${category.slug}`}
                    key={category.id}
                  >
                    {categoryImage ? (
                      <img
                        src={categoryImage}
                        alt={categoryCleanName}
                        width="600"
                        height="400"
                        loading="lazy"
                      />
                    ) : (
                      <ProductPlaceholder name={categoryCleanName} />
                    )}
                    <div>
                      <h3>{categoryCleanName}</h3>
                      <span>
                        View products <ChevronRight size={15} />
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <EmptyState>No product categories available yet.</EmptyState>
          )}
        </div>
      </section>

      <section className="public-section offwhite">
        <div className="site-container">
          <SectionHeading eyebrow="FEATURED MACHINES" title="Built for consistent production" />
          {featuredProducts.length ? (
            <div className="product-grid">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <EmptyState>No featured products available yet.</EmptyState>
          )}
        </div>
      </section>

      {/* C2: Dynamic Why Section */}
      <section className="public-section">
        <div className="site-container split-section">
          <div>
            <SectionHeading eyebrow="WHY UTSAV" title="A practical manufacturing partner" />
            <p className="body-copy">{whyIntro}</p>
          </div>
          <div className="numbered-list">
            {why.map((item, index) => (
              <div key={item.id}>
                <strong>{String(index + 1).padStart(2, '0')}</strong>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* C2: Dynamic Process Steps */}
      <section className="public-section offwhite">
        <div className="site-container process-section">
          <SectionHeading eyebrow="HOW WE WORK" title="From requirement to dispatch" />
          <div className="process-grid">
            {process.map((step, index) => (
              <div key={step.id}>
                <strong>{String(index + 1).padStart(2, '0')}</strong>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="cta-band">
        <div className="site-container cta-inner">
          <div>
            <p className="eyebrow">PLANNING A NEW UNIT?</p>
            <h2>Need a machine built to your capacity?</h2>
          </div>
          <div className="hero-actions">
            <Link className="button button-primary" to="/contact">
              Request a quote
            </Link>
            {site?.whatsapp && (
              <a
                className="button button-secondary"
                href={`https://wa.me/${site.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent('Hello Utsav Food Technology, I am planning a new production unit.')}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle size={17} /> WhatsApp enquiry
              </a>
            )}
          </div>
        </div>
      </section>
    </>
  )
}

// ==========================================
// D2. PRODUCTS CATALOGUE PAGE (URL QUERY PARAMS & SORT)
// ==========================================
export function ProductsPage() {
  const [params, setParams] = useSearchParams()

  const categorySlug = params.get('category') || ''
  const searchParam = params.get('q') || ''
  const sortParam = params.get('sort') || 'newest'

  const [searchInput, setSearchInput] = useState(searchParam)
  const [limit, setLimit] = useState(9)

  // B2: Public query filters in the database query
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products', 'public-catalog'],
    queryFn: async () => {
      const client = requireSupabase()
      const { data, error } = await client
        .from('products')
        .select('id, name, slug, short_description, category_id, images, specifications, is_featured, is_active, created_at, categories(name, slug)')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data || []) as unknown as Product[]
    },
    staleTime: 30_000,
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', 'public-catalog'],
    queryFn: async () => {
      const client = requireSupabase()
      const { data, error } = await client
        .from('categories')
        .select('id, name, slug, display_order, is_active')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
      if (error) throw error
      return (data || []) as Category[]
    },
    staleTime: 30_000,
  })

  // Debounce search updating URL param
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== searchParam) {
        setParams(
          (prev) => {
            const next = new URLSearchParams(prev)
            if (searchInput.trim()) {
              next.set('q', searchInput.trim())
            } else {
              next.delete('q')
            }
            return next
          },
          { replace: true }
        )
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput, searchParam, setParams])

  const filtered = useMemo(() => {
    let list = products.filter((product) => {
      const matchesCategory =
        !categorySlug ||
        categories.find((c) => c.slug === categorySlug)?.id === product.category_id
      const query = searchParam.toLowerCase().trim()
      const matchesSearch =
        !query ||
        product.name.toLowerCase().includes(query) ||
        (product.short_description && product.short_description.toLowerCase().includes(query))
      return matchesCategory && matchesSearch
    })

    if (sortParam === 'name') {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name))
    } else {
      list = [...list] // already newest
    }

    return list
  }, [products, categories, categorySlug, searchParam, sortParam])

  const clearFilters = () => {
    setSearchInput('')
    setParams({})
  }

  const hasActiveFilters = Boolean(categorySlug || searchParam || (sortParam && sortParam !== 'newest'))

  return (
    <>
      <Helmet>
        <title>Food Processing Machinery Catalogue | Utsav Food Technology</title>
        <meta
          name="description"
          content="Explore our commercial machinery range: Automatic Papad Making Machines, Samosa Patti Machines, Applam Equipment, and Industrial Dryers."
        />
        <link rel="canonical" href={getAbsoluteUrl('/products')} />
        <meta property="og:title" content="Food Processing Machinery Catalogue | Utsav Food Technology" />
        <meta
          property="og:description"
          content="Explore our commercial food processing machinery range manufactured in Anand, Gujarat."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={getAbsoluteUrl('/products')} />
      </Helmet>

      <section className="page-banner">
        <div className="site-container">
          <PageTitle
            eyebrow="PRODUCT CATALOGUE"
            title="Food processing machinery"
            text="Browse our durable range of papad making machines and allied commercial equipment."
          />
        </div>
      </section>

      <section className="public-section">
        <div className="site-container products-layout">
          <aside className="category-sidebar">
            <h3>Categories</h3>
            <button
              className={!categorySlug ? 'selected' : ''}
              onClick={() => {
                setParams((prev) => {
                  const next = new URLSearchParams(prev)
                  next.delete('category')
                  return next
                })
              }}
              type="button"
            >
              All products <span>{products.length}</span>
            </button>
            {categories.map((item) => (
              <button
                className={categorySlug === item.slug ? 'selected' : ''}
                key={item.id}
                onClick={() => {
                  setParams((prev) => {
                    const next = new URLSearchParams(prev)
                    next.set('category', item.slug)
                    return next
                  })
                }}
                type="button"
              >
                {item.name}
                <span>
                  {products.filter((product) => product.category_id === item.id).length}
                </span>
              </button>
            ))}
          </aside>

          <div className="catalogue-results">
            <div className="catalogue-toolbar">
              <label className="search-field">
                <Search size={16} />
                <input
                  placeholder="Search machines…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
              </label>

              <div className="toolbar-controls">
                <select
                  aria-label="Sort products"
                  value={sortParam}
                  onChange={(e) => {
                    setParams((prev) => {
                      const next = new URLSearchParams(prev)
                      next.set('sort', e.target.value)
                      return next
                    })
                  }}
                >
                  <option value="newest">Sort: Newest first</option>
                  <option value="name">Sort: Name (A-Z)</option>
                </select>

                <span>{filtered.length} products</span>
              </div>
            </div>

            {isLoading ? (
              <p className="muted">Loading machinery catalogue…</p>
            ) : filtered.length ? (
              <>
                <div className="product-grid">
                  {filtered.slice(0, limit).map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
                {limit < filtered.length && (
                  <div className="load-more-wrap">
                    <Button variant="secondary" onClick={() => setLimit((prev) => prev + 9)}>
                      Load more machines
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="empty-catalog-state">
                <EmptyState>No active products match your current filters.</EmptyState>
                {hasActiveFilters && (
                  <Button variant="secondary" onClick={clearFilters}>
                    Clear all filters
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  )
}

// ==========================================
// D3. PRODUCT DETAIL (ONE QUERY, LIGHTBOX, STICKY CARD, JSON-LD)
// ==========================================
export function ProductDetail() {
  const { slug } = useParams()
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [sent, setSent] = useState(false)

  // B2: Fetch ONLY the single active product by slug
  const { data: product, isLoading } = useQuery({
    queryKey: ['products', 'detail', slug],
    queryFn: async () => {
      if (!slug) return null
      const client = requireSupabase()
      const { data, error } = await client
        .from('products')
        .select('*, categories(name)')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle()
      if (error) throw error
      return data as Product | null
    },
    staleTime: 30_000,
  })

  // B2: Fetch related products in a separate query only after product loads
  const { data: related = [] } = useQuery({
    queryKey: ['products', 'related', product?.category_id, product?.id],
    enabled: Boolean(product?.category_id && product?.id),
    queryFn: async () => {
      const client = requireSupabase()
      const { data, error } = await client
        .from('products')
        .select('id, name, slug, short_description, images, specifications, categories(name)')
        .eq('category_id', product!.category_id)
        .eq('is_active', true)
        .neq('id', product!.id)
        .limit(3)
      if (error) throw error
      return (data || []) as unknown as Product[]
    },
  })

  const { data: settings = [] } = useTable<SiteSettings>('site_settings', ['site_settings'])
  const site = settings[0]

  const images = product?.images ?? []
  const currentImage = images[activeImageIndex] || images[0]

  // Lightbox keyboard controls
  useEffect(() => {
    if (!lightboxOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxOpen(false)
      if (e.key === 'ArrowLeft' && images.length > 1) {
        setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))
      }
      if (e.key === 'ArrowRight' && images.length > 1) {
        setActiveImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [lightboxOpen, images.length])

  if (isLoading) return <div className="site-container loading">Loading product details…</div>
  if (!product) {
    return (
      <>
        <Helmet>
          <title>Product not found | Utsav Food Technology</title>
          <meta name="robots" content="noindex,follow" />
        </Helmet>
        <div className="site-container not-found">
          <h1>Product not found</h1>
          <p>The machinery you are looking for is currently unavailable or has been relocated.</p>
          <Link className="button button-primary" to="/products">
            Return to catalogue
          </Link>
        </div>
      </>
    )
  }

  const cleanWhatsapp = site?.whatsapp?.replace(/\D/g, '') || ''
  const whatsappUrl = cleanWhatsapp
    ? `https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(`Hello, I am interested in details and quotation for: ${product.name}`)}`
    : ''

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: images.length ? images.map(getAbsoluteUrl) : undefined,
    description: product.short_description || product.description,
    category: product.categories?.name,
    brand: {
      '@type': 'Brand',
      name: 'Utsav Food Technology',
    },
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'INR',
      availability: 'https://schema.org/InStock',
    },
  }

  return (
    <>
      <Helmet>
        <title>{product.name} | Utsav Food Technology</title>
        <meta
          name="description"
          content={product.short_description || `${product.name} manufactured by Utsav Food Technology.`}
        />
        <link rel="canonical" href={getAbsoluteUrl(`/products/${product.slug}`)} />
        <meta property="og:title" content={`${product.name} | Utsav Food Technology`} />
        <meta property="og:description" content={product.short_description || product.name} />
        <meta property="og:type" content="product" />
        <meta property="og:url" content={getAbsoluteUrl(`/products/${product.slug}`)} />
        {images[0] && <meta property="og:image" content={getAbsoluteUrl(images[0])} />}
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">{JSON.stringify(productJsonLd)}</script>
      </Helmet>

      {/* Gallery Lightbox */}
      {lightboxOpen && currentImage && (
        <div className="lightbox-modal" onClick={() => setLightboxOpen(false)}>
          <button
            className="lightbox-close"
            onClick={() => setLightboxOpen(false)}
            aria-label="Close zoomed view"
            type="button"
          >
            <X size={24} />
          </button>
          {images.length > 1 && (
            <>
              <button
                className="lightbox-nav lightbox-prev"
                onClick={(e) => {
                  e.stopPropagation()
                  setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))
                }}
                aria-label="Previous image"
                type="button"
              >
                <ChevronLeft size={28} />
              </button>
              <button
                className="lightbox-nav lightbox-next"
                onClick={(e) => {
                  e.stopPropagation()
                  setActiveImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))
                }}
                aria-label="Next image"
                type="button"
              >
                <ChevronRight size={28} />
              </button>
            </>
          )}
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <img src={currentImage} alt={product.name} />
          </div>
        </div>
      )}

      <section className="public-section product-detail-section">
        <div className="site-container detail-grid">
          {/* Media Column */}
          <div className="detail-media-col">
            <div className="detail-media-sticky">
              <div
                className="detail-main-image"
                onClick={() => {
                  if (currentImage) setLightboxOpen(true)
                }}
                onKeyDown={(event) => {
                  if ((event.key === 'Enter' || event.key === ' ') && currentImage) {
                    event.preventDefault()
                    setLightboxOpen(true)
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label="Click to zoom image"
              >
                {currentImage ? (
                  <>
                    <img src={currentImage} alt={product.name} width="720" height="540" />
                    <span className="zoom-hint">
                      <ZoomIn size={16} /> Click to zoom
                    </span>
                  </>
                ) : (
                  <ProductPlaceholder name={product.name} />
                )}
              </div>

              {images.length > 1 && (
                <div className="thumbnail-row">
                  {images.map((url, index) => (
                    <button
                      key={url}
                      className={index === activeImageIndex ? 'active-thumb' : ''}
                      onClick={() => setActiveImageIndex(index)}
                      aria-label={`View photo ${index + 1}`}
                      type="button"
                    >
                      <img src={url} alt={`${product.name} photo ${index + 1}`} width="80" height="64" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Copy & Sticky Actions Column */}
          <div className="detail-copy">
            <span className="category-label">{product.categories?.name}</span>
            <h1>{product.name}</h1>

            {/* A3: Safe Formatted Description */}
            <FormattedText text={product.description || product.short_description} />

            <div className="spec-chips">
              {Object.entries(product.specifications || {})
                .slice(0, 4)
                .map(([key, value]) => (
                  <span key={key}>
                    {key}: {String(value || 'On request')}
                  </span>
                ))}
            </div>

            {/* D3: Sticky Action Bar */}
            <div className="detail-sticky-card">
              <a className="button button-primary" href="#enquiry">
                Request formal quotation
              </a>
              {whatsappUrl && (
                <a
                  className="button button-secondary"
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle size={17} /> WhatsApp enquiry
                </a>
              )}
              {product.brochure_url && (
                <a
                  className="button button-secondary"
                  href={product.brochure_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink size={16} /> Download brochure (PDF)
                </a>
              )}
            </div>

            <h2>Specifications</h2>
            <table className="spec-table">
              <tbody>
                {Object.entries(product.specifications || {}).map(([key, value]) => (
                  <tr key={key}>
                    <th>{key}</th>
                    <td>{String(value || 'On request')}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {product.applications?.length ? (
              <>
                <h2>Suitable Applications</h2>
                <ul className="application-list">
                  {product.applications.map((app) => (
                    <li key={app}>{app}</li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>
        </div>
      </section>

      {/* Enquiry Form Section */}
      <section className="public-section offwhite" id="enquiry">
        <div className="site-container narrow-content">
          <SectionHeading
            eyebrow="PRICE & CAPACITY ENQUIRY"
            title={`Get pricing for ${product.name}`}
          />
          {sent ? (
            <div className="success-message">
              <CheckCircle size={22} />
              <div>
                <strong>Thank you for contacting us.</strong>
                <p>Our sales engineering team will review your specifications and contact you shortly.</p>
              </div>
            </div>
          ) : (
            <EnquiryForm product={product} onSuccess={() => setSent(true)} />
          )}
        </div>
      </section>

      {/* Related Products */}
      {related.length > 0 && (
        <section className="public-section">
          <div className="site-container">
            <SectionHeading eyebrow="RELATED EQUIPMENT" title="More from this category" />
            <div className="product-grid">
              {related.map((item) => (
                <ProductCard key={item.id} product={item} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  )
}

// ==========================================
// ABOUT US PAGE
// ==========================================
export function AboutPage() {
  const { data: sections = [] } = useTable<AboutContent>('about_content', ['about_content'], {
    order: 'section_key',
  })
  const { data: why = [] } = useTable<WhyChooseUs>('why_choose_us', ['why_choose_us'], {
    order: 'display_order',
  })
  const { data: facts = [] } = useTable<FactSheet>('fact_sheet', ['fact_sheet'], {
    order: 'display_order',
  })
  const { data: timeline = [] } = useTable<TimelineItem>('timeline_items', ['timeline_items'], {
    order: 'display_order',
  })

  const overview = sections.find((item) => item.section_key === 'overview')
  const leadership = sections.find((item) => item.section_key === 'leadership')
  const vision = sections.find((item) => item.section_key === 'vision')
  const mission = sections.find((item) => item.section_key === 'mission')
  const team = sections.find((item) => item.section_key === 'team')

  return (
    <>
      <Helmet>
        <title>About Us | Utsav Food Technology</title>
        <meta
          name="description"
          content="Learn about Utsav Food Technology, manufacturing durable papad making machinery in Anand, Gujarat since 1989."
        />
        <link rel="canonical" href={getAbsoluteUrl('/about')} />
        <meta property="og:title" content="About Us | Utsav Food Technology" />
        <meta
          property="og:description"
          content="Food processing machinery manufacturing since 1989 in Anand, Gujarat."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={getAbsoluteUrl('/about')} />
      </Helmet>

      <section className="page-banner">
        <div className="site-container">
          <PageTitle
            eyebrow="SINCE 1989"
            title="Most Trusted Name In Indian Papad Making Machinery And All Type Of Food Machinery…"
            text="UTSAV FOOD TECHNOLOGY manufactures, exports, trades and supplies durable food processing equipment."
          />
        </div>
      </section>

      {/* C2: Dynamic Timeline from Database */}
      <section className="public-section">
        <div className="site-container split-section about-overview">
          <div>
            <SectionHeading eyebrow="OUR COMPANY" title={overview?.title || 'About Utsav Food Technology'} />
            <p className="body-copy">{overview?.content}</p>
          </div>
          <div className="timeline">
            {timeline.length ? (
              timeline.map((item) => (
                <div key={item.id}>
                  <strong>{item.year}</strong>
                  <span>{item.title}</span>
                  {item.description && <p className="timeline-desc">{item.description}</p>}
                </div>
              ))
            ) : (
              <div>
                <strong>1989</strong>
                <span>Company established in Anand, Gujarat</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {leadership?.content && (
        <section className="public-section offwhite">
          <div className="site-container leadership-block">
            {leadership.photo && (
              <img
                src={leadership.photo}
                alt={leadership.name || 'Company leadership'}
                width="300"
                height="300"
              />
            )}
            <div>
              <SectionHeading eyebrow="LEADERSHIP" title={leadership.name || 'Mr. Utsav Patel'} />
              {leadership.designation && <p className="category-label">{leadership.designation}</p>}
              <p className="body-copy">{leadership.content}</p>
            </div>
          </div>
        </section>
      )}

      {(vision?.content || mission?.content) && (
        <section className="public-section">
          <div className="site-container two-panels">
            {vision?.content && (
              <div>
                <SectionHeading eyebrow="OUR VISION" title={vision.title || 'Vision'} />
                <p className="body-copy">{vision.content}</p>
              </div>
            )}
            {mission?.content && (
              <div>
                <SectionHeading eyebrow="OUR MISSION" title={mission.title || 'Mission'} />
                <p className="body-copy">{mission.content}</p>
              </div>
            )}
          </div>
        </section>
      )}

      {why.length > 0 && (
        <section className="public-section offwhite">
          <div className="site-container">
            <SectionHeading eyebrow="WHY CHOOSE US" title="What customers can expect" />
            <div className="numbered-list">
              {why.map((item, index) => (
                <div key={item.id}>
                  <strong>{String(index + 1).padStart(2, '0')}</strong>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="public-section">
        <div className="site-container two-panels">
          {team?.content && (
            <div>
              <SectionHeading eyebrow="OUR TEAM" title={team.title || 'Team'} />
              <p className="body-copy">{team.content}</p>
            </div>
          )}
          {facts.length > 0 && (
            <div>
              <SectionHeading eyebrow="FACT SHEET" title="At a glance" />
              <table className="fact-table">
                <tbody>
                  {facts.map((item) => (
                    <tr key={item.id}>
                      <th>{item.label}</th>
                      <td>{item.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </>
  )
}

// ==========================================
// D4. CONTACT PAGE (TEL, MAILTO, SAFE WHATSAPP, GOOGLE MAPS)
// ==========================================
export function ContactPage() {
  const [params] = useSearchParams()
  const productSlug = params.get('product')

  const { data: settings = [] } = useTable<SiteSettings>('site_settings', ['site_settings'])
  const site = settings[0]
  const { data: products = [] } = useTable<Product>('products', ['products'])
  const [sent, setSent] = useState(false)

  const selectedProduct = products.find((p) => p.slug === productSlug)

  const cleanWhatsapp = site?.whatsapp?.replace(/\D/g, '') || ''
  const whatsappUrl = cleanWhatsapp ? `https://wa.me/${cleanWhatsapp}` : ''

  const mapsQuery = encodeURIComponent(site?.address || 'Utsav Food Technology Anand Gujarat')
  const directionsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`

  return (
    <>
      <Helmet>
        <title>Contact Us | Utsav Food Technology</title>
        <meta
          name="description"
          content="Contact Utsav Food Technology for machine specifications, factory visits, and commercial quotes."
        />
        <link rel="canonical" href={getAbsoluteUrl('/contact')} />
        <meta property="og:title" content="Contact Us | Utsav Food Technology" />
        <meta
          property="og:description"
          content="Discuss your food machinery production requirement with our engineering team."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={getAbsoluteUrl('/contact')} />
      </Helmet>

      <section className="page-banner">
        <div className="site-container">
          <PageTitle
            eyebrow="CONTACT US"
            title="Discuss your production requirement"
            text="Tell us about your unit and the equipment specifications you are looking for."
          />
        </div>
      </section>

      <section className="public-section">
        <div className="site-container contact-grid">
          <div>
            <h2>{site?.company_name || 'Utsav Food Technology'}</h2>
            <div className="contact-details">
              {site?.address && (
                <p>
                  <MapPin size={16} /> {site.address}
                </p>
              )}
              {site?.phone && (
                <p>
                  <Phone size={16} /> <a href={`tel:${site.phone.replace(/\s+/g, '')}`}>{site.phone}</a>
                </p>
              )}
              {site?.email && (
                <p>
                  <Mail size={16} /> <a href={`mailto:${site.email}`}>{site.email}</a>
                </p>
              )}
              {whatsappUrl && (
                <p>
                  <MessageCircle size={16} />{' '}
                  <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                    Chat on WhatsApp
                  </a>
                </p>
              )}
            </div>

            {site?.address && (
              <p className="directions-wrap">
                <a
                  className="button button-secondary"
                  href={directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MapPin size={15} /> Get Google Maps Directions
                </a>
              </p>
            )}

            {site?.map_embed_url && (
              <iframe
                className="map-frame"
                src={site.map_embed_url}
                title="Company location"
                loading="lazy"
              />
            )}
          </div>

          <div className="panel contact-form-panel">
            <SectionHeading eyebrow="SEND AN ENQUIRY" title="How can we help?" />
            {sent ? (
              <div className="success-message">
                <CheckCircle size={22} />
                <div>
                  <strong>Enquiry sent successfully.</strong>
                  <p>Our team will contact you back via phone or email.</p>
                </div>
              </div>
            ) : (
              <EnquiryForm product={selectedProduct} onSuccess={() => setSent(true)} />
            )}
          </div>
        </div>
      </section>
    </>
  )
}

export function NotFound() {
  return (
    <>
      <Helmet>
        <title>Page not found | Utsav Food Technology</title>
        <meta name="robots" content="noindex,follow" />
      </Helmet>
      <div className="site-container not-found">
        <p className="eyebrow">404</p>
        <h1>Page not found</h1>
        <p>The page you requested does not exist or may have been moved.</p>
        <Link className="button button-primary" to="/">
          Return home
        </Link>
      </div>
    </>
  )
}
