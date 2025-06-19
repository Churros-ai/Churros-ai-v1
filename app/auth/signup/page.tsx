"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Sparkles, Github, Mail } from "lucide-react"

export default function SignupPage() {
  const [isSigningUp, setIsSigningUp] = useState(false)

  const handleOAuthSignup = (provider: string) => {
    setIsSigningUp(true)
    // Simulate OAuth flow
    setTimeout(() => {
      window.location.href = "/search"
    }, 1500)
  }

  return (
    <div className="min-h-screen bg-[#F7FAFC] font-['Open_Sans'] flex items-center justify-center px-4">
      <Card className="w-full max-w-md bg-white shadow-xl rounded-xl border-0">
        <CardHeader className="text-center pb-6">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-10 h-10 bg-[#E0531F] rounded-lg flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-[#242424]">Churros AI</span>
          </div>
          <CardTitle className="text-2xl font-bold text-[#242424] mb-2">Almost there! 🎉</CardTitle>
          <p className="text-[#242424] opacity-70">Create your account to start finding amazing talent</p>
        </CardHeader>

        <CardContent className="p-8 pt-0">
          <div className="space-y-4">
            <Button
              onClick={() => handleOAuthSignup("github")}
              disabled={isSigningUp}
              className="w-full h-12 bg-[#24292e] hover:bg-[#24292e]/90 text-white font-medium flex items-center justify-center space-x-3"
            >
              <Github className="w-5 h-5" />
              <span>Continue with GitHub</span>
            </Button>

            <Button
              onClick={() => handleOAuthSignup("google")}
              disabled={isSigningUp}
              variant="outline"
              className="w-full h-12 border-2 border-gray-200 hover:border-[#E0531F] hover:text-[#E0531F] font-medium flex items-center justify-center space-x-3"
            >
              <Mail className="w-5 h-5" />
              <span>Continue with Google</span>
            </Button>
          </div>

          {isSigningUp && (
            <div className="mt-6 text-center">
              <div className="inline-flex items-center space-x-2 text-[#E0531F]">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#E0531F]"></div>
                <span className="text-sm font-medium">Setting up your account...</span>
              </div>
            </div>
          )}

          <div className="mt-6 text-center">
            <p className="text-xs text-[#242424] opacity-50">
              By continuing, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
