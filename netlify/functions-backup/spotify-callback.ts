import { Handler } from '@netlify/functions';

interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

export const handler: Handler = async (event) => {
  // Handle CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const { code, state, error } = event.queryStringParameters || {};

  if (error) {
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'Spotify authorization failed' }),
    };
  }

  if (!code) {
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'Authorization code not provided' }),
    };
  }

  try {
    const clientId = process.env.VITE_SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    const redirectUri = process.env.VITE_SPOTIFY_REDIRECT_URI || 'https://xspensesai.com/spotify/callback';

    if (!clientId || !clientSecret) {
      throw new Error('Spotify credentials not configured');
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Spotify token exchange failed:', errorData);
      throw new Error('Failed to exchange authorization code for token');
    }

    const tokenData: SpotifyTokenResponse = await tokenResponse.json();

    // Redirect to frontend with token
    const frontendUrl = `https://xspensesai.com/callback?access_token=${tokenData.access_token}&token_type=${tokenData.token_type}&expires_in=${tokenData.expires_in}`;

    return {
      statusCode: 302,
      headers: {
        'Location': frontendUrl,
        'Access-Control-Allow-Origin': '*',
      },
      body: '',
    };

  } catch (error) {
    console.error('Spotify callback error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
    };
  }
};
