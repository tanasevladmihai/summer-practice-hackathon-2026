"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin, Navigation, Search, SlidersHorizontal, UserRound, X } from "lucide-react";
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
  // Use a fallback key or no key to allow loading in Dev Mode with watermarks
  const effectiveKey = apiKey || "AIzaSy_DEV_MODE_WATERMARK_EXPECTED";

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
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(effectiveKey)}`;
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
  const [selectedId, setSelectedId] = useState<string | null>(events[0]?.id ?? null);
  const [mapError, setMapError] = useState<string | null>(null);
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const googleMapRef = useRef<GoogleMapInstance | null>(null);
  const markersRef = useRef<GoogleMarkerInstance[]>([]);

  const visibleEvents = useMemo(
    () =>
      events.filter((event) => {
        const queryMatch =
          event.title.toLowerCase().includes(query.toLowerCase()) ||
          event.location.name.toLowerCase().includes(query.toLowerCase()) ||
          event.location.address.toLowerCase().includes(query.toLowerCase());
        const sportMatch = sport === "all" || event.sportId === sport;

        return queryMatch && sportMatch;
      }),
    [events, query, sport],
  );

  const selectedEvent = selectedId ? visibleEvents.find((event) => event.id === selectedId) ?? null : null;
  const showFallbackMap = false; // Force real map for dev purposes

  useEffect(() => {
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

      <div className="top-right-overlay">
        <div className="friend-cassette">
          <div className="friend-info">
            <span className="friend-label">Friend</span>
            <span className="friend-name">username123</span>
          </div>
          <div className="activity-status">
            <span className="status-is">IS AT</span>
            <div className="activity-details">
              <div className="friend-avatar-placeholder">
                <UserRound size={32} />
              </div>
              <div className="activity-image-placeholder">
                <MapPin size={32} />
              </div>
            </div>
            <button className="more-link">more</button>
          </div>
        </div>
      </div>

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
            <span className="sport-badge">{sports.find((sportOption) => sportOption.id === selectedEvent.sportId)?.name ?? selectedEvent.sportId}</span>
            <h2>{selectedEvent.title}</h2>
            <p>{selectedEvent.description}</p>
            <div className="event-detail-meta">
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
