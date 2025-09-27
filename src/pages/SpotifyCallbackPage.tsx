import { useEffect } from "react";

export default function SpotifyCallbackPage() {
  useEffect(() => {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const token = params.get("access_token");
    const expiresIn = params.get("expires_in");
    const error = params.get("error");

    if (error) {
      // Send error message to parent window
      if (window.opener) {
        window.opener.postMessage({
          type: 'SPOTIFY_AUTH_ERROR',
          error: error
        }, window.location.origin);
      }
      window.close();
      return;
    }

    if (token) {
      // Send success message to parent window
      if (window.opener) {
        window.opener.postMessage({
          type: 'SPOTIFY_AUTH_SUCCESS',
          access_token: token,
          expires_in: expiresIn ? parseInt(expiresIn) : 3600
        }, window.location.origin);
      }
      window.close();
    } else {
      // No token found, close popup
      if (window.opener) {
        window.opener.postMessage({
          type: 'SPOTIFY_AUTH_ERROR',
          error: 'No access token received'
        }, window.location.origin);
      }
      window.close();
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold mb-2">Connecting to Spotify...</h2>
        <p className="text-gray-400">Please wait while we authenticate your account.</p>
      </div>
    </div>
  );
}
