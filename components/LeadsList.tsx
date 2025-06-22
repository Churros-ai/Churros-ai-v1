"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LeadCard } from "./LeadCard"
import { Profile, PlatformType } from "@/lib/types"
import { Search, Filter, Github, Twitter, Linkedin, ExternalLink } from "lucide-react"

interface LeadsListProps {
  leads: Profile[]
  onTrack?: (profileId: string) => void
  onMessage?: (profileId: string) => void
  isLoading?: boolean
  source?: 'database' | 'scraped'
}

export function LeadsList({ 
  leads, 
  onTrack, 
  onMessage, 
  isLoading = false,
  source = 'database'
}: LeadsListProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformType | "all">("all")
  const [trackingIds, setTrackingIds] = useState<Set<string>>(new Set())
  const [messagingIds, setMessagingIds] = useState<Set<string>>(new Set())

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const matchesSearch = searchQuery === "" || 
        lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.bio?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      
      const matchesPlatform = selectedPlatform === "all" || lead.platform === selectedPlatform
      
      return matchesSearch && matchesPlatform
    })
  }, [leads, searchQuery, selectedPlatform])

  const handleTrack = async (profileId: string) => {
    setTrackingIds(prev => new Set(prev).add(profileId))
    try {
      await onTrack?.(profileId)
    } finally {
      setTrackingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(profileId)
        return newSet
      })
    }
  }

  const handleMessage = async (profileId: string) => {
    setMessagingIds(prev => new Set(prev).add(profileId))
    try {
      await onMessage?.(profileId)
    } finally {
      setMessagingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(profileId)
        return newSet
      })
    }
  }

  const getPlatformIcon = (platform: PlatformType) => {
    switch (platform) {
      case 'github':
        return <Github className="w-4 h-4" />
      case 'twitter':
        return <Twitter className="w-4 h-4" />
      case 'linkedin':
        return <Linkedin className="w-4 h-4" />
      default:
        return <ExternalLink className="w-4 h-4" />
    }
  }

  const platformCounts = useMemo(() => {
    const counts: Record<PlatformType, number> = {
      github: 0,
      twitter: 0,
      substack: 0,
      linkedin: 0,
      other: 0
    }
    
    leads.forEach(lead => {
      counts[lead.platform]++
    })
    
    return counts
  }, [leads])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#242424]">Loading leads...</h2>
        </div>
        <div className="grid gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white shadow-lg rounded-xl border-0 p-6 animate-pulse">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-xl font-bold text-[#242424]">
            Found {filteredLeads.length} potential matches
          </h2>
          <div className="flex items-center space-x-2 mt-1">
            <Badge variant="outline" className="text-[#E0531F] border-[#E0531F]">
              Sorted by fit
            </Badge>
            <Badge variant="secondary" className="text-xs">
              Source: {source === 'database' ? 'Database' : 'Live Scraped'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search by name, bio, or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 border-gray-200 focus:border-[#E0531F] focus:ring-[#E0531F]"
          />
        </div>
        
        <Select value={selectedPlatform} onValueChange={(value) => setSelectedPlatform(value as PlatformType | "all")}>
          <SelectTrigger className="w-full sm:w-48 border-gray-200 focus:border-[#E0531F] focus:ring-[#E0531F]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter by platform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              <div className="flex items-center">
                <span>All Platforms</span>
                <Badge variant="secondary" className="ml-2 text-xs">
                  {leads.length}
                </Badge>
              </div>
            </SelectItem>
            {Object.entries(platformCounts).map(([platform, count]) => (
              <SelectItem key={platform} value={platform}>
                <div className="flex items-center">
                  {getPlatformIcon(platform as PlatformType)}
                  <span className="ml-2 capitalize">{platform}</span>
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {count}
                  </Badge>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results */}
      {filteredLeads.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-[#242424] mb-2">No matches found</h3>
          <p className="text-[#242424] opacity-60">
            Try adjusting your search terms or platform filter
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {filteredLeads.map((lead, index) => (
            <LeadCard
              key={lead.id}
              profile={lead}
              onTrack={handleTrack}
              onMessage={handleMessage}
              isTracking={trackingIds.has(lead.id)}
              isMessaging={messagingIds.has(lead.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
} 