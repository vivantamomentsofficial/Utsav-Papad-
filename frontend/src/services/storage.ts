import { requireSupabase } from '../lib/supabaseClient'

export async function uploadImage(bucket: 'product-images' | 'category-images' | 'site-assets', file: File) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Only JPG, PNG and WebP images are allowed.')
  if (file.size > 5 * 1024 * 1024) throw new Error('Images must be 5 MB or smaller.')
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('Could not compress image.')), 'image/webp', 0.8))
  const client = requireSupabase(); const path = `${crypto.randomUUID()}-${file.name.replace(/\.[^.]+$/, '.webp').replace(/[^a-zA-Z0-9._-]/g, '-')}`
  const { error } = await client.storage.from(bucket).upload(path, blob, { upsert: false, contentType: 'image/webp' })
  if (error) throw error
  return client.storage.from(bucket).getPublicUrl(path).data.publicUrl
}
export async function removeImage(bucket: string, url: string) {
  const marker = `/storage/v1/object/public/${bucket}/`; const path = url.split(marker)[1]
  if (!path) return
  const { error } = await requireSupabase().storage.from(bucket).remove([path])
  if (error) throw error
}
export async function uploadPdf(bucket: 'brochures' | 'site-assets', file: File) {
  if (file.type !== 'application/pdf') throw new Error('Only PDF files are allowed.')
  if (file.size > 15 * 1024 * 1024) throw new Error('PDF files must be 15 MB or smaller.')
  const client = requireSupabase(); const path = `${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`
  const { error } = await client.storage.from(bucket).upload(path, file, { upsert: false, contentType: file.type })
  if (error) throw error
  return client.storage.from(bucket).getPublicUrl(path).data.publicUrl
}
