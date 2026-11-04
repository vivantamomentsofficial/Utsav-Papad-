import { useState } from 'react'
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'
import { AlertTriangle, Check, X } from 'lucide-react'
import { removeImage, uploadImage } from '../lib/crud'

export function Button({ children, variant = 'primary', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' }) {
  return <button className={`button button-${variant}`} {...props}>{children}</button>
}

export function Input({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return <label className="field">{label && <span>{label}</span>}<input {...props} /></label>
}

export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return <div className="modal-backdrop" role="presentation"><div className="modal"><div className="modal-header"><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Close">×</button></div>{children}</div></div>
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="empty-state">{children}</div>
}

export function ConfirmDialog({ title, message, onConfirm, onClose }: { title: string; message: string; onConfirm: () => void; onClose: () => void }) {
  return <Modal title={title} onClose={onClose}><div className="confirm-content"><AlertTriangle size={32} color="#f26a1b" /><p>{message}</p><div className="modal-actions"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant="danger" onClick={() => { onConfirm(); onClose() }}>Delete</Button></div></div></Modal>
}

export function Toast({ message, type = 'success', onClose }: { message: string; type?: 'success' | 'error'; onClose: () => void }) {
  return <div className={`toast toast-${type}`} role="status"><Check size={17} />{message}<button onClick={onClose} aria-label="Close notification"><X size={15} /></button></div>
}

export function ImageUploader({ bucket, value, onChange, multiple = false, label = 'Image' }: { bucket: 'product-images' | 'category-images' | 'site-assets'; value: string[]; onChange: (value: string[]) => void; multiple?: boolean; label?: string }) {
  const [uploading, setUploading] = useState(false); const [error, setError] = useState('')
  async function handleChange(files: FileList | null) {
    if (!files?.length) return
    setUploading(true); setError('')
    try { const urls = await Promise.all(Array.from(files).map((file) => uploadImage(bucket, file))); if (!multiple) { await Promise.all(value.map((url) => removeImage(bucket, url))) } onChange(multiple ? [...value, ...urls] : urls.slice(0, 1)) } catch (uploadError) { setError(uploadError instanceof Error ? uploadError.message : 'Upload failed.') } finally { setUploading(false) }
  }
  return <div className="upload-field"><span>{label}</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple={multiple} onChange={(event) => void handleChange(event.target.files)} disabled={uploading} />{uploading && <small className="muted">Uploading…</small>}{error && <small className="error">{error}</small>}<div className="image-preview-list">{value.map((url, index) => <div className="image-preview" key={url}><img src={url} alt="" /><button type="button" onClick={() => { void removeImage(bucket, url); onChange(value.filter((_, itemIndex) => itemIndex !== index)) }} aria-label="Remove image"><X size={14} /></button></div>)}</div></div>
}
