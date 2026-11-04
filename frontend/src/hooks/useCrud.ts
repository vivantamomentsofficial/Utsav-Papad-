import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { readTable, saveRecord, deleteRecord } from '../services/data'

export function useTable<T>(
  table: string,
  queryKey: string | readonly unknown[],
  options?: { order?: string; select?: string; enabled?: boolean }
) {
  return useQuery({
    queryKey: Array.isArray(queryKey) ? queryKey : [queryKey],
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    retry: 2,
    enabled: options?.enabled,
    queryFn: async () => {
      return readTable<T>(table, options?.select ?? '*', options?.order)
    },
  })
}

export function useCrud<T extends object>(table: string, queryKey?: string | readonly unknown[]) {
  const queryClient = useQueryClient()

  const invalidate = () => {
    // Invalidate affected table and linked resources
    void queryClient.invalidateQueries({ queryKey: [table] })
    if (table === 'products') {
      void queryClient.invalidateQueries({ queryKey: ['categories'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    } else if (table === 'categories') {
      void queryClient.invalidateQueries({ queryKey: ['products'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    } else if (table === 'enquiries') {
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    }
    if (queryKey) {
      void queryClient.invalidateQueries({ queryKey: Array.isArray(queryKey) ? queryKey : [queryKey] })
    }
  }

  const save = useMutation({
    mutationFn: async (record: Partial<T> & { id?: string }) => {
      return saveRecord<T>(table, record)
    },
    onSuccess: invalidate,
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await deleteRecord(table, id)
    },
    onSuccess: invalidate,
  })

  return { save, remove }
}
