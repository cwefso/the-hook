"use client";

import { useState, useEffect } from "react";
import { recognizeSong } from "../lib/audd";
import { getAuthorizationUrl } from "../lib/spotify";
import { ClipLoader } from "react-spinners";
import { FaCheckCircle } from "react-icons/fa";
import { useUser } from "@clerk/nextjs";
import { useSpotify } from "./hooks/useSpotify";

interface SongDetails {
  title: string;
  artist: string;
}

interface Playlist {
  id: string;
  name: string;
}

export default function Home() {
  const [isListening, setIsListening] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [songDetails, setSongDetails] = useState<SongDetails | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<string>("");
  const { isSignedIn, user } = useUser();

  const { addToSpotify, getUserPlaylists } = useSpotify();

  const spotifyAccessToken = user?.unsafeMetadata.spotifyAccessToken as string;
  const spotifyRefreshToken = user?.unsafeMetadata
    .spotifyRefreshToken as string;

  useEffect(() => {
    if (isSignedIn) {
      const fetchPlaylists = async () => {
        try {
          const playlists = await getUserPlaylists(
            spotifyAccessToken,
            spotifyRefreshToken
          );
          setPlaylists(playlists);
          setSelectedPlaylist(playlists[0].id);
        } catch (error) {
          console.error("Failed to fetch playlists:", error);
        }
      };

      fetchPlaylists();
    }
  }, [getUserPlaylists, spotifyAccessToken, spotifyRefreshToken, isSignedIn]);

  if (!isSignedIn) {
    return <p>Please sign in to use the app.</p>;
  }

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

        const songData = await recognizeSong(blob);
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
      setTimeout(() => mediaRecorder.stop(), 10000);
    } catch (error) {
      console.error("Error recording audio:", error);
      console.log("Failed to record audio.");
      setIsListening(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      {!spotifyAccessToken && (
        <button
          onClick={() => (window.location.href = getAuthorizationUrl())}
          className="px-6 py-2 bg-green-500 text-white rounded-lg"
        >
          Connect Spotify
        </button>
      )}
      {spotifyAccessToken && playlists.length > 0 && (
        <>
          <h1>Select your playlist</h1>
          <select
            value={selectedPlaylist}
            onChange={(e) => setSelectedPlaylist(e.target.value)}
            className="px-4 py-2 border rounded-md my-2 text-black w-[50%] lg:w-[25%]"
          >
            {playlists.map((playlist) => (
              <option key={playlist.id} value={playlist.id}>
                {playlist.name}
              </option>
            ))}
          </select>
        </>
      )}
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
  );
}
