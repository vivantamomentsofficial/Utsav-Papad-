import { requireSupabase } from '../lib/supabaseClient'

export async function readTable<T>(table: string, select = '*', order?: string) {
  let query = requireSupabase().from(table).select(select)
  if (order) query = query.order(order)
  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as T[]
}

export async function saveRecord<T extends object>(table: string, record: Partial<T> & { id?: string }) {
  const { id, ...values } = record
  const result = id
    ? await requireSupabase().from(table).update(values as never).eq('id', id).select().single()
    : await requireSupabase().from(table).insert(values as never).select().single()
  if (result.error) throw result.error
  return result.data as T
}

export async function deleteRecord(table: string, id: string) {
  const { error } = await requireSupabase().from(table).delete().eq('id', id)
  if (error) throw error
}
