import axios from "axios";
import { searchSpotifyTrack } from "lib/spotify";

export const useSpotify = () => {
  const addToSpotify = async (
    songData: { artist: string; title: string },
    spotifyAccessToken: string,
    playlistId: string
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

      console.log("Song added to Spotify playlist!");
    } catch (error) {
      console.error("Error adding song to Spotify playlist:", error);
      console.log("Failed to add song to Spotify playlist.");
    }
  };

  const getUserPlaylists = async (spotifyAccessToken: string) => {
    try {
      const response = await axios.get(
        "https://api.spotify.com/v1/me/playlists",
        {
          headers: {
            Authorization: `Bearer ${spotifyAccessToken}`,
          },
        }
      );
      return response.data.items;
    } catch (error) {
      console.error("Error fetching playlists:", error);
      return [];
    }
  };

  return { addToSpotify, getUserPlaylists };
};
