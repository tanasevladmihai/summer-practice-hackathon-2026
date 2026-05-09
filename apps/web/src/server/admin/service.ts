import { getStore } from "../data/store";

export function getAdminDashboard() {
  const store = getStore();

  return {
    users: store.users.length,
    organizers: store.users.filter((user) => user.roles.includes("organizer")).length,
    admins: store.users.filter((user) => user.roles.includes("admin")).length,
    openEvents: store.events.filter((event) => event.status === "open").length,
    suggestedEvents: store.events.filter((event) => event.status === "suggested").length,
    conversations: store.conversations.length,
    auditLogs: store.auditLogs.toSorted(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    )
  };
}
