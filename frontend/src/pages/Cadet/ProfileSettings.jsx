import React, { useEffect, useState, useContext } from "react";
import { AuthContext } from "../../contexts/AuthContext";
import axiosClient from "../../api/axiosClient";
import { FiMail, FiPhone, FiHash, FiCalendar, FiEdit3 } from "react-icons/fi";
import ProfilePhotoUploader from "../../components/ProfilePhotoUploader";

export default function ProfileSettings() {
  const { user, setUser } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await axiosClient.get("/api/auth/profile");
        const data = res.data || {};
        // If intake missing but academyYear present, prefill intake for UI
        const normalized = {
          ...data,
          intake:
            (data.intake && data.intake !== "-" ? data.intake : "") ||
            (data.academyYear && data.academyYear !== "-"
              ? data.academyYear
              : ""),
        };
        setProfile(normalized);
      } catch (err) {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  // Split name for editing
  const firstName = profile?.name?.split(" ")[0] || profile?.firstName || "";
  const lastName =
    profile?.name?.split(" ").slice(1).join(" ") || profile?.lastName || "";

  // Fallback: if intake is missing, use academyYear for display/edit
  const intakeValue =
    (profile?.intake && profile.intake !== "-" ? profile.intake : "") ||
    (profile?.academyYear && profile.academyYear !== "-"
      ? profile.academyYear
      : "");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      // Combine first and last name for 'name' field
      const name =
        (profile.firstName || firstName || "") +
        (profile.lastName || lastName
          ? " " + (profile.lastName || lastName)
          : "");
      // Always send serviceNumber for backend lookup
      // Normalize DOB: accept yyyy-MM-dd only
      let dob = profile.dob;
      if (!dob || dob === "-") dob = "";
      if (dob && !/^\d{4}-\d{2}-\d{2}$/.test(dob)) dob = "";
      const payload = {
        ...profile,
        name,
        serviceNumber: profile.serviceNumber,
        // Persist intake; if empty, fall back to academyYear
        intake:
          profile.intake && profile.intake !== "-"
            ? profile.intake
            : profile.academyYear && profile.academyYear !== "-"
            ? profile.academyYear
            : "",
        phone: profile.phone || "",
        dob,
      };
      const res = await axiosClient.put("/api/auth/profile", payload);
      setProfile(res.data);
      setUser && setUser(res.data); // update context if available
      setSuccess("Profile updated successfully!");
      setEdit(false);
    } catch (err) {
      setError("Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-gray-600">Loading profile...</div>;
  }
  if (!profile) {
    return <div className="p-8 text-red-600">Failed to load profile.</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#1e2a55]">
              Profile Settings
            </h1>
            <p className="text-sm text-[#51608f]">
              Manage your personal details and contact information
            </p>
          </div>
          {!edit ? (
            <button
              onClick={() => setEdit(true)}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow"
            >
              <FiEdit3 /> Edit Profile
            </button>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => setEdit(false)}
                className="rounded-xl px-4 py-2 font-semibold border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 shadow-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-xl px-4 py-2 font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {/* Avatar & Basic Info */}
          <div className="bg-white/90 backdrop-blur rounded-2xl shadow border border-gray-100 p-6 flex flex-col items-center md:min-h-[70vh]">
            {/* Replace initial letter avatar with uploader */}
            <ProfilePhotoUploader
              profile={profile}
              onUpdated={(p) => {
                console.log("[ProfileSettings] onUpdated received profile:", p);
                setProfile(p);
                setUser && setUser(p);
                if (p?.photoUrl) {
                  console.log("[ProfileSettings] New photoUrl:", p.photoUrl);
                } else {
                  console.warn(
                    "[ProfileSettings] No photoUrl in updated profile"
                  );
                }
                setSuccess("Photo updated!");
              }}
            />
            <div className="font-bold text-xl text-[#1e2a55] text-center mt-4">
              {(profile.firstName || profile.name?.split(" ")[0] || "") +
                (profile.lastName || profile.name?.split(" ").slice(1).join(" ")
                  ? " " +
                    (profile.lastName ||
                      profile.name?.split(" ").slice(1).join(" "))
                  : "")}
            </div>
            <div className="mt-1 inline-flex items-center gap-1 text-xs text-[#51608f]">
              <FiHash /> {profile.serviceNumber}
            </div>
            {(profile.company && profile.company !== "-") ||
            (profile.platoon && profile.platoon !== "-") ? (
              <div className="mt-3 bg-blue-50 text-blue-800 rounded-full px-3 py-1 text-xs font-bold">
                {profile.company || "-"} • {profile.platoon || "-"}
              </div>
            ) : null}

            <div className="w-full mt-5 space-y-2">
              <div className="flex items-center gap-2 text-gray-700 text-sm">
                <FiMail className="text-blue-600" />
                <span className="truncate">{profile.email}</span>
              </div>
              {profile.phone && profile.phone !== "-" ? (
                <div className="flex items-center gap-2 text-gray-700 text-sm">
                  <FiPhone className="text-blue-600" />
                  <span>{profile.phone}</span>
                </div>
              ) : null}
              {profile.roomNumber && profile.roomNumber !== "-" ? (
                <div className="text-gray-700 text-sm">
                  Room {profile.roomNumber}
                </div>
              ) : null}
            </div>
          </div>

          {/* Personal Info */}
          <div className="bg-white/90 backdrop-blur rounded-2xl shadow border border-gray-100 p-6 col-span-2 md:min-h-[70vh]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-6">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-gray-500">
                  First Name
                </div>
                {edit ? (
                  <input
                    name="firstName"
                    value={profile.firstName ?? firstName}
                    onChange={handleChange}
                    className="mt-1 border rounded-xl px-3 h-11 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <div className="mt-1 font-semibold text-[#1e2a55]">
                    {firstName}
                  </div>
                )}
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wide text-gray-500">
                  Last Name
                </div>
                {edit ? (
                  <input
                    name="lastName"
                    value={profile.lastName ?? lastName}
                    onChange={handleChange}
                    className="mt-1 border rounded-xl px-3 h-11 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <div className="mt-1 font-semibold text-[#1e2a55]">
                    {lastName || "-"}
                  </div>
                )}
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wide text-gray-500">
                  Email Address
                </div>
                {edit ? (
                  <input
                    name="email"
                    value={profile.email}
                    onChange={handleChange}
                    className="mt-1 border rounded-xl px-3 h-11 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <div className="mt-1 font-semibold text-[#1e2a55] flex items-center gap-2">
                    <FiMail className="text-blue-600" /> {profile.email}
                  </div>
                )}
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wide text-gray-500">
                  Service Number
                </div>
                {edit ? (
                  <input
                    name="serviceNumber"
                    value={profile.serviceNumber}
                    className="mt-1 border rounded-xl px-3 h-11 w-full bg-gray-100 cursor-not-allowed"
                    disabled
                    readOnly
                  />
                ) : (
                  <div className="mt-1 font-semibold text-[#1e2a55] flex items-center gap-2">
                    <FiHash className="text-blue-600" /> {profile.serviceNumber}
                  </div>
                )}
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wide text-gray-500">
                  Intake
                </div>
                {edit ? (
                  <input
                    name="intake"
                    value={profile.intake ?? intakeValue}
                    onChange={handleChange}
                    className="mt-1 border rounded-xl px-3 h-11 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <div className="mt-1 font-semibold text-[#1e2a55]">
                    {intakeValue || "-"}
                  </div>
                )}
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wide text-gray-500">
                  Mobile Number
                </div>
                {edit ? (
                  <input
                    name="phone"
                    value={profile.phone || ""}
                    onChange={handleChange}
                    className="mt-1 border rounded-xl px-3 h-11 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <div className="mt-1 font-semibold text-[#1e2a55] flex items-center gap-2">
                    <FiPhone className="text-blue-600" /> {profile.phone || "-"}
                  </div>
                )}
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wide text-gray-500">
                  Date of Birth
                </div>
                {edit ? (
                  <input
                    type="date"
                    name="dob"
                    value={
                      profile.dob && profile.dob !== "-" ? profile.dob : ""
                    }
                    onChange={handleChange}
                    className="mt-1 border rounded-xl px-3 h-11 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <div className="mt-1 font-semibold text-[#1e2a55] flex items-center gap-2">
                    <FiCalendar className="text-blue-600" />{" "}
                    {profile.dob && profile.dob !== "-" ? profile.dob : "-"}
                  </div>
                )}
              </div>
            </div>

            {/* Feedback messages */}
            <div className="mt-4">
              {edit && (
                <div className="text-xs text-gray-500">
                  Tip: Double‑check your email and phone number before saving.
                </div>
              )}
              {!edit && success && (
                <div className="text-green-700 font-semibold mt-2">
                  {success}
                </div>
              )}
              {!edit && error && (
                <div className="text-red-600 font-semibold mt-2">{error}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
