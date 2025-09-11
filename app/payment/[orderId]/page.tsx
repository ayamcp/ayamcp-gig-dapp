"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import QRCode from "qrcode"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { QrCode, Copy, ArrowLeft, CheckCircle, Loader2, Clock, User } from "lucide-react"
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
}

export default function PaymentPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const orderId = params.orderId as string

  const [order, setOrder] = useState<Order | null>(null)
  const [gig, setGig] = useState<GigData | null>(null)
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentHash, setPaymentHash] = useState<string>("")

  useEffect(() => {
    if (orderId) {
      loadOrderData()
    }
  }, [orderId])

  const loadOrderData = async () => {
    try {
      setIsLoading(true)
      
      // First get the order data
      const orderData = await contractService.getOrder(parseInt(orderId))
      setOrder(orderData)
      
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
      setIsLoading(false)
    }
  }

  const generateQRCode = async (orderData: Order, gigData: GigData) => {
    try {
      // For MetaMask compatibility, create a transaction data object
      // MetaMask can read QR codes containing transaction parameters
      const transactionData = {
        to: orderData.provider,
        value: ethers.parseEther(orderData.amount).toString(),
        data: ethers.hexlify(ethers.toUtf8Bytes(`Order ${orderId}: ${gigData.title}`)),
        chainId: 296, // Hedera Testnet chain ID
        gasLimit: "21000" // Standard transfer gas limit
      }
      
      // Create a MetaMask-compatible transaction request
      // Format: ethereum:0x<address>@<chainId>?value=<value>&data=<data>
      const ethereumUri = `ethereum:${orderData.provider}@296?value=${transactionData.value}&data=${transactionData.data}`
      
      // Generate QR code for the Ethereum URI (MetaMask compatible)
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

    const paymentData = {
      recipient: order.provider,
      amount: order.amount,
      currency: "HBAR",
      memo: `Order ${orderId}: ${gig.title}`,
      network: "Hedera Testnet"
    }

    try {
      await navigator.clipboard.writeText(JSON.stringify(paymentData, null, 2))
      toast({
        title: "Copied!",
        description: "Payment data copied to clipboard",
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
    
    const transactionData = {
      to: order.provider,
      value: ethers.parseEther(order.amount).toString(),
      data: ethers.hexlify(ethers.toUtf8Bytes(`Order ${orderId}: ${gig.title}`)),
      chainId: 296
    }
    
    const ethereumUri = `ethereum:${order.provider}@296?value=${transactionData.value}&data=${transactionData.data}`

    try {
      await navigator.clipboard.writeText(ethereumUri)
      toast({
        title: "Copied!",
        description: "MetaMask transaction URI copied to clipboard",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy transaction URI",
        variant: "destructive",
      })
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
                  This order has already been paid for.
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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold mb-2">Payment for Order #{orderId}</h1>
          <p className="text-muted-foreground">
            Complete your payment by scanning the QR code or using the payment details below
          </p>
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
                <span>{order.amount} HBAR</span>
              </div>
              
              {/* Show price comparison if different */}
              {parseFloat(order.amount) !== parseFloat(gig.price) && (
                <div className="text-sm text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Original Gig Price:</span>
                    <span>{gig.price} HBAR</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Methods */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                Payment Options
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* QR Code Section */}
              <div className="text-center">
                <h3 className="font-semibold mb-4">Scan with MetaMask</h3>
                {qrCodeUrl && (
                  <div className="inline-block p-4 bg-white rounded-lg">
                    <img 
                      src={qrCodeUrl} 
                      alt="Payment QR Code" 
                      className="w-48 h-48 mx-auto"
                    />
                  </div>
                )}
                <p className="text-sm text-muted-foreground mt-2">
                  Open MetaMask mobile app and scan this QR code to initiate payment
                </p>
              </div>

              <Separator />

              {/* Manual Payment Data */}
              <div>
                <h3 className="font-semibold mb-2">Manual Payment via MetaMask</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Recipient Address:</span>
                    <span className="font-mono text-xs">
                      {order.provider.slice(0, 10)}...{order.provider.slice(-6)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Amount (Wei):</span>
                    <span className="font-mono text-xs">{ethers.parseEther(order.amount).toString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Amount (HBAR):</span>
                    <span className="font-semibold">{order.amount} HBAR</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Network:</span>
                    <span className="text-xs">Hedera Testnet (Chain ID: 296)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Data (Memo):</span>
                    <span className="text-xs">Order {orderId}: {gig.title.slice(0, 20)}...</span>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button
                    variant="outline"
                    onClick={copyPaymentData}
                    className="flex-1"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Payment Data
                  </Button>
                  <Button
                    variant="outline"
                    onClick={copyMetaMaskUri}
                    className="flex-1"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy MetaMask URI
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Payment Status */}
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  After payment, the funds will be held in escrow until the order is completed and released by the client.
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