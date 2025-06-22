"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Github, 
  Twitter, 
  Linkedin, 
  ExternalLink, 
  MessageCircle,
  Star,
  MapPin,
  Calendar
} from "lucide-react"
import { Profile, PlatformType } from "@/lib/types"

interface LeadCardProps {
  profile: Profile
  onTrack?: (profileId: string) => void
  onMessage?: (profileId: string) => void
  isTracking?: boolean
  isMessaging?: boolean
}

export function LeadCard({ 
  profile, 
  onTrack, 
  onMessage, 
  isTracking = false,
  isMessaging = false 
}: LeadCardProps) {
  const [isHovered, setIsHovered] = useState(false)

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

  const getPlatformColor = (platform: PlatformType) => {
    switch (platform) {
      case 'github':
        return 'bg-gray-900 text-white'
      case 'twitter':
        return 'bg-blue-500 text-white'
      case 'linkedin':
        return 'bg-blue-700 text-white'
      case 'substack':
        return 'bg-orange-600 text-white'
      default:
        return 'bg-gray-600 text-white'
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'bg-green-100 text-green-800'
    if (score >= 0.6) return 'bg-yellow-100 text-yellow-800'
    return 'bg-gray-100 text-gray-800'
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 1) return 'Today'
    if (diffDays <= 7) return `${diffDays} days ago`
    if (diffDays <= 30) return `${Math.floor(diffDays / 7)} weeks ago`
    return date.toLocaleDateString()
  }

  return (
    <Card 
      className="bg-white shadow-lg rounded-xl border-0 hover:shadow-xl transition-all duration-300 cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start space-x-4">
            <Avatar className="w-12 h-12">
              <AvatarImage src={`/placeholder-user.jpg`} alt={profile.name} />
              <AvatarFallback className="bg-[#E0531F] text-white font-bold">
                {profile.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="text-lg font-bold text-[#242424] truncate">
                  {profile.name}
                </h3>
                <Badge 
                  variant="secondary" 
                  className={`${getPlatformColor(profile.platform)} text-xs`}
                >
                  {getPlatformIcon(profile.platform)}
                  <span className="ml-1 capitalize">{profile.platform}</span>
                </Badge>
              </div>
              
              <div className="flex items-center space-x-4 text-sm text-[#242424] opacity-60 mb-2">
                <div className="flex items-center">
                  <Calendar className="w-3 h-3 mr-1" />
                  {formatDate(profile.last_updated)}
                </div>
                <div className="flex items-center">
                  <Star className="w-3 h-3 mr-1" />
                  {Math.round(profile.score * 100)}% match
                </div>
              </div>
            </div>
          </div>

          <Badge 
            variant="secondary" 
            className={`${getScoreColor(profile.score)} font-medium`}
          >
            {Math.round(profile.score * 100)}%
          </Badge>
        </div>

        {profile.bio && (
          <p className="text-[#242424] opacity-80 mb-4 line-clamp-2">
            {profile.bio}
          </p>
        )}

        {profile.tags && profile.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {profile.tags.slice(0, 4).map((tag) => (
              <Badge 
                key={tag} 
                variant="outline" 
                className="text-xs bg-gray-50 border-gray-200 text-[#242424]"
              >
                {tag}
              </Badge>
            ))}
            {profile.tags.length > 4 && (
              <Badge 
                variant="outline" 
                className="text-xs bg-gray-50 border-gray-200 text-[#242424]"
              >
                +{profile.tags.length - 4} more
              </Badge>
            )}
          </div>
        )}

        {profile.fit_summary && (
          <div className="bg-[#E0531F]/5 rounded-lg p-3 mb-4">
            <h4 className="font-medium text-[#242424] mb-1 text-sm">Why they're a fit:</h4>
            <p className="text-[#242424] opacity-80 text-sm italic">
              {profile.fit_summary}
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 border-[#E0531F] text-[#E0531F] hover:bg-[#E0531F] hover:text-white"
            onClick={() => onTrack?.(profile.id)}
            disabled={isTracking}
          >
            {isTracking ? "Tracking..." : "Track Profile"}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="flex-1"
            onClick={() => window.location.href = `/candidate/${profile.id}`}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            See full details
          </Button>
          
          {profile.profile_url && (
            <Button
              variant="ghost"
              size="sm"
              className="flex-1"
              onClick={() => window.open(profile.profile_url!, '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              View Profile
            </Button>
          )}
          
          <Button
            size="sm"
            className="flex-1 bg-[#E0531F] hover:bg-[#E0531F]/90 text-white"
            onClick={() => onMessage?.(profile.id)}
            disabled={isMessaging}
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            {isMessaging ? "Sending..." : "Message"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
} 