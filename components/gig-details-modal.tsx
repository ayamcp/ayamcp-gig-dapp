"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Star,
  Clock,
  QrCode,
  User,
  Calendar,
  DollarSign,
  Tag,
  FileText,
  CheckCircle,
  Loader2,
  TrendingUp,
  AlertCircle,
  Pause,
  XCircle,
  Activity
} from "lucide-react"
import { Gig } from "@/types/gig"
import { contractService } from "@/lib/contract-service"

interface GigDetailsModalProps {
  gig: Gig | null
  isOpen: boolean
  onClose: () => void
  activeOrdersCount: number
}

export function GigDetailsModal({ gig, isOpen, onClose, activeOrdersCount }: GigDetailsModalProps) {
  const [orders, setOrders] = useState<any[]>([])
  const [isLoadingOrders, setIsLoadingOrders] = useState(false)
  const [orderStats, setOrderStats] = useState({
    total: 0,
    completed: 0,
    inProgress: 0,
    awaitingPayment: 0,
    totalRevenue: 0
  })

  useEffect(() => {
    if (isOpen && gig) {
      loadGigOrders()
    }
  }, [isOpen, gig])

  const loadGigOrders = async () => {
    if (!gig) return

    try {
      setIsLoadingOrders(true)
      const gigOrders = await contractService.getGigOrders(parseInt(gig.id))
      setOrders(gigOrders)
      
      // Calculate order statistics
      const stats = gigOrders.reduce((acc, order) => {
        acc.total += 1
        acc.totalRevenue += parseFloat(order.amount)
        
        if (order.isPaid) {
          acc.completed += 1
        } else if (order.isCompleted) {
          acc.awaitingPayment += 1
        } else {
          acc.inProgress += 1
        }
        
        return acc
      }, {
        total: 0,
        completed: 0,
        inProgress: 0,
        awaitingPayment: 0,
        totalRevenue: 0
      })
      
      setOrderStats(stats)
    } catch (error) {
      console.error("Error loading gig orders:", error)
      setOrders([])
      setOrderStats({
        total: 0,
        completed: 0,
        inProgress: 0,
        awaitingPayment: 0,
        totalRevenue: 0
      })
    } finally {
      setIsLoadingOrders(false)
    }
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const getOrderStatusBadge = (order: any) => {
    if (order.isPaid) {
      return <Badge variant="default" className="text-xs">Completed</Badge>
    } else if (order.isCompleted) {
      return <Badge variant="secondary" className="text-xs">Awaiting Payment</Badge>
    } else {
      return <Badge variant="outline" className="text-xs">In Progress</Badge>
    }
  }

  if (!gig) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold pr-8">{gig.title}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <div>
              <h3 className="font-semibold text-lg mb-3">About This Gig</h3>
              <p className="text-muted-foreground leading-relaxed">{gig.description}</p>
            </div>

            {/* Requirements */}
            {gig.requirements && (
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Requirements
                </h3>
                <p className="text-muted-foreground">{gig.requirements}</p>
              </div>
            )}

            {/* Tags */}
            {gig.tags && gig.tags.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  Skills & Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {gig.tags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Order History */}
            <div>
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Order Activity
                {isLoadingOrders && <Loader2 className="h-4 w-4 animate-spin" />}
              </h3>
              
              {orders.length > 0 ? (
                <div className="space-y-3">
                  {orders.slice(0, 5).map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {order.client.slice(2, 4).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">
                            {formatAddress(order.client)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{order.amount} HBAR</span>
                        {getOrderStatusBadge(order)}
                      </div>
                    </div>
                  ))}
                  {orders.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center">
                      +{orders.length - 5} more orders
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No orders yet. Be the first to order this gig!
                </p>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Price Card */}
            <div className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{gig.price} HBAR</span>
                {activeOrdersCount > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {activeOrdersCount} active
                  </Badge>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4" />
                  <span>Delivery: {gig.deliveryTime}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span>New Seller</span>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Button asChild className="w-full">
                  <Link href={`/payment/${gig.id}`}>
                    <QrCode className="h-4 w-4 mr-2" />
                    Order Now
                  </Link>
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Safe payment via smart contract escrow
                </p>
              </div>
            </div>

            {/* Seller Info */}
            <div className="border rounded-lg p-4 space-y-4">
              <h4 className="font-semibold flex items-center gap-2">
                <User className="h-4 w-4" />
                About the Seller
              </h4>
              
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>
                    {gig.seller.slice(2, 4).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm">
                    {formatAddress(gig.seller)}
                  </p>
                  <p className="text-xs text-muted-foreground">Verified Provider</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Member since</span>
                  <span>{new Date(gig.createdAt || Date.now()).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Category</span>
                  <Badge variant="secondary" className="text-xs">{gig.category}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Network</span>
                  <span className="text-xs">{gig.network || 'Hedera Testnet'}</span>
                </div>
              </div>
            </div>

            {/* Additional Info */}
            <div className="border rounded-lg p-4 space-y-3">
              <h4 className="font-semibold text-sm">Payment & Delivery</h4>
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-3 w-3" />
                  <span>Secure escrow payment</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-3 w-3" />
                  <span>Delivery as promised or refund</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3" />
                  <span>Release payment when satisfied</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}