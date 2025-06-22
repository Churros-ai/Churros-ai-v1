import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: NextRequest) {
  try {
    const { profileId, userId, notes } = await request.json();

    if (!profileId) {
      return NextResponse.json({ 
        error: 'Profile ID is required' 
      }, { status: 400 });
    }

    console.log(`Tracking profile ${profileId} for user ${userId || 'anonymous'}`);

    // Check if profile exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profileId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ 
        error: 'Profile not found' 
      }, { status: 404 });
    }

    // Create tracking record
    const trackingData = {
      profile_id: profileId,
      user_id: userId || 'anonymous',
      notes: notes || null,
      tracked_at: new Date().toISOString(),
      status: 'interested'
    };

    // Try to insert tracking record (ignore if already exists)
    const { error: trackingError } = await supabase
      .from('tracked_profiles')
      .upsert(trackingData, { 
        onConflict: 'profile_id,user_id',
        ignoreDuplicates: false 
      });

    if (trackingError) {
      console.error('Error tracking profile:', trackingError);
      return NextResponse.json({ 
        error: 'Failed to track profile',
        details: trackingError.message
      }, { status: 500 });
    }

    // Update profile tracking count
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        tracking_count: (profile.tracking_count || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', profileId);

    if (updateError) {
      console.warn('Error updating tracking count:', updateError);
    }

    return NextResponse.json({
      success: true,
      message: 'Profile tracked successfully',
      profile: {
        ...profile,
        tracking_count: (profile.tracking_count || 0) + 1
      }
    });

  } catch (error) {
    console.error('Track profile failed:', error);
    return NextResponse.json({ 
      error: 'Failed to track profile',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * GET endpoint to get tracked profiles for a user
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ 
        error: 'User ID is required' 
      }, { status: 400 });
    }

    console.log(`Getting tracked profiles for user ${userId}`);

    // Get tracked profiles
    const { data: trackedProfiles, error } = await supabase
      .from('tracked_profiles')
      .select(`
        *,
        profiles (*)
      `)
      .eq('user_id', userId)
      .order('tracked_at', { ascending: false });

    if (error) {
      console.error('Error getting tracked profiles:', error);
      return NextResponse.json({ 
        error: 'Failed to get tracked profiles',
        details: error.message
      }, { status: 500 });
    }

    return NextResponse.json({
      trackedProfiles: trackedProfiles || []
    });

  } catch (error) {
    console.error('Get tracked profiles failed:', error);
    return NextResponse.json({ 
      error: 'Failed to get tracked profiles',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * DELETE endpoint to untrack a profile
 */
export async function DELETE(request: NextRequest) {
  try {
    const { profileId, userId } = await request.json();

    if (!profileId || !userId) {
      return NextResponse.json({ 
        error: 'Profile ID and User ID are required' 
      }, { status: 400 });
    }

    console.log(`Untracking profile ${profileId} for user ${userId}`);

    // Delete tracking record
    const { error } = await supabase
      .from('tracked_profiles')
      .delete()
      .eq('profile_id', profileId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error untracking profile:', error);
      return NextResponse.json({ 
        error: 'Failed to untrack profile',
        details: error.message
      }, { status: 500 });
    }

    // Update profile tracking count
    const { data: profile } = await supabase
      .from('profiles')
      .select('tracking_count')
      .eq('id', profileId)
      .single();

    if (profile && profile.tracking_count > 0) {
      await supabase
        .from('profiles')
        .update({
          tracking_count: Math.max(0, profile.tracking_count - 1),
          updated_at: new Date().toISOString()
        })
        .eq('id', profileId);
    }

    return NextResponse.json({
      success: true,
      message: 'Profile untracked successfully'
    });

  } catch (error) {
    console.error('Untrack profile failed:', error);
    return NextResponse.json({ 
      error: 'Failed to untrack profile',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 