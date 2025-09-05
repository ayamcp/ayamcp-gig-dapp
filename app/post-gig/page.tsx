"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Plus, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { contractService } from "@/lib/contract-service"
import { CreateGigData, GIG_CATEGORIES, DELIVERY_OPTIONS } from "@/types/gig"
import { ProtectedRoute } from "@/components/protected-route"

export default function PostGigPage() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [tags, setTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState("")
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    price: "",
    deliveryTime: "",
    requirements: ""
  })

  const categories = GIG_CATEGORIES
  const deliveryOptions = DELIVERY_OPTIONS

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim()) && tags.length < 5) {
      setTags(prev => [...prev, newTag.trim()])
      setNewTag("")
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags(prev => prev.filter(tag => tag !== tagToRemove))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Validate form
      if (!formData.title || !formData.description || !formData.category || !formData.price) {
        throw new Error("Please fill in all required fields")
      }

      if (parseFloat(formData.price) <= 0) {
        throw new Error("Price must be greater than 0")
      }

      // Create gig through smart contract
      const tx = await contractService.createGig(
        formData.title,
        formData.description,
        formData.category,
        formData.price,
        formData.deliveryTime || "1 week",
        formData.requirements,
        tags
      )

      toast({
        title: "Transaction Submitted",
        description: "Your gig is being created on the blockchain...",
      })

      // Wait for transaction confirmation
      const receipt = await tx.wait()
      
      if (receipt?.status === 1) {
        toast({
          title: "Gig Posted Successfully!",
          description: "Your gig has been posted to the marketplace.",
        })

        // Reset form
        setFormData({
          title: "",
          description: "",
          category: "",
          price: "",
          deliveryTime: "",
          requirements: ""
        })
        setTags([])
      } else {
        throw new Error("Transaction failed")
      }

    } catch (error: any) {
      console.error("Error creating gig:", error)
      
      let errorMessage = "Failed to post gig"
      if (error.code === "ACTION_REJECTED") {
        errorMessage = "Transaction was rejected by user"
      } else if (error.code === "INSUFFICIENT_FUNDS") {
        errorMessage = "Insufficient funds for transaction"
      } else if (error.reason) {
        errorMessage = error.reason
      } else if (error.message) {
        errorMessage = error.message
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container max-w-4xl mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Post a New Gig</h1>
            <p className="text-muted-foreground">
              Share your skills and start earning on the decentralized marketplace
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Gig Details</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title">Gig Title *</Label>
                  <Input
                    id="title"
                    placeholder="I will create a professional website for you"
                    value={formData.title}
                    onChange={(e) => handleInputChange("title", e.target.value)}
                    maxLength={100}
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.title.length}/100 characters
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe what you'll deliver, your experience, and why clients should choose you..."
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    rows={6}
                    maxLength={1000}
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.description.length}/1000 characters
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Select onValueChange={(value) => handleInputChange("category", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="price">Price (HBAR) *</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="50.00"
                      value={formData.price}
                      onChange={(e) => handleInputChange("price", e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deliveryTime">Delivery Time</Label>
                  <Select onValueChange={(value) => handleInputChange("deliveryTime", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select delivery time" />
                    </SelectTrigger>
                    <SelectContent>
                      {deliveryOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tags">Tags (up to 5)</Label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      placeholder="Add a tag"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                      maxLength={20}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addTag}
                      disabled={tags.length >= 5}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="requirements">Requirements from Buyer</Label>
                  <Textarea
                    id="requirements"
                    placeholder="What information do you need from the buyer to get started?"
                    value={formData.requirements}
                    onChange={(e) => handleInputChange("requirements", e.target.value)}
                    rows={4}
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.requirements.length}/500 characters
                  </p>
                </div>

                <div className="flex gap-4 pt-4">
                  <Button type="submit" disabled={isLoading} className="flex-1">
                    {isLoading ? "Posting Gig..." : "Post Gig"}
                  </Button>
                  <Button type="button" variant="outline" className="flex-1">
                    Save as Draft
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    </ProtectedRoute>
  )
}