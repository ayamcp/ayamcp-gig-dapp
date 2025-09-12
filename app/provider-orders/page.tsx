"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { CheckCircle, Clock, Loader2, Package, DollarSign, User, Calendar, AlertCircle, FileText, Send } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { contractService } from "@/lib/contract-service"
import { Order } from "@/types/gig"
import { ProtectedRoute } from "@/components/protected-route"
import { ethers } from "ethers"

interface ExtendedOrder extends Order {
  gigTitle: string
  gigCategory: string
  deliverable?: string
}

export default function ProviderOrdersPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [orders, setOrders] = useState<ExtendedOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [completingOrderId, setCompletingOrderId] = useState<string | null>(null)
  const [userAddress, setUserAddress] = useState<string>("")
  const [deliverables, setDeliverables] = useState<{[orderId: string]: string}>({})
  const [showDeliverableInput, setShowDeliverableInput] = useState<{[orderId: string]: boolean}>({})
  const [deliverableError, setDeliverableError] = useState<{[orderId: string]: string}>({})

  useEffect(() => {
    loadProviderOrders()
  }, [])

  const loadProviderOrders = async () => {
    try {
      setIsLoading(true)
      
      // Get user's address
      if (typeof window !== "undefined" && window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum)
        const signer = await provider.getSigner()
        const address = await signer.getAddress()
        setUserAddress(address)
        
        // Get provider orders using the new helper function
        const providerOrdersData = await contractService.getProviderOrders(address)
        const providerOrders: ExtendedOrder[] = []
        
        for (const order of providerOrdersData) {
          try {
            // Get gig details for additional info
            const gig = await contractService.getGig(parseInt(order.gigId))
            
            providerOrders.push({
              ...order,
              gigTitle: gig.title,
              gigCategory: gig.category
            })
          } catch (error) {
            console.error(`Error loading gig details for order ${order.id}:`, error)
            // Still add the order even if we can't get gig details
            providerOrders.push({
              ...order,
              gigTitle: `Order #${order.id}`,
              gigCategory: "Unknown"
            })
          }
        }
        setOrders(providerOrders)
      }
      
    } catch (error) {
      console.error("Error loading provider orders:", error)
      toast({
        title: "Error",
        description: "Failed to load your orders",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCompleteOrder = async (orderId: string) => {
    const deliverable = deliverables[orderId]
    
    // Validate deliverable
    if (!deliverable || deliverable.trim().length === 0) {
      setDeliverableError({
        ...deliverableError,
        [orderId]: "Deliverable description is required"
      })
      return
    }
    
    if (deliverable.trim().length < 10) {
      setDeliverableError({
        ...deliverableError,
        [orderId]: "Deliverable description must be at least 10 characters"
      })
      return
    }
    
    try {
      setCompletingOrderId(orderId)
      
      console.log(`[PROVIDER] Completing order ${orderId} with deliverable:`, deliverable)
      
      toast({
        title: "Processing",
        description: "Please confirm the transaction to mark this order as complete...",
      })
      
      const tx = await contractService.completeOrder(parseInt(orderId), deliverable.trim())
      
      toast({
        title: "Transaction Submitted",
        description: `Transaction hash: ${tx.hash.slice(0, 10)}...`,
      })
      
      // Wait for confirmation
      const receipt = await tx.wait()
      
      if (receipt?.status === 1) {
        toast({
          title: "Order Completed! ✅",
          description: "The order has been marked as complete with your deliverable. The client can now review and release payment.",
        })
        
        // Clear the deliverable input and hide it
        setDeliverables({
          ...deliverables,
          [orderId]: ""
        })
        setShowDeliverableInput({
          ...showDeliverableInput,
          [orderId]: false
        })
        setDeliverableError({
          ...deliverableError,
          [orderId]: ""
        })
        
        // Refresh orders
        await loadProviderOrders()
      } else {
        throw new Error("Transaction failed")
      }
      
    } catch (error: any) {
      console.error("Error completing order:", error)
      
      let errorMessage = "Failed to complete order"
      if (error.code === "ACTION_REJECTED" || error.code === 4001) {
        errorMessage = "Transaction was rejected by user"
      } else if (error.message?.includes("Deliverable cannot be empty")) {
        errorMessage = "Please provide a deliverable description"
      } else if (error.message?.includes("Order must be paid")) {
        errorMessage = "Order must be paid before it can be completed"
      } else if (error.message) {
        errorMessage = error.message
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setCompletingOrderId(null)
    }
  }

  const getOrderStatusBadge = (order: ExtendedOrder) => {
    if (!order.isPaid) {
      return <Badge variant="secondary">Awaiting Payment</Badge>
    } else if (order.isPaid && !order.isCompleted) {
      return <Badge variant="default">In Progress</Badge>
    } else if (order.isCompleted && !order.paymentReleased) {
      return <Badge variant="outline">Completed - Awaiting Release</Badge>
    } else if (order.paymentReleased) {
      return <Badge variant="default" className="bg-green-500">Payment Released</Badge>
    }
  }

  const getOrderActions = (order: ExtendedOrder) => {
    if (!order.isPaid) {
      return (
        <div className="text-sm text-muted-foreground">
          <AlertCircle className="h-4 w-4 inline mr-1" />
          Waiting for client payment
        </div>
      )
    } else if (order.isPaid && !order.isCompleted) {
      return (
        <div className="space-y-2">
          {!showDeliverableInput[order.id] ? (
            <Button
              onClick={() => setShowDeliverableInput({...showDeliverableInput, [order.id]: true})}
              disabled={completingOrderId === order.id}
            >
              <FileText className="h-4 w-4 mr-2" />
              Add Deliverable & Complete
            </Button>
          ) : (
            <div className="space-y-2">
              <div>
                <Label htmlFor={`deliverable-${order.id}`} className="text-sm font-medium">
                  Deliverable Description *
                </Label>
                <Textarea
                  id={`deliverable-${order.id}`}
                  placeholder="Describe what you've delivered (links, files, descriptions, etc.)"
                  value={deliverables[order.id] || ""}
                  onChange={(e) => {
                    setDeliverables({...deliverables, [order.id]: e.target.value})
                    // Clear error when user starts typing
                    if (deliverableError[order.id]) {
                      setDeliverableError({...deliverableError, [order.id]: ""})
                    }
                  }}
                  className="min-h-[80px] text-sm"
                />
                {deliverableError[order.id] && (
                  <p className="text-red-500 text-xs mt-1">{deliverableError[order.id]}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleCompleteOrder(order.id)}
                  disabled={completingOrderId === order.id}
                >
                  {completingOrderId === order.id ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Completing...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-1" />
                      Submit & Complete
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowDeliverableInput({...showDeliverableInput, [order.id]: false})
                    setDeliverableError({...deliverableError, [order.id]: ""})
                  }}
                  disabled={completingOrderId === order.id}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )
    } else if (order.isCompleted && !order.paymentReleased) {
      return (
        <div className="text-sm text-muted-foreground">
          <Clock className="h-4 w-4 inline mr-1" />
          Waiting for client to release payment
        </div>
      )
    } else {
      return (
        <div className="text-sm text-green-600 font-medium">
          <CheckCircle className="h-4 w-4 inline mr-1" />
          Order Complete & Paid
        </div>
      )
    }
  }

  // Filter orders by status
  const pendingPaymentOrders = orders.filter(order => !order.isPaid)
  const inProgressOrders = orders.filter(order => order.isPaid && !order.isCompleted)
  const completedOrders = orders.filter(order => order.isCompleted && !order.paymentReleased)
  const paymentReleasedOrders = orders.filter(order => order.paymentReleased)

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background">
          <Header />
          <main className="container max-w-6xl mx-auto px-4 py-8">
            <div className="flex items-center justify-center min-h-[400px]">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          </main>
          <Footer />
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container max-w-6xl mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Provider Dashboard</h1>
            <p className="text-muted-foreground">
              Manage your orders and track your earnings
            </p>
            {userAddress && (
              <p className="text-xs text-muted-foreground mt-2">
                Provider: {userAddress.slice(0, 6)}...{userAddress.slice(-4)}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Orders</p>
                    <p className="text-2xl font-bold">{orders.length}</p>
                  </div>
                  <Package className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Orders</p>
                    <p className="text-2xl font-bold">{inProgressOrders.length}</p>
                  </div>
                  <Clock className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Earnings</p>
                    <p className="text-2xl font-bold">
                      {paymentReleasedOrders.reduce((sum, order) => sum + parseFloat(order.amount), 0).toFixed(2)} HBAR
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="in-progress" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="pending">
                Pending Payment ({pendingPaymentOrders.length})
              </TabsTrigger>
              <TabsTrigger value="in-progress">
                In Progress ({inProgressOrders.length})
              </TabsTrigger>
              <TabsTrigger value="completed">
                Awaiting Release ({completedOrders.length})
              </TabsTrigger>
              <TabsTrigger value="payment-released">
                Payment Released ({paymentReleasedOrders.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending">
              <div className="space-y-4">
                {pendingPaymentOrders.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No pending orders</h3>
                      <p className="text-muted-foreground">
                        Orders waiting for payment will appear here
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  pendingPaymentOrders.map((order) => (
                    <OrderCard key={order.id} order={order} getOrderStatusBadge={getOrderStatusBadge} getOrderActions={getOrderActions} />
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="in-progress">
              <div className="space-y-4">
                {inProgressOrders.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No active orders</h3>
                      <p className="text-muted-foreground">
                        Orders you need to work on will appear here
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  inProgressOrders.map((order) => (
                    <OrderCard key={order.id} order={order} getOrderStatusBadge={getOrderStatusBadge} getOrderActions={getOrderActions} />
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="completed">
              <div className="space-y-4">
                {completedOrders.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No orders awaiting release</h3>
                      <p className="text-muted-foreground">
                        Orders you've completed that are waiting for client payment release will appear here
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  completedOrders.map((order) => (
                    <OrderCard key={order.id} order={order} getOrderStatusBadge={getOrderStatusBadge} getOrderActions={getOrderActions} />
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="payment-released">
              <div className="space-y-4">
                {paymentReleasedOrders.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No payments released yet</h3>
                      <p className="text-muted-foreground">
                        Orders where payment has been released to you will appear here
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  paymentReleasedOrders.map((order) => (
                    <OrderCard key={order.id} order={order} getOrderStatusBadge={getOrderStatusBadge} getOrderActions={getOrderActions} />
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </main>
        <Footer />
      </div>
    </ProtectedRoute>
  )
}

function OrderCard({ 
  order, 
  getOrderStatusBadge, 
  getOrderActions 
}: { 
  order: ExtendedOrder
  getOrderStatusBadge: (order: ExtendedOrder) => JSX.Element
  getOrderActions: (order: ExtendedOrder) => JSX.Element 
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{order.gigTitle}</CardTitle>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary">{order.gigCategory}</Badge>
              {getOrderStatusBadge(order)}
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{order.amount} HBAR</p>
            <p className="text-sm text-muted-foreground">Order #{order.id}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Client:</span>
              <span className="font-mono">{order.client.slice(0, 6)}...{order.client.slice(-4)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Created:</span>
              <span>{order.createdAt.toLocaleDateString()}</span>
            </div>
          </div>
          
          {/* Show deliverable if order is completed and has deliverable */}
          {order.isCompleted && order.deliverable && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Deliverable Submitted:</span>
                </div>
                <div className="bg-muted/50 p-3 rounded-md">
                  <p className="text-sm whitespace-pre-wrap">{order.deliverable}</p>
                </div>
              </div>
            </>
          )}
          
          <Separator />
          
          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              Payment Status: {order.isPaid ? "✅ Paid" : "⏳ Pending"}
              {order.paymentReleased && " | ✅ Released"}
            </div>
            <div>
              {getOrderActions(order)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}