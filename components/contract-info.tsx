"use client"

import { useAuth } from "@/contexts/auth-context"
import { contractService } from "@/lib/contract-service"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, Copy, Loader2 } from "lucide-react"
import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"

export function ContractInfo() {
  const { isConnected, address, isOnHederaNetwork } = useAuth()
  const { toast } = useToast()
  const [contractName, setContractName] = useState<string>("")
  const [contractSymbol, setContractSymbol] = useState<string>("")
  const [contractBalance, setContractBalance] = useState<string>("0")
  const [totalGigs, setTotalGigs] = useState<string>("0")
  const [totalOrders, setTotalOrders] = useState<string>("0")
  const [platformFee, setPlatformFee] = useState<string>("5%")
  const [isPaused, setIsPaused] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isConnected && isOnHederaNetwork) {
      loadContractInfo()
    }
  }, [isConnected, isOnHederaNetwork, address])

  const loadContractInfo = async () => {
    setIsLoading(true)
    try {
      const [name, symbol, balance, gigs, orders, fee, paused] = await Promise.all([
        contractService.getContractName(),
        contractService.getContractSymbol(),
        contractService.getContractBalance(),
        contractService.getTotalGigs(),
        contractService.getTotalOrders(),
        contractService.getPlatformFee(),
        contractService.isContractPaused()
      ])
      
      setContractName(name)
      setContractSymbol(symbol)
      setContractBalance(balance)
      setTotalGigs(gigs)
      setTotalOrders(orders)
      setPlatformFee(fee)
      setIsPaused(paused)
    } catch (error) {
      console.error("Error loading contract info:", error)
      toast({
        title: "Error",
        description: "Failed to load contract information",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const refreshData = async () => {
    await loadContractInfo()
    toast({
      title: "Data Refreshed",
      description: "Contract information has been updated",
    })
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied",
      description: "Address copied to clipboard",
    })
  }

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Contract Interaction</CardTitle>
          <CardDescription>Connect your wallet to interact with the smart contract</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Please connect your wallet to continue</p>
        </CardContent>
      </Card>
    )
  }

  if (!isOnHederaNetwork) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Contract Interaction</CardTitle>
          <CardDescription>Switch to Hedera Testnet to interact with the smart contract</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Please switch to Hedera Testnet to continue</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Marketplace Information
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          </CardTitle>
          <CardDescription>
            Gig Marketplace deployed on Hedera Testnet
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label>Contract Address</Label>
              <div className="flex items-center gap-2 mt-1">
                <code className="text-sm bg-muted px-2 py-1 rounded flex-1 text-xs">
                  {contractService.getContractAddress()}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(contractService.getContractAddress())}
                >
                  <Copy className="h-3 w-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`https://hashscan.io/testnet/contract/${contractService.getContractAddress()}`, "_blank")}
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div>
              <Label>Network</Label>
              <div className="mt-1">
                <Badge variant="secondary">Hedera Testnet</Badge>
              </div>
            </div>
            <div>
              <Label>Contract Status</Label>
              <div className="mt-1">
                <Badge variant={isPaused ? "destructive" : "default"}>
                  {isPaused ? "Paused" : "Active"}
                </Badge>
              </div>
            </div>
            <div>
              <Label>Contract Name</Label>
              <p className="text-sm font-mono mt-1">{contractName || "Loading..."}</p>
            </div>
            <div>
              <Label>Total Gigs</Label>
              <p className="text-sm font-mono mt-1">{totalGigs}</p>
            </div>
            <div>
              <Label>Total Orders</Label>
              <p className="text-sm font-mono mt-1">{totalOrders}</p>
            </div>
            <div>
              <Label>Platform Fee</Label>
              <p className="text-sm font-mono mt-1">{platformFee}</p>
            </div>
            <div>
              <Label>Contract Balance</Label>
              <p className="text-sm font-mono mt-1">{contractBalance} HBAR</p>
            </div>
            <div>
              <Label>Actions</Label>
              <div className="mt-1">
                <Button variant="outline" size="sm" onClick={refreshData}>
                  Refresh Data
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Marketplace Statistics</CardTitle>
          <CardDescription>Real-time marketplace metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{totalGigs}</div>
              <div className="text-sm text-blue-600">Total Gigs</div>
            </div>
            <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{totalOrders}</div>
              <div className="text-sm text-green-600">Total Orders</div>
            </div>
            <div className="text-center p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{contractBalance}</div>
              <div className="text-sm text-purple-600">HBAR in Escrow</div>
            </div>
            <div className="text-center p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{platformFee}</div>
              <div className="text-sm text-orange-600">Platform Fee</div>
            </div>
          </div>
          <div className="mt-4 text-center">
            <Button variant="outline" onClick={refreshData} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Refresh Statistics
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}