import { MapExperience } from "@/components/map/MapExperience";
import { getCurrentUser } from "@/server/auth/session";
import { listEvents } from "@/server/events/service";
import { getRecommendations } from "@/server/matching/service";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <MapExperience
      events={listEvents()}
      isAuthenticated={Boolean(user)}
      recommendations={getRecommendations()}
    />
  );
}
