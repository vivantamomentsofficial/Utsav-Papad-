import { requireSupabase } from '../lib/supabase'
import type { Category } from '../lib/types'

export async function listCategories() {
  const { data, error } = await requireSupabase().from('categories').select('*').order('display_order')
  if (error) throw error
  return (data ?? []) as Category[]
}
