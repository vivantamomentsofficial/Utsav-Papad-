import { requireSupabase } from '../lib/supabase'
import type { ProcessStep } from '../lib/types'

export async function listProcessSteps() {
  const { data, error } = await requireSupabase().from('process_steps').select('*').order('display_order')
  if (error) throw error
  return (data ?? []) as ProcessStep[]
}
