import { requireCurrentUser } from "@/server/auth/session";
import { getStore } from "@/server/data/store";
import { handleRouteError, jsonOk, readJson } from "@/server/http";
import { z } from "zod";

const schema = z.object({
  friendId: z.string()
});

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    const { friendId } = await readJson(request, schema);
    const store = getStore();

    const existing = store.friendships.find(
      (f) => 
        (f.user1Id === user.id && f.user2Id === friendId) || 
        (f.user1Id === friendId && f.user2Id === user.id)
    );

    if (existing) {
      return jsonOk({ message: "Already friends" });
    }

    store.friendships.push({
      user1Id: user.id,
      user2Id: friendId,
      createdAt: new Date().toISOString()
    });

    return jsonOk({ message: "Friend added" }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
