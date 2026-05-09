import { requireCurrentUser } from "@/server/auth/session";
import { getStore } from "@/server/data/store";
import { handleRouteError, jsonOk } from "@/server/http";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.toLowerCase() || "";
    const user = await requireCurrentUser();
    const store = getStore();

    if (!q) return jsonOk({ users: [] });

    const results = store.profiles
      .filter((p) => 
        p.userId !== user.id && 
        (p.username.toLowerCase().includes(q) || p.displayName.toLowerCase().includes(q))
      )
      .map((p) => ({
        userId: p.userId,
        username: p.username,
        displayName: p.displayName,
        avatarUrl: p.avatarUrl
      }));

    return jsonOk({ users: results });
  } catch (error) {
    return handleRouteError(error);
  }
}
