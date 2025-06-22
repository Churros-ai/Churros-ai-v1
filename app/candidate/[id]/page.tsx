"use client"

import { useState, useEffect, use } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import {
  ArrowLeft,
  Sparkles,
  Github,
  Twitter,
  Linkedin,
  ExternalLink,
  Star,
  MessageCircle,
  MapPin,
  Crown,
  Loader2,
} from "lucide-react"

interface CandidateDetail {
  id: string
  name: string
  avatar: string
  title: string
  location: string
  summary: string
  tldr: string
  matchScore: number
  alignment: {
    values: string[]
    vibe: string
    culture: string
  }
  signals: Array<{
    type: "github" | "twitter" | "linkedin"
    title: string
    content: string
    engagement: string
    date: string
    url: string
  }>
  skills: string[]
  experience: string[]
  profile_url?: string
  platform?: string
}

export default function CandidateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [isMessaging, setIsMessaging] = useState(false)
  const [candidate, setCandidate] = useState<CandidateDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchCandidateDetails()
  }, [id])

  const fetchCandidateDetails = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/profile-details?id=${id}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch profile details')
      }
      
      const data = await response.json()
      setCandidate(data)
    } catch (error) {
      console.error('Error fetching candidate details:', error)
      setError('Failed to load profile details')
    } finally {
      setLoading(false)
    }
  }

  const handleMessageCandidate = () => {
    setIsMessaging(true)
    // Simulate messaging flow
    setTimeout(() => {
      setIsMessaging(false)
      // Show success message or redirect
    }, 2000)
  }

  const getSignalIcon = (type: string) => {
    switch (type) {
      case "github":
        return <Github className="w-5 h-5" />
      case "twitter":
        return <Twitter className="w-5 h-5" />
      case "linkedin":
        return <Linkedin className="w-5 h-5" />
      default:
        return <ExternalLink className="w-5 h-5" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7FAFC] font-['Open_Sans'] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-[#E0531F]" />
          <p className="text-[#242424] opacity-70">Loading profile details...</p>
        </div>
      </div>
    )
  }

  if (error || !candidate) {
    return (
      <div className="min-h-screen bg-[#F7FAFC] font-['Open_Sans']">
        <header className="px-4 sm:px-6 py-4 bg-white shadow-sm">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={() => window.history.back()} className="p-2 hover:bg-gray-100">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-[#E0531F] rounded-lg flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-[#242424]">Churros AI</span>
              </div>
            </div>
          </div>
        </header>
        
        <main className="px-4 sm:px-6 py-6 sm:py-8">
          <div className="max-w-4xl mx-auto text-center">
            <Card className="bg-white shadow-lg rounded-xl border-0">
              <CardContent className="p-8">
                <h2 className="text-xl font-bold text-[#242424] mb-2">Profile Not Found</h2>
                <p className="text-[#242424] opacity-70 mb-4">{error || 'The requested profile could not be loaded.'}</p>
                <Button onClick={() => window.history.back()} className="bg-[#E0531F] hover:bg-[#E0531F]/90 text-white">
                  Go Back
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F7FAFC] font-['Open_Sans']">
      {/* Header */}
      <header className="px-4 sm:px-6 py-4 bg-white shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => window.history.back()} className="p-2 hover:bg-gray-100">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-[#E0531F] rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-[#242424]">Churros AI</span>
            </div>
          </div>
          <Badge className="bg-[#E0531F]/10 text-[#E0531F] font-bold text-sm px-3 py-1">
            {candidate.matchScore}% DNA Match
          </Badge>
        </div>
      </header>

      <main className="px-4 sm:px-6 py-6 sm:py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Profile Header */}
          <Card className="bg-white shadow-lg rounded-xl border-0">
            <CardContent className="p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
                <Avatar className="w-20 h-20 sm:w-24 sm:h-24">
                  <AvatarImage src={candidate.avatar || "/placeholder.svg"} alt={candidate.name} />
                  <AvatarFallback className="bg-[#E0531F] text-white text-2xl font-bold">
                    {candidate.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 space-y-3">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-[#242424] mb-2">{candidate.name}</h1>
                    <p className="text-lg text-[#242424] opacity-80 font-medium mb-1">{candidate.title}</p>
                    <div className="flex items-center text-[#242424] opacity-60 text-sm">
                      <MapPin className="w-4 h-4 mr-1" />
                      {candidate.location}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {candidate.skills.slice(0, 4).map((skill) => (
                      <Badge key={skill} variant="secondary" className="bg-gray-100 text-[#242424]">
                        {skill}
                      </Badge>
                    ))}
                    {candidate.skills.length > 4 && (
                      <Badge variant="secondary" className="bg-gray-100 text-[#242424]">
                        +{candidate.skills.length - 4} more
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="w-full sm:w-auto space-y-2">
                  <Button
                    onClick={handleMessageCandidate}
                    disabled={isMessaging}
                    className="w-full sm:w-auto bg-[#E0531F] hover:bg-[#E0531F]/90 text-white font-bold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <Crown className="w-4 h-4 mr-2" />
                    {isMessaging ? "Sending message..." : "Message Them on My Behalf"}
                  </Button>
                  <p className="text-xs text-[#242424] opacity-50 text-center">Premium Feature</p>
                  
                  {candidate.profile_url && (
                    <Button
                      variant="outline"
                      onClick={() => window.open(candidate.profile_url, '_blank')}
                      className="w-full sm:w-auto border-[#E0531F] text-[#E0531F] hover:bg-[#E0531F] hover:text-white"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View {candidate.platform} Profile
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* TL;DR Summary */}
          <Card className="bg-white shadow-lg rounded-xl border-0">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-[#242424] flex items-center">
                <Star className="w-5 h-5 mr-2 text-[#E0531F]" />
                TL;DR Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-[#242424] opacity-80 leading-relaxed">{candidate.tldr}</p>
            </CardContent>
          </Card>

          {/* DNA Alignment Breakdown */}
          <Card className="bg-white shadow-lg rounded-xl border-0">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-[#242424]">DNA Alignment Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-6">
              <div>
                <h4 className="font-medium text-[#242424] mb-3">Shared Values</h4>
                <div className="flex flex-wrap gap-2">
                  {candidate.alignment.values.map((value) => (
                    <Badge key={value} className="bg-[#E0531F]/10 text-[#E0531F] border-[#E0531F]/20">
                      {value}
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium text-[#242424] mb-2">Team Vibe Match</h4>
                <p className="text-[#242424] opacity-80">{candidate.alignment.vibe}</p>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium text-[#242424] mb-2">Culture Fit</h4>
                <p className="text-[#242424] opacity-80">{candidate.alignment.culture}</p>
              </div>
            </CardContent>
          </Card>

          {/* Public Signals */}
          <Card className="bg-white shadow-lg rounded-xl border-0">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-[#242424]">Public Signals</CardTitle>
              <p className="text-[#242424] opacity-60">Recent activity that shows they're a great fit</p>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              {candidate.signals.length > 0 ? (
                candidate.signals.map((signal, index) => (
                  <div key={index} className="border border-gray-100 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-gray-50 rounded-lg">{getSignalIcon(signal.type)}</div>
                        <div>
                          <h5 className="font-medium text-[#242424]">{signal.title}</h5>
                          <p className="text-sm text-[#242424] opacity-60">{signal.date}</p>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="p-1"
                        onClick={() => window.open(signal.url, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>

                    <p className="text-[#242424] opacity-80 mb-3 leading-relaxed">{signal.content}</p>

                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">
                        {signal.engagement}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Github className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-[#242424] opacity-60">No recent activity found</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Experience & Skills */}
          <div className="grid sm:grid-cols-2 gap-6">
            <Card className="bg-white shadow-lg rounded-xl border-0">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-[#242424]">Experience</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {candidate.experience.map((exp, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-[#E0531F] rounded-full"></div>
                      <span className="text-[#242424] opacity-80">{exp}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-lg rounded-xl border-0">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-[#242424]">All Skills</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-2">
                  {candidate.skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="bg-gray-100 text-[#242424]">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bottom CTA */}
          <Card className="bg-gradient-to-r from-[#E0531F]/5 to-[#E0531F]/10 border-[#E0531F]/20 shadow-lg rounded-xl">
            <CardContent className="p-6 text-center">
              <h3 className="text-lg font-bold text-[#242424] mb-2">Ready to connect?</h3>
              <p className="text-[#242424] opacity-70 mb-4">
                We'll craft a personalized message and reach out on your behalf
              </p>
              <Button
                onClick={handleMessageCandidate}
                disabled={isMessaging}
                className="bg-[#E0531F] hover:bg-[#E0531F]/90 text-white font-bold px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                {isMessaging ? "Sending message..." : "Message Them on My Behalf"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
