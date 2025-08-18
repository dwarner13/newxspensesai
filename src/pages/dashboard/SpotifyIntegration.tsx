import { getSpotifyAuthURL } from "@/utils/SpotifyAuth";

export default function SpotifyIntegration() {
  const handleConnect = () => {
    window.location.href = getSpotifyAuthURL();
  };

  return (
    <div className="p-8 text-white min-h-screen bg-gradient-to-br from-[#0f172a] to-[#1e293b]">
      <h1 className="text-3xl font-bold mb-6">Spotify Integration</h1>
      <p className="text-slate-400 mb-8">Control your music while budgeting</p>

      <div className="rounded-xl bg-green-700/90 p-6 mb-10 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Spotify Account</h2>
          <p className="text-sm text-slate-100">Connect your Spotify for seamless music control</p>
        </div>
        <button
          className="bg-green-500 hover:bg-green-400 text-slate-900 font-semibold px-6 py-2 rounded-lg shadow"
          onClick={handleConnect}
        >
          🎵 Connect Spotify
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <PlaylistCard
          title="Budgeting Beats"
          description="Lo-fi music designed for focused financial planning"
          color="from-blue-600 to-indigo-500"
          playlistUri="spotify:playlist:YOUR_LOFI_PLAYLIST_ID"
        />
        <PlaylistCard
          title="Goal Setting Grooves"
          description="Motivational tracks for achieving financial goals"
          color="from-emerald-500 to-teal-400"
          playlistUri="spotify:playlist:YOUR_GOAL_PLAYLIST_ID"
        />
        <PlaylistCard
          title="Stress Relief Sounds"
          description="Calming music for financial wellness sessions"
          color="from-pink-500 to-purple-500"
          playlistUri="spotify:playlist:YOUR_CALM_PLAYLIST_ID"
        />
      </div>
    </div>
  );
}

function PlaylistCard({ title, description, color, playlistUri }: any) {
  const handlePlay = () => {
    // Placeholder: open playlist in new tab
    const spotifyUrl = `https://open.spotify.com/playlist/${playlistUri.split(":").pop()}`;
    window.open(spotifyUrl, "_blank");
  };

  return (
    <div className={`rounded-xl p-6 bg-gradient-to-br ${color} shadow-lg`}>
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="text-sm mt-1 mb-4">{description}</p>
      <button
        className="bg-white text-black px-4 py-2 rounded-md text-sm font-semibold hover:bg-slate-100"
        onClick={handlePlay}
      >
        ▶️ Play Playlist
      </button>
    </div>
  );
}
