"use client"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { Wallet, LogOut, User, AlertTriangle, Network } from "lucide-react"
import Link from "next/link"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Alert, AlertDescription } from "@/components/ui/alert"

export function WalletConnect() {
  const { 
    isConnected, 
    address, 
    userProfile, 
    connectWallet, 
    disconnectWallet, 
    isLoading, 
    isOnHederaNetwork, 
    switchToHedera 
  } = useAuth()

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  const handleConnect = async () => {
    try {
      await connectWallet()
    } catch (error) {
      console.error("Failed to connect wallet:", error)
    }
  }

  const handleSwitchToHedera = async () => {
    try {
      await switchToHedera()
    } catch (error) {
      console.error("Failed to switch to Hedera:", error)
    }
  }

  if (isLoading) {
    return (
      <Button variant="outline" size="sm" disabled>
        Loading...
      </Button>
    )
  }

  if (isConnected && userProfile) {
    return (
      <div className="flex items-center gap-2">
        {!isOnHederaNetwork && (
          <Alert className="border-amber-200 bg-amber-50 text-amber-800 p-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs ml-2">
              Please switch to Hedera Testnet
              <Button 
                variant="link" 
                size="sm" 
                className="h-auto p-0 ml-1 text-amber-800 underline"
                onClick={handleSwitchToHedera}
              >
                Switch Network
              </Button>
            </AlertDescription>
          </Alert>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <User className="h-4 w-4 mr-2" />
              {isOnHederaNetwork && <div className="h-2 w-2 bg-green-500 rounded-full mr-1" />}
              <span className="hidden sm:inline">{userProfile.username || formatAddress(address)}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5 text-sm">
              <div className="font-medium">{userProfile.username || "Anonymous User"}</div>
              <div className="text-muted-foreground">{formatAddress(address)}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {isOnHederaNetwork ? "✓ Hedera Testnet" : "⚠ Wrong Network"}
              </div>
            </div>
            <DropdownMenuSeparator />
            {!isOnHederaNetwork && (
              <>
                <DropdownMenuItem onClick={handleSwitchToHedera}>
                  <Network className="h-4 w-4 mr-2" />
                  Switch to Hedera Testnet
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem asChild>
              <Link href="/profile">Profile Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard">Dashboard</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/my-gigs">My Gigs</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={disconnectWallet}>
              <LogOut className="h-4 w-4 mr-2" />
              Disconnect Wallet
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  }

  return (
    <Button onClick={handleConnect} size="sm">
      <Wallet className="h-4 w-4 mr-2" />
      Connect Wallet
    </Button>
  )
}
