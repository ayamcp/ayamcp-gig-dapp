"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { switchToHederaNetwork, HEDERA_TESTNET_CONFIG } from "@/lib/hedera-config"

interface UserProfile {
  address: string
  username?: string
  bio?: string
  skills?: string[]
  isServiceProvider: boolean
  isClient: boolean
  rating?: number
  completedJobs?: number
  joinedAt: string
}

interface AuthContextType {
  isConnected: boolean
  address: string
  userProfile: UserProfile | null
  connectWallet: () => Promise<void>
  disconnectWallet: () => void
  updateProfile: (profile: Partial<UserProfile>) => void
  isLoading: boolean
  isOnHederaNetwork: boolean
  switchToHedera: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false)
  const [address, setAddress] = useState<string>("")
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isOnHederaNetwork, setIsOnHederaNetwork] = useState(false)

  useEffect(() => {
    checkConnection()

    // Listen for account changes
    if (typeof window !== "undefined" && window.ethereum) {
      window.ethereum.on("accountsChanged", handleAccountsChanged)
      window.ethereum.on("chainChanged", handleChainChanged)
    }

    return () => {
      if (typeof window !== "undefined" && window.ethereum) {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged)
        window.ethereum.removeListener("chainChanged", handleChainChanged)
      }
    }
  }, [])

  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length === 0) {
      disconnectWallet()
    } else {
      setAddress(accounts[0])
      loadUserProfile(accounts[0])
    }
  }

  const handleChainChanged = () => {
    checkNetworkAndConnection()
  }

  const checkNetworkAndConnection = async () => {
    if (typeof window !== "undefined" && window.ethereum) {
      try {
        const chainId = await window.ethereum.request({ method: "eth_chainId" })
        const hederaChainId = `0x${HEDERA_TESTNET_CONFIG.chainId.toString(16)}`
        setIsOnHederaNetwork(chainId === hederaChainId)
        
        const accounts = await window.ethereum.request({ method: "eth_accounts" })
        if (accounts.length > 0) {
          setIsConnected(true)
          setAddress(accounts[0])
          await loadUserProfile(accounts[0])
        }
      } catch (error) {
        console.error("Error checking network and connection:", error)
        setIsOnHederaNetwork(false)
      }
    }
  }

  const checkConnection = async () => {
    setIsLoading(true)
    await checkNetworkAndConnection()
    setIsLoading(false)
  }

  const loadUserProfile = async (walletAddress: string) => {
    // In a real app, this would fetch from your backend or IPFS
    // For now, we'll use localStorage as a simple storage solution
    const savedProfile = localStorage.getItem(`profile_${walletAddress}`)
    if (savedProfile) {
      setUserProfile(JSON.parse(savedProfile))
    } else {
      // Create default profile for new users
      const defaultProfile: UserProfile = {
        address: walletAddress,
        isServiceProvider: false,
        isClient: false,
        joinedAt: new Date().toISOString(),
      }
      setUserProfile(defaultProfile)
      localStorage.setItem(`profile_${walletAddress}`, JSON.stringify(defaultProfile))
    }
  }

  const connectWallet = async () => {
    if (typeof window !== "undefined" && window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" })
        if (accounts.length > 0) {
          setIsConnected(true)
          setAddress(accounts[0])
          await loadUserProfile(accounts[0])
          await checkNetworkAndConnection()
        }
      } catch (error) {
        console.error("Error connecting wallet:", error)
        throw error
      }
    } else {
      throw new Error("Please install MetaMask or another EVM-compatible wallet")
    }
  }

  const switchToHedera = async () => {
    try {
      await switchToHederaNetwork()
      await checkNetworkAndConnection()
    } catch (error) {
      console.error("Error switching to Hedera:", error)
      throw error
    }
  }

  const disconnectWallet = () => {
    setIsConnected(false)
    setAddress("")
    setUserProfile(null)
    setIsOnHederaNetwork(false)
  }

  const updateProfile = (profileUpdates: Partial<UserProfile>) => {
    if (userProfile) {
      const updatedProfile = { ...userProfile, ...profileUpdates }
      setUserProfile(updatedProfile)
      localStorage.setItem(`profile_${address}`, JSON.stringify(updatedProfile))
    }
  }

  return (
    <AuthContext.Provider
      value={{
        isConnected,
        address,
        userProfile,
        connectWallet,
        disconnectWallet,
        updateProfile,
        isLoading,
        isOnHederaNetwork,
        switchToHedera,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
