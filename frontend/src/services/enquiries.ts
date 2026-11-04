import { requireSupabase } from '../lib/supabaseClient'

export async function createEnquiry(values: {
  name: string
  email: string
  phone?: string | null
  country?: string | null
  message: string
  product_id?: string | null
}) {
  const { error } = await requireSupabase().from('enquiries').insert(values)
  if (error) throw error
}
