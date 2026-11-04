export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  image_url: string | null
  display_order: number
  is_active: boolean
}

export interface Product {
  id: string
  category_id: string | null
  name: string
  slug: string
  short_description: string | null
  description: string | null
  specifications: Record<string, string>
  images: string[]
  is_featured: boolean
  is_active: boolean
  show_in_hero?: boolean
  hero_order?: number
  applications?: string[]
  brochure_url?: string | null
  categories?: Pick<Category, 'name'>
}

export interface AboutContent {
  id: string
  section_key: string
  title: string
  content: string | null
  image_url: string | null
  name: string | null
  designation: string | null
  photo: string | null
}

export interface WhyChooseUs { id: string; title: string; description: string | null; display_order: number }
export interface FactSheet { id: string; label: string; value: string; display_order: number }
export interface SiteStat { id: string; label: string; value: string; display_order: number }
export interface TimelineItem { id: string; year: string; title: string; description: string | null; display_order: number }
export interface ProcessStep { id: string; title: string; description: string | null; display_order: number }

export interface SiteSettings {
  id: string
  logo_url: string | null
  company_name?: string | null
  tagline?: string | null
  phone: string | null
  email: string | null
  address: string | null
  whatsapp: string | null
  social_links: Record<string, string>
  map_embed_url: string | null
  catalog_url: string | null
  seo_title: string | null
  seo_description: string | null
  footer_text: string | null
  export_markets?: string[]
}

export interface Enquiry {
  id: string
  product_id: string | null
  name: string
  email: string
  phone: string | null
  country: string | null
  message: string
  status: 'new' | 'read' | 'replied'
  created_at: string
  products?: Pick<Product, 'name'>
}
