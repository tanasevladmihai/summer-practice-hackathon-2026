import { requireCurrentUser } from "@/server/auth/session";
import { getStore } from "@/server/data/store";
import { handleRouteError, jsonOk } from "@/server/http";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    const store = getStore();

    // Find friendships
    const friendships = store.friendships.filter(
      (f) => f.user1Id === user.id || f.user2Id === user.id
    );

    const friendIds = friendships.map((f) => (f.user1Id === user.id ? f.user2Id : f.user1Id));

    // Get profiles and current activity (event they are confirmed in)
    const friendActivities = friendIds.map((friendId) => {
      const profile = store.profiles.find((p) => p.userId === friendId);
      const participant = store.participants.find(
        (p) => p.userId === friendId && p.status === "confirmed"
      );
      const event = participant ? store.events.find((e) => e.id === participant.eventId) : undefined;

      return {
        userId: friendId,
        displayName: profile?.displayName || "Unknown Friend",
        avatarUrl: profile?.avatarUrl,
        event: event ? {
          id: event.id,
          title: event.title,
          imageUrl: event.imageUrl,
          distanceKm: 1.2, // Mock distance
        } : undefined
      };
    });

    return jsonOk({ friends: friendActivities });
  } catch (error) {
    return handleRouteError(error);
  }
}
