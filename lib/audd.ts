// Types for environment variables
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NEXT_PUBLIC_AUDD_API_KEY: string;
    }
  }
}

if (!process.env.NEXT_PUBLIC_AUDD_API_KEY) {
  throw new Error("Missing AUDD_API_KEY environment variable");
}

const API_KEY = process.env.NEXT_PUBLIC_AUDD_API_KEY;

// Type for AudD API response
interface AudDResponse {
  status: string;
  result: {
    title: string;
    artist: string;
    // Add other fields as needed
  } | null;
}

export const recognizeSong = async (
  audioBlob: Blob
): Promise<AudDResponse | null> => {
  if (!API_KEY) {
    console.error("AudD API key is not configured");
    return null;
  }

  try {
    const formData = new FormData();
    formData.append("file", audioBlob, "recording.wav");
    formData.append("api_token", API_KEY);

    const response = await fetch("https://api.audd.io/", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const data: AudDResponse = await response.json();
    return data;
  } catch (error) {
    console.error("Error recognizing song:", error);
    return null;
  }
};
