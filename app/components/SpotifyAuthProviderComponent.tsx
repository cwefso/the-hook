// app/components/SpotifyAuthProvider.tsx
"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
// import { initializeSpotifyAuth } from "../../lib/spotify";

export default function SpotifyAuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  useEffect(() => {
    // Don't initialize on the callback page to avoid redirect loops
    if (pathname !== "/callback") {
      try {
        // initializeSpotifyAuth();
      } catch (error) {
        console.error("Failed to initialize Spotify auth:", error);
      }
    }
  }, [pathname]);

  return <>{children}</>;
}
