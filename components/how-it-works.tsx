import { Card, CardContent } from "@/components/ui/card"
import { Search, MessageSquare, CreditCard, CheckCircle } from "lucide-react"

const steps = [
  {
    icon: Search,
    title: "Browse or Post",
    description: "Find services you need or post your own gig to offer your skills",
  },
  {
    icon: MessageSquare,
    title: "Connect & Discuss",
    description: "Chat with service providers to discuss requirements and timeline",
  },
  {
    icon: CreditCard,
    title: "Secure Payment",
    description: "Pay securely through smart contracts with built-in escrow protection",
  },
  {
    icon: CheckCircle,
    title: "Get Results",
    description: "Receive high-quality work and release payment when satisfied",
  },
]

export function HowItWorks() {
  return (
    <section className="py-16 px-4">
      <div className="container max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">How It Works</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Simple steps to get started with our decentralized marketplace
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, index) => (
            <Card key={index} className="text-center">
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <step.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
