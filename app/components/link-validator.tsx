/**
 * Wiederverwendbare UI-Komponente `link-validator`.
 * Die Komponente kapselt klar abgegrenzte Darstellung und Interaktion, damit sie in mehreren Seiten oder Features einheitlich eingesetzt werden kann.
 */
"use client";

import { useEffect, useState } from "react";

type LinkValidatorProps = {
  type: "youtube" | "spotify" | "soundcloud";
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
};

type ValidationState = "idle" | "loading" | "valid" | "invalid";

function extractEmbedTarget(url: string, type: "youtube" | "spotify" | "soundcloud"): string | null {
  if (!url.trim()) return null;

  try {
    if (type === "youtube") {
      // Handle youtube.com/watch?v=ID or youtu.be/ID
      const watchMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      if (watchMatch?.[1]) return watchMatch[1];
      // Handle youtube.com/embed/ID or youtube-nocookie.com/embed/ID
      const embedMatch = url.match(/youtube(?:-nocookie)?\.com\/embed\/([a-zA-Z0-9_-]{11})/);
      if (embedMatch?.[1]) return embedMatch[1];
      return null;
    }

    if (type === "spotify") {
      if (url.startsWith("spotify:")) {
        const [, resourceType, resourceId] = url.split(":");
        const supportedTypes = new Set(["track", "album", "playlist", "episode", "artist"]);

        if (resourceType && resourceId && supportedTypes.has(resourceType)) {
          return `${resourceType}/${resourceId}`;
        }
      }

      const urlObj = new URL(url);

      if (!urlObj.hostname.includes("spotify.com")) {
        return null;
      }

      const segments = urlObj.pathname.split("/").filter(Boolean);
      const supportedTypes = new Set(["track", "album", "playlist", "episode", "artist"]);
      const typeIndex = segments.findIndex((segment) => supportedTypes.has(segment));

      if (typeIndex >= 0 && segments[typeIndex + 1]) {
        return `${segments[typeIndex]}/${segments[typeIndex + 1]}`;
      }

      return null;
    }

    if (type === "soundcloud") {
      // For SoundCloud, just check if it's a valid soundcloud.com URL
      const urlObj = new URL(url);
      if (urlObj.hostname.includes("soundcloud.com")) return url;
      return null;
    }

    return null;
  } catch {
    return null;
  }
}

function testIframeLoading(url: string, type: "youtube" | "spotify" | "soundcloud"): Promise<boolean> {
  return new Promise((resolve) => {
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.style.width = "0";
    iframe.style.height = "0";

    let loaded = false;

    // Timeout after 5 seconds
    const timeout = setTimeout(() => {
      if (!loaded) {
        resolve(false);
        document.body.removeChild(iframe);
      }
    }, 5000);

    iframe.onload = () => {
      loaded = true;
      clearTimeout(timeout);
      resolve(true);
      document.body.removeChild(iframe);
    };

    iframe.onerror = () => {
      loaded = true;
      clearTimeout(timeout);
      resolve(false);
      document.body.removeChild(iframe);
    };

    try {
      if (type === "youtube") {
        const videoId = extractEmbedTarget(url, type);
        if (!videoId) {
          resolve(false);
          return;
        }
        iframe.src = `https://www.youtube.com/embed/${videoId}`;
      } else if (type === "spotify") {
        const spotifyTarget = extractEmbedTarget(url, type);
        if (!spotifyTarget) {
          resolve(false);
          return;
        }
        iframe.src = `https://open.spotify.com/embed/${spotifyTarget}?utm_source=generator`;
      } else if (type === "soundcloud") {
        iframe.src = `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}`;
      }

      document.body.appendChild(iframe);
    } catch {
      resolve(false);
    }
  });
}

export function LinkValidator({ type, value, onChange, placeholder }: LinkValidatorProps) {
  const [validationState, setValidationState] = useState<ValidationState>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!value.trim()) {
      setValidationState("idle");
      setErrorMessage("");
    }
  }, [value]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    const isEmpty = !value.trim();

    if (isEmpty) {
      return;
    }

    const timer = setTimeout(async () => {
      setValidationState("loading");

      // First check if we can extract an ID/URL
      const extracted = extractEmbedTarget(value, type);
      if (!extracted) {
        setValidationState("invalid");
        if (type === "youtube") {
          setErrorMessage("Ungültiger YouTube-Link");
        } else if (type === "spotify") {
          setErrorMessage("Ungültiger Spotify-Link");
        } else if (type === "soundcloud") {
          setErrorMessage("Ungültiger SoundCloud-Link");
        }
        return;
      }

      // Test if iframe loads
      const isValid = await testIframeLoading(value, type);

      if (isValid) {
        setValidationState("valid");
        setErrorMessage("");
      } else {
        setValidationState("invalid");
        setErrorMessage("Link konnte nicht geladen werden");
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [value, type]);

  return (
    <div className="min-w-0 space-y-2">
      <div className="relative min-w-0">
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={`h-12 w-full rounded-full border bg-transparent px-4 pr-12 text-base outline-none placeholder:text-black/35 transition sm:h-14 sm:px-6 sm:pr-14 sm:text-lg ${
            validationState === "valid"
              ? "border-emerald-500 focus:border-emerald-600"
              : validationState === "invalid"
                ? "border-red-500 focus:border-red-600"
                : "border-black/45 focus:border-black"
          }`}
        />

        {validationState === "loading" && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-black/30 border-t-black" />
          </div>
        )}

        {validationState === "valid" && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-lg text-emerald-600">✓</div>
        )}

        {validationState === "invalid" && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-lg text-red-600">✕</div>
        )}
      </div>

      {validationState === "invalid" && errorMessage && (
        <p className="text-xs text-red-600">{errorMessage}</p>
      )}
    </div>
  );
}
