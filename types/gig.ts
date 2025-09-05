export interface Gig {
  id: string
  seller: string
  title: string
  description: string
  category: string
  price: string
  deliveryTime: string
  requirements: string
  tags: string[]
  active: boolean
  createdAt: Date
}

export interface CreateGigData {
  title: string
  description: string
  category: string
  price: string
  deliveryTime: string
  requirements: string
  tags: string[]
}

export const GIG_CATEGORIES = [
  "Web Development",
  "Mobile App Development", 
  "Smart Contract Development",
  "Design & Creative",
  "Writing & Translation",
  "Marketing & SEO",
  "Data & Analytics",
  "Consulting"
] as const

export const DELIVERY_OPTIONS = [
  "24 hours",
  "3 days", 
  "1 week",
  "2 weeks",
  "1 month",
  "Custom"
] as const

export type GigCategory = typeof GIG_CATEGORIES[number]
export type DeliveryOption = typeof DELIVERY_OPTIONS[number]