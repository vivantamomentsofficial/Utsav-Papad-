import { requireSupabase } from '../lib/supabase'
import type { SiteSettings } from '../lib/types'

export async function getSiteSettings() {
  const { data, error } = await requireSupabase().from('site_settings').select('*').maybeSingle()
  if (error) throw error
  return data as SiteSettings | null
}
