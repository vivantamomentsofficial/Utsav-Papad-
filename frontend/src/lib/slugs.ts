import { requireSupabase } from './supabaseClient'

export function baseSlugify(value: string): string {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'item'
  )
}

export async function resolveUniqueSlug(
  table: 'products' | 'categories',
  rawSlug: string,
  currentId?: string
): Promise<string> {
  const base = baseSlugify(rawSlug)
  const client = requireSupabase()
  let candidate = base
  let counter = 1

  while (true) {
    let query = client.from(table).select('id').eq('slug', candidate)
    if (currentId) {
      query = query.neq('id', currentId)
    }
    const { data } = await query.maybeSingle()
    if (!data) {
      return candidate
    }
    counter += 1
    candidate = `${base}-${counter}`
  }
}
