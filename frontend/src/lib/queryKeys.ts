export const keys = {
  products: {
    all: ['products'] as const,
    list: () => ['products', 'list'] as const,
    active: (filters?: Record<string, unknown>) => ['products', 'active', filters] as const,
    detail: (slug: string) => ['products', 'detail', slug] as const,
    related: (categoryId?: string | null, productId?: string) => ['products', 'related', categoryId, productId] as const,
    hero: () => ['products', 'hero'] as const,
    featured: () => ['products', 'featured'] as const,
  },
  categories: {
    all: ['categories'] as const,
    list: () => ['categories', 'list'] as const,
    active: () => ['categories', 'active'] as const,
  },
  settings: {
    all: ['site_settings'] as const,
  },
  about: {
    all: ['about_content'] as const,
  },
  why: {
    all: ['why_choose_us'] as const,
  },
  facts: {
    all: ['fact_sheet'] as const,
  },
  stats: {
    all: ['site_stats'] as const,
  },
  timeline: {
    all: ['timeline_items'] as const,
  },
  process: {
    all: ['process_steps'] as const,
  },
  enquiries: {
    all: ['enquiries'] as const,
    list: (filters?: Record<string, unknown>) => ['enquiries', 'list', filters] as const,
    unreadCount: () => ['enquiries', 'unread-count'] as const,
  },
  dashboard: {
    all: ['dashboard'] as const,
  },
} as const
