"use client";

import { useState, useEffect } from "react";
import { recognizeSong } from "../lib/audd";
import { getAuthorizationUrl } from "../lib/spotify";
import { ClipLoader } from "react-spinners";
import { FaCheckCircle } from "react-icons/fa";
import { SignInButton, useUser } from "@clerk/nextjs";
import { useSpotify } from "./hooks/useSpotify";
import ApiKeyForm from "./components/ApiKeyForm";

interface SongDetails {
  title: string;
  artist: string;
}

interface Playlist {
  id: string;
  name: string;
}

// Define the steps in the setup process
enum SetupStep {
  SIGN_IN, // Clerk sign-in
  ENTER_AUDD_API_KEY, // Enter AudD API key
  CONNECT_SPOTIFY, // Connect Spotify
  SELECT_PLAYLIST, // Select a playlist
  READY, // Ready to recognize songs
}

export default function Home() {
  const [isListening, setIsListening] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [songDetails, setSongDetails] = useState<SongDetails | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<string>("");
  const [auddApiKey, setAuddApiKey] = useState<string>("");
  const [currentStep, setCurrentStep] = useState<SetupStep>(SetupStep.SIGN_IN);
  const { isSignedIn, user } = useUser();

  const { addToSpotify, getUserPlaylists } = useSpotify();

  const spotifyAccessToken = user?.unsafeMetadata.spotifyAccessToken as string;
  const spotifyRefreshToken = user?.unsafeMetadata
    .spotifyRefreshToken as string;

  useEffect(() => {
    if (selectedPlaylist) {
      setCurrentStep(SetupStep.READY);
    }
  }, [selectedPlaylist]);

  // Step 1: Check if the user is signed in
  useEffect(() => {
    if (isSignedIn) {
      setCurrentStep(SetupStep.ENTER_AUDD_API_KEY);
    }
  }, [isSignedIn]);

  // Step 2: Fetch the API key from the user's metadata when the component mounts
  useEffect(() => {
    if (user) {
      console.log(user);
      const storedApiKey = user.unsafeMetadata.auddApiKey as string;
      if (storedApiKey) {
        setAuddApiKey(storedApiKey);
        localStorage.setItem("AUDD_API_KEY", storedApiKey); // Save to localStorage
      }
    }
  }, [user]);

  useEffect(() => {
    if (auddApiKey) {
      setCurrentStep(SetupStep.CONNECT_SPOTIFY); // Move to the next step
    }
  }, [auddApiKey]);

  // Step 3: Connect Spotify account
  useEffect(() => {
    if (currentStep === SetupStep.CONNECT_SPOTIFY && spotifyAccessToken) {
      setCurrentStep(SetupStep.SELECT_PLAYLIST);
    }
  }, [currentStep, spotifyAccessToken]);

  // Step 4: Fetch playlists when Spotify is connected
  useEffect(() => {
    if (currentStep === SetupStep.SELECT_PLAYLIST && isSignedIn) {
      const fetchPlaylists = async () => {
        try {
          const playlists = await getUserPlaylists(
            spotifyAccessToken,
            spotifyRefreshToken
          );
          setPlaylists(playlists);
        } catch (error) {
          console.error("Failed to fetch playlists:", error);
        }
      };

      fetchPlaylists();
    }
  }, [
    currentStep,
    getUserPlaylists,
    spotifyAccessToken,
    spotifyRefreshToken,
    isSignedIn,
  ]);

  const handleApiKeySubmit = async (apiKey: string) => {
    if (user) {
      try {
        // Save the API key to the Clerk user's metadata
        await user.update({
          unsafeMetadata: {
            ...user?.unsafeMetadata,
            auddApiKey: apiKey,
          },
        });
        console.log("API key saved to Clerk user metadata.");
      } catch (error) {
        console.error("Failed to save API key to Clerk user metadata:", error);
        return;
      }
    }
    // Save the API key to localStorage
    localStorage.setItem("AUDD_API_KEY", apiKey);
    setAuddApiKey(apiKey);
    setCurrentStep(SetupStep.CONNECT_SPOTIFY); // Move to the next step
  };

  const handleSpotifyConnect = () => {
    window.location.href = getAuthorizationUrl();
  };

  const handlePlaylistSelect = () => {
    setCurrentStep(SetupStep.READY); // Move to the final step
  };

  const startListening = async () => {
    setIsListening(true);

    try {
      if (!navigator.mediaDevices || !window.MediaRecorder) {
        console.log("Your browser does not support audio recording.");
        setIsListening(false);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e: BlobEvent) => chunks.push(e.data);
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: "audio/wav" });

        const songData = await recognizeSong(blob, auddApiKey); // Pass the API key
        if (songData && songData.result) {
          const { title, artist } = songData.result;
          console.log(`Song Recognized: ${title} by ${artist}`);
          await addToSpotify(
            songData.result,
            spotifyAccessToken,
            selectedPlaylist,
            spotifyRefreshToken
          );
          setSongDetails({ title, artist });
          setIsSuccess(true);
          setTimeout(() => {
            setIsSuccess(false);
            setSongDetails(null);
          }, 3000);
        } else {
          console.log("No song recognized.");
        }
        setIsListening(false);
      };

      mediaRecorder.start();
      setTimeout(() => mediaRecorder.stop(), 5000);
    } catch (error) {
      console.error("Error recording audio:", error);
      console.log("Failed to record audio.");
      setIsListening(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen overflow-y-hidden p-4">
      {/* Step 1: Sign in with Clerk */}
      {currentStep === SetupStep.SIGN_IN && (
        <div>
          <h1>Welcome to Hook</h1>
          <div className="py-2 px-4 border border-white rounded-md flex justify-center m-4 text-lg">
            <SignInButton />
          </div>
        </div>
      )}

      {/* Step 2: Enter AudD API Key */}
      {currentStep === SetupStep.ENTER_AUDD_API_KEY && (
        <div>
          <h1>Enter Your AudD API Key</h1>
          <ApiKeyForm onApiKeySubmit={handleApiKeySubmit} />
        </div>
      )}

      {/* Step 3: Connect Spotify */}
      {currentStep === SetupStep.CONNECT_SPOTIFY && (
        <div>
          <h1>Connect Your Spotify Account</h1>
          <button
            onClick={handleSpotifyConnect}
            className="px-6 py-2 bg-green-500 text-white rounded-lg"
          >
            Connect Spotify
          </button>
        </div>
      )}

      {/* Step 4: Select a Playlist */}
      {currentStep === SetupStep.SELECT_PLAYLIST && (
        <div className="flex flex-col justify-center items-center">
          <h1>Select Your Playlist</h1>
          <select
            value={selectedPlaylist}
            onChange={(e) => setSelectedPlaylist(e.target.value)}
            className="px-4 py-2 border rounded-md my-2 text-black "
          >
            {playlists.map((playlist) => (
              <option key={playlist.id} value={playlist.id}>
                {playlist.name}
              </option>
            ))}
          </select>
          <button
            onClick={handlePlaylistSelect}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg mt-4"
          >
            Confirm Playlist
          </button>
        </div>
      )}

      {/* Step 5: Ready to Recognize Songs */}
      {currentStep === SetupStep.READY && (
        <div>
          {isListening ? (
            <div className="flex flex-col items-center">
              <ClipLoader color="#3b82f6" size={40} />
              <p className="mt-2">Listening...</p>
            </div>
          ) : isSuccess ? (
            <div className="flex flex-col items-center">
              <FaCheckCircle className="text-green-500 text-4xl" />
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
      )}
    </div>
  );
}
