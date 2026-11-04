import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { readTable, saveRecord, deleteRecord } from '../services/data'

export function useTable<T>(table: string, queryKey: string, options?: { order?: string; select?: string; enabled?: boolean }) {
  return useQuery({
    queryKey: [queryKey],
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    retry: 2,
    enabled: options?.enabled,
    queryFn: async () => {
      return readTable<T>(table, options?.select ?? '*', options?.order)
    },
  })
}

export function useCrud<T extends object>(table: string, queryKey: string) {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries()
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
