import { requireSupabase } from '../lib/supabase'
import type { Enquiry } from '../lib/types'

export async function createEnquiry(values: Partial<Enquiry>) {
  const { data, error } = await requireSupabase().from('enquiries').insert(values).select().single()
  if (error) throw error
  return data as Enquiry
}
