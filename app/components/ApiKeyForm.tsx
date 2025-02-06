import { useRef, FormEvent } from "react";

interface ApiKeyFormProps {
  onApiKeySubmit: (apiKey: string) => void;
}

const ApiKeyForm = ({ onApiKeySubmit }: ApiKeyFormProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const apiKey = inputRef.current?.value.trim();

    if (!apiKey) {
      alert("Please enter an API key.");
      return;
    }

    onApiKeySubmit(apiKey);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-md mx-auto p-6 bg-white shadow-lg rounded-lg border border-gray-200"
    >
      <label className="block mb-2 text-lg font-medium text-gray-700">
        Enter your AudD API Key:
      </label>
      <input
        type="text"
        ref={inputRef}
        required
        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
        placeholder="Your API Key"
      />
      <button
        type="submit"
        className="mt-4 w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition"
      >
        Save
      </button>
      <p className="mt-3 text-gray-600 text-sm">
        Don&apos;t have an API key?{" "}
        <a
          href="https://audd.io/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:underline"
        >
          Get one here
        </a>
        .
      </p>
    </form>
  );
};

export default ApiKeyForm;
