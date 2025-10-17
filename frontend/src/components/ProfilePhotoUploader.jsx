import React, { useRef, useState, useCallback, useEffect } from "react";
import axiosClient from "../api/axiosClient";

// Simple profile photo uploader (click-to-select) with multipart primary upload
// and base64 fallback (for legacy / 404 scenarios). Shows progress & allows
// cancel via ESC. Drag & drop removed per user request.
export default function ProfilePhotoUploader({ profile, onUpdated }) {
  const fileInputRef = useRef(null);
  const abortRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState(false); // still used internally
  const [removedFlash, setRemovedFlash] = useState(false);
  const containerRef = useRef(null);

  const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
  const rawPhoto = preview || profile?.photoUrl || "";
  let currentPhoto = rawPhoto;
  if (!preview && rawPhoto && !/^https?:\/\//i.test(rawPhoto)) {
    currentPhoto =
      API_BASE.replace(/\/$/, "") +
      (rawPhoto.startsWith("/") ? rawPhoto : "/" + rawPhoto);
  }
  if (!preview && /\/api\/auth\/profile\/photo$/.test(currentPhoto)) {
    currentPhoto = ""; // guard against wrong endpoint being used as image
  }

  useEffect(() => {
    if (!preview) {
      console.log(
        "[ProfilePhotoUploader] Displaying photo URL:",
        currentPhoto || "<none>"
      );
    }
  }, [preview, currentPhoto]);

  const validateAndPreview = useCallback(
    (file) => {
      setError("");
      if (!file) return false;
      if (!file.type.startsWith("image/")) {
        setError("Please select an image file.");
        return false;
      }
      const MAX_MB = 8;
      if (file.size > MAX_MB * 1024 * 1024) {
        setError(`Image must be less than ${MAX_MB}MB.`);
        return false;
      }
      if (preview) URL.revokeObjectURL(preview);
      setPreview(URL.createObjectURL(file));
      return true;
    },
    [preview]
  );

  const performUpload = useCallback(
    async (file) => {
      if (!file) return;
      setUploading(true);
      setProgress(5);
      setError("");
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const form = new FormData();
        form.append("photo", file);
        if (profile?.serviceNumber)
          form.append("serviceNumber", profile.serviceNumber);
        let data;
        try {
          const resp = await axiosClient.post("/api/auth/profile/photo", form, {
            signal: controller.signal,
            onUploadProgress: (e) => {
              if (e.total) {
                const pct = Math.min(
                  99,
                  Math.round((e.loaded / e.total) * 100)
                );
                setProgress(pct);
              }
            },
          });
          data = resp.data;
        } catch (err) {
          if (err?.response?.status === 404) {
            console.warn(
              "[ProfilePhotoUploader] Multipart 404, using base64 fallback"
            );
            data = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = async () => {
                try {
                  const respLegacy = await axiosClient.put(
                    "/api/auth/profile",
                    {
                      serviceNumber: profile?.serviceNumber,
                      photoBase64: reader.result,
                    },
                    { signal: controller.signal }
                  );
                  resolve(respLegacy.data);
                } catch (legacyErr) {
                  reject(legacyErr);
                }
              };
              reader.onerror = reject;
              reader.readAsDataURL(file);
            });
          } else if (err.name === "CanceledError") {
            throw err;
          } else {
            throw err;
          }
        }
        setProgress(100);
        console.log("[ProfilePhotoUploader] Upload response (final):", data);
        onUpdated && onUpdated(data);
        setTimeout(() => {
          if (preview) URL.revokeObjectURL(preview);
          setPreview(null);
        }, 250);
      } catch (e) {
        if (e?.response?.status === 413) {
          setError("File too large (server limit). Choose a smaller image.");
        } else if (e?.name === "CanceledError") {
          setError("Upload canceled");
        } else {
          setError(e?.response?.data?.error || "Upload failed");
        }
      } finally {
        setUploading(false);
        abortRef.current = null;
        setTimeout(() => setProgress(0), 600);
      }
    },
    [onUpdated, preview, profile?.serviceNumber]
  );

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (validateAndPreview(file)) performUpload(file);
  };
  // Drag & drop removed.

  const handleRemove = async () => {
    try {
      setError("");
      setRemoving(true);
      // Attempt to delete via backend; relies on JWT header from axiosClient
      await axiosClient.delete("/api/auth/profile/photo", {
        data:
          import.meta.env.MODE !== "production"
            ? { serviceNumber: profile?.serviceNumber }
            : undefined,
      });
      if (preview) URL.revokeObjectURL(preview);
      setPreview(null);
      onUpdated &&
        onUpdated({
          ...(profile || {}),
          photoUrl: "",
        });
      setRemovedFlash(true);
      setTimeout(() => setRemovedFlash(false), 1400);
    } catch (e) {
      setError(e?.response?.data?.error || "Failed to remove photo");
    } finally {
      setRemoving(false);
    }
  };

  // Drag-out removal removed. Removal now via button (and Delete key).

  // ESC cancels current upload; Delete removes existing photo
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && abortRef.current) abortRef.current.abort();
      if (e.key === "Delete" || e.key === "Backspace") {
        if (currentPhoto && !uploading && !removing) {
          handleRemove();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [currentPhoto, uploading, removing]);

  return (
    <div
      className="w-full flex flex-col items-center text-center"
      ref={containerRef}
    >
      <div
        className={`relative group w-36 h-36 rounded-full overflow-hidden flex items-center justify-center border shadow-sm mb-4 transition-colors cursor-pointer select-none border-gray-300 bg-gradient-to-br from-gray-100 to-gray-200`}
        onClick={() => fileInputRef.current?.click()}
        title="Click to upload a photo"
      >
        {currentPhoto ? (
          <img
            src={currentPhoto}
            alt="Profile"
            className="w-full h-full object-cover"
            loading="lazy"
            draggable={false}
          />
        ) : (
          <span className="text-sm font-medium text-gray-500 px-2 text-center leading-tight">
            Click to Upload
          </span>
        )}
        {currentPhoto && !uploading && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center text-white text-[11px] font-semibold tracking-wide opacity-0 group-hover:opacity-100 transition-all select-none">
            Change Photo
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 flex flex-col items-center justify-end pointer-events-none">
            <div className="w-full h-1 bg-black/10">
              <div
                className="h-1 bg-blue-600 transition-all duration-150"
                style={{ width: progress + "%" }}
              />
            </div>
          </div>
        )}
        {removedFlash && (
          <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] px-2 py-1 rounded-full shadow animate-pulse select-none">
            🗑️
          </div>
        )}
      </div>

      {/* Visible remove button removed per request; deletion still possible via Delete/Backspace key. */}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {uploading && (
        <p className="text-xs text-blue-600 font-medium animate-pulse">
          Uploading... (Esc to cancel)
        </p>
      )}
      {error && (
        <p className="text-xs text-red-500 font-medium mt-2">{error}</p>
      )}
    </div>
  );
}
