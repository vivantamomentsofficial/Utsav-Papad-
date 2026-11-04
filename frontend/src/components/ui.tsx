import { useEffect, useId, useRef, useState } from 'react'
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'
import { AlertTriangle, ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import { uploadImage } from '../services/storage'

export function Button({
  children,
  variant = 'primary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' }) {
  return (
    <button className={`button button-${variant}`} {...props}>
      {children}
    </button>
  )
}

export function Input({ label, error, ...props }: InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }) {
  return (
    <label className="field">
      {label && <span>{label}</span>}
      <input {...props} />
      {error && <small className="error-text">{error}</small>}
    </label>
  )
}

export function Modal({
  title,
  children,
  onClose,
}: {
  title: string
  children: ReactNode
  onClose: () => void
}) {
  const titleId = useId()
  const modalRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCloseRef.current()
        return
      }
      if (event.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (!focusable.length) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          last.focus()
          event.preventDefault()
        } else if (!event.shiftKey && document.activeElement === last) {
          first.focus()
          event.preventDefault()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    modalRef.current?.focus()

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previousFocusRef.current?.focus()
    }
  }, [])

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="modal"
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="modal-header">
          <h2 id={titleId}>{title}</h2>
          <button className="icon-button" onClick={onClose} aria-label="Close modal" type="button">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="empty-state">{children}</div>
}

export function ConfirmDialog({
  title,
  message,
  onConfirm,
  onClose,
}: {
  title: string
  message: string
  onConfirm: () => void | Promise<void>
  onClose: () => void
}) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function confirm() {
    setBusy(true)
    setError('')
    try {
      await onConfirm()
      onClose()
    } catch (confirmError) {
      setError(confirmError instanceof Error ? confirmError.message : 'Could not complete this action.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      <div className="confirm-content">
        <AlertTriangle size={32} color="#F26A1B" />
        <p>{message}</p>
        {error && <p className="form-alert-error">{error}</p>}
        <div className="modal-actions">
          <Button variant="secondary" onClick={onClose} type="button" disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => void confirm()}
            type="button"
            disabled={busy}
          >
            {busy ? 'Working…' : 'Delete'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export function Toast({
  message,
  type = 'success',
  onClose,
}: {
  message: string
  type?: 'success' | 'error'
  onClose: () => void
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className={`toast toast-${type}`} role="status">
      <Check size={17} />
      {message}
      <button onClick={onClose} aria-label="Close notification" type="button">
        <X size={15} />
      </button>
    </div>
  )
}

export function ImageUploader({
  bucket,
  value,
  onChange,
  onPendingRemove,
  onNewUpload,
  multiple = false,
  label = 'Image',
}: {
  bucket: 'product-images' | 'category-images' | 'site-assets'
  value: string[]
  onChange: (value: string[]) => void
  onPendingRemove?: (url: string) => void
  onNewUpload?: (url: string) => void
  multiple?: boolean
  label?: string
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function handleChange(files: FileList | null) {
    if (!files?.length) return
    setUploading(true)
    setError('')
    try {
      const urls = await Promise.all(Array.from(files).map((file) => uploadImage(bucket, file)))
      urls.forEach((url) => onNewUpload?.(url))
      if (!multiple) {
        if (value[0]) onPendingRemove?.(value[0])
        onChange(urls.slice(0, 1))
      } else {
        onChange([...value, ...urls])
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  function move(index: number, direction: 'left' | 'right') {
    const newIdx = direction === 'left' ? index - 1 : index + 1
    if (newIdx < 0 || newIdx >= value.length) return
    const updated = [...value]
    const temp = updated[index]
    updated[index] = updated[newIdx]
    updated[newIdx] = temp
    onChange(updated)
  }

  function removeAt(index: number) {
    const url = value[index]
    onPendingRemove?.(url)
    onChange(value.filter((_, idx) => idx !== index))
  }

  return (
    <div className="upload-field">
      <span>{label}</span>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple={multiple}
        onChange={(event) => void handleChange(event.target.files)}
        disabled={uploading}
      />
      {uploading && <small className="muted">Compressing and uploading image…</small>}
      {error && <small className="error">{error}</small>}
      <div className="image-preview-list">
        {value.map((url, index) => (
          <div className="image-preview" key={url}>
            <img src={url} alt="" />
            {index === 0 && <span className="main-image-badge">Main</span>}
            <div className="image-preview-actions">
              {multiple && index > 0 && (
                <button
                  type="button"
                  className="preview-btn"
                  onClick={() => move(index, 'left')}
                  title="Move left"
                  aria-label="Move left"
                >
                  <ArrowLeft size={12} />
                </button>
              )}
              {multiple && index < value.length - 1 && (
                <button
                  type="button"
                  className="preview-btn"
                  onClick={() => move(index, 'right')}
                  title="Move right"
                  aria-label="Move right"
                >
                  <ArrowRight size={12} />
                </button>
              )}
              <button
                type="button"
                className="preview-remove-btn"
                onClick={() => removeAt(index)}
                aria-label="Remove image"
                title="Remove image"
              >
                <X size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
