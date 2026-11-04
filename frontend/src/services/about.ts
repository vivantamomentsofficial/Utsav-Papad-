import { requireSupabase } from '../lib/supabase'
import type { AboutContent } from '../lib/types'

export async function listAboutSections() {
  const { data, error } = await requireSupabase().from('about_content').select('*').order('section_key')
  if (error) throw error
  return (data ?? []) as AboutContent[]
}
