-- Add username field to profiles table
ALTER TABLE profiles ADD COLUMN username TEXT;

-- Create index for username lookups
CREATE INDEX idx_profiles_username ON profiles(username);

-- Update existing profiles to extract username from profile_url where possible
UPDATE profiles 
SET username = CASE 
    WHEN platform = 'github' AND profile_url LIKE '%github.com/%' 
    THEN substring(profile_url from 'github\.com/([^/]+)')
    WHEN platform = 'twitter' AND profile_url LIKE '%twitter.com/%' 
    THEN substring(profile_url from 'twitter\.com/([^/]+)')
    WHEN platform = 'linkedin' AND profile_url LIKE '%linkedin.com/in/%' 
    THEN substring(profile_url from 'linkedin\.com/in/([^/]+)')
    ELSE NULL
END; 