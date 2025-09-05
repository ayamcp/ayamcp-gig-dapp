import { Header } from "@/components/header"
import { Hero } from "@/components/hero"
import { FeaturedGigs } from "@/components/featured-gigs"
import { HowItWorks } from "@/components/how-it-works"
import { Footer } from "@/components/footer"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Hero />
        <FeaturedGigs />
        <HowItWorks />
      </main>
      <Footer />
    </div>
  )
}
