"use client"; // Mark as a Client Component

import { useState } from "react";
import { recognizeSong } from "../lib/audd";
import { getAuthorizationUrl } from "../lib/spotify";
import { ClipLoader } from "react-spinners"; // Import a spinner
import { FaCheckCircle } from "react-icons/fa"; // Import a check mark icon
import { useUser } from "@clerk/nextjs";
import { useSpotify } from "./hooks/useSpotify";

export default function Home() {
  const [isListening, setIsListening] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [songDetails, setSongDetails] = useState<{
    title: string;
    artist: string;
  } | null>(null);
  const { isSignedIn, user } = useUser();

  if (!isSignedIn) {
    return <p>Please sign in to use the app.</p>;
  }

  // useEffect(() => {
  //   console.log("is listening: ", isListening);
  // }, [isListening]);

  const { addToSpotify } = useSpotify();
  const spotifyAccessToken = user?.unsafeMetadata.spotifyAccessToken as string;

  const handleAddToSpotify = async (songData: {
    artist: string;
    title: string;
  }) => {
    await addToSpotify(songData, spotifyAccessToken);
  };

  const startListening = async () => {
    setIsListening(true);

    try {
      // Check for browser support
      if (!navigator.mediaDevices || !window.MediaRecorder) {
        console.log("Your browser does not support audio recording.");
        setIsListening(false); // Reset state if recording is not supported
        return;
      }

      // Record audio using the Web Audio API
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: "audio/wav" });

        // Send audio to AudD API
        const songData = await recognizeSong(blob);
        if (songData && songData.result) {
          const { title, artist } = songData.result;
          console.log(`Song Recognized: ${title} by ${artist}`);
          await handleAddToSpotify(songData.result);
          setSongDetails({ title, artist }); // Set song details
          setIsSuccess(true); // Set success state
          setTimeout(() => {
            setIsSuccess(false);
            setSongDetails(null); // Reset song details after 3 seconds
          }, 3000); // Reset after 3 seconds
        } else {
          console.log("No song recognized.");
        }
        setIsListening(false); // Reset state after processing is complete
      };

      mediaRecorder.start();
      setTimeout(() => mediaRecorder.stop(), 10000); // Record for 10 seconds
    } catch (error) {
      console.error("Error recording audio:", error);
      console.log("Failed to record audio.");
      setIsListening(false); // Reset state on error
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1>Welcome, {user.firstName}!</h1>
      <button
        onClick={() => (window.location.href = getAuthorizationUrl())}
        className="px-6 py-2 bg-green-500 text-white rounded-lg"
      >
        Connect Spotify
      </button>
      {isListening ? (
        <div className="flex flex-col items-center">
          <ClipLoader color="#3b82f6" size={40} /> {/* Loading spinner */}
          <p className="mt-2">Listening...</p>
        </div>
      ) : isSuccess ? (
        <div className="flex flex-col items-center">
          <FaCheckCircle className="text-green-500 text-4xl" />{" "}
          {/* Green check mark */}
          <p className="mt-2">Song added to playlist!</p>
          {songDetails && (
            <p className="mt-2 text-center">
              {songDetails.title} by {songDetails.artist}
            </p>
          )}
        </div>
      ) : (
        <button
          onClick={startListening}
          disabled={isListening}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg disabled:bg-gray-400"
        >
          Recognize Song
        </button>
      )}
    </div>
  );
}
