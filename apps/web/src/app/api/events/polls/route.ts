import { requireCurrentUser } from "@/server/auth/session";
import { getStore, newId } from "@/server/data/store";
import { handleRouteError, jsonOk, readJson } from "@/server/http";
import { z } from "zod";

const schema = z.object({
  eventId: z.string(),
  title: z.string(),
  options: z.array(z.string()).min(2)
});

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    const { eventId, title, options } = await readJson(request, schema);
    const store = getStore();

    const pollId = newId("poll");
    const poll = {
      id: pollId,
      eventId,
      title,
      kind: "other" as const,
      createdBy: user.id,
      createdAt: new Date().toISOString()
    };

    store.polls.push(poll);

    options.forEach((opt) => {
      store.pollOptions.push({
        id: newId("option"),
        pollId,
        label: opt,
        metadata: {}
      });
    });

    // Create a message in the event chat about the poll
    const conversation = store.conversations.find((c) => c.eventId === eventId);
    if (conversation) {
      store.messages.push({
        id: newId("message"),
        conversationId: conversation.id,
        senderId: user.id,
        kind: "poll_prompt",
        body: `New poll: ${title}`,
        eventId, // Using eventId to link the poll message
        createdAt: new Date().toISOString()
      });
    }

    return jsonOk({ pollId }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
