import axios, { AxiosError } from "axios";
import { searchSpotifyTrack } from "lib/spotify";
import { useCallback } from "react";

interface SongData {
  artist: string;
  title: string;
}

interface Playlist {
  id: string;
  name: string;
}

interface SpotifyPlaylistResponse {
  items: Array<{ id: string; name: string }>;
}

export const useSpotify = () => {
  const refreshAccessToken = useCallback(async (refreshToken: string) => {
    try {
      const response = await axios.post(
        "https://accounts.spotify.com/api/token",
        new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
          client_id: process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID!,
          client_secret: process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_SECRET!,
        }),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      return response.data.access_token;
    } catch (error) {
      console.error("Error refreshing access token:", error);
      throw new Error("Failed to refresh access token.");
    }
  }, []);
  const addToSpotify = useCallback(
    async (
      songData: SongData,
      spotifyAccessToken: string,
      playlistId: string,
      spotifyRefeshToken: string
    ) => {
      const attemptAddTrack = async (token: string) => {
        const trackUri = await searchSpotifyTrack(
          songData.artist,
          songData.title,
          token,
          spotifyRefeshToken
        );
        if (!trackUri) {
          throw new Error("Track not found on Spotify.");
        }
        await axios.post(
          `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
          { uris: [trackUri] },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
        console.log("Song added to Spotify playlist!");
      };

      try {
        await attemptAddTrack(spotifyAccessToken);
      } catch (error) {
        if (axios.isAxiosError(error)) {
          if (error.response?.status === 401) {
            // Token expired, try refreshing
            try {
              const newAccessToken = await refreshAccessToken(
                spotifyRefeshToken
              );
              await attemptAddTrack(newAccessToken); // Retry with the new token
            } catch (error) {
              console.log(error);
              throw new Error("Session expired. Please log in again.");
            }
          } else {
            throw new Error("Failed to add song to Spotify playlist.");
          }
        } else {
          throw new Error("Failed to add song to Spotify playlist.");
        }
      }
    },
    [refreshAccessToken]
  );

  const getUserPlaylists = useCallback(
    async (
      spotifyAccessToken: string,
      refreshToken: string
    ): Promise<Playlist[]> => {
      if (!spotifyAccessToken) {
        console.error("No Spotify access token found.");
        return [];
      }

      try {
        const response = await axios.get<SpotifyPlaylistResponse>(
          "https://api.spotify.com/v1/me/playlists",
          {
            headers: {
              Authorization: `Bearer ${spotifyAccessToken}`,
            },
          }
        );

        return response.data.items.map((item) => ({
          id: item.id,
          name: item.name,
        }));
      } catch (error) {
        const axiosError = error as AxiosError;

        if (axiosError.response?.status === 401) {
          const newAccessToken = await refreshAccessToken(refreshToken);

          const retryResponse = await axios.get<SpotifyPlaylistResponse>(
            "https://api.spotify.com/v1/me/playlists",
            {
              headers: {
                Authorization: `Bearer ${newAccessToken}`,
              },
            }
          );

          return retryResponse.data.items.map((item) => ({
            id: item.id,
            name: item.name,
          }));
        } else {
          throw new Error("Failed to fetch playlists.");
        }
      }
    },
    [refreshAccessToken]
  );

  return { addToSpotify, getUserPlaylists };
};
