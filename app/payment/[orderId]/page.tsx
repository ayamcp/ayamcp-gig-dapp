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
      // Create direct payment URL for the specific order amount
      // This should be a direct HBAR transfer to the provider with order ID in memo
      const memo = `Order ${orderId}: ${gigData.title}`
      
      // Create Hedera payment URI for HashPack wallet
      const hbarAmount = orderData.amount
      const hederaPaymentUrl = `hbar://pay?to=${orderData.provider}&amount=${hbarAmount}&memo=${encodeURIComponent(memo)}`
      
      // Generate QR code for the Hedera payment URI
      const qrUrl = await QRCode.toDataURL(hederaPaymentUrl, {
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

  const copyHederaUri = async () => {
    if (!order || !gig) return
    
    const memo = `Order ${orderId}: ${gig.title}`
    const hederaPaymentUrl = `hbar://pay?to=${order.provider}&amount=${order.amount}&memo=${encodeURIComponent(memo)}`

    try {
      await navigator.clipboard.writeText(hederaPaymentUrl)
      toast({
        title: "Copied!",
        description: "Hedera payment URI copied to clipboard",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy Hedera URI",
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
              <div>
                <h3 className="font-semibold text-lg">{gig.title}</h3>
                <Badge variant="secondary" className="mt-1">
                  {gig.category}
                </Badge>
              </div>
              
              <p className="text-muted-foreground">{gig.description}</p>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Delivery Time:
                  </span>
                  <span>{gig.deliveryTime}</span>
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
                  <span>Order Created:</span>
                  <span className="text-sm">
                    {order.createdAt.toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Order ID:</span>
                  <span className="font-mono text-sm">#{orderId}</span>
                </div>
                <div className="flex justify-between">
                  <span>Status:</span>
                  <Badge variant={order.isPaid ? "default" : "secondary"}>
                    {order.isPaid ? "Paid" : "Pending Payment"}
                  </Badge>
                </div>
                {order.isPaid && order.isCompleted && (
                  <div className="flex justify-between">
                    <span>Payment Release:</span>
                    <Badge variant={order.paymentReleased ? "default" : "secondary"}>
                      {order.paymentReleased ? "Released" : "In Escrow"}
                    </Badge>
                  </div>
                )}
              </div>

              <Separator />
              
              <div className="flex justify-between text-lg font-semibold">
                <span>Total Amount:</span>
                <span>{order.amount} HBAR</span>
              </div>
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
                <h3 className="font-semibold mb-4">Scan with HashPack</h3>
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
                  Open HashPack mobile app and scan this QR code
                </p>
              </div>

              <Separator />

              {/* Manual Payment Data */}
              <div>
                <h3 className="font-semibold mb-2">Manual Payment</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Send to:</span>
                    <span className="font-mono text-xs">
                      {order.provider.slice(0, 10)}...{order.provider.slice(-6)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Amount:</span>
                    <span className="font-semibold">{order.amount} HBAR</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Memo:</span>
                    <span className="text-xs">Order {orderId}</span>
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
                    onClick={copyHederaUri}
                    className="flex-1"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy URI
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