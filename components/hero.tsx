import { Button } from "@/components/ui/button"
import { ArrowRight, Users, Briefcase, Shield } from "lucide-react"
import Link from "next/link"

export function Hero() {
  return (
    <section className="py-20 px-4">
      <div className="container max-w-6xl mx-auto text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-6 text-balance">
          Decentralized Freelance
          <span className="text-primary"> Marketplace</span>
        </h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto text-pretty">
          Connect with skilled professionals or offer your services on the blockchain. Secure, transparent, and powered
          by smart contracts.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <Button size="lg" asChild>
            <Link href="/browse">
              Browse Services
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href="/post-gig">Post a Gig</Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="flex flex-col items-center text-center">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Trusted Community</h3>
            <p className="text-sm text-muted-foreground">
              Connect with verified professionals and clients in our decentralized network
            </p>
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Secure Payments</h3>
            <p className="text-sm text-muted-foreground">
              Smart contract escrow ensures safe and transparent transactions
            </p>
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <Briefcase className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Quality Work</h3>
            <p className="text-sm text-muted-foreground">
              Find skilled professionals for any project, from design to development
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
