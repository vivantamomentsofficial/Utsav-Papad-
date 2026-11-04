import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { requireSupabase } from '../lib/supabaseClient'

const tables = ['products', 'categories', 'about_content', 'why_choose_us', 'fact_sheet', 'site_stats', 'site_settings', 'process_steps', 'enquiries']

export function useRealtimeSync() {
  const queryClient = useQueryClient()
  useEffect(() => {
    const client = requireSupabase()
    const channel = client.channel('content-sync')
    tables.forEach((table) => channel.on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
      void queryClient.invalidateQueries()
      if (table === 'enquiries' && payload.eventType === 'INSERT') window.dispatchEvent(new CustomEvent('utsav:new-enquiry'))
    }))
    channel.subscribe()
    return () => { void client.removeChannel(channel) }
  }, [queryClient])
}
