-- Add tracking_count column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tracking_count INTEGER DEFAULT 0;

-- Create tracked_profiles table
CREATE TABLE IF NOT EXISTS tracked_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    notes TEXT,
    status TEXT DEFAULT 'interested' CHECK (status IN ('interested', 'contacted', 'hired', 'rejected')),
    tracked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(profile_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tracked_profiles_user_id ON tracked_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_tracked_profiles_profile_id ON tracked_profiles(profile_id);
CREATE INDEX IF NOT EXISTS idx_tracked_profiles_status ON tracked_profiles(status);
CREATE INDEX IF NOT EXISTS idx_tracked_profiles_tracked_at ON tracked_profiles(tracked_at DESC);

-- Enable Row Level Security
ALTER TABLE tracked_profiles ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (you can restrict this later)
CREATE POLICY "Allow all operations on tracked_profiles" ON tracked_profiles
    FOR ALL USING (true);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_tracked_profiles_updated_at 
    BEFORE UPDATE ON tracked_profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column(); 