"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { exchangeCodeForToken } from "../../../lib/spotify";
import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
// import { clerkClient } from "@clerk/nextjs/server";

export default function SpotifyCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const { user, isLoaded } = useUser();
  console.log("1. user", user);

  const connectToSpotify = async () => {
    // const clerk = await clerkClient();
    // Retrieve tokens from localStorage
    console.log("2. user", user);
    const spotifyAccessToken = localStorage.getItem("spotifyAccessToken");
    const spotifyRefreshToken = localStorage.getItem("spotifyRefreshToken");

    if (!spotifyAccessToken || !spotifyRefreshToken) {
      console.error("No Spotify tokens found in localStorage.");
      return;
    }
    // Store tokens on the Clerk user object
    try {
      await user?.update({
        unsafeMetadata: {
          spotifyAccessToken: spotifyAccessToken,
          spotifyRefreshToken: spotifyRefreshToken,
        },
      });
      console.log("Spotify tokens stored on Clerk user object.");
    } catch (error) {
      console.error("Failed to update Clerk user metadata:", error);
      return;
    }
  };

  useEffect(() => {
    if (code && isLoaded) {
      exchangeCodeForToken(code)
        .then((accessToken) => {
          connectToSpotify();
          // Store the access token in the user's session or database
          console.log("Spotify access token:", accessToken);
          router.push("/");
        })
        .catch((error) =>
          console.error("Error exchanging code for token:", error)
        );
    }
  }, [code, router, isLoaded]);

  return <p>Loading...</p>;
}
