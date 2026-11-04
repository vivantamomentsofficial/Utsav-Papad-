import { requireSupabase } from '../lib/supabase'
import type { Product } from '../lib/types'

export async function listProducts(select = '*, categories(name)') {
  const { data, error } = await requireSupabase().from('products').select(select).order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as Product[]
}

export async function getProductBySlug(slug: string) {
  const { data, error } = await requireSupabase().from('products').select('*, categories(name)').eq('slug', slug).eq('is_active', true).maybeSingle()
  if (error) throw error
  return data as Product | null
}
