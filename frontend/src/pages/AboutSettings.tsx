import { FormEvent, useRef, useState } from 'react'
import { useCrud, useTable } from '../hooks/useCrud'
import { AboutContent, FactSheet, ProcessStep, SiteSettings, SiteStat, TimelineItem, WhyChooseUs } from '../lib/types'
import { Button, ConfirmDialog, ImageUploader, Input, Modal, Toast } from '../components/ui'
import { uploadPdf } from '../services/storage'

function useNotice() {
  const [notice, setNotice] = useState<{ message: string; type?: 'success' | 'error' } | null>(null)
  return {
    notice,
    notify: (message: string, type?: 'success' | 'error') => setNotice({ message, type }),
    clear: () => setNotice(null),
  }
}

function ListEditor<T extends { id: string }>({
  title,
  rows,
  fields,
  onSave,
  onDelete,
}: {
  title: string
  rows: T[]
  fields: (row?: Partial<T>) => React.ReactNode
  onSave: (row: Partial<T>) => Promise<void>
  onDelete: (row: T) => Promise<void>
}) {
  const [editing, setEditing] = useState<Partial<T> | null>(null)
  const [deleting, setDeleting] = useState<T | null>(null)
  const [error, setError] = useState('')
  const isDirty = useRef(false)

  const handleClose = () => {
    if (isDirty.current && !window.confirm('You have unsaved changes. Discard?')) {
      return
    }
    isDirty.current = false
    setEditing(null)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const values = Object.fromEntries(new FormData(event.currentTarget))
    setError('')
    try {
      await onSave({ ...editing, ...values } as Partial<T>)
      isDirty.current = false
      setEditing(null)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not save this item.')
    }
  }

  return (
    <section className="panel editor-section">
      <div className="panel-header">
        <h2>{title}</h2>
        <Button
          onClick={() => {
            isDirty.current = false
            setEditing({})
          }}
        >
          Add item
        </Button>
      </div>
      {rows.length === 0 ? (
        <p className="muted">No items configured yet.</p>
      ) : (
        rows.map((row) => (
          <div className="editor-row" key={row.id}>
            <div>
              <strong>
                {String(
                  (row as Record<string, unknown>).title ??
                    (row as Record<string, unknown>).label ??
                    (row as Record<string, unknown>).year ??
                    ''
                )}
              </strong>
              <span>
                {String(
                  (row as Record<string, unknown>).description ??
                    (row as Record<string, unknown>).value ??
                    ''
                )}
              </span>
            </div>
            <div className="actions">
              <button
                onClick={() => {
                  isDirty.current = false
                  setEditing(row)
                }}
              >
                Edit
              </button>
              <button onClick={() => setDeleting(row)}>Delete</button>
            </div>
          </div>
        ))
      )}
      {editing && (
        <Modal title={`${editing.id ? 'Edit' : 'Add'} item`} onClose={handleClose}>
          <form
            className="form-grid"
            onSubmit={(event) => void submit(event)}
            onChange={() => {
              isDirty.current = true
            }}
          >
            {fields(editing)}
            {error && <p className="form-alert-error">{error}</p>}
            <Button type="submit">Save</Button>
          </form>
        </Modal>
      )}
      {deleting && (
        <ConfirmDialog
          title="Delete item?"
          message="This item will be permanently removed."
          onConfirm={() => onDelete(deleting).then(() => setDeleting(null))}
          onClose={() => setDeleting(null)}
        />
      )}
    </section>
  )
}

// ==========================================
// ABOUT US MANAGEMENT
// ==========================================
export function About() {
  const { data: sections = [] } = useTable<AboutContent>('about_content', ['about_content'], {
    order: 'section_key',
  })
  const { data: why = [] } = useTable<WhyChooseUs>('why_choose_us', ['why_choose_us'], {
    order: 'display_order',
  })
  const { data: facts = [] } = useTable<FactSheet>('fact_sheet', ['fact_sheet'], {
    order: 'display_order',
  })
  const { data: stats = [] } = useTable<SiteStat>('site_stats', ['site_stats'], {
    order: 'display_order',
  })
  const { data: timeline = [] } = useTable<TimelineItem>('timeline_items', ['timeline_items'], {
    order: 'display_order',
  })
  const { data: process = [] } = useTable<ProcessStep>('process_steps', ['process_steps'], {
    order: 'display_order',
  })

  const aboutCrud = useCrud<AboutContent>('about_content')
  const whyCrud = useCrud<WhyChooseUs>('why_choose_us')
  const factCrud = useCrud<FactSheet>('fact_sheet')
  const statCrud = useCrud<SiteStat>('site_stats')
  const timelineCrud = useCrud<TimelineItem>('timeline_items')
  const processCrud = useCrud<ProcessStep>('process_steps')

  const { notice, notify, clear } = useNotice()
  const [editing, setEditing] = useState<AboutContent | null>(null)
  const isDirty = useRef(false)

  const handleSectionClose = () => {
    if (isDirty.current && !window.confirm('You have unsaved changes. Discard?')) {
      return
    }
    isDirty.current = false
    setEditing(null)
  }

  async function saveSection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editing) return
    const values = Object.fromEntries(new FormData(event.currentTarget))
    try {
      await aboutCrud.save.mutateAsync({ ...editing, ...values })
      isDirty.current = false
      setEditing(null)
      notify('Section saved successfully.')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not save section.', 'error')
    }
  }

  const sectionFields = (row: AboutContent) => (
    <>
      <Input label="Section Title" name="title" defaultValue={row.title} required />
      <label className="field">
        <span>Content</span>
        <textarea name="content" rows={6} defaultValue={row.content ?? ''} />
      </label>
      {row.section_key === 'leadership' && (
        <>
          <Input label="Leader Name" name="name" defaultValue={row.name ?? ''} />
          <Input label="Designation" name="designation" defaultValue={row.designation ?? ''} />
          <ImageUploader
            bucket="site-assets"
            label="Leader Photo"
            value={row.photo ? [row.photo] : []}
            onChange={(urls) => {
              isDirty.current = true
              setEditing({ ...row, photo: urls[0] ?? null })
            }}
          />
        </>
      )}
    </>
  )

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">CONTENT MANAGEMENT</p>
          <h1>About Us</h1>
        </div>
      </header>

      {/* Main Narrative Sections */}
      <div className="panel">
        <h2>About Narrative Sections</h2>
        <div className="about-editor-tabs">
          {sections.map((section) => (
            <button
              key={section.id}
              className="tab-button"
              onClick={() => {
                isDirty.current = false
                setEditing(section)
              }}
            >
              {section.title}
            </button>
          ))}
        </div>
      </div>

      {editing && (
        <Modal title={`Edit ${editing.title}`} onClose={handleSectionClose}>
          <form
            className="form-grid"
            onSubmit={(event) => void saveSection(event)}
            onChange={() => {
              isDirty.current = true
            }}
          >
            {sectionFields(editing)}
            <Button type="submit">Save section</Button>
          </form>
        </Modal>
      )}

      {/* Timeline Items CRUD */}
      <ListEditor
        title="Company Timeline (Milestones)"
        rows={timeline}
        fields={(row) => (
          <>
            <Input label="Year / Period" name="year" defaultValue={row?.year ?? ''} required />
            <Input label="Milestone Title" name="title" defaultValue={row?.title ?? ''} required />
            <Input label="Description" name="description" defaultValue={row?.description ?? ''} />
            <Input
              label="Display order"
              name="display_order"
              type="number"
              defaultValue={row?.display_order ?? 0}
            />
          </>
        )}
        onSave={(row) =>
          timelineCrud.save
            .mutateAsync({ ...row, display_order: Number(row.display_order ?? 0) })
            .then(() => notify('Timeline milestone saved.'))
        }
        onDelete={(row) => timelineCrud.remove.mutateAsync(row.id).then(() => notify('Milestone deleted.'))}
      />

      {/* Process Steps CRUD */}
      <ListEditor
        title="Process Steps (How We Work)"
        rows={process}
        fields={(row) => (
          <>
            <Input label="Step Title" name="title" defaultValue={row?.title ?? ''} required />
            <Input label="Step Description" name="description" defaultValue={row?.description ?? ''} />
            <Input
              label="Display order"
              name="display_order"
              type="number"
              defaultValue={row?.display_order ?? 0}
            />
          </>
        )}
        onSave={(row) =>
          processCrud.save
            .mutateAsync({ ...row, display_order: Number(row.display_order ?? 0) })
            .then(() => notify('Process step saved.'))
        }
        onDelete={(row) => processCrud.remove.mutateAsync(row.id).then(() => notify('Process step deleted.'))}
      />

      {/* Why Choose Us */}
      <ListEditor
        title="Why Choose Us"
        rows={why}
        fields={(row) => (
          <>
            <Input label="Title" name="title" defaultValue={(row?.title as string) ?? ''} required />
            <Input label="Description" name="description" defaultValue={(row?.description as string) ?? ''} />
            <Input
              label="Display order"
              name="display_order"
              type="number"
              defaultValue={(row?.display_order as number) ?? 0}
            />
          </>
        )}
        onSave={(row) =>
          whyCrud.save
            .mutateAsync({ ...row, display_order: Number(row.display_order ?? 0) })
            .then(() => notify('Why Choose Us saved.'))
        }
        onDelete={(row) => whyCrud.remove.mutateAsync(row.id).then(() => notify('Item deleted.'))}
      />

      {/* Fact Sheet */}
      <ListEditor
        title="Fact Sheet"
        rows={facts}
        fields={(row) => (
          <>
            <Input label="Label" name="label" defaultValue={(row?.label as string) ?? ''} required />
            <Input label="Value" name="value" defaultValue={(row?.value as string) ?? ''} required />
            <Input
              label="Display order"
              name="display_order"
              type="number"
              defaultValue={(row?.display_order as number) ?? 0}
            />
          </>
        )}
        onSave={(row) =>
          factCrud.save
            .mutateAsync({ ...row, display_order: Number(row.display_order ?? 0) })
            .then(() => notify('Fact sheet saved.'))
        }
        onDelete={(row) => factCrud.remove.mutateAsync(row.id).then(() => notify('Item deleted.'))}
      />

      {/* Site Stats */}
      <ListEditor
        title="Site Stats"
        rows={stats}
        fields={(row) => (
          <>
            <Input label="Label" name="label" defaultValue={(row?.label as string) ?? ''} required />
            <Input label="Value" name="value" defaultValue={(row?.value as string) ?? ''} required />
            <Input
              label="Display order"
              name="display_order"
              type="number"
              defaultValue={(row?.display_order as number) ?? 0}
            />
          </>
        )}
        onSave={(row) =>
          statCrud.save
            .mutateAsync({ ...row, display_order: Number(row.display_order ?? 0) })
            .then(() => notify('Stats saved.'))
        }
        onDelete={(row) => statCrud.remove.mutateAsync(row.id).then(() => notify('Item deleted.'))}
      />

      {notice && <Toast {...notice} onClose={clear} />}
    </>
  )
}

// ==========================================
// SITE SETTINGS MANAGEMENT
// ==========================================
export function Settings() {
  const { data = [] } = useTable<SiteSettings>('site_settings', ['site_settings'])
  const { save } = useCrud<SiteSettings>('site_settings', ['site_settings'])
  const [settings, setSettings] = useState<SiteSettings | null>(null)
  const [uploadingPdf, setUploadingPdf] = useState(false)
  const { notice, notify, clear } = useNotice()

  const current = settings ?? data[0] ?? ({ social_links: {} } as SiteSettings)

  async function handlePdfUpload(file: File) {
    setUploadingPdf(true)
    try {
      const url = await uploadPdf('site-assets', file)
      setSettings({ ...current, catalog_url: url })
      notify('Catalogue PDF uploaded.')
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Upload failed', 'error')
    } finally {
      setUploadingPdf(false)
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const values = Object.fromEntries(new FormData(event.currentTarget))
    const text = (key: string) => String(values[key] ?? '').trim()

    const rawMarkets = text('export_markets')
    const exportMarkets = rawMarkets
      ? rawMarkets
          .split(',')
          .map((m) => m.trim())
          .filter(Boolean)
      : current.export_markets ?? ['USA', 'Canada', 'UK', 'Sri Lanka', 'Africa', 'New Zealand', 'Australia']

    try {
      await save.mutateAsync({
        ...current,
        company_name: text('company_name'),
        tagline: text('tagline'),
        phone: text('phone'),
        email: text('email'),
        address: text('address'),
        whatsapp: text('whatsapp'),
        map_embed_url: text('map_embed_url'),
        catalog_url: text('catalog_url'),
        seo_title: text('seo_title'),
        seo_description: text('seo_description'),
        footer_text: text('footer_text'),
        export_markets: exportMarkets,
        social_links: {
          facebook: text('facebook'),
          instagram: text('instagram'),
          linkedin: text('linkedin'),
          youtube: text('youtube'),
        },
      })
      notify('Site settings saved successfully.')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not save settings.', 'error')
    }
  }

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">CONFIGURATION</p>
          <h1>Site Settings</h1>
        </div>
      </header>
      <div className="panel">
        <form className="settings-form" onSubmit={submit} key={current.id || 'new-settings'}>
          <ImageUploader
            bucket="site-assets"
            label="Company Logo"
            value={current.logo_url ? [current.logo_url] : []}
            onChange={(urls) => setSettings({ ...current, logo_url: urls[0] ?? null })}
          />

          <div className="two-col">
            <Input
              label="Company name"
              name="company_name"
              defaultValue={current.company_name ?? 'UTSAV FOOD TECHNOLOGY'}
            />
            <Input
              label="Tagline"
              name="tagline"
              defaultValue={current.tagline ?? 'Papad and food processing machinery since 1989'}
            />
            <Input label="Phone" name="phone" defaultValue={current.phone ?? ''} />
            <Input label="Email" name="email" type="email" defaultValue={current.email ?? ''} />
            <Input label="WhatsApp number" name="whatsapp" defaultValue={current.whatsapp ?? ''} />
          </div>

          <label className="field">
            <span>Address</span>
            <textarea
              name="address"
              rows={3}
              defaultValue={current.address ?? 'Anand, Gujarat, India'}
            />
          </label>

          <label className="field">
            <span>Export Markets (comma separated)</span>
            <input
              name="export_markets"
              defaultValue={(current.export_markets ?? ['USA', 'Canada', 'UK', 'Sri Lanka', 'Africa', 'New Zealand', 'Australia']).join(', ')}
              placeholder="USA, Canada, UK, Sri Lanka, Africa, New Zealand, Australia"
            />
          </label>

          <div className="two-col">
            <Input
              label="Facebook URL"
              name="facebook"
              defaultValue={current.social_links?.facebook ?? ''}
            />
            <Input
              label="Instagram URL"
              name="instagram"
              defaultValue={current.social_links?.instagram ?? ''}
            />
            <Input
              label="LinkedIn URL"
              name="linkedin"
              defaultValue={current.social_links?.linkedin ?? ''}
            />
            <Input
              label="YouTube Video / Channel URL"
              name="youtube"
              defaultValue={current.social_links?.youtube ?? ''}
            />
            <Input
              label="Google map embed URL"
              name="map_embed_url"
              defaultValue={current.map_embed_url ?? ''}
            />
            <Input
              label="Catalogue PDF URL"
              name="catalog_url"
              defaultValue={current.catalog_url ?? ''}
            />
          </div>

          <div className="field upload-field">
            <span>Upload Catalogue PDF (replaces or fills URL above)</span>
            <input
              type="file"
              accept="application/pdf"
              disabled={uploadingPdf}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void handlePdfUpload(file)
              }}
            />
            {uploadingPdf && <small className="muted">Uploading PDF…</small>}
          </div>

          <Input
            label="SEO Title (Home fallback)"
            name="seo_title"
            defaultValue={current.seo_title ?? ''}
          />

          <label className="field">
            <span>SEO description</span>
            <textarea
              name="seo_description"
              rows={3}
              defaultValue={current.seo_description ?? ''}
            />
          </label>

          <label className="field">
            <span>Footer text</span>
            <textarea name="footer_text" rows={3} defaultValue={current.footer_text ?? ''} />
          </label>

          <Button type="submit">Save settings</Button>
        </form>
      </div>
      {notice && <Toast {...notice} onClose={clear} />}
    </>
  )
}
