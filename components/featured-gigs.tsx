import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Star, Clock } from "lucide-react"

const mockGigs = [
  {
    id: 1,
    title: "Smart Contract Development",
    description: "I will develop secure and efficient smart contracts for your DeFi project",
    price: "0.5 ETH",
    rating: 4.9,
    reviews: 127,
    deliveryTime: "3 days",
    seller: "0x1234...5678",
    tags: ["Solidity", "DeFi", "Smart Contracts"],
  },
  {
    id: 2,
    title: "Web3 Frontend Development",
    description: "I will create responsive dApp interfaces with wallet integration",
    price: "0.3 ETH",
    rating: 4.8,
    reviews: 89,
    deliveryTime: "5 days",
    seller: "0x9876...4321",
    tags: ["React", "Web3", "Frontend"],
  },
  {
    id: 3,
    title: "NFT Collection Design",
    description: "I will design unique NFT collections with metadata and rarity traits",
    price: "0.2 ETH",
    rating: 4.7,
    reviews: 156,
    deliveryTime: "7 days",
    seller: "0x5555...9999",
    tags: ["NFT", "Design", "Art"],
  },
]

export function FeaturedGigs() {
  return (
    <section className="py-16 px-4 bg-muted/30">
      <div className="container max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Featured Services</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Discover top-rated services from our community of skilled professionals
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockGigs.map((gig) => (
            <Card key={gig.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-lg line-clamp-2">{gig.title}</h3>
                  <Badge variant="secondary">{gig.price}</Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{gig.description}</p>
              </CardHeader>

              <CardContent>
                <div className="flex flex-wrap gap-1 mb-4">
                  {gig.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{gig.rating}</span>
                    <span className="text-muted-foreground">({gig.reviews})</span>
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
      </div>
    </section>
  )
}
