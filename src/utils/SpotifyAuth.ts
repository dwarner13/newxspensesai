const SPOTIFY_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID || '464607e5d7c24f36a9b464c15899c29f';
const REDIRECT_URI = import.meta.env.VITE_SPOTIFY_REDIRECT_URI || 'https://xspensesai.com/spotify/callback';
const SCOPES = [
  'user-read-playback-state',
  'user-read-currently-playing',
  'user-modify-playback-state',
  'streaming',
  'user-read-email',
  'user-read-private'
];

export function getSpotifyLoginUrl() {
  const scopeParam = SCOPES.join('%20');
  return `https://accounts.spotify.com/authorize?client_id=${SPOTIFY_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(
    REDIRECT_URI
  )}&scope=${scopeParam}`;
}

export function getSpotifyAuthURL() {
  return getSpotifyLoginUrl();
}
