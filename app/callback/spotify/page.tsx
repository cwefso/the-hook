"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { exchangeCodeForToken } from "../../../lib/spotify";
import { useCallback, useEffect, Suspense } from "react";
import { useUser } from "@clerk/nextjs";

function SpotifyCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const { user, isLoaded } = useUser();

  const connectToSpotify = useCallback(async () => {
    const spotifyAccessToken = localStorage.getItem("spotifyAccessToken");
    const spotifyRefreshToken = localStorage.getItem("spotifyRefreshToken");

    if (!spotifyAccessToken || !spotifyRefreshToken) {
      console.error("No Spotify tokens found in localStorage.");
      return;
    }
    try {
      await user?.update({
        unsafeMetadata: {
          ...user?.unsafeMetadata,
          spotifyAccessToken,
          spotifyRefreshToken,
        },
      });
      console.log("Spotify tokens stored on Clerk user object.");
    } catch (error) {
      console.error("Failed to update Clerk user metadata:", error);
    }
  }, [user]);

  useEffect(() => {
    if (code && isLoaded) {
      exchangeCodeForToken(code)
        .then((accessToken) => {
          connectToSpotify();
          console.log("Spotify access token:", accessToken);
          router.push("/");
        })
        .catch((error) =>
          console.error("Error exchanging code for token:", error)
        );
    }
  }, [code, router, isLoaded, connectToSpotify]);

  return <p>Loading...</p>;
}

export default function SpotifyCallback() {
  return (
    <Suspense fallback={<p>Loading Spotify callback...</p>}>
      <SpotifyCallbackContent />
    </Suspense>
  );
}
