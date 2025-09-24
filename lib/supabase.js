import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Client voor frontend (bestaand)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server client voor admin operations
export const supabaseServer = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
})

// Server-side functions using service role
export async function checkExistingPlaylist(email) {
    // Check user permissions
    const { data: permissions } = await supabaseServer
        .from('user_permissions')
        .select('*')
        .eq('email', email)
        .single();

    if (permissions?.is_unlimited) {
        console.log(`User ${email} has unlimited permissions`);
        return [];
    }

    const maxAllowed = permissions?.max_playlists || 3;

    // Get existing playlists
    const { data, error } = await supabaseServer
        .from('user_playlists')
        .select('*')
        .eq('email', email)
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error('Error checking playlists:', error);
        return [];
    }
    
    // Check if user exceeded their limit
    if (data && data.length >= maxAllowed) {
        return data; // Return existing playlists to trigger limit
    }
    
    return []; // Under limit
}

export async function savePlaylist(email, spotifyUserId, playlistData, method) {
    const { data, error } = await supabaseServer
        .from('user_playlists')
        .insert([{
            email: email,
            spotify_user_id: spotifyUserId,
            playlist_id: playlistData.id,
            playlist_name: playlistData.name,
            playlist_url: playlistData.url,
            method: method
        }])
        .select()
        .single();
    
    return { data, error };
}