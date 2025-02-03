"use client"; // Ensure this is a client component

import { useUser } from "@clerk/nextjs";
import { SignInButton, UserButton } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import LoadingSpinner from "./LoadingSpinner";

export default function AuthButtons() {
  const { isSignedIn, isLoaded } = useUser();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isLoaded) {
    return <LoadingSpinner />;
  }

  return <>{isSignedIn ? <UserButton /> : <SignInButton />}</>;
}
