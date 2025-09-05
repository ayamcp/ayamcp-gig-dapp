"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Filter, Star, Clock, Loader2, Grid, List } from "lucide-react"
import { contractService } from "@/lib/contract-service"
import { Gig, GIG_CATEGORIES } from "@/types/gig"

export default function BrowsePage() {
  const [gigs, setGigs] = useState<Gig[]>([])
  const [filteredGigs, setFilteredGigs] = useState<Gig[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [priceFilter, setPriceFilter] = useState<string>("all")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

  useEffect(() => {
    loadAllGigs()
  }, [])

  useEffect(() => {
    filterGigs()
  }, [gigs, searchQuery, selectedCategory, priceFilter])

  const loadAllGigs = async () => {
    try {
      setIsLoading(true)
      const activeGigIds = await contractService.getAllActiveGigs()
      
      const gigsData = await Promise.all(
        activeGigIds.map(async (id) => {
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
      console.error("Error loading gigs:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const filterGigs = () => {
    let filtered = [...gigs]

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(gig =>
        gig.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        gig.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        gig.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }

    // Category filter
    if (selectedCategory !== "all") {
      filtered = filtered.filter(gig => gig.category === selectedCategory)
    }

    // Price filter
    if (priceFilter !== "all") {
      filtered = filtered.filter(gig => {
        const price = parseFloat(gig.price)
        switch (priceFilter) {
          case "under-10":
            return price < 10
          case "10-50":
            return price >= 10 && price <= 50
          case "50-100":
            return price >= 50 && price <= 100
          case "over-100":
            return price > 100
          default:
            return true
        }
      })
    }

    setFilteredGigs(filtered)
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const clearFilters = () => {
    setSearchQuery("")
    setSelectedCategory("all")
    setPriceFilter("all")
  }

  const GridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredGigs.map((gig) => (
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
  )

  const ListView = () => (
    <div className="space-y-4">
      {filteredGigs.map((gig) => (
        <Card key={gig.id} className="hover:shadow-lg transition-shadow">
          <div className="flex">
            <div className="flex-1 p-6">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-xl">{gig.title}</h3>
                <Badge variant="secondary" className="text-lg px-3 py-1">
                  {gig.price} HBAR
                </Badge>
              </div>
              
              <p className="text-muted-foreground mb-4 line-clamp-2">
                {gig.description}
              </p>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-sm text-muted-foreground">
                    by {formatAddress(gig.seller)}
                  </div>
                  <Badge variant="outline">{gig.category}</Badge>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{gig.deliveryTime}</span>
                  </div>
                </div>
                
                <Button>View Details</Button>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Browse All Services</h1>
          <p className="text-muted-foreground">
            Discover professional services from our community of skilled providers
          </p>
        </div>

        {/* Filters */}
        <div className="mb-8 bg-muted/30 p-6 rounded-lg">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search gigs, skills, or keywords..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Category Filter */}
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full lg:w-[200px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {GIG_CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Price Filter */}
            <Select value={priceFilter} onValueChange={setPriceFilter}>
              <SelectTrigger className="w-full lg:w-[150px]">
                <SelectValue placeholder="Any Price" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any Price</SelectItem>
                <SelectItem value="under-10">Under 10 HBAR</SelectItem>
                <SelectItem value="10-50">10-50 HBAR</SelectItem>
                <SelectItem value="50-100">50-100 HBAR</SelectItem>
                <SelectItem value="over-100">Over 100 HBAR</SelectItem>
              </SelectContent>
            </Select>

            {/* Clear Filters */}
            <Button variant="outline" onClick={clearFilters}>
              <Filter className="h-4 w-4 mr-2" />
              Clear
            </Button>
          </div>
        </div>

        {/* Results Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground">
              {isLoading ? "Loading..." : `${filteredGigs.length} services found`}
            </span>
            {(searchQuery || selectedCategory !== "all" || priceFilter !== "all") && (
              <Badge variant="outline">Filtered</Badge>
            )}
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-2 border rounded-md p-1">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : filteredGigs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              {gigs.length === 0 
                ? "No gigs available yet. Be the first to post one!" 
                : "No gigs match your current filters."}
            </p>
            {gigs.length === 0 ? (
              <Button asChild>
                <a href="/post-gig">Post Your First Gig</a>
              </Button>
            ) : (
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <>
            {viewMode === "grid" ? <GridView /> : <ListView />}
          </>
        )}
      </main>
      <Footer />
    </div>
  )
}