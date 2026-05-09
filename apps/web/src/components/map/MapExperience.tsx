"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin, Navigation, Search, SlidersHorizontal, UserPlus, UserRound, X } from "lucide-react";
import type { Sport, SportsEvent } from "@showup2move/shared";

interface MapExperienceProps {
  events: SportsEvent[];
  sports: Sport[];
  mapsApiKey?: string;
}

interface GoogleLatLng {
  lat: number;
  lng: number;
}

interface GoogleLatLngBounds {
  extend(position: GoogleLatLng): void;
}

interface GoogleMapInstance {
  fitBounds(bounds: GoogleLatLngBounds): void;
  panTo(position: GoogleLatLng): void;
  setZoom(zoom: number): void;
}

interface GoogleMarkerInstance {
  addListener(eventName: string, handler: () => void): void;
  setMap(map: GoogleMapInstance | null): void;
}

interface GoogleMapsApi {
  maps: {
    LatLngBounds: new () => GoogleLatLngBounds;
    Map: new (element: HTMLElement, options: Record<string, unknown>) => GoogleMapInstance;
    Marker: new (options: Record<string, unknown>) => GoogleMarkerInstance;
  };
}

declare global {
  interface Window {
    google?: GoogleMapsApi;
    __showUpGoogleMapsPromise?: Promise<void>;
  }
}

function loadGoogleMaps(apiKey: string): Promise<void> {
  if (window.google?.maps) {
    return Promise.resolve();
  }

  if (window.__showUpGoogleMapsPromise) {
    return window.__showUpGoogleMapsPromise;
  }

  window.__showUpGoogleMapsPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-showup-google-maps]");

    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Google Maps failed to load.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.defer = true;
    script.dataset.showupGoogleMaps = "true";
    
    // If no key is provided, load without the key parameter to trigger "Development Purposes Only" mode
    // rather than providing an invalid dummy key.
    const baseUrl = "https://maps.googleapis.com/maps/api/js";
    script.src = apiKey ? `${baseUrl}?key=${encodeURIComponent(apiKey)}` : baseUrl;
    
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google Maps failed to load."));
    document.head.appendChild(script);
  });

  return window.__showUpGoogleMapsPromise;
}

export function MapExperience({ events, sports, mapsApiKey = "" }: MapExperienceProps) {
  const [query, setQuery] = useState("");
  const [sport, setSport] = useState<string | "all">("all");
  const [viewType, setViewType] = useState<"active" | "scheduled">("active");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [friends, setFriends] = useState<any[]>([]);
  const [sendingInvitation, setSendingInvitation] = useState(false);
  const [showUpResponse, setShowUpResponse] = useState<boolean | null>(null);
  const [searchQuery, setSearchParams] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!searchQuery) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(() => {
      fetch(`/api/profile/search?q=${encodeURIComponent(searchQuery)}`)
        .then(res => res.json())
        .then(data => setSearchResults(data.users || []));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleAddFriend = async (friendId: string) => {
    const res = await fetch("/api/profile/friends/add", {
      method: "POST",
      body: JSON.stringify({ friendId }),
      headers: { "Content-Type": "application/json" }
    });
    if (res.ok) {
      alert("Friend added!");
      setSearchParams("");
      setIsSearching(false);
      // Refresh friends list
      fetch("/api/profile/friends")
        .then((res) => res.json())
        .then((data) => setFriends(data.friends || []));
    }
  };

  const handleShowUpResponse = async (response: boolean) => {
    setShowUpResponse(response);
    // In a real app, this would hit an API
    alert(response ? "Great! We'll match you shortly." : "Maybe next time!");
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const eventId = params.get("event");
    if (eventId) {
      setSelectedId(eventId);
    } else if (events[0]) {
      setSelectedId(events[0].id);
    }
  }, [events]);
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const googleMapRef = useRef<GoogleMapInstance | null>(null);
  const markersRef = useRef<GoogleMarkerInstance[]>([]);

  useEffect(() => {
    fetch("/api/profile/friends")
      .then((res) => res.json())
      .then((data) => setFriends(data.friends || []))
      .catch(console.error);
  }, []);

  const visibleEvents = useMemo(() => {
    const now = new Date();
    return events.filter((event) => {
      const eventStart = new Date(event.startsAt);
      const eventEnd = new Date(event.endsAt);
      
      const typeMatch = viewType === "active" 
        ? (eventStart <= now && eventEnd >= now) || event.status === "active"
        : eventStart > now || event.status === "confirmed" || event.status === "open";

      const queryMatch =
        event.title.toLowerCase().includes(query.toLowerCase()) ||
        event.location.name.toLowerCase().includes(query.toLowerCase()) ||
        event.location.address.toLowerCase().includes(query.toLowerCase());
      const sportMatch = sport === "all" || event.sportId === sport;

      return typeMatch && queryMatch && sportMatch;
    });
  }, [events, query, sport, viewType]);

  const selectedEvent = selectedId ? visibleEvents.find((event) => event.id === selectedId) ?? null : null;
  const friendWithActivity = friends.find((f) => f.event);
  const mainFriend = friends[0];

  const handleSendToFriend = async (eventId: string, friendId: string) => {
    setSendingInvitation(true);
    try {
      // 1. Get or create conversation
      const convRes = await fetch("/api/messages/direct", {
        method: "POST",
        body: JSON.stringify({ targetUserId: friendId }),
        headers: { "Content-Type": "application/json" }
      });
      const { conversationId } = await convRes.json();

      // 2. Send invitation
      await fetch("/api/messages", {
        method: "POST",
        body: JSON.stringify({
          conversationId,
          body: `Check out this event: ${selectedEvent?.title}`,
          eventId
        }),
        headers: { "Content-Type": "application/json" }
      });

      alert("Invitation sent to " + mainFriend?.displayName);
    } catch (error) {
      console.error(error);
      alert("Failed to send invitation.");
    } finally {
      setSendingInvitation(false);
    }
  };

  useEffect(() => {
// ... existing markers logic ...
    if (selectedId && !visibleEvents.some((event) => event.id === selectedId)) {
      setSelectedId(visibleEvents[0]?.id ?? null);
    }
  }, [selectedId, visibleEvents]);

  useEffect(() => {
    let cancelled = false;

    loadGoogleMaps(mapsApiKey)
      .then(() => {
        if (cancelled || !window.google?.maps || !mapElementRef.current) {
          return;
        }

        const maps = window.google.maps;
        const firstCoordinates = visibleEvents.at(0)?.location.coordinates;
        const center = firstCoordinates
          ? { lat: firstCoordinates.lat, lng: firstCoordinates.lng }
          : { lat: 44.4268, lng: 26.1025 };

        const map =
          googleMapRef.current ??
          new maps.Map(mapElementRef.current, {
            center,
            disableDefaultUI: true,
            zoom: 13,
            styles: [
              {
                featureType: "poi",
                elementType: "labels",
                stylers: [{ visibility: "off" }],
              },
            ],
          });

        googleMapRef.current = map;
        markersRef.current.forEach((marker) => marker.setMap(null));
        markersRef.current = [];

        const bounds = new maps.LatLngBounds();

        visibleEvents.forEach((event) => {
          if (!event.location.coordinates) {
            return;
          }

          const position = { lat: event.location.coordinates.lat, lng: event.location.coordinates.lng };
          bounds.extend(position);

          const marker = new maps.Marker({
            map,
            position,
            title: event.title,
          });

          marker.addListener("click", () => setSelectedId(event.id));
          markersRef.current.push(marker);
        });

        if (markersRef.current.length > 1) {
          map.fitBounds(bounds);
        } else if (markersRef.current.length === 1) {
          map.panTo(center);
          map.setZoom(14);
        }

        setMapError(null);
      })
      .catch((error: Error) => {
        if (!cancelled) {
          setMapError(error.message);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [mapsApiKey, visibleEvents]);

  useEffect(() => {
    if (!selectedEvent?.location.coordinates || !googleMapRef.current) {
      return;
    }

    googleMapRef.current.panTo({
      lat: selectedEvent.location.coordinates.lat,
      lng: selectedEvent.location.coordinates.lng,
    });
  }, [selectedEvent]);

  return (
    <section className="map-shell-fullscreen">
      <div className="top-left-overlay">
        <div className="toggle-container">
          <button 
            className={`toggle-btn ${viewType === "active" ? "is-active" : ""}`}
            onClick={() => setViewType("active")}
          >
            now
          </button>
          <button 
            className={`toggle-btn ${viewType === "scheduled" ? "is-active" : ""}`}
            onClick={() => setViewType("scheduled")}
          >
            scheduled
          </button>
        </div>
      </div>

      <div className="top-right-overlay flex flex-col gap-3 items-end">
        {/* Friend Search */}
        <div className={`transition-all duration-300 ${isSearching ? 'w-64' : 'w-12'} h-12 bg-white/90 backdrop-blur rounded-full shadow-lg flex items-center overflow-hidden border border-white/20`}>
          <button 
            onClick={() => setIsSearching(!isSearching)}
            className="w-12 h-12 flex-shrink-0 grid place-items-center text-slate-600 hover:text-ink"
          >
            {isSearching ? <X size={20} /> : <UserPlus size={20} />}
          </button>
          <input 
            value={searchQuery}
            onChange={(e) => setSearchParams(e.target.value)}
            placeholder="Search by username..."
            className="flex-1 bg-transparent border-none outline-none text-sm font-bold pr-4"
          />
        </div>

        {/* Search Results Dropdown */}
        {isSearching && searchResults.length > 0 && (
          <div className="w-64 bg-white/95 backdrop-blur rounded-2xl shadow-2xl border border-black/5 overflow-hidden max-h-60 overflow-y-auto">
            {searchResults.map((user) => (
              <button 
                key={user.userId}
                onClick={() => handleAddFriend(user.userId)}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-cyan/10 transition text-left"
              >
                <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden">
                  {user.avatarUrl ? <img src={user.avatarUrl} className="w-full h-full object-cover" /> : <UserRound size={16} className="m-2" />}
                </div>
                <div>
                  <div className="text-sm font-black">@{user.username}</div>
                  <div className="text-xs font-bold text-slate-500">{user.displayName}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Friend Cassette */}
        {friends.length > 0 && (
          <div className="friend-cassette">
            <div className="friend-info">
              <span className="friend-label">Friend</span>
              <span className="friend-name">{friendWithActivity?.displayName || mainFriend?.displayName}</span>
            </div>
            <div className="activity-status">
              <span className="status-is">{friendWithActivity ? "IS AT" : "is online"}</span>
              <div className="activity-details">
                <div className="friend-avatar-placeholder overflow-hidden">
                  {(friendWithActivity?.avatarUrl || mainFriend?.avatarUrl) ? (
                    <img src={friendWithActivity?.avatarUrl || mainFriend?.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <UserRound size={32} />
                  )}
                </div>
                {friendWithActivity && (
                  <div className="activity-image-placeholder overflow-hidden">
                    <img src={friendWithActivity.event.imageUrl} alt="Event" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
              <button className="more-link">more</button>
            </div>
          </div>
        )}
      </div>

      {/* ShowUpToday Prompt */}
      {!showUpResponse && (
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-40 w-full max-w-xs animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-ink text-white rounded-3xl p-5 shadow-2xl border border-white/10 backdrop-blur-md bg-opacity-90">
            <h3 className="text-lg font-black mb-1">ShowUpToday? 🎾</h3>
            <p className="text-sm font-bold text-slate-300 mb-4">Want to play something in the next few hours?</p>
            <div className="flex gap-2">
              <button 
                onClick={() => handleShowUpResponse(true)}
                className="flex-1 bg-cyan text-ink py-3 rounded-2xl font-black text-sm transition hover:scale-105 active:scale-95"
              >
                Yes!
              </button>
              <button 
                onClick={() => handleShowUpResponse(false)}
                className="px-6 bg-white/10 text-white py-3 rounded-2xl font-black text-sm transition hover:bg-white/20"
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}


      <div className="map-stage-fullscreen">
        <div
          className="google-map-fullscreen"
          ref={mapElementRef}
          role="application"
          aria-label="Google map of nearby events"
        />
        
        {selectedEvent ? (
          <article className="event-detail-panel" aria-live="polite">
            <button
              type="button"
              className="icon-button event-detail-close"
              onClick={() => setSelectedId(null)}
              aria-label="Close event details"
            >
              <X size={16} aria-hidden="true" />
            </button>
            <div className="flex justify-between items-start mb-2">
              <span className="sport-badge">{sports.find((sportOption) => sportOption.id === selectedEvent.sportId)?.name ?? selectedEvent.sportId}</span>
              {mainFriend && (
                <button 
                  className="send-invite-btn"
                  onClick={() => handleSendToFriend(selectedEvent.id, mainFriend.userId)}
                  disabled={sendingInvitation}
                >
                  {sendingInvitation ? "Sending..." : `Send to ${mainFriend.displayName}`}
                </button>
              )}
            </div>
            <h2>{selectedEvent.title}</h2>
            <p className="mb-3">{selectedEvent.description}</p>
            
            <div className="grid gap-2 border-t border-black/5 pt-3">
              <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider">
                <span className="text-slate-500">Status</span>
                <span className={new Date(selectedEvent.startsAt) <= new Date() && new Date(selectedEvent.endsAt) >= new Date() ? "text-green-600" : "text-cyan"}>
                  {new Date(selectedEvent.startsAt) <= new Date() && new Date(selectedEvent.endsAt) >= new Date() ? "● Active" : "○ Scheduled"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider">
                <span className="text-slate-500">Date</span>
                <span className="text-ink">{new Date(selectedEvent.startsAt).toLocaleDateString()} at {new Date(selectedEvent.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider">
                <span className="text-slate-500">Coordinates</span>
                <span className="text-slate-400 font-mono">
                  {selectedEvent.location.coordinates.lat.toFixed(4)}, {selectedEvent.location.coordinates.lng.toFixed(4)}
                </span>
              </div>
            </div>

            <div className="event-detail-meta mt-4">
              <Navigation size={16} aria-hidden="true" />
              <span>
                {selectedEvent.location.name} - {selectedEvent.location.address}
              </span>
            </div>
          </article>
        ) : null}
      </div>
    </section>
  );
}

function getFallbackMarkers(events: SportsEvent[]) {
  if (events.length === 0) {
    return [];
  }

  const lats = events.map((event) => event.location.coordinates.lat);
  const lngs = events.map((event) => event.location.coordinates.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latRange = Math.max(maxLat - minLat, 0.001);
  const lngRange = Math.max(maxLng - minLng, 0.001);

  return events.map((event) => ({
    id: event.id,
    left: 14 + ((event.location.coordinates.lng - minLng) / lngRange) * 72,
    top: 86 - ((event.location.coordinates.lat - minLat) / latRange) * 72,
  }));
}
