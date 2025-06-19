"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Sparkles, Github, Twitter, Linkedin, ExternalLink, Users, LinkIcon } from "lucide-react"

interface Candidate {
  id: string
  name: string
  title: string
  summary: string
  alignment: string
  proofs: Array<{
    type: "github" | "twitter" | "linkedin"
    content: string
    url: string
  }>
  matchScore: number
  isPremium?: boolean
}

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [activeTab, setActiveTab] = useState("search")
  const [profileUrl, setProfileUrl] = useState("")

  // Mock candidates data
  const mockCandidates: Candidate[] = [
    {
      id: "1",
      name: "Alex Chen",
      title: "Full-stack Engineer",
      summary:
        "Building open-source dev tools and writing about the future of AI. Previously at early-stage YC startup.",
      alignment:
        'Perfect match for your "chaotic genius" vibe—ships fast, iterates quickly, and loves building in public.',
      proofs: [
        { type: "github", content: "47 commits this week on AI tooling project", url: "#" },
        { type: "twitter", content: "Thread about LLM optimization got 2.3k likes", url: "#" },
        { type: "linkedin", content: "Just left Series A startup to explore AI space", url: "#" },
      ],
      matchScore: 94,
    },
    {
      id: "2",
      name: "Sarah Kim",
      title: "Product Designer",
      summary:
        "Design systems expert who codes her own prototypes. Active in design Twitter and open-source community.",
      alignment:
        'Matches your "move fast" values—designs with code, ships prototypes, and believes in iteration over perfection.',
      proofs: [
        { type: "github", content: "Maintains popular React component library", url: "#" },
        { type: "twitter", content: "Regular posts about design-dev collaboration", url: "#" },
        { type: "linkedin", content: "Led design at 3 early-stage startups", url: "#" },
      ],
      matchScore: 89,
      isPremium: true,
    },
  ]

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setIsSearching(true)
    // Simulate API call
    setTimeout(() => {
      setCandidates(mockCandidates)
      setIsSearching(false)
    }, 1500)
  }

  const handleTrackProfile = async () => {
    if (!profileUrl.trim()) return

    // Simulate profile analysis
    const mockProfile = {
      id: "3",
      name: "Jordan Taylor",
      title: "Backend Engineer",
      summary: "Extracted from their GitHub and LinkedIn activity",
      alignment: "Strong technical skills and startup experience align with your company DNA.",
      proofs: [{ type: "github", content: "Active contributor to distributed systems projects", url: profileUrl }],
      matchScore: 87,
    }

    setCandidates([mockProfile, ...candidates])
    setProfileUrl("")
  }

  const getProofIcon = (type: string) => {
    switch (type) {
      case "github":
        return <Github className="w-4 h-4" />
      case "twitter":
        return <Twitter className="w-4 h-4" />
      case "linkedin":
        return <Linkedin className="w-4 h-4" />
      default:
        return <ExternalLink className="w-4 h-4" />
    }
  }

  return (
    <div className="min-h-screen bg-[#F7FAFC] font-['Open_Sans']">
      {/* Header */}
      <header className="px-6 py-4 bg-white shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-0">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-[#E0531F] rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-[#242424]">Churros AI</span>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm">
              <Users className="w-4 h-4 mr-2" />
              Referrals
            </Button>
            <Button variant="outline" size="sm">
              Settings
            </Button>
          </div>
        </div>
      </header>

      <main className="px-6 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-0">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[#242424] mb-2">Find your next team member</h1>
            <p className="text-[#242424] opacity-70 italic">
              Ask naturally—we'll find people who actually fit your vibe.
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-white shadow-sm rounded-xl p-1">
              <TabsTrigger value="search" className="data-[state=active]:bg-[#E0531F] data-[state=active]:text-white">
                <Search className="w-4 h-4 mr-2" />
                Smart Search
              </TabsTrigger>
              <TabsTrigger value="track" className="data-[state=active]:bg-[#E0531F] data-[state=active]:text-white">
                <LinkIcon className="w-4 h-4 mr-2" />
                Track Profile
              </TabsTrigger>
            </TabsList>

            <TabsContent value="search" className="space-y-6">
              <Card className="bg-white shadow-lg rounded-xl border-0">
                <CardContent className="p-6">
                  <div className="flex space-x-4">
                    <div className="flex-1">
                      <Input
                        placeholder="Show me designers who build in public..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                        className="text-lg h-16 border-gray-200 focus:border-[#E0531F] focus:ring-[#E0531F]"
                      />
                      <div className="flex flex-wrap gap-2 mt-3">
                        <Badge variant="outline" className="text-xs cursor-pointer hover:border-[#E0531F]">
                          Frontend engineers who tweet
                        </Badge>
                        <Badge variant="outline" className="text-xs cursor-pointer hover:border-[#E0531F]">
                          Designers with GitHub activity
                        </Badge>
                        <Badge variant="outline" className="text-xs cursor-pointer hover:border-[#E0531F]">
                          AI researchers building products
                        </Badge>
                      </div>
                    </div>
                    <Button
                      onClick={handleSearch}
                      disabled={isSearching || !searchQuery.trim()}
                      className="bg-[#E0531F] hover:bg-[#E0531F]/90 text-white font-medium px-8"
                    >
                      {isSearching ? "Searching..." : "Search"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="track" className="space-y-6">
              <Card className="bg-white shadow-lg rounded-xl border-0">
                <CardContent className="p-6">
                  <h3 className="font-medium text-[#242424] mb-4">Paste a profile to analyze fit</h3>
                  <div className="flex space-x-4">
                    <Input
                      placeholder="https://github.com/username or https://linkedin.com/in/username"
                      value={profileUrl}
                      onChange={(e) => setProfileUrl(e.target.value)}
                      className="flex-1 border-gray-200 focus:border-[#E0531F] focus:ring-[#E0531F]"
                    />
                    <Button
                      onClick={handleTrackProfile}
                      disabled={!profileUrl.trim()}
                      className="bg-[#E0531F] hover:bg-[#E0531F]/90 text-white font-medium"
                    >
                      Analyze
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Results */}
          {candidates.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-[#242424]">Found {candidates.length} potential matches</h2>
                <Badge variant="outline" className="text-[#E0531F] border-[#E0531F]">
                  Sorted by fit
                </Badge>
              </div>

              <div className="grid gap-6">
                {candidates.map((candidate, index) => (
                  <Card
                    key={candidate.id}
                    className="bg-white shadow-lg rounded-xl border-0 hover:shadow-xl transition-all duration-300 animate-in slide-in-from-bottom-4"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-xl font-bold text-[#242424]">{candidate.name}</h3>
                            <Badge variant="secondary" className="bg-[#E0531F]/10 text-[#E0531F] font-medium">
                              {candidate.matchScore}% match
                            </Badge>
                            {candidate.isPremium && (
                              <Badge className="bg-gradient-to-r from-orange-400 to-orange-600 text-white text-xs">
                                Premium
                              </Badge>
                            )}
                          </div>
                          <p className="text-[#242424] opacity-70 font-medium mb-1">{candidate.title}</p>
                          <p className="text-[#242424] opacity-80 mb-3">{candidate.summary}</p>
                        </div>
                      </div>

                      <div className="bg-[#E0531F]/5 rounded-lg p-4 mb-4">
                        <h4 className="font-medium text-[#242424] mb-2">Why they're a fit:</h4>
                        <p className="text-[#242424] opacity-80 italic">{candidate.alignment}</p>
                      </div>

                      <div className="space-y-3 mb-4">
                        <h4 className="font-medium text-[#242424]">Social proof:</h4>
                        {candidate.proofs.map((proof, proofIndex) => (
                          <div key={proofIndex} className="flex items-center space-x-3 text-sm">
                            {getProofIcon(proof.type)}
                            <span className="text-[#242424] opacity-80">{proof.content}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-auto p-0 text-[#E0531F] hover:text-[#E0531F]/80"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                        <Button
                          className="bg-[#E0531F] hover:bg-[#E0531F]/90 text-white font-medium"
                          onClick={() => (window.location.href = `/candidate/${candidate.id}`)}
                        >
                          See Full Details
                        </Button>
                        {candidate.isPremium && (
                          <Button
                            variant="outline"
                            className="border-[#E0531F] text-[#E0531F] hover:bg-[#E0531F] hover:text-white"
                          >
                            We'll reach out for you
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {isSearching && (
            <div className="text-center py-12">
              <div className="inline-flex items-center space-x-2 text-[#E0531F]">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#E0531F]"></div>
                <span className="font-medium">Finding your perfect matches...</span>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
