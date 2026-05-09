import { getStore } from "@/server/data/store";
import { jsonOk } from "@/server/http";

export function GET() {
  const store = getStore();

  return jsonOk({
    status: "ready",
    dependencies: {
      database: process.env.DATABASE_URL ? "configured" : "using-seed-store",
      redis: process.env.REDIS_URL ? "configured" : "not-configured"
    },
    seedCounts: {
      users: store.users.length,
      events: store.events.length,
      conversations: store.conversations.length
    },
    checkedAt: new Date().toISOString()
  });
}
