"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowRight, Sparkles, Users, Target } from "lucide-react"

export default function WelcomePage() {
  const [isStarting, setIsStarting] = useState(false)

  const handleGetStarted = () => {
    setIsStarting(true)
    // Navigate to company DNA flow
    window.location.href = "/onboarding"
  }

  return (
    <div className="min-h-screen bg-[#F7FAFC] font-['Open_Sans']">
      {/* Header */}
      <header className="px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-[#E0531F] rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-[#242424]">Churros AI</span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="px-6 py-12">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-8">
            <h1 className="text-3xl md:text-5xl font-bold text-[#242424] mb-6 leading-tight">
              This isn't your average hiring tool,
              <br />
              <span className="italic text-[#E0531F]">because you're not building an average team.</span>
            </h1>
            <p className="text-xl text-[#242424] opacity-80 font-medium max-w-2xl mx-auto">
              Think of it as matchmaking, not metrics. Find talent that actually fits your startup's DNA.
            </p>
          </div>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <Card className="bg-white shadow-lg rounded-xl border-0 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-[#E0531F] bg-opacity-10 rounded-xl flex items-center justify-center mb-4 mx-auto">
                  <Target className="w-6 h-6 text-[#E0531F]" />
                </div>
                <h3 className="font-bold text-[#242424] mb-2">DNA-First Matching</h3>
                <p className="text-[#242424] opacity-70">
                  We learn your company's vibe first, then find people who actually fit.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-lg rounded-xl border-0 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-[#E0531F] bg-opacity-10 rounded-xl flex items-center justify-center mb-4 mx-auto">
                  <Sparkles className="w-6 h-6 text-[#E0531F]" />
                </div>
                <h3 className="font-bold text-[#242424] mb-2">Social Proof</h3>
                <p className="text-[#242424] opacity-70">
                  See what they're actually building, not just what they claim.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-lg rounded-xl border-0 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-[#E0531F] bg-opacity-10 rounded-xl flex items-center justify-center mb-4 mx-auto">
                  <Users className="w-6 h-6 text-[#E0531F]" />
                </div>
                <h3 className="font-bold text-[#242424] mb-2">Warm Intros</h3>
                <p className="text-[#242424] opacity-70">
                  No "hey, you hiring?" awkwardness. Just genuine connections.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* CTA */}
          <div className="space-y-4">
            <Button
              onClick={handleGetStarted}
              disabled={isStarting}
              className="bg-[#E0531F] hover:bg-[#E0531F]/90 text-white font-bold px-8 py-3 rounded-xl text-lg shadow-lg hover:shadow-xl transition-all duration-300"
            >
              {isStarting ? "Starting your journey..." : "Start Building Your Dream Team"}
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <p className="text-sm text-[#242424] opacity-60">Takes 3 minutes to set up • No credit card required</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-8 mt-16">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-[#242424] opacity-50 text-sm">
            Built for founders who know that great teams aren't found in spreadsheets.
          </p>
        </div>
      </footer>
    </div>
  )
}
