import { Header } from "@/components/header"
import { Hero } from "@/components/hero"
import { FeaturedGigs } from "@/components/featured-gigs"
import { HowItWorks } from "@/components/how-it-works"
import { Footer } from "@/components/footer"
import { ContractInfo } from "@/components/contract-info"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Hero />
        <div className="container mx-auto px-4 py-8">
          <ContractInfo />
        </div>
        <FeaturedGigs />
        <HowItWorks />
      </main>
      <Footer />
    </div>
  )
}
