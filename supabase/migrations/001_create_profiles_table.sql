-- Create profiles table
CREATE TYPE platform_type AS ENUM ('twitter', 'github', 'substack', 'linkedin', 'other');

CREATE TABLE profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    bio TEXT,
    platform platform_type NOT NULL,
    tags TEXT[] DEFAULT '{}',
    score FLOAT DEFAULT 0.0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fit_summary TEXT,
    profile_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_profiles_platform ON profiles(platform);
CREATE INDEX idx_profiles_tags ON profiles USING GIN(tags);
CREATE INDEX idx_profiles_score ON profiles(score DESC);
CREATE INDEX idx_profiles_last_updated ON profiles(last_updated DESC);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (you can restrict this later)
CREATE POLICY "Allow all operations on profiles" ON profiles
    FOR ALL USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column(); 