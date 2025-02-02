import axios from "axios";

// Generate the authorization URL
export const getAuthorizationUrl = () => {
  const scopes = [
    "playlist-modify-public",
    "playlist-modify-private",
    "playlist-read-private",
  ];

  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID!, // Use your Spotify client ID
    response_type: "code",
    redirect_uri: process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI!, // Dynamic redirect URI
    scope: scopes.join(" "),
    show_dialog: "true", // Always show the login dialog
  });

  return `https://accounts.spotify.com/authorize?${params.toString()}`;
};

// Initialize Spotify authentication
export const exchangeCodeForToken = async (code: string) => {
  const redirectUri = `${window.location.origin}/callback/spotify/`;

  try {
    const response = await fetch("/api/spotify/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, redirectUri }),
    });

    const data = await response.json();
    console.log("Token exchange response:", data);

    if (data.access_token) {
      localStorage.setItem("spotifyAccessToken", data.access_token);
      if (data.refresh_token) {
        localStorage.setItem("spotifyRefreshToken", data.refresh_token);
      }
      return data.access_token;
    } else {
      throw new Error("Invalid token response: " + JSON.stringify(data));
    }
  } catch (error) {
    console.error("Error exchanging code for token:", error);
    throw error;
  }
};

// Refresh the access token using the refresh token
export const refreshAccessToken = async () => {
  const refreshToken = localStorage.getItem("spotifyRefreshToken");

  if (!refreshToken) {
    // If no refresh token exists, start the auth flow again
    throw new Error("No refresh token found. Starting authentication flow.");
  }

  try {
    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID!, // Use your Spotify client ID
        client_secret: process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_SECRET!,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    console.log("response", response);
    if (response.data.access_token) {
      localStorage.setItem("spotifyAccessToken", response.data.access_token);
      // Some implementations also provide a new refresh token
      if (response.data.refresh_token) {
        localStorage.setItem(
          "spotifyRefreshToken",
          response.data.refresh_token
        );
      }

      return response.data.access_token;
    } else {
      throw new Error("Invalid token response");
    }
  } catch (error) {
    console.error("Error refreshing access token:", error);
    // Clear tokens and restart auth flow on refresh failure
    localStorage.removeItem("spotifyAccessToken");
    localStorage.removeItem("spotifyRefreshToken");
    throw error;
  }
};

// Search for a track on Spotify using the artist and title
export const searchSpotifyTrack = async (
  artist: string,
  title: string,
  spotifyAccessToken: unknown
) => {
  const accessToken = spotifyAccessToken;

  if (!accessToken) {
    // Initialize auth if no access token exists
    throw new Error("No access token found. Starting authentication flow.");
  }

  try {
    const simplifiedTitle = title.replace(/\(.*\)/, "").trim(); // Remove anything in parentheses
    const query = `track:${simplifiedTitle} artist:${artist}`;
    const response = await axios.get("https://api.spotify.com/v1/search", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
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
  } catch (error) {
    console.error("Error searching for track on Spotify:", error);
    throw error;
  }
};
