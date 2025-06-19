"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, ArrowLeft, Sparkles } from "lucide-react"

interface OnboardingData {
  building: string
  values: string[]
  vibe: "chaotic-genius" | "systems-nerd" | ""
}

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [data, setData] = useState<OnboardingData>({
    building: "",
    values: [],
    vibe: "",
  })

  const values = [
    "Move fast, break things",
    "Quality over speed",
    "Transparency",
    "Work-life balance",
    "Remote-first",
    "In-person collaboration",
    "Data-driven",
    "Intuition-led",
    "Customer obsessed",
    "Product perfectionist",
    "Scrappy hustle",
    "Process & systems",
  ]

  const handleValueToggle = (value: string) => {
    setData((prev) => ({
      ...prev,
      values: prev.values.includes(value) ? prev.values.filter((v) => v !== value) : [...prev.values, value],
    }))
  }

  const handleComplete = () => {
    // Save onboarding data and navigate to OAuth signup
    localStorage.setItem("companyDNA", JSON.stringify(data))
    window.location.href = "/auth/signup"
  }

  return (
    <div className="min-h-screen bg-[#F7FAFC] font-['Open_Sans']">
      {/* Header */}
      <header className="px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-[#E0531F] rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-[#242424]">Churros AI</span>
          </div>
          <div className="text-sm text-[#242424] opacity-60">Step {step} of 3</div>
        </div>
      </header>

      <main className="px-6 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="w-full bg-white rounded-full h-2 shadow-inner">
              <div
                className="bg-[#E0531F] h-2 rounded-full transition-all duration-500"
                style={{ width: `${(step / 3) * 100}%` }}
              />
            </div>
          </div>

          <Card className="bg-white shadow-xl rounded-xl border-0">
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-2xl font-bold text-[#242424]">Let's understand your company DNA</CardTitle>
              <p className="text-[#242424] opacity-70 italic">Think of it as matchmaking, not metrics.</p>
            </CardHeader>

            <CardContent className="p-8">
              {step === 1 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-[#242424] mb-3">What are you building and why? 🚀</h3>
                    <p className="text-sm text-[#242424] opacity-60 mb-4">
                      Don't overthink it—just tell us like you'd tell a friend at a coffee shop.
                    </p>
                    <Textarea
                      placeholder="We're building an AI-powered... because we noticed that..."
                      value={data.building}
                      onChange={(e) => setData((prev) => ({ ...prev, building: e.target.value }))}
                      className="min-h-[120px] border-gray-200 focus:border-[#E0531F] focus:ring-[#E0531F]"
                    />
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-[#242424] mb-3">
                      What values does your team actually care about? 💭
                    </h3>
                    <p className="text-sm text-[#242424] opacity-60 mb-4">
                      Pick the ones that feel right. No judgment—every team is different.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {values.map((value) => (
                        <Badge
                          key={value}
                          variant={data.values.includes(value) ? "default" : "outline"}
                          className={`cursor-pointer p-3 text-center justify-center transition-all duration-200 ${
                            data.values.includes(value)
                              ? "bg-[#E0531F] text-white hover:bg-[#E0531F]/90"
                              : "border-gray-200 text-[#242424] hover:border-[#E0531F] hover:text-[#E0531F]"
                          }`}
                          onClick={() => handleValueToggle(value)}
                        >
                          {value}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-[#242424] mb-3">What's your team vibe? ⚡</h3>
                    <p className="text-sm text-[#242424] opacity-60 mb-6">
                      Both are great—we just want to find people who match your energy.
                    </p>
                    <div className="space-y-4">
                      <Card
                        className={`cursor-pointer transition-all duration-200 border-2 ${
                          data.vibe === "chaotic-genius"
                            ? "border-[#E0531F] bg-[#E0531F]/5"
                            : "border-gray-200 hover:border-[#E0531F]/50"
                        }`}
                        onClick={() => setData((prev) => ({ ...prev, vibe: "chaotic-genius" }))}
                      >
                        <CardContent className="p-6">
                          <h4 className="font-bold text-[#242424] mb-2">🌪️ Chaotic Genius</h4>
                          <p className="text-[#242424] opacity-70">
                            Move fast, figure it out as you go. Thrive in ambiguity. Ship first, perfect later.
                          </p>
                        </CardContent>
                      </Card>

                      <Card
                        className={`cursor-pointer transition-all duration-200 border-2 ${
                          data.vibe === "systems-nerd"
                            ? "border-[#E0531F] bg-[#E0531F]/5"
                            : "border-gray-200 hover:border-[#E0531F]/50"
                        }`}
                        onClick={() => setData((prev) => ({ ...prev, vibe: "systems-nerd" }))}
                      >
                        <CardContent className="p-6">
                          <h4 className="font-bold text-[#242424] mb-2">🔧 Systems Nerd</h4>
                          <p className="text-[#242424] opacity-70">
                            Process-driven, love clean architecture. Build it right the first time.
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-100">
                {step > 1 ? (
                  <Button
                    variant="outline"
                    onClick={() => setStep(step - 1)}
                    className="border-gray-200 text-[#242424] hover:border-[#E0531F] hover:text-[#E0531F]"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                ) : (
                  <div />
                )}

                {step < 3 ? (
                  <Button
                    onClick={() => setStep(step + 1)}
                    disabled={(step === 1 && !data.building.trim()) || (step === 2 && data.values.length === 0)}
                    className="bg-[#E0531F] hover:bg-[#E0531F]/90 text-white font-medium"
                  >
                    Next
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleComplete}
                    disabled={!data.vibe}
                    className="bg-[#E0531F] hover:bg-[#E0531F]/90 text-white font-bold"
                  >
                    Start Finding Talent
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
