"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Star, Clock, Loader2 } from "lucide-react"
import { contractService } from "@/lib/contract-service"
import { Gig } from "@/types/gig"

export function FeaturedGigs() {
  const [gigs, setGigs] = useState<Gig[]>([])
  const [isLoading, setIsLoading] = useState(true)

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
    } catch (error) {
      console.error("Error loading featured gigs:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
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
                    <Badge variant="secondary">{gig.price} HBAR</Badge>
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

                <CardFooter>
                  <Button className="w-full">View Details</Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
