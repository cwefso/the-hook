import axios from "axios";
import { searchSpotifyTrack } from "lib/spotify";

export const useSpotify = () => {
  const addToSpotify = async (
    songData: { artist: string; title: string },
    spotifyAccessToken: string
  ) => {
    if (!spotifyAccessToken) {
      console.error("No Spotify access token found.");
      return;
    }

    try {
      const trackUri = await searchSpotifyTrack(
        songData.artist,
        songData.title,
        spotifyAccessToken
      );
      if (!trackUri) {
        throw new Error("Track not found on Spotify.");
      }
      const playlistId = "0qiJyAxESNqy4AynkpHerX";
      await axios.post(
        `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
        { uris: [trackUri] },
        {
          headers: {
            Authorization: `Bearer ${spotifyAccessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      alert("Song added to Spotify playlist!");
    } catch (error) {
      console.error("Error adding song to Spotify playlist:", error);
      alert("Failed to add song to Spotify playlist.");
    }
  };

  return { addToSpotify };
};
