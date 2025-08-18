export function getSpotifyLoginUrl() {
  const client_id = "YOUR_SPOTIFY_CLIENT_ID";
  const redirect_uri = "https://xspensesai.com/callback";
  const scope = [
    "user-read-playback-state",
    "user-modify-playback-state",
    "user-read-currently-playing",
    "streaming"
  ].join(" ");

  const query = new URLSearchParams({
    client_id,
    response_type: "token",
    redirect_uri,
    scope
  });

  return `https://accounts.spotify.com/authorize?${query.toString()}`;
}
