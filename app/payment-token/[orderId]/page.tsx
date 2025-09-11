"use client"

import { useState, useEffect } from "react"

// Extend window interface for MetaMask
declare global {
  interface Window {
    ethereum?: any;
  }
}
import { useParams, useRouter } from "next/navigation"
import QRCode from "qrcode"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { QrCode, Copy, ArrowLeft, CheckCircle, Loader2, Clock, User, RefreshCw, Coins } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { contractService } from "@/lib/contract-service"
import { CONTRACT_ADDRESS } from "@/lib/hedera-config"
import { Order } from "@/types/gig"
import { ethers } from "ethers"

interface GigData {
  id: string
  title: string
  description: string
  price: string
  seller: string
  category: string
  deliveryTime: string
  active: boolean
  token?: string
}

export default function TokenPaymentPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const orderId = params.orderId as string

  const [order, setOrder] = useState<Order | null>(null)
  const [gig, setGig] = useState<GigData | null>(null)
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isCheckingStatus, setIsCheckingStatus] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [paymentHash, setPaymentHash] = useState<string>("")
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  useEffect(() => {
    if (orderId) {
      loadOrderData()
    }
  }, [orderId])

  // Periodic status polling - checks every 15 seconds
  useEffect(() => {
    if (!orderId || !order) return

    console.log(`[POLLING] Starting periodic status checks for Order ${orderId}`)
    
    const pollInterval = setInterval(async () => {
      try {
        // Continue polling until payment is fully released (final state)
        if (!order.paymentReleased) {
          console.log(`[POLLING] Automatic status check for Order ${orderId}...`, {
            currentState: {
              isPaid: order.isPaid,
              isCompleted: order.isCompleted,
              paymentReleased: order.paymentReleased
            },
            timestamp: new Date().toISOString()
          })
          
          const updatedOrder = await contractService.getOrder(parseInt(orderId))
          
          console.log(`[POLLING] Fetched updated status:`, {
            newState: {
              isPaid: updatedOrder.isPaid,
              isCompleted: updatedOrder.isCompleted,
              paymentReleased: updatedOrder.paymentReleased
            },
            hasChanged: (
              updatedOrder.isPaid !== order.isPaid || 
              updatedOrder.isCompleted !== order.isCompleted || 
              updatedOrder.paymentReleased !== order.paymentReleased
            ),
            timestamp: new Date().toISOString()
          })
          
          // Check if any status changed
          if (updatedOrder.isPaid !== order.isPaid || 
              updatedOrder.isCompleted !== order.isCompleted || 
              updatedOrder.paymentReleased !== order.paymentReleased) {
            
            console.log(`[POLLING] ✅ STATUS CHANGED! Updating UI`, {
              changes: {
                isPaid: { from: order.isPaid, to: updatedOrder.isPaid },
                isCompleted: { from: order.isCompleted, to: updatedOrder.isCompleted },
                paymentReleased: { from: order.paymentReleased, to: updatedOrder.paymentReleased }
              }
            })
            
            setOrder(updatedOrder)
            setLastUpdated(new Date())
            
            // Show appropriate notifications
            if (updatedOrder.isPaid && !order.isPaid) {
              toast({
                title: "Payment Received!",
                description: "Your token payment has been confirmed on the blockchain.",
              })
            }
            
            if (updatedOrder.isCompleted && !order.isCompleted) {
              toast({
                title: "Work Completed!",
                description: "The provider has marked this order as completed.",
              })
            }
            
            if (updatedOrder.paymentReleased && !order.paymentReleased) {
              toast({
                title: "Payment Released!",
                description: "Payment has been released to the provider.",
              })
            }
          } else {
            console.log(`[POLLING] No changes detected for Order ${orderId}`)
          }
        } else {
          console.log(`[POLLING] Order ${orderId} is complete (payment released), continuing to monitor`)
        }
      } catch (error) {
        console.error("[POLLING] Error during status check:", error)
      }
    }, 15000) // Check every 15 seconds

    return () => {
      console.log(`[POLLING] Stopping periodic checks for Order ${orderId}`)
      clearInterval(pollInterval)
    }
  }, [orderId, order?.isPaid, order?.isCompleted, order?.paymentReleased, toast])

  const loadOrderData = async (isRefresh = false) => {
    try {
      if (!isRefresh) setIsLoading(true)
      
      console.log(`[${isRefresh ? 'REFRESH' : 'LOAD'}] Fetching Order ${orderId} data...`, {
        timestamp: new Date().toISOString(),
        isRefresh
      })
      
      // First get the order data
      const orderData = await contractService.getOrder(parseInt(orderId))
      
      console.log(`[${isRefresh ? 'REFRESH' : 'LOAD'}] Order ${orderId} status:`, {
        isPaid: orderData.isPaid,
        isCompleted: orderData.isCompleted,
        paymentReleased: orderData.paymentReleased,
        amount: orderData.amount,
        client: orderData.client,
        provider: orderData.provider,
        createdAt: orderData.createdAt.toISOString(),
        timestamp: new Date().toISOString()
      })
      
      setOrder(orderData)
      setLastUpdated(new Date())
      
      // Then get the associated gig data
      if (orderData) {
        const gigData = await contractService.getGig(parseInt(orderData.gigId))
        setGig(gigData)
        
        if (gigData && !orderData.isPaid) {
          await generateQRCode(orderData, gigData)
        }
      }
    } catch (error) {
      console.error("Error loading order:", error)
      toast({
        title: "Error",
        description: "Failed to load order data",
        variant: "destructive",
      })
    } finally {
      if (!isRefresh) setIsLoading(false)
    }
  }

  const generateQRCode = async (orderData: Order, gigData: GigData) => {
    try {
      // Create contract call data for payOrderWithToken function
      const contractInterface = new ethers.Interface([
        "function payOrderWithToken(uint256 _orderId)"
      ])
      const callData = contractInterface.encodeFunctionData("payOrderWithToken", [parseInt(orderId)])
      
      // Create transaction data object for calling contract (no value needed for token payments)
      const transactionData = {
        to: CONTRACT_ADDRESS,
        value: "0", // No ETH value for token payments
        data: callData,
        chainId: 296, // Hedera Testnet chain ID
        gasLimit: "200000" // Higher gas limit for token interaction
      }
      
      console.log('[QR Code] Generated token contract call data:', {
        contractAddress: CONTRACT_ADDRESS,
        orderId: orderId,
        amount: orderData.amount,
        callData: callData,
        provider: orderData.provider,
        tokenAddress: gigData.token || "Not set"
      })
      
      // Create a MetaMask-compatible transaction request for contract interaction
      const ethereumUri = `ethereum:${CONTRACT_ADDRESS}@296?data=${transactionData.data}`
      
      // Generate QR code for the contract transaction
      const qrUrl = await QRCode.toDataURL(ethereumUri, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })
      
      setQrCodeUrl(qrUrl)
    } catch (error) {
      console.error("Error generating QR code:", error)
      toast({
        title: "Error",
        description: "Failed to generate QR code",
        variant: "destructive",
      })
    }
  }

  const copyPaymentData = async () => {
    if (!order || !gig) return

    // Create contract transaction data for token payment
    const contractInterface = new ethers.Interface([
      "function payOrderWithToken(uint256 _orderId)"
    ])
    const callData = contractInterface.encodeFunctionData("payOrderWithToken", [parseInt(orderId)])

    const paymentData = {
      type: "Token Contract Transaction",
      contractAddress: CONTRACT_ADDRESS,
      function: "payOrderWithToken",
      orderId: orderId,
      amount: order.amount,
      tokenAddress: gig.token || "Not set",
      callData: callData,
      description: `Token payment for Order ${orderId}: ${gig.title}`,
      network: "Hedera Testnet",
      note: "Token approval required before payment"
    }

    try {
      await navigator.clipboard.writeText(JSON.stringify(paymentData, null, 2))
      toast({
        title: "Copied!",
        description: "Token contract transaction data copied to clipboard",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy payment data",
        variant: "destructive",
      })
    }
  }

  const copyMetaMaskUri = async () => {
    if (!order || !gig) return
    
    // Create contract transaction URI for token payment
    const contractInterface = new ethers.Interface([
      "function payOrderWithToken(uint256 _orderId)"
    ])
    const callData = contractInterface.encodeFunctionData("payOrderWithToken", [parseInt(orderId)])
    
    const ethereumUri = `ethereum:${CONTRACT_ADDRESS}@296?data=${callData}`

    try {
      await navigator.clipboard.writeText(ethereumUri)
      toast({
        title: "Copied!",
        description: "Token contract transaction URI copied to clipboard",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy transaction URI",
        variant: "destructive",
      })
    }
  }

  // Manual refresh function
  const handleManualRefresh = async () => {
    try {
      setIsRefreshing(true)
      console.log(`[MANUAL REFRESH] User requested refresh for Order ${orderId}`)
      
      await loadOrderData(true) // Pass true to indicate this is a refresh
      
      toast({
        title: "Status Updated",
        description: "Order status has been refreshed.",
      })
      
      console.log(`[MANUAL REFRESH] Refresh completed for Order ${orderId}`)
    } catch (error) {
      console.error("[MANUAL REFRESH] Error:", error)
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh order status. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  // MetaMask browser extension token payment function
  const payWithToken = async () => {
    if (!orderId || !order || !gig) return

    try {
      setIsProcessing(true)
      console.log(`[TOKEN PAY] Starting token payment for Order ${orderId}`)
      
      // Check if MetaMask is available
      if (typeof window.ethereum === 'undefined') {
        toast({
          title: "MetaMask Not Found",
          description: "Please install MetaMask browser extension to continue.",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Processing Token Payment",
        description: "Please approve the token spending and confirm the transaction in MetaMask...",
      })

      console.log(`[TOKEN PAY] Calling contractService.payOrderWithToken(${orderId})`)
      
      // Use the contract service's payOrderWithToken method
      const tx = await contractService.payOrderWithToken(parseInt(orderId))
      
      console.log(`[TOKEN PAY] Transaction submitted via contractService:`, tx.hash)
      
      toast({
        title: "Transaction Submitted",
        description: `Transaction hash: ${tx.hash.slice(0, 10)}...`,
      })

      // Wait for transaction confirmation
      const receipt = await tx.wait()
      
      if (receipt?.status === 1) {
        console.log(`[TOKEN PAY] Payment confirmed! Reloading order data`)
        
        // Reload order data to reflect payment
        await loadOrderData(true)
        
        toast({
          title: "Token Payment Successful! 🎉",
          description: "Your token payment has been confirmed and funds are held in escrow.",
        })
      } else {
        throw new Error("Transaction failed")
      }

    } catch (error: any) {
      console.error("[TOKEN PAY] Payment error:", error)
      
      let errorMessage = "Token payment failed"
      if (error.code === "ACTION_REJECTED" || error.code === 4001) {
        errorMessage = "Transaction was rejected by user"
      } else if (error.message) {
        errorMessage = error.message
      }

      toast({
        title: "Token Payment Failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (!order || !gig) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container max-w-4xl mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Order Not Found</h1>
            <p className="text-muted-foreground mb-4">
              The order you're looking for doesn't exist or has been removed.
            </p>
            <Button onClick={() => router.push("/browse")}>Browse Gigs</Button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (order.isPaid) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container max-w-4xl mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6">
              <div className="text-center">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h1 className="text-2xl font-bold mb-2">Already Paid!</h1>
                <p className="text-muted-foreground mb-4">
                  This order has already been paid for with tokens.
                </p>
                <div className="space-y-2 mb-6">
                  <p className="text-sm">Order ID:</p>
                  <p className="text-lg font-mono bg-muted p-2 rounded">
                    #{orderId}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => router.push("/browse")} className="flex-1">
                    Browse More Gigs
                  </Button>
                  <Button onClick={() => router.push("/profile")} variant="outline" className="flex-1">
                    My Orders
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    )
  }

  const tokenAddress = gig.token === "native" ? "Native Token (HBAR)" : gig.token || "Not specified"

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            
            <div className="flex items-center gap-2">
              <div className="text-xs text-muted-foreground">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualRefresh}
                disabled={isRefreshing}
              >
                {isRefreshing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Refreshing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Status
                  </>
                )}
              </Button>
            </div>
          </div>
          
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Coins className="h-8 w-8 text-blue-500" />
            Token Payment for Order #{orderId}
          </h1>
          <p className="text-muted-foreground">
            Complete your token payment using the payment methods below
          </p>
          
          {/* Status indicator */}
          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <p className="text-sm">
              <strong>Token Payment:</strong> This order requires ERC20 token payment. 
              Make sure you have approved the contract to spend your tokens.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Order Details */}
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Service Details (from original gig) */}
              <div>
                <div className="text-xs text-muted-foreground mb-1">Service Ordered:</div>
                <h3 className="font-semibold text-lg">{gig.title}</h3>
                <Badge variant="secondary" className="mt-1">
                  {gig.category}
                </Badge>
              </div>
              
              <p className="text-muted-foreground text-sm">{gig.description}</p>
              
              {/* Order Details */}
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground mb-2">ORDER DETAILS</div>
                
                <div className="flex justify-between">
                  <span>Order ID:</span>
                  <span className="font-mono text-sm">#{orderId}</span>
                </div>
                <div className="flex justify-between">
                  <span>Order Created:</span>
                  <span className="text-sm">
                    {order.createdAt.toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Client:</span>
                  <span className="font-mono text-xs">
                    {order.client.slice(0, 6)}...{order.client.slice(-4)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Provider:
                  </span>
                  <span className="font-mono text-xs">
                    {order.provider.slice(0, 6)}...{order.provider.slice(-4)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Expected Delivery:
                  </span>
                  <span className="text-sm">{gig.deliveryTime}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment Token:</span>
                  <span className="text-sm font-mono">
                    {tokenAddress === "Native Token (HBAR)" ? tokenAddress : `${tokenAddress?.slice(0, 6)}...${tokenAddress?.slice(-4)}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Payment Status:</span>
                  <Badge variant={order.isPaid ? "default" : "secondary"}>
                    {order.isPaid ? "Paid" : "Pending Payment"}
                  </Badge>
                </div>
                {order.isPaid && (
                  <div className="flex justify-between">
                    <span>Escrow Status:</span>
                    <Badge variant={order.paymentReleased ? "default" : "secondary"}>
                      {order.paymentReleased ? "Released to Provider" : "Held in Escrow"}
                    </Badge>
                  </div>
                )}
              </div>

              <Separator />
              
              <div className="flex justify-between text-lg font-semibold">
                <span>Order Amount:</span>
                <span>{order.amount} Tokens</span>
              </div>
              
              {/* Show price comparison if different */}
              {parseFloat(order.amount) !== parseFloat(gig.price) && (
                <div className="text-sm text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Original Gig Price:</span>
                    <span>{gig.price} Tokens</span>
                  </div>
                </div>
              )}

              {/* Primary Payment Button - MetaMask Token Payment */}
              {!order.isPaid && (
                <>
                  <Separator />
                  {tokenAddress !== "Native Token (HBAR)" ? (
                    <Button 
                      onClick={payWithToken}
                      disabled={isProcessing}
                      className="w-full"
                      size="lg"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processing Token Payment...
                        </>
                      ) : (
                        <>
                          <Coins className="h-4 w-4 mr-2" />
                          Pay {order.amount} Tokens Now
                        </>
                      )}
                    </Button>
                  ) : (
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        <strong>Notice:</strong> This gig is configured for native token payment (HBAR). 
                        Use the regular payment page instead.
                      </p>
                      <Button 
                        onClick={() => router.push(`/payment/${orderId}`)}
                        variant="outline"
                        size="sm"
                        className="mt-2"
                      >
                        Go to Regular Payment Page
                      </Button>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground text-center">
                    Uses MetaMask browser extension for token transactions
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Payment Methods */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                Token Payment Methods
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {!order.isPaid && (
                <div className="text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
                  <p><strong>Important:</strong> You need to approve the contract to spend your tokens before payment.</p>
                  <p className="mt-1">Use the "Pay Now" button above for automated approval and payment.</p>
                </div>
              )}
              
              {/* QR Code Section */}
              <div className="text-center">
                <h3 className="font-semibold mb-4">Scan with MetaMask</h3>
                {qrCodeUrl && (
                  <div className="inline-block p-4 bg-white rounded-lg">
                    <img 
                      src={qrCodeUrl} 
                      alt="Token Payment QR Code" 
                      className="w-48 h-48 mx-auto"
                    />
                  </div>
                )}
                <p className="text-sm text-muted-foreground mt-2">
                  Scan to call the contract's payOrderWithToken function
                </p>
              </div>

              <Separator />

              {/* Manual Payment Data */}
              <div>
                <h3 className="font-semibold mb-2">Token Contract Transaction Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Contract Address:</span>
                    <span className="font-mono text-xs">
                      {CONTRACT_ADDRESS.slice(0, 10)}...{CONTRACT_ADDRESS.slice(-6)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Function:</span>
                    <span className="font-mono text-xs">payOrderWithToken({orderId})</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Token Address:</span>
                    <span className="font-mono text-xs">
                      {tokenAddress === "Native Token (HBAR)" ? tokenAddress : `${tokenAddress?.slice(0, 6)}...${tokenAddress?.slice(-4)}`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Amount (Tokens):</span>
                    <span className="font-semibold">{order.amount} Tokens</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Network:</span>
                    <span className="text-xs">Hedera Testnet (Chain ID: 296)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Escrow:</span>
                    <span className="text-xs">Tokens held until completion</span>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button
                    variant="outline"
                    onClick={copyPaymentData}
                    className="flex-1"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Contract Data
                  </Button>
                  <Button
                    variant="outline"
                    onClick={copyMetaMaskUri}
                    className="flex-1"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Contract URI
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Payment Status */}
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  After token payment, the tokens will be held in escrow until the order is completed and released by the client.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  )
}