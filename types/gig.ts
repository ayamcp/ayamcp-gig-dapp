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
  network: string
  paymentToken: string
}

export interface CreateGigData {
  title: string
  description: string
  category: string
  price: string
  deliveryTime: string
  requirements: string
  tags: string[]
  network: string
  paymentToken: string
}

export interface Order {
  id: string
  gigId: string
  client: string
  provider: string
  amount: string
  isCompleted: boolean
  isPaid: boolean
  paymentReleased: boolean
  createdAt: Date
}

export interface Network {
  id: string
  name: string
  chainId: number
  nativeCurrency: {
    name: string
    symbol: string
    decimals: number
  }
  supportedTokens: Token[]
}

export interface Token {
  address: string
  symbol: string
  name: string
  decimals: number
  isNative: boolean
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

// Supported networks and their tokens
export const SUPPORTED_NETWORKS: Network[] = [
  {
    id: "hedera-testnet",
    name: "Hedera Testnet",
    chainId: 296,
    nativeCurrency: {
      name: "HBAR",
      symbol: "HBAR",
      decimals: 18
    },
    supportedTokens: [
      {
        address: "native",
        symbol: "HBAR",
        name: "HBAR",
        decimals: 18,
        isNative: true
      },
      {
        address: "0x0000000000000000000000000000000000163b5a", // USDC on Hedera
        symbol: "USDC",
        name: "USD Coin",
        decimals: 6,
        isNative: false
      },
      {
        address: "0x00000000000000000000000000000000001637f4", // USDT on Hedera
        symbol: "USDT", 
        name: "Tether USD",
        decimals: 6,
        isNative: false
      }
    ]
  }
]

export type GigCategory = typeof GIG_CATEGORIES[number]
export type DeliveryOption = typeof DELIVERY_OPTIONS[number]