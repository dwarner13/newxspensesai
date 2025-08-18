import { useEffect, useState } from "react";
import axios from "axios";
import { getSpotifyAuthURL } from "../utils/SpotifyAuth";

export default function SpotifyPlayerPage() {
  const [track, setTrack] = useState<any>(null);
  const token = localStorage.getItem("spotify_access_token");

  useEffect(() => {
    if (!token) return;
    axios
      .get("https://api.spotify.com/v1/me/player/currently-playing", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setTrack(res.data))
      .catch((err) => console.error(err));
  }, [token]);

  if (!token) {
    return (
      <div className="p-10 text-white">
        <a
          href={getSpotifyAuthURL()}
          className="rounded-xl bg-green-500 px-6 py-3 font-semibold text-slate-900 hover:bg-green-400"
        >
          Connect to Spotify
        </a>
      </div>
    );
  }

  return (
    <div className="p-10 text-white">
      {track ? (
        <>
          <p className="text-sm text-slate-400">Now Playing:</p>
          <h2 className="text-xl font-bold">{track.item.name}</h2>
          <p>{track.item.artists.map((a: any) => a.name).join(", ")}</p>
          <img
            src={track.item.album.images[0].url}
            alt="Album"
            className="mt-4 w-48 rounded-xl"
          />
        </>
      ) : (
        <p>No track is currently playing.</p>
      )}
    </div>
  );
}
