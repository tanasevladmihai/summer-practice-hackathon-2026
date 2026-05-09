import { MapExperience } from "@/components/map/MapExperience";
import { listEvents } from "@/server/events/service";
import { listSports } from "@/server/sports/service";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  return (
    <MapExperience
      events={listEvents()}
      sports={listSports()}
      mapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? process.env.NEXT_PUBLIC_MAP_PROVIDER_KEY}
    />
  );
}
