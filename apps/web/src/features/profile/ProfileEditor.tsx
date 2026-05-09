"use client";

import { useState, useTransition } from "react";
import type { Profile, Sport, UserSportPreference } from "@showup2move/shared";

export function ProfileEditor({
  profile,
  preferences,
  sports
}: Readonly<{
  profile: Profile;
  preferences: UserSportPreference[];
  sports: Sport[];
}>) {
  const [selectedSports, setSelectedSports] = useState(
    new Set(preferences.length ? preferences.map((preference) => preference.sportId) : ["football"])
  );
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit(formData: FormData) {
    const sportPreferences = [...selectedSports].map((sportId) => ({
      sportId,
      skillLevel: String(formData.get(`skill-${sportId}`) ?? "casual"),
      intensity: String(formData.get(`intensity-${sportId}`) ?? "balanced"),
      preferredRoles: String(formData.get(`roles-${sportId}`) ?? "")
        .split(",")
        .map((role) => role.trim())
        .filter(Boolean)
    }));

    const payload = {
      profile: {
        displayName: String(formData.get("displayName") ?? ""),
        bio: String(formData.get("bio") ?? ""),
        avatarUrl: String(formData.get("avatarUrl") ?? ""),
        homeArea: String(formData.get("homeArea") ?? ""),
        preferredRadiusKm: Number(formData.get("preferredRadiusKm") ?? 8),
        locationPrivacy: String(formData.get("locationPrivacy") ?? "approximate"),
        allowsAiProfile: formData.get("allowsAiProfile") === "on",
        coordinates: {
          lat: Number(formData.get("lat") ?? profile.coordinates.lat),
          lng: Number(formData.get("lng") ?? profile.coordinates.lng)
        }
      },
      sportPreferences
    };

    startTransition(async () => {
      const [profileResponse, availabilityResponse] = await Promise.all([
        fetch("/api/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }),
        fetch("/api/availability", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            showUpToday: formData.get("showUpToday") === "on",
            startsAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            endsAt: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
            note: String(formData.get("availabilityNote") ?? "")
          })
        })
      ]);

      setMessage(
        profileResponse.ok && availabilityResponse.ok
          ? "Profile saved."
          : "Could not save every change."
      );
    });
  }

  return (
    <form action={submit} className="grid gap-5 lg:grid-cols-[1fr_24rem]">
      <section className="grid gap-4 rounded-lg border border-black/10 bg-white p-5 shadow-nav">
        <label className="grid gap-2 text-sm font-black">
          Display name
          <input
            className="rounded-lg border border-black/10 bg-field px-4 py-3 font-semibold"
            defaultValue={profile.displayName}
            name="displayName"
          />
        </label>
        <label className="grid gap-2 text-sm font-black">
          Bio
          <textarea
            className="min-h-32 rounded-lg border border-black/10 bg-field px-4 py-3 font-semibold"
            defaultValue={profile.bio}
            name="bio"
          />
        </label>
        <label className="grid gap-2 text-sm font-black">
          Profile photo URL
          <input
            className="rounded-lg border border-black/10 bg-field px-4 py-3 font-semibold"
            defaultValue={profile.avatarUrl ?? ""}
            name="avatarUrl"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-black">
            Home area
            <input
              className="rounded-lg border border-black/10 bg-field px-4 py-3 font-semibold"
              defaultValue={profile.homeArea}
              name="homeArea"
            />
          </label>
          <label className="grid gap-2 text-sm font-black">
            Radius
            <input
              className="rounded-lg border border-black/10 bg-field px-4 py-3 font-semibold"
              defaultValue={profile.preferredRadiusKm}
              min={1}
              max={80}
              name="preferredRadiusKm"
              type="number"
            />
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="grid gap-2 text-sm font-black">
            Privacy
            <select
              className="rounded-lg border border-black/10 bg-field px-4 py-3 font-semibold"
              defaultValue={profile.locationPrivacy}
              name="locationPrivacy"
            >
              <option value="approximate">Approximate</option>
              <option value="precise">Precise</option>
              <option value="hidden">Hidden</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-black">
            Latitude
            <input
              className="rounded-lg border border-black/10 bg-field px-4 py-3 font-semibold"
              defaultValue={profile.coordinates.lat}
              name="lat"
              step="0.0001"
              type="number"
            />
          </label>
          <label className="grid gap-2 text-sm font-black">
            Longitude
            <input
              className="rounded-lg border border-black/10 bg-field px-4 py-3 font-semibold"
              defaultValue={profile.coordinates.lng}
              name="lng"
              step="0.0001"
              type="number"
            />
          </label>
        </div>
      </section>

      <aside className="grid content-start gap-4">
        <section className="rounded-lg border border-black/10 bg-white p-5 shadow-nav">
          <h2 className="text-lg font-black">Sports</h2>
          <div className="mt-4 grid gap-3">
            {sports.map((sport) => {
              const preference = preferences.find((record) => record.sportId === sport.id);
              const checked = selectedSports.has(sport.id);

              return (
                <div className="rounded-lg border border-black/10 bg-field p-3" key={sport.id}>
                  <label className="flex items-center gap-3 text-sm font-black">
                    <input
                      checked={checked}
                      onChange={() =>
                        setSelectedSports((current) => {
                          const next = new Set(current);
                          if (next.has(sport.id)) next.delete(sport.id);
                          else next.add(sport.id);
                          return next;
                        })
                      }
                      type="checkbox"
                    />
                    {sport.name}
                  </label>
                  {checked ? (
                    <div className="mt-3 grid gap-2">
                      <select
                        className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm font-bold"
                        defaultValue={preference?.skillLevel ?? "casual"}
                        name={`skill-${sport.id}`}
                      >
                        <option value="beginner">Beginner</option>
                        <option value="casual">Casual</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                      </select>
                      <select
                        className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm font-bold"
                        defaultValue={preference?.intensity ?? "balanced"}
                        name={`intensity-${sport.id}`}
                      >
                        <option value="social">Social</option>
                        <option value="balanced">Balanced</option>
                        <option value="competitive">Competitive</option>
                      </select>
                      <input
                        className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm font-bold"
                        defaultValue={preference?.preferredRoles.join(", ") ?? ""}
                        name={`roles-${sport.id}`}
                        placeholder="roles"
                      />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-lg border border-black/10 bg-white p-5 shadow-nav">
          <h2 className="text-lg font-black">ShowUpToday?</h2>
          <label className="mt-4 flex items-center gap-3 text-sm font-black">
            <input defaultChecked name="showUpToday" type="checkbox" />
            Yes
          </label>
          <label className="mt-4 grid gap-2 text-sm font-black">
            Note
            <input
              className="rounded-lg border border-black/10 bg-field px-4 py-3 font-semibold"
              defaultValue="After work works best."
              name="availabilityNote"
            />
          </label>
          <label className="mt-4 flex items-center gap-3 text-sm font-black">
            <input
              defaultChecked={profile.allowsAiProfile}
              name="allowsAiProfile"
              type="checkbox"
            />
            AI recommendations
          </label>
        </section>

        <button
          className="rounded-full bg-ink px-5 py-3 text-sm font-black text-white disabled:opacity-60"
          disabled={isPending}
          type="submit"
        >
          {isPending ? "Saving..." : "Save profile"}
        </button>
        {message ? <p className="text-sm font-black text-slate-700">{message}</p> : null}
      </aside>
    </form>
  );
}
