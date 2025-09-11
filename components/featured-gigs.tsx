"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Star, Clock, Loader2, ShoppingCart } from "lucide-react"
import { contractService } from "@/lib/contract-service"
import { Gig } from "@/types/gig"
import { GigDetailsModal } from "@/components/gig-details-modal"
import { useToast } from "@/hooks/use-toast"

export function FeaturedGigs() {
  const router = useRouter()
  const { toast } = useToast()
  const [gigs, setGigs] = useState<Gig[]>([])
  const [gigOrderCounts, setGigOrderCounts] = useState<{[key: string]: number}>({})
  const [selectedGig, setSelectedGig] = useState<Gig | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [orderingGigId, setOrderingGigId] = useState<string | null>(null)

  useEffect(() => {
    loadFeaturedGigs()
  }, [])

  const loadFeaturedGigs = async () => {
    try {
      const activeGigIds = await contractService.getAllActiveGigs()
      const gigsData = await Promise.all(
        activeGigIds.slice(0, 6).map(async (id) => {
          try {
            return await contractService.getGig(id)
          } catch (error) {
            console.error(`Error loading gig ${id}:`, error)
            return null
          }
        })
      )
      
      const validGigs = gigsData.filter((gig): gig is Gig => gig !== null)
      setGigs(validGigs)

      // Load order counts for each gig
      const orderCounts: {[key: string]: number} = {}
      await Promise.all(
        validGigs.map(async (gig) => {
          try {
            const count = await contractService.getActiveOrdersCount(parseInt(gig.id))
            orderCounts[gig.id] = count
          } catch (error) {
            console.error(`Error loading order count for gig ${gig.id}:`, error)
            orderCounts[gig.id] = 0
          }
        })
      )
      setGigOrderCounts(orderCounts)
    } catch (error) {
      console.error("Error loading featured gigs:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const handleViewDetails = (gig: Gig) => {
    setSelectedGig(gig)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedGig(null)
  }

  const handleOrderNow = async (gig: Gig) => {
    try {
      setOrderingGigId(gig.id)
      
      toast({
        title: "Creating Order",
        description: "Please confirm the transaction in your wallet...",
      })

      // Create order on blockchain
      const tx = await contractService.orderGig(parseInt(gig.id))
      
      toast({
        title: "Transaction Submitted",
        description: "Creating your order...",
      })

      // Wait for transaction confirmation
      const receipt = await tx.wait()
      
      if (receipt?.status === 1) {
        // Extract the actual order ID from the OrderCreated event
        const orderId = contractService.parseOrderCreatedEvent(receipt)
        
        if (orderId) {
          toast({
            title: "Order Created!",
            description: `Order #${orderId} created. Redirecting to payment page...`,
          })

          // Redirect to payment page with the actual order ID
          router.push(`/payment/${orderId}`)
        } else {
          // Fallback if we can't parse the order ID
          console.warn("Could not extract orderId from transaction logs")
          toast({
            title: "Order Created",
            description: "Your order was created successfully. Please check your orders page.",
          })
          router.push('/profile')
        }
      } else {
        throw new Error("Transaction failed")
      }
    } catch (error: any) {
      console.error("Order creation error:", error)
      
      let errorMessage = "Failed to create order"
      if (error.code === "ACTION_REJECTED") {
        errorMessage = "Transaction was rejected by user"
      } else if (error.message) {
        errorMessage = error.message
      }

      toast({
        title: "Order Creation Failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setOrderingGigId(null)
    }
  }

  return (
    <section className="py-16 px-4 bg-muted/30">
      <div className="container max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Featured Services</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Discover top-rated services from our community of skilled professionals
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : gigs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No gigs available yet. Be the first to post one!</p>
            <Button className="mt-4" asChild>
              <a href="/post-gig">Post Your First Gig</a>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {gigs.map((gig) => (
              <Card key={gig.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-lg line-clamp-2">{gig.title}</h3>
                    <div className="flex flex-col gap-1 items-end">
                      <Badge variant="secondary">{gig.price} HBAR</Badge>
                      {gigOrderCounts[gig.id] > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {gigOrderCounts[gig.id]} active order{gigOrderCounts[gig.id] !== 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{gig.description}</p>
                  <div className="text-xs text-muted-foreground">
                    by {formatAddress(gig.seller)}
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="flex flex-wrap gap-1 mb-4">
                    <Badge variant="outline" className="text-xs">
                      {gig.category}
                    </Badge>
                    {gig.tags.slice(0, 2).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {gig.tags.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{gig.tags.length - 2} more
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">New</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{gig.deliveryTime}</span>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => handleViewDetails(gig)}
                  >
                    View Details
                  </Button>
                  <Button 
                    className="flex-1"
                    onClick={() => handleOrderNow(gig)}
                    disabled={orderingGigId === gig.id}
                  >
                    {orderingGigId === gig.id ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating Order...
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Order Now
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {/* Gig Details Modal */}
        <GigDetailsModal
          gig={selectedGig}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          activeOrdersCount={selectedGig ? gigOrderCounts[selectedGig.id] || 0 : 0}
        />
      </div>
    </section>
  )
}
