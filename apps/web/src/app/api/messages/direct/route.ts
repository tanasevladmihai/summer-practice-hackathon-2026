import { requireCurrentUser } from "@/server/auth/session";
import { getStore, newId } from "@/server/data/store";
import { handleRouteError, jsonOk, readJson } from "@/server/http";
import { z } from "zod";

const schema = z.object({
  targetUserId: z.string()
});

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    const { targetUserId } = await readJson(request, schema);
    const store = getStore();

    // Find existing direct conversation
    let conversation = store.conversations.find(
      (c) =>
        c.kind === "direct" &&
        c.participantIds.includes(user.id) &&
        c.participantIds.includes(targetUserId)
    );

    if (!conversation) {
      // Create new direct conversation
      const targetProfile = store.profiles.find((p) => p.userId === targetUserId);
      conversation = {
        id: newId("conversation"),
        kind: "direct",
        title: targetProfile?.displayName || "Direct Chat",
        participantIds: [user.id, targetUserId],
        unreadCount: 0,
        updatedAt: new Date().toISOString()
      };
      store.conversations.push(conversation);
    }

    return jsonOk({ conversationId: conversation.id });
  } catch (error) {
    return handleRouteError(error);
  }
}
