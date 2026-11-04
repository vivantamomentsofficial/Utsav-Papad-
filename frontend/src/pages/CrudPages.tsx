import { FormEvent, useMemo, useRef, useState } from 'react'
import { Search, Eye, Image as ImageIcon, Download, Trash2 } from 'lucide-react'
import { z } from 'zod'
import { useCrud, useTable } from '../hooks/useCrud'
import { Category, Enquiry, Product } from '../lib/types'
import { Button, ConfirmDialog, EmptyState, ImageUploader, Input, Modal, Toast } from '../components/ui'
import { resolveUniqueSlug } from '../lib/slugs'
import { removeImage, removeImages } from '../services/storage'
import { requireSupabase } from '../lib/supabaseClient'

function useNotice() {
  const [notice, setNotice] = useState<{ message: string; type?: 'success' | 'error' } | null>(null)
  return {
    notice,
    notify: (message: string, type?: 'success' | 'error') => setNotice({ message, type }),
    clear: () => setNotice(null),
  }
}

function CrudShell({ title, action, children }: { title: string; action?: () => void; children: React.ReactNode }) {
  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">CONTENT MANAGEMENT</p>
          <h1>{title}</h1>
        </div>
        {action && (
          <Button onClick={action}>
            Add {title === 'Categories' ? 'category' : title === 'Products' ? 'product' : ''}
          </Button>
        )}
      </header>
      {children}
    </>
  )
}

function TableState({ loading, empty, text }: { loading: boolean; empty: boolean; text: string }) {
  if (loading) return <p className="muted">Loading…</p>
  return empty ? <EmptyState>{text}</EmptyState> : null
}

// ==========================================
// CATEGORIES CRUD
// ==========================================
export function Categories() {
  const { data = [], isLoading } = useTable<Category>('categories', ['categories'], { order: 'display_order' })
  const { data: products = [] } = useTable<Pick<Product, 'id' | 'category_id'>>('products', ['category-products'])
  const { save, remove } = useCrud<Category>('categories', ['categories'])
  const [editing, setEditing] = useState<Partial<Category> | null>(null)
  const [deleting, setDeleting] = useState<Category | null>(null)
  const { notice, notify, clear } = useNotice()

  // Track pending deletions and new uploads
  const pendingRemovals = useRef<string[]>([])
  const newUploads = useRef<string[]>([])
  const isDirty = useRef(false)

  const handleClose = () => {
    if (isDirty.current && !window.confirm('You have unsaved changes. Discard?')) {
      return
    }
    // Delete newly uploaded unsaved files on cancel
    if (newUploads.current.length) {
      void removeImages('category-images', newUploads.current)
    }
    pendingRemovals.current = []
    newUploads.current = []
    isDirty.current = false
    setEditing(null)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const values = Object.fromEntries(new FormData(form))
    const rawSlug = String(values.slug || values.name || 'category')

    try {
      const uniqueSlug = await resolveUniqueSlug('categories', rawSlug, editing?.id)
      await save.mutateAsync({
        ...values,
        id: editing?.id,
        slug: uniqueSlug,
        image_url: editing?.image_url ?? null,
        display_order: Number(values.display_order ?? 0),
        is_active: values.is_active === 'on',
      })

      // Clean up removed images from storage now that save succeeded
      if (pendingRemovals.current.length) {
        void removeImages('category-images', pendingRemovals.current)
      }

      pendingRemovals.current = []
      newUploads.current = []
      isDirty.current = false
      setEditing(null)
      notify('Category saved successfully.')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not save category.', 'error')
    }
  }

  async function deleteCategory() {
    if (!deleting) return
    try {
      // Delete image from storage when category deleted
      if (deleting.image_url) {
        void removeImage('category-images', deleting.image_url)
      }
      await remove.mutateAsync(deleting.id)
      setDeleting(null)
      notify('Category deleted.')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not delete category.', 'error')
    }
  }

  return (
    <CrudShell
      title="Categories"
      action={() => {
        isDirty.current = false
        pendingRemovals.current = []
        newUploads.current = []
        setEditing({ is_active: true })
      }}
    >
      <div className="panel">
        <TableState loading={isLoading} empty={!data.length} text="No categories added yet." />
        {data.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Slug</th>
                  <th>Products</th>
                  <th>Order</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.map((item) => (
                  <tr key={item.id}>
                    <td><strong>{item.name}</strong></td>
                    <td><code>{item.slug}</code></td>
                    <td>{products.filter((product) => product.category_id === item.id).length}</td>
                    <td>{item.display_order}</td>
                    <td>
                      <span className={`status ${item.is_active ? 'status-replied' : 'status-read'}`}>
                        {item.is_active ? 'Active' : 'Hidden'}
                      </span>
                    </td>
                    <td className="actions">
                      <button
                        onClick={() => {
                          isDirty.current = false
                          pendingRemovals.current = []
                          newUploads.current = []
                          setEditing(item)
                        }}
                      >
                        Edit
                      </button>
                      <button onClick={() => setDeleting(item)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <Modal title={editing.id ? 'Edit category' : 'Add category'} onClose={handleClose}>
          <form className="form-grid" onSubmit={submit} onChange={() => { isDirty.current = true }}>
            <Input label="Name" name="name" required defaultValue={editing.name ?? ''} />
            <Input
              label="Slug"
              name="slug"
              defaultValue={editing.slug ?? ''}
              placeholder="auto-generated from name if left empty"
            />
            <Input label="Description" name="description" defaultValue={editing.description ?? ''} />
            <ImageUploader
              bucket="category-images"
              label="Category image"
              value={editing.image_url ? [editing.image_url] : []}
              onPendingRemove={(url) => {
                pendingRemovals.current.push(url)
                isDirty.current = true
              }}
              onNewUpload={(url) => {
                newUploads.current.push(url)
                isDirty.current = true
              }}
              onChange={(urls) => setEditing({ ...editing, image_url: urls[0] ?? null })}
            />
            <Input
              label="Display order"
              name="display_order"
              type="number"
              defaultValue={editing.display_order ?? 0}
            />
            <label className="check">
              <input type="checkbox" name="is_active" defaultChecked={editing.is_active ?? true} /> Active
            </label>
            <Button type="submit">Save category</Button>
          </form>
        </Modal>
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete category?"
          message={
            products.some((product) => product.category_id === deleting.id)
              ? 'This category has products. They will become uncategorised.'
              : 'This cannot be undone.'
          }
          onConfirm={() => void deleteCategory()}
          onClose={() => setDeleting(null)}
        />
      )}

      {notice && <Toast {...notice} onClose={clear} />}
    </CrudShell>
  )
}

// ==========================================
// PRODUCTS CRUD
// ==========================================
const productSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  slug: z.string().trim().optional(),
  short_description: z.string().optional(),
  description: z.string().optional(),
})

function ProductEditor({
  product,
  categories,
  heroCount,
  onSaved,
  onClose,
  notify,
}: {
  product: Partial<Product>
  categories: Category[]
  heroCount: number
  onSaved: () => void
  onClose: () => void
  notify: (message: string, type?: 'success' | 'error') => void
}) {
  const { save } = useCrud<Product>('products', ['products'])
  const [images, setImages] = useState<string[]>(product.images ?? [])
  const [specifications, setSpecifications] = useState<[string, string][]>(
    Object.entries(product.specifications ?? {}).length
      ? (Object.entries(product.specifications ?? {}) as [string, string][])
      : [
          ['Capacity', ''],
          ['Power', ''],
          ['Motor', ''],
          ['Material', ''],
          ['Dimensions', ''],
          ['Weight', ''],
        ]
  )

  const pendingRemovals = useRef<string[]>([])
  const newUploads = useRef<string[]>([])
  const isDirty = useRef(false)

  const handleClose = () => {
    if (isDirty.current && !window.confirm('You have unsaved changes. Discard?')) {
      return
    }
    // Delete newly uploaded files on cancel
    if (newUploads.current.length) {
      void removeImages('product-images', newUploads.current)
    }
    onClose()
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const values = Object.fromEntries(new FormData(event.currentTarget))
    const parsed = productSchema.safeParse(values)
    if (!parsed.success) {
      notify(parsed.error.issues[0]?.message || 'Invalid product details.', 'error')
      return
    }

    if (values.show_in_hero === 'on' && !product.show_in_hero && heroCount >= 5) {
      notify('Only five products can be shown in the hero slider.', 'error')
      return
    }

    const rawSlug = String(values.slug || values.name || 'product')
    const specs = Object.fromEntries(
      specifications.filter(([key, value]) => key.trim() && value.trim())
    )

    try {
      const uniqueSlug = await resolveUniqueSlug('products', rawSlug, product.id)
      await save.mutateAsync({
        ...values,
        id: product.id,
        slug: uniqueSlug,
        category_id: values.category_id ? String(values.category_id) : null,
        images,
        specifications: specs,
        applications: String(values.applications ?? '')
          .split('\n')
          .map((item) => item.trim())
          .filter(Boolean),
        brochure_url: String(values.brochure_url ?? '').trim() || null,
        hero_order: Number(values.hero_order ?? 0),
        show_in_hero: values.show_in_hero === 'on',
        is_featured: values.is_featured === 'on',
        is_active: values.is_active === 'on',
      })

      // Delete removed images from storage
      if (pendingRemovals.current.length) {
        void removeImages('product-images', pendingRemovals.current)
      }

      isDirty.current = false
      notify('Product saved successfully.')
      onSaved()
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not save product.', 'error')
    }
  }

  return (
    <Modal title={product.id ? 'Edit product' : 'Add product'} onClose={handleClose}>
      <form className="form-grid" onSubmit={submit} onChange={() => { isDirty.current = true }}>
        <Input label="Name" name="name" required defaultValue={product.name ?? ''} />
        <Input
          label="Slug"
          name="slug"
          defaultValue={product.slug ?? ''}
          placeholder="auto-generated if empty"
        />
        <label className="field">
          <span>Category</span>
          <select name="category_id" defaultValue={product.category_id ?? ''}>
            <option value="">Uncategorised</option>
            {categories.map((category) => (
              <option value={category.id} key={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <Input label="Short description" name="short_description" defaultValue={product.short_description ?? ''} />

        <label className="field">
          <span>Full description</span>
          <textarea
            name="description"
            rows={6}
            defaultValue={product.description ?? ''}
            placeholder="Describe the machine, operating specifications, and capabilities..."
          />
          <small className="field-hint">Blank line = new paragraph. Start a line with - for bullets.</small>
        </label>

        <ImageUploader
          bucket="product-images"
          label="Product images (first is main image)"
          value={images}
          multiple
          onPendingRemove={(url) => {
            pendingRemovals.current.push(url)
            isDirty.current = true
          }}
          onNewUpload={(url) => {
            newUploads.current.push(url)
            isDirty.current = true
          }}
          onChange={(newImages) => {
            setImages(newImages)
            isDirty.current = true
          }}
        />

        <Input label="Brochure PDF URL" name="brochure_url" defaultValue={product.brochure_url ?? ''} />

        <label className="field">
          <span>Applications (one per line)</span>
          <textarea
            name="applications"
            rows={3}
            defaultValue={(product.applications ?? []).join('\n')}
            placeholder="Commercial papad manufacturing&#10;Food processing units"
          />
        </label>

        <div className="specification-editor">
          <h3>Specifications</h3>
          {specifications.map(([key, value], index) => (
            <div className="spec-row" key={`${key}-${index}`}>
              <input
                aria-label="Specification name"
                placeholder="Specification (e.g. Capacity)"
                value={key}
                onChange={(event) => {
                  isDirty.current = true
                  setSpecifications(
                    specifications.map((row, rowIndex) =>
                      rowIndex === index ? [event.target.value, row[1]] : row
                    )
                  )
                }}
              />
              <input
                aria-label="Specification value"
                placeholder="Value (e.g. 100 kg/hr)"
                value={value}
                onChange={(event) => {
                  isDirty.current = true
                  setSpecifications(
                    specifications.map((row, rowIndex) =>
                      rowIndex === index ? [row[0], event.target.value] : row
                    )
                  )
                }}
              />
              <button
                type="button"
                onClick={() => {
                  isDirty.current = true
                  setSpecifications(specifications.filter((_, rowIndex) => rowIndex !== index))
                }}
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            className="text-button"
            onClick={() => {
              isDirty.current = true
              setSpecifications([...specifications, ['', '']])
            }}
          >
            + Add specification
          </button>
        </div>

        <label className="check">
          <input type="checkbox" name="is_featured" defaultChecked={product.is_featured} /> Featured on homepage
        </label>
        <label className="check">
          <input type="checkbox" name="show_in_hero" defaultChecked={product.show_in_hero} /> Show in homepage hero slider
        </label>
        <Input
          label="Homepage slider order (1-5)"
          name="hero_order"
          type="number"
          min="1"
          max="5"
          defaultValue={product.hero_order ?? 0}
        />
        <label className="check">
          <input type="checkbox" name="is_active" defaultChecked={product.is_active ?? true} /> Active
        </label>
        <Button type="submit">Save product</Button>
      </form>
    </Modal>
  )
}

export function Products() {
  const { data = [], isLoading } = useTable<Product>('products', ['products'], {
    order: 'created_at',
    select: '*, categories(name)',
  })
  const { data: categories = [] } = useTable<Category>('categories', ['categories'], { order: 'name' })
  const { remove } = useCrud<Product>('products', ['products'])
  const [editing, setEditing] = useState<Partial<Product> | null>(null)
  const [deleting, setDeleting] = useState<Product | null>(null)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const { notice, notify, clear } = useNotice()

  const filtered = useMemo(
    () =>
      data.filter(
        (item) =>
          (!category || item.category_id === category) &&
          item.name.toLowerCase().includes(search.toLowerCase())
      ),
    [data, category, search]
  )

  async function deleteProduct() {
    if (!deleting) return
    try {
      // Delete images and brochure from storage
      if (deleting.images?.length) {
        void removeImages('product-images', deleting.images)
      }
      if (deleting.brochure_url) {
        void removeImage('brochures', deleting.brochure_url)
      }
      await remove.mutateAsync(deleting.id)
      setDeleting(null)
      notify('Product deleted.')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not delete product.', 'error')
    }
  }

  return (
    <CrudShell title="Products" action={() => setEditing({ is_active: true })}>
      <div className="panel">
        <div className="filter-bar">
          <label className="search-field">
            <Search size={16} />
            <input
              placeholder="Search products by name…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="">All categories</option>
            {categories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>

        <TableState loading={isLoading} empty={!filtered.length} text="No matching products." />
        {filtered.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Featured</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id}>
                    <td>
                      {item.images?.[0] ? (
                        <img className="table-thumb" src={item.images[0]} alt="" width="52" height="40" />
                      ) : (
                        <ImageIcon size={22} color="#aaa" />
                      )}
                    </td>
                    <td>
                      <strong>{item.name}</strong>
                      <small>{item.short_description}</small>
                    </td>
                    <td>{item.categories?.name ?? '—'}</td>
                    <td>{item.is_featured ? 'Yes' : 'No'}</td>
                    <td>
                      <span className={`status ${item.is_active ? 'status-replied' : 'status-read'}`}>
                        {item.is_active ? 'Active' : 'Hidden'}
                      </span>
                    </td>
                    <td className="actions">
                      <button onClick={() => setEditing(item)}>Edit</button>
                      <button onClick={() => setDeleting(item)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <ProductEditor
          product={editing}
          categories={categories}
          heroCount={data.filter((item) => item.show_in_hero).length}
          onSaved={() => setEditing(null)}
          onClose={() => setEditing(null)}
          notify={notify}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete product?"
          message={`Are you sure you want to delete "${deleting.name}"? This will also remove its photos and brochure.`}
          onConfirm={() => void deleteProduct()}
          onClose={() => setDeleting(null)}
        />
      )}

      {notice && <Toast {...notice} onClose={clear} />}
    </CrudShell>
  )
}

// ==========================================
// ENQUIRIES CRUD (ADMIN)
// ==========================================
export function Enquiries() {
  const { data = [], isLoading } = useTable<Enquiry>('enquiries', ['enquiries'], {
    order: 'created_at',
    select: '*, products(name)',
  })
  const { save, remove } = useCrud<Enquiry>('enquiries', ['enquiries'])
  const [selected, setSelected] = useState<Enquiry | null>(null)
  const [deleting, setDeleting] = useState<Enquiry | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'read' | 'replied'>('all')
  const { notice, notify, clear } = useNotice()

  // Newest first sorting & filtering
  const filtered = useMemo(() => {
    return [...data]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .filter((item) => {
        const matchesStatus = statusFilter === 'all' || item.status === statusFilter
        const term = search.toLowerCase().trim()
        const matchesSearch =
          !term ||
          item.name.toLowerCase().includes(term) ||
          item.email.toLowerCase().includes(term) ||
          (item.phone && item.phone.toLowerCase().includes(term)) ||
          (item.country && item.country.toLowerCase().includes(term)) ||
          (item.products?.name && item.products.name.toLowerCase().includes(term)) ||
          item.message.toLowerCase().includes(term)
        return matchesStatus && matchesSearch
      })
  }, [data, search, statusFilter])

  // Automatically mark as read when opened in modal
  async function openEnquiry(enquiry: Enquiry) {
    setSelected(enquiry)
    if (enquiry.status === 'new') {
      try {
        await save.mutateAsync({ id: enquiry.id, status: 'read' })
      } catch (err) {
        console.warn('Could not mark enquiry as read:', err)
      }
    }
  }

  function exportCSV() {
    if (!filtered.length) return
    const headers = ['Date', 'Name', 'Email', 'Phone', 'Country', 'Product', 'Status', 'Message']
    const rows = filtered.map((e) => [
      new Date(e.created_at).toLocaleString(),
      `"${e.name.replace(/"/g, '""')}"`,
      `"${e.email.replace(/"/g, '""')}"`,
      `"${(e.phone || '').replace(/"/g, '""')}"`,
      `"${(e.country || '').replace(/"/g, '""')}"`,
      `"${(e.products?.name || 'General enquiry').replace(/"/g, '""')}"`,
      e.status,
      `"${e.message.replace(/"/g, '""')}"`,
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `enquiries-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  async function deleteEnquiry() {
    if (!deleting) return
    try {
      await remove.mutateAsync(deleting.id)
      setDeleting(null)
      notify('Enquiry deleted.')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not delete enquiry.', 'error')
    }
  }

  return (
    <CrudShell title="Enquiries">
      <div className="panel">
        <div className="filter-bar enquiries-toolbar">
          <label className="search-field">
            <Search size={16} />
            <input
              placeholder="Search enquiries by name, email, phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'new' | 'read' | 'replied')}
          >
            <option value="all">All statuses</option>
            <option value="new">New</option>
            <option value="read">Read</option>
            <option value="replied">Replied</option>
          </select>
          <Button variant="secondary" onClick={exportCSV} disabled={!filtered.length}>
            <Download size={14} /> Export CSV
          </Button>
        </div>

        <TableState loading={isLoading} empty={!filtered.length} text="No enquiries found." />
        {filtered.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Name</th>
                  <th>Product</th>
                  <th>Country</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id} className={item.status === 'new' ? 'unread-row' : ''}>
                    <td>{new Date(item.created_at).toLocaleDateString()}</td>
                    <td>
                      <strong>{item.name}</strong>
                      <small>{item.email}</small>
                    </td>
                    <td>{item.products?.name ?? 'General enquiry'}</td>
                    <td>{item.country || '—'}</td>
                    <td>
                      <select
                        className={`status-select status-${item.status}`}
                        value={item.status}
                        onChange={async (event) => {
                          await save.mutateAsync({
                            id: item.id,
                            status: event.target.value as Enquiry['status'],
                          })
                          notify('Status updated.')
                        }}
                      >
                        <option value="new">New</option>
                        <option value="read">Read</option>
                        <option value="replied">Replied</option>
                      </select>
                    </td>
                    <td className="actions">
                      <button onClick={() => void openEnquiry(item)} title="View message">
                        <Eye size={16} />
                      </button>
                      <button onClick={() => setDeleting(item)} title="Delete enquiry">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <Modal title="Enquiry details" onClose={() => setSelected(null)}>
          <div className="detail-list">
            <div className="detail-header-block">
              <h3>{selected.name}</h3>
              <p>
                <strong>Email:</strong> <a href={`mailto:${selected.email}`}>{selected.email}</a>
              </p>
              {selected.phone && (
                <p>
                  <strong>Phone:</strong> <a href={`tel:${selected.phone}`}>{selected.phone}</a>{' '}
                  <a
                    href={`https://wa.me/${selected.phone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="whatsapp-lead-link"
                  >
                    (WhatsApp)
                  </a>
                </p>
              )}
              {selected.country && (
                <p>
                  <strong>Country:</strong> {selected.country}
                </p>
              )}
              <p>
                <strong>Product of interest:</strong>{' '}
                {selected.products?.name || 'General machine enquiry'}
              </p>
              <p>
                <strong>Received at:</strong> {new Date(selected.created_at).toLocaleString()}
              </p>
            </div>
            <div className="enquiry-message-box">
              <strong>Message:</strong>
              <p>{selected.message}</p>
            </div>
          </div>
        </Modal>
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete enquiry?"
          message={`Are you sure you want to delete enquiry from ${deleting.name}?`}
          onConfirm={() => void deleteEnquiry()}
          onClose={() => setDeleting(null)}
        />
      )}

      {notice && <Toast {...notice} onClose={clear} />}
    </CrudShell>
  )
}
