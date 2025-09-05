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
  const [balance, setBalance] = useState<string>("0")
  const [totalSupply, setTotalSupply] = useState<string>("0")
  const [transferTo, setTransferTo] = useState<string>("")
  const [transferAmount, setTransferAmount] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [isTransferring, setIsTransferring] = useState(false)

  useEffect(() => {
    if (isConnected && isOnHederaNetwork) {
      loadContractInfo()
    }
  }, [isConnected, isOnHederaNetwork, address])

  const loadContractInfo = async () => {
    setIsLoading(true)
    try {
      const [name, symbol, supply, userBalance] = await Promise.all([
        contractService.getContractName(),
        contractService.getContractSymbol(),
        contractService.getTotalSupply(),
        address ? contractService.getBalance(address) : Promise.resolve("0")
      ])
      
      setContractName(name)
      setContractSymbol(symbol)
      setTotalSupply(supply)
      setBalance(userBalance)
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

  const handleTransfer = async () => {
    if (!transferTo || !transferAmount) {
      toast({
        title: "Error",
        description: "Please enter recipient address and amount",
        variant: "destructive"
      })
      return
    }

    setIsTransferring(true)
    try {
      const tx = await contractService.transfer(transferTo, transferAmount)
      
      toast({
        title: "Transaction Submitted",
        description: `Transaction hash: ${tx.hash}`,
        action: (
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(contractService.getBlockExplorerUrl(tx.hash), "_blank")}
          >
            <ExternalLink className="h-3 w-3" />
          </Button>
        )
      })

      // Wait for transaction to be mined
      await tx.wait()
      
      toast({
        title: "Transfer Successful",
        description: `Transferred ${transferAmount} ${contractSymbol} to ${transferTo.slice(0, 6)}...${transferTo.slice(-4)}`,
      })

      // Refresh balance
      if (address) {
        const newBalance = await contractService.getBalance(address)
        setBalance(newBalance)
      }
      
      // Clear form
      setTransferTo("")
      setTransferAmount("")
    } catch (error: any) {
      console.error("Transfer error:", error)
      toast({
        title: "Transfer Failed",
        description: error.message || "Transaction failed",
        variant: "destructive"
      })
    } finally {
      setIsTransferring(false)
    }
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
            Contract Information
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          </CardTitle>
          <CardDescription>
            Contract deployed on Hedera Testnet
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Contract Address</Label>
              <div className="flex items-center gap-2 mt-1">
                <code className="text-sm bg-muted px-2 py-1 rounded flex-1">
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
              <Label>Contract Name</Label>
              <p className="text-sm font-mono mt-1">{contractName || "Loading..."}</p>
            </div>
            <div>
              <Label>Symbol</Label>
              <p className="text-sm font-mono mt-1">{contractSymbol || "Loading..."}</p>
            </div>
            <div>
              <Label>Total Supply</Label>
              <p className="text-sm font-mono mt-1">{totalSupply} {contractSymbol}</p>
            </div>
            <div>
              <Label>Your Balance</Label>
              <p className="text-sm font-mono mt-1">{balance} {contractSymbol}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transfer Tokens</CardTitle>
          <CardDescription>Send tokens to another address</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="transferTo">Recipient Address</Label>
            <Input
              id="transferTo"
              placeholder="0x..."
              value={transferTo}
              onChange={(e) => setTransferTo(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="transferAmount">Amount</Label>
            <Input
              id="transferAmount"
              type="number"
              placeholder="0.0"
              value={transferAmount}
              onChange={(e) => setTransferAmount(e.target.value)}
            />
          </div>
          <Button 
            onClick={handleTransfer} 
            disabled={isTransferring || !transferTo || !transferAmount}
            className="w-full"
          >
            {isTransferring && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Transfer {contractSymbol}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}