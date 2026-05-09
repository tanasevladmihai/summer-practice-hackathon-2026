"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { CalendarClock, Check, Dumbbell, MapPin, Navigation, UsersRound, X } from "lucide-react";
import { getSportById, type SportsEvent, type TeammateRecommendation } from "@showup2move/shared";
import { AppNav } from "@/components/navigation/AppNav";
import { formatEventTime, formatPrice } from "@/lib/format";

type ActivityMode = "now" | "scheduled" | "both";

const bounds = {
  minLat: 44.448,
  maxLat: 44.474,
  minLng: 26.078,
  maxLng: 26.096
};

export function MapExperience({
  events,
  recommendations,
  isAuthenticated
}: Readonly<{
  events: SportsEvent[];
  recommendations: TeammateRecommendation[];
  isAuthenticated: boolean;
}>) {
  const [mode, setMode] = useState<ActivityMode>("both");
  const [selectedId, setSelectedId] = useState(events[0]?.id ?? "");
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const visibleEvents = useMemo(
    () =>
      events.filter((event) => {
        if (mode === "both") return true;
        if (mode === "now")
          return (
            event.status === "open" || event.status === "active" || event.status === "suggested"
          );

        return event.status === "confirmed" || event.status === "pending_confirmation";
      }),
    [events, mode]
  );
  const selectedEvent = visibleEvents.find((event) => event.id === selectedId) ?? visibleEvents[0];
  const friend = recommendations[0];

  function joinSelectedEvent() {
    if (!selectedEvent) {
      return;
    }

    if (!isAuthenticated) {
      setMessage("Log in to join this activity.");
      return;
    }

    startTransition(async () => {
      const response = await fetch(`/api/events/${selectedEvent.id}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "joined" })
      });

      if (response.ok) {
        setJoinedIds((current) => new Set([...current, selectedEvent.id]));
        setMessage("Joined. The event chat is ready.");
      } else {
        setMessage("Could not join right now.");
      }
    });
  }

  return (
    <main className="relative min-h-dvh overflow-hidden bg-field text-ink">
      <section aria-label="Map-first sports activity screen" className="map-grid absolute inset-0">
        <MapLabels />
        {visibleEvents.map((event) => (
          <EventMarker
            event={event}
            isSelected={selectedEvent?.id === event.id}
            key={event.id}
            onSelect={() => setSelectedId(event.id)}
          />
        ))}
      </section>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 px-4 pt-4 md:px-8">
        <div className="pointer-events-auto rounded-full bg-white/86 p-1 shadow-marker backdrop-blur">
          {(["now", "scheduled", "both"] as const).map((value) => (
            <button
              className={`rounded-full px-3 py-2 text-xs font-black capitalize transition md:px-4 ${
                mode === value ? "bg-cyan text-ink" : "text-slate-600 hover:bg-white"
              }`}
              key={value}
              onClick={() => setMode(value)}
              type="button"
            >
              {value}
            </button>
          ))}
        </div>
        <Link
          className="pointer-events-auto rounded-full bg-ink px-4 py-3 text-xs font-black text-white shadow-marker"
          href={isAuthenticated ? "/matching" : "/login"}
        >
          ShowUpToday?
        </Link>
      </div>

      <aside className="absolute right-3 top-20 z-20 w-[min(23rem,calc(100vw-1.5rem))] rounded-[2rem] bg-zinc-200/95 p-4 shadow-nav backdrop-blur md:right-8 md:top-24">
        <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3">
          <div>
            <p className="text-sm font-black leading-tight">{friend?.displayName ?? "Friend"}</p>
            <p className="text-xs font-semibold text-slate-600">
              is at {sportName(friend?.sportId)}
            </p>
          </div>
          <div className="relative h-16 w-16 overflow-hidden rounded-full bg-white">
            {friend?.avatarUrl ? (
              <Image
                alt=""
                fill
                sizes="64px"
                src={friend.avatarUrl}
                unoptimized
                className="object-cover"
              />
            ) : (
              <UsersRound className="m-4 h-8 w-8" />
            )}
          </div>
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white text-ink">
            <Dumbbell className="h-8 w-8" />
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs font-black text-slate-600">
          <span>{friend?.distanceKm.toFixed(1) ?? "1.2"} km away</span>
          <Link className="text-blue-600" href="/matching">
            more
          </Link>
        </div>
      </aside>

      <section className="absolute inset-x-0 bottom-32 z-30 mx-auto flex max-w-5xl gap-3 overflow-x-auto px-4 pb-3 md:bottom-8 md:left-8 md:right-auto md:top-36 md:block md:w-[22rem] md:space-y-3 md:overflow-visible">
        {visibleEvents.map((event) => (
          <button
            className={`min-w-[18rem] rounded-lg border bg-white/94 p-3 text-left shadow-marker backdrop-blur transition md:w-full ${
              selectedEvent?.id === event.id ? "border-cyan" : "border-black/10"
            }`}
            key={event.id}
            onClick={() => setSelectedId(event.id)}
            type="button"
          >
            <div className="flex gap-3">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-200">
                <Image
                  alt=""
                  fill
                  sizes="80px"
                  src={event.imageUrl}
                  unoptimized
                  className="object-cover"
                />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-base font-black">{event.title}</h2>
                <p className="mt-1 text-xs font-bold text-slate-600">
                  {sportName(event.sportId)} · {event.distanceKm.toFixed(1)} km ·{" "}
                  {formatEventTime(event.startsAt)}
                </p>
                <div className="mt-3 flex items-center gap-2 text-xs font-black text-slate-700">
                  <UsersRound className="h-4 w-4" />
                  <span>
                    {event.participantCount}/{event.capacity}
                  </span>
                  <span className="rounded-full bg-field px-2 py-1">
                    {event.status.replace("_", " ")}
                  </span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </section>

      {selectedEvent ? (
        <section className="absolute inset-x-3 bottom-[13.5rem] z-30 rounded-lg border border-black/10 bg-white/96 p-4 shadow-nav backdrop-blur md:bottom-8 md:left-auto md:right-8 md:w-[23rem]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                {sportName(selectedEvent.sportId)}
              </p>
              <h2 className="mt-1 text-xl font-black leading-tight">{selectedEvent.title}</h2>
            </div>
            <button
              aria-label="Close details"
              className="grid h-10 w-10 place-items-center rounded-full bg-slate-100"
              onClick={() => setSelectedId("")}
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-xs font-black text-slate-700">
            <Detail
              icon={<CalendarClock className="h-4 w-4" />}
              label={formatEventTime(selectedEvent.startsAt)}
            />
            <Detail
              icon={<MapPin className="h-4 w-4" />}
              label={`${selectedEvent.distanceKm.toFixed(1)} km`}
            />
            <Detail
              icon={<UsersRound className="h-4 w-4" />}
              label={`${selectedEvent.participantCount}/${selectedEvent.capacity}`}
            />
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-700">{selectedEvent.description}</p>
          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="text-sm font-black">
              {formatPrice(selectedEvent.location.priceEstimateCents)}
            </span>
            <button
              className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-black text-white disabled:opacity-60"
              disabled={isPending || joinedIds.has(selectedEvent.id)}
              onClick={joinSelectedEvent}
              type="button"
            >
              {joinedIds.has(selectedEvent.id) ? (
                <Check className="h-4 w-4" />
              ) : (
                <Navigation className="h-4 w-4" />
              )}
              {joinedIds.has(selectedEvent.id) ? "Joined" : "Join"}
            </button>
          </div>
          {message ? <p className="mt-3 text-xs font-bold text-slate-600">{message}</p> : null}
        </section>
      ) : null}

      <AppNav />
    </main>
  );
}

function EventMarker({
  event,
  isSelected,
  onSelect
}: Readonly<{
  event: SportsEvent;
  isSelected: boolean;
  onSelect: () => void;
}>) {
  const position = markerPosition(event);

  return (
    <button
      aria-label={event.title}
      className={`absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 bg-white shadow-marker transition hover:scale-105 ${
        isSelected ? "h-24 w-24 border-cyan" : "h-16 w-16 border-white/80"
      }`}
      onClick={onSelect}
      style={{ left: `${position.left}%`, top: `${position.top}%` }}
      type="button"
    >
      <Image
        alt=""
        fill
        sizes="96px"
        src={event.imageUrl}
        unoptimized
        className="rounded-full object-cover p-1"
      />
    </button>
  );
}

function Detail({ icon, label }: Readonly<{ icon: React.ReactNode; label: string }>) {
  return (
    <div className="flex min-h-12 items-center justify-center gap-1 rounded-lg bg-field px-2 text-center">
      {icon}
      <span className="truncate">{label}</span>
    </div>
  );
}

function MapLabels() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 select-none text-white [text-shadow:0_2px_5px_rgba(80,50,120,0.35)]"
    >
      <span className="absolute left-[13%] top-[72%] text-lg font-black md:text-2xl">
        Catedrala
      </span>
      <span className="absolute left-[43%] top-[50%] text-lg font-black md:text-2xl">
        Piata Victoriei
      </span>
      <span className="absolute left-[69%] top-[31%] text-base font-black md:text-xl">
        Piata Libera
      </span>
      <span className="absolute left-[6%] top-[20%] text-xs font-bold text-slate-500 md:text-sm">
        Bulevardul Aviatorilor
      </span>
    </div>
  );
}

function markerPosition(event: SportsEvent): { left: number; top: number } {
  const lngRatio =
    (event.location.coordinates.lng - bounds.minLng) / (bounds.maxLng - bounds.minLng);
  const latRatio =
    (bounds.maxLat - event.location.coordinates.lat) / (bounds.maxLat - bounds.minLat);

  return {
    left: clamp(lngRatio * 100, 8, 92),
    top: clamp(latRatio * 100, 12, 88)
  };
}

function sportName(sportId: string | undefined): string {
  if (!sportId) {
    return "activity";
  }

  return getSportById(sportId)?.name ?? sportId;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
