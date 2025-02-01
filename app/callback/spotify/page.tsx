"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { exchangeCodeForToken } from "../../../lib/spotify";
import { useEffect } from "react";

export default function SpotifyCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");

  useEffect(() => {
    if (code) {
      exchangeCodeForToken(code)
        .then((accessToken) => {
          // Store the access token in the user's session or database
          console.log("Spotify access token:", accessToken);
          router.push("/");
        })
        .catch((error) =>
          console.error("Error exchanging code for token:", error)
        );
    }
  }, [code, router]);

  return <p>Loading...</p>;
}
