export const keys = {
  products: { list: () => ['products', 'list'] as const, detail: (slug: string) => ['products', 'detail', slug] as const, hero: () => ['products', 'hero'] as const },
  categories: { list: () => ['categories', 'list'] as const },
  settings: ['settings'] as const,
  about: ['about'] as const,
  why: ['why_choose_us'] as const,
  facts: ['fact_sheet'] as const,
  stats: ['site_stats'] as const,
  process: ['process_steps'] as const,
  enquiries: { list: () => ['enquiries', 'list'] as const, unread: () => ['enquiries', 'unread'] as const },
} as const
