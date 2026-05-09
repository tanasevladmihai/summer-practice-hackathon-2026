import { requireCurrentUser } from "@/server/auth/session";
import { getStore } from "@/server/data/store";
import { handleRouteError, jsonOk } from "@/server/http";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get("eventId");
    if (!eventId) throw new Error("Missing eventId");

    const store = getStore();
    const poll = store.polls.find((p) => p.eventId === eventId);
    if (!poll) return jsonOk({ poll: null });

    const options = store.pollOptions.filter((o) => o.pollId === poll.id);
    const votes = store.pollVotes.filter((v) => v.pollId === poll.id);

    return jsonOk({ 
      poll: {
        ...poll,
        options: options.map(o => ({
          ...o,
          voteCount: votes.filter(v => v.optionId === o.id).length
        }))
      }
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
