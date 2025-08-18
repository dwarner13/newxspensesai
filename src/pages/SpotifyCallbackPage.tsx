import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function SpotifyCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const token = params.get("access_token");

    if (token) {
      localStorage.setItem("spotify_access_token", token);
      navigate("/spotify-player");
    }
  }, [navigate]);

  return <div className="text-white p-10">Connecting to Spotify...</div>;
}
