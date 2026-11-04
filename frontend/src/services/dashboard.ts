import { requireSupabase } from '../lib/supabaseClient'
import type { Enquiry } from '../lib/types'

export async function getDashboardData() {
  const client = requireSupabase()
  const [products, categories, enquiries, newEnquiries] = await Promise.all([
    client.from('products').select('id', { count: 'exact', head: true }),
    client.from('categories').select('id', { count: 'exact', head: true }),
    client.from('enquiries').select('*, products(name)').order('created_at', { ascending: false }).limit(5),
    client.from('enquiries').select('id', { count: 'exact', head: true }).eq('status', 'new'),
  ])
  const error = products.error ?? categories.error ?? enquiries.error ?? newEnquiries.error
  if (error) throw error
  return { counts: [products.count ?? 0, categories.count ?? 0, newEnquiries.count ?? 0], enquiries: enquiries.data as Enquiry[] }
}
