"use client";

import { useState } from "react";

export default function PatInput() {
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    const response = await fetch("/api/github/pat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    const data = await response.json();

    if (response.ok) {
      setSuccess(true);
      setToken("");
    } else {
      setError(data.error || "Failed to save token");
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="ghp_..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          disabled={loading}
        />
        <p className="text-xs text-gray-500 mt-1">
          <a
            href="https://github.com/settings/tokens/new?scopes=repo,user:email&description=Eng%20Coach"
            target="_blank"
            className="text-blue-600 hover:underline"
          >
            Create a Classic PAT
          </a>{" "}
          with 'repo' scope
        </p>
      </div>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      {success && (
        <div className="text-green-600 text-sm">
          ✓ Token saved successfully!
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !token}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Saving..." : "Save Token"}
      </button>
    </form>
  );
}
