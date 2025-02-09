import axios, { AxiosError } from "axios";

// Types
interface TokenResponse {
  access_token: string;
  refresh_token?: string;
}

interface SpotifyUser {
  id: string;
  display_name: string;
}

// Generate the authorization URL
export const getAuthorizationUrl = (): string => {
  const scopes = [
    "playlist-modify-public",
    "playlist-modify-private",
    "playlist-read-private",
    "user-read-email",
    "user-read-private",
  ];

  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID!,
    response_type: "code",
    redirect_uri: process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI!,
    scope: scopes.join(" "),
    show_dialog: "true",
  });

  return `https://accounts.spotify.com/authorize?${params.toString()}`;
};

// Initialize Spotify authentication
export const exchangeCodeForToken = async (code: string): Promise<string> => {
  const redirectUri = `${window.location.origin}/callback/spotify/`;

  try {
    const response = await fetch("/api/spotify/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, redirectUri }),
    });

    const data: TokenResponse = await response.json();
    console.log("Token exchange response:", data);

    if (data.access_token) {
      localStorage.setItem("spotifyAccessToken", data.access_token);
      if (data.refresh_token) {
        localStorage.setItem("spotifyRefreshToken", data.refresh_token);
      }
      await verifySpotifyUser(data.access_token);
      return data.access_token;
    } else {
      throw new Error("Invalid token response: " + JSON.stringify(data));
    }
  } catch (error) {
    console.error("Error exchanging code for token:", error);
    throw error;
  }
};

// Verify Spotify user registration
export const verifySpotifyUser = async (accessToken: string): Promise<void> => {
  try {
    const response = await axios.get<SpotifyUser>(
      "https://api.spotify.com/v1/me",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    console.log("User verified:", response.data);
  } catch (error) {
    console.error("Error verifying Spotify user:", error);
    localStorage.removeItem("spotifyAccessToken");
    localStorage.removeItem("spotifyRefreshToken");
    window.location.href = getAuthorizationUrl();
  }
};

// Refresh the access token using the refresh token
export const refreshAccessToken = async (
  refreshToken: string
): Promise<string> => {
  if (!refreshToken) {
    throw new Error("No refresh token found. Starting authentication flow.");
  }

  try {
    const response = await axios.post<TokenResponse>(
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

    if (response.data.access_token) {
      localStorage.setItem("spotifyAccessToken", response.data.access_token);
      if (response.data.refresh_token) {
        localStorage.setItem(
          "spotifyRefreshToken",
          response.data.refresh_token
        );
      }
      await verifySpotifyUser(response.data.access_token);
      return response.data.access_token;
    } else {
      throw new Error("Invalid token response");
    }
  } catch (error) {
    console.error("Error refreshing access token:", error);
    localStorage.removeItem("spotifyAccessToken");
    localStorage.removeItem("spotifyRefreshToken");
    throw error;
  }
};

export const searchSpotifyTrack = async (
  artist: string,
  title: string,
  spotifyAccessToken: string,
  refreshToken: string // Add refreshToken as a parameter
): Promise<string | null> => {
  console.log("Searching for track on Spotify...");

  try {
    const simplifiedTitle = title.replace(/\(.*\)/, "").trim();
    const query = `track:${simplifiedTitle} artist:${artist}`;

    const response = await axios.get("https://api.spotify.com/v1/search", {
      headers: {
        Authorization: `Bearer ${spotifyAccessToken}`,
      },
      params: {
        q: query,
        type: "track",
        limit: 1,
      },
    });

    if (response.data.tracks.items.length > 0) {
      return response.data.tracks.items[0].uri;
    }
    return null;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;

      if (axiosError.response?.status === 401) {
        // Token expired, refresh it
        console.log("Access token expired. Refreshing token...");
        const newAccessToken = await refreshAccessToken(refreshToken);

        // Retry the request with the new access token
        const retryResponse = await axios.get(
          "https://api.spotify.com/v1/search",
          {
            headers: {
              Authorization: `Bearer ${newAccessToken}`,
            },
            params: {
              q: `track:${title.replace(/\(.*\)/, "").trim()} artist:${artist}`,
              type: "track",
              limit: 1,
            },
          }
        );

        if (retryResponse.data.tracks.items.length > 0) {
          return retryResponse.data.tracks.items[0].uri;
        }
        return null;
      } else {
        console.error("Error searching for track on Spotify:", axiosError);
        throw new Error("Failed to search for track on Spotify.");
      }
    } else {
      console.error("Unknown error:", error);
      throw new Error("An unknown error occurred.");
    }
  }
};
