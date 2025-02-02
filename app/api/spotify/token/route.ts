import { NextResponse } from "next/server";
import axios from "axios";

export async function POST(req: Request) {
  const { code, redirectUri } = await req.json();

  // Validate request body
  if (!code || !redirectUri) {
    console.error("Missing code or redirectUri in request body.");
    return NextResponse.json(
      { error: "Invalid request: code and redirectUri are required" },
      { status: 400 }
    );
  }

  try {
    const requestBody = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID!, // Use your Spotify client ID
      client_secret: process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_SECRET!,
    });

    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      requestBody,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    console.log("Spotify API response:", response.data);
    return NextResponse.json(response.data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Spotify API error response:", error.response?.data);
      return NextResponse.json(
        { error: "Spotify API error", details: error.response?.data },
        { status: 500 }
      );
    } else {
      console.error("Unexpected error:", error);
      return NextResponse.json(
        { error: "Token exchange failed" },
        { status: 500 }
      );
    }
  }
}
