import { requireSupabase } from '../lib/supabaseClient'

export async function getSession() { return (await requireSupabase().auth.getSession()).data.session }
export async function isAdmin(userId: string) {
  const { data, error } = await requireSupabase().from('admin_users').select('user_id').eq('user_id', userId).maybeSingle()
  if (error) throw error
  return Boolean(data)
}
export async function signOut() { await requireSupabase().auth.signOut() }
export async function signIn(email: string, password: string) { return requireSupabase().auth.signInWithPassword({ email, password }) }
export async function resetPassword(email: string, redirectTo: string) { return requireSupabase().auth.resetPasswordForEmail(email, { redirectTo }) }
export async function updatePassword(password: string) { return requireSupabase().auth.updateUser({ password }) }
