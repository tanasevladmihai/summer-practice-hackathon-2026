import { MapExperience } from "@/components/map/MapExperience";
import { AppNav } from "@/components/navigation/AppNav";
import { listEvents } from "@/server/events/service";
import { listSports } from "@/server/sports/service";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  return (
    <main className="min-h-dvh bg-field text-ink relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <MapExperience
          events={listEvents()}
          sports={listSports()}
          mapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? process.env.NEXT_PUBLIC_MAP_PROVIDER_KEY}
        />
      </div>
      <AppNav />
    </main>
  );
}
