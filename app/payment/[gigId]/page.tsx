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
import { QrCode, Copy, ArrowLeft, CheckCircle, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { contractService } from "@/lib/contract-service"
import { CONTRACT_ADDRESS } from "@/lib/hedera-config"
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
  const gigId = params.gigId as string

  const [gig, setGig] = useState<GigData | null>(null)
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentHash, setPaymentHash] = useState<string>("")

  useEffect(() => {
    if (gigId) {
      loadGigData()
    }
  }, [gigId])

  const loadGigData = async () => {
    try {
      setIsLoading(true)
      const gigData = await contractService.getGig(parseInt(gigId))
      setGig(gigData)
      
      if (gigData) {
        await generateQRCode(gigData)
      }
    } catch (error) {
      console.error("Error loading gig:", error)
      toast({
        title: "Error",
        description: "Failed to load gig data",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const generateQRCode = async (gigData: GigData) => {
    try {
      // Create the transaction data for MetaMask scanning
      const orderGigData = new ethers.Interface([
        "function orderGig(uint256 _gigId)"
      ]).encodeFunctionData("orderGig", [parseInt(gigId)])

      // Create MetaMask deep link format
      const metamaskUrl = `ethereum:${CONTRACT_ADDRESS}@296/orderGig?uint256=${gigId}&value=${ethers.parseEther(gigData.price).toString()}`
      
      // Alternative format for better compatibility
      const transactionData = {
        to: CONTRACT_ADDRESS,
        value: ethers.parseEther(gigData.price).toString(),
        data: orderGigData,
        chainId: 296 // Hedera Testnet
      }

      // Use the Ethereum URL scheme for QR code
      const qrUrl = await QRCode.toDataURL(metamaskUrl, {
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

  const copyTransactionData = async () => {
    if (!gig) return

    const transactionData = {
      to: CONTRACT_ADDRESS,
      value: ethers.parseEther(gig.price).toString(),
      data: new ethers.Interface([
        "function orderGig(uint256 _gigId)"
      ]).encodeFunctionData("orderGig", [parseInt(gigId)]),
      chainId: 296
    }

    try {
      await navigator.clipboard.writeText(JSON.stringify(transactionData, null, 2))
      toast({
        title: "Copied!",
        description: "Transaction data copied to clipboard",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy transaction data",
        variant: "destructive",
      })
    }
  }

  const handleDirectPayment = async () => {
    if (!gig) return

    try {
      setIsProcessing(true)
      const tx = await contractService.orderGig(parseInt(gigId))
      
      toast({
        title: "Payment Submitted",
        description: "Your payment is being processed on the blockchain...",
      })

      const receipt = await tx.wait()
      
      if (receipt?.status === 1) {
        setPaymentHash(receipt.hash)
        toast({
          title: "Payment Successful!",
          description: "Your order has been placed successfully.",
        })
      } else {
        throw new Error("Transaction failed")
      }
    } catch (error: any) {
      console.error("Payment error:", error)
      
      let errorMessage = "Payment failed"
      if (error.code === "ACTION_REJECTED") {
        errorMessage = "Payment was rejected by user"
      } else if (error.code === "INSUFFICIENT_FUNDS") {
        errorMessage = "Insufficient funds for payment"
      } else if (error.message) {
        errorMessage = error.message
      }

      toast({
        title: "Payment Error",
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

  if (!gig) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container max-w-4xl mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Gig Not Found</h1>
            <Button onClick={() => router.back()}>Go Back</Button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (paymentHash) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container max-w-4xl mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6">
              <div className="text-center">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h1 className="text-2xl font-bold mb-2">Payment Successful!</h1>
                <p className="text-muted-foreground mb-4">
                  Your order has been placed successfully.
                </p>
                <div className="space-y-2">
                  <p className="text-sm">Transaction Hash:</p>
                  <p className="text-xs font-mono bg-muted p-2 rounded break-all">
                    {paymentHash}
                  </p>
                </div>
                <div className="flex gap-2 mt-6">
                  <Button onClick={() => router.push("/browse")} className="flex-1">
                    Browse More Gigs
                  </Button>
                  <Button onClick={() => router.push("/dashboard")} variant="outline" className="flex-1">
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
          <h1 className="text-3xl font-bold mb-2">Payment for Gig</h1>
          <p className="text-muted-foreground">
            Complete your purchase by scanning the QR code with MetaMask
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Gig Details */}
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
                  <span>Delivery Time:</span>
                  <span>{gig.deliveryTime}</span>
                </div>
                <div className="flex justify-between">
                  <span>Provider:</span>
                  <span className="font-mono text-xs">
                    {gig.seller.slice(0, 6)}...{gig.seller.slice(-4)}
                  </span>
                </div>
              </div>

              <Separator />
              
              <div className="flex justify-between text-lg font-semibold">
                <span>Total Amount:</span>
                <span>{gig.price} HBAR</span>
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
                  Open MetaMask mobile app and scan this QR code
                </p>
              </div>

              <Separator />

              {/* Manual Transaction Data */}
              <div>
                <h3 className="font-semibold mb-2">Manual Transaction</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Copy transaction data for manual input
                </p>
                <Button
                  variant="outline"
                  onClick={copyTransactionData}
                  className="w-full"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Transaction Data
                </Button>
              </div>

              <Separator />

              {/* Direct Payment Button */}
              <div>
                <h3 className="font-semibold mb-2">Direct Payment</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Pay directly if you have MetaMask extension
                </p>
                <Button
                  onClick={handleDirectPayment}
                  disabled={isProcessing}
                  className="w-full"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    `Pay ${gig.price} HBAR`
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  )
}