"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import type { Conversation, Message } from "@showup2move/shared";
import { formatEventTime } from "@/lib/format";
import { ExternalLink, ListTodo, Plus, X } from "lucide-react";

type Thread = Conversation & { messages: Message[] };

export function MessageCenter({ initialThreads }: Readonly<{ initialThreads: Thread[] }>) {
  const [threads, setThreads] = useState(initialThreads);
  const [selectedId, setSelectedId] = useState(initialThreads[0]?.id ?? "");
  const [isPending, startTransition] = useTransition();
  const [isCreatingPoll, setIsCreatingPoll] = useState(false);
  const [pollTitle, setPollTitle] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [activePolls, setActivePolls] = useState<Record<string, any>>({});

  const selectedThread = threads.find((thread) => thread.id === selectedId) ?? threads[0];

  useEffect(() => {
    if (selectedThread?.eventId) {
      fetch(`/api/events/polls/details?eventId=${selectedThread.eventId}`)
        .then(res => res.json())
        .then(data => {
          if (data.poll) {
            setActivePolls(prev => ({ ...prev, [selectedThread.eventId!]: data.poll }));
          }
        });
    }
  }, [selectedThread?.eventId]);

  async function createPoll() {
    if (!selectedThread?.eventId || !pollTitle || pollOptions.some(o => !o)) return;
    
    const res = await fetch("/api/events/polls", {
      method: "POST",
      body: JSON.stringify({
        eventId: selectedThread.eventId,
        title: pollTitle,
        options: pollOptions
      }),
      headers: { "Content-Type": "application/json" }
    });

    if (res.ok) {
      setIsCreatingPoll(false);
      setPollTitle("");
      setPollOptions(["", ""]);
      // Trigger refresh of messages
      window.location.reload();
    }
  }

  function send(formData: FormData) {
// ... existing send logic ...
    if (!selectedThread) {
      return;
    }

    const body = String(formData.get("body") ?? "");
    if (!body.trim()) {
      return;
    }

    startTransition(async () => {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: selectedThread.id, body })
      });

      if (response.ok) {
        const payload = (await response.json()) as { message: Message };
        setThreads((current) =>
          current.map((thread) =>
            thread.id === selectedThread.id
              ? { ...thread, messages: [...thread.messages, payload.message] }
              : thread
          )
        );
      }
    });
  }

  return (
    <div className="grid min-h-[34rem] overflow-hidden rounded-lg border border-black/10 bg-white shadow-nav lg:grid-cols-[20rem_1fr]">
      <aside className="border-b border-black/10 bg-field p-3 lg:border-b-0 lg:border-r">
        <div className="grid gap-2">
          {threads.map((thread) => (
            <button
              className={`rounded-lg px-4 py-3 text-left transition ${
                selectedThread?.id === thread.id ? "bg-cyan text-ink" : "bg-white hover:bg-white/80"
              }`}
              key={thread.id}
              onClick={() => setSelectedId(thread.id)}
              type="button"
            >
              <span className="block truncate text-sm font-black">{thread.title}</span>
              <span className="mt-1 block text-xs font-bold text-slate-600">
                {thread.kind} · {thread.unreadCount} unread
              </span>
            </button>
          ))}
        </div>
      </aside>
      <section className="flex min-h-[34rem] flex-col relative">
        <header className="border-b border-black/10 px-5 py-4 flex justify-between items-center bg-white z-10">
          <h2 className="text-xl font-black">{selectedThread?.title ?? "Messages"}</h2>
          {selectedThread?.eventId && (
            <button 
              onClick={() => setIsCreatingPoll(true)}
              className="flex items-center gap-2 bg-[#25d9f5] text-[#101317] px-4 py-2 rounded-full text-xs font-black transition hover:scale-105"
            >
              <Plus size={14} />
              Create Poll
            </button>
          )}
        </header>

        {/* Poll Creation Modal */}
        {isCreatingPoll && (
          <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm p-6 animate-in fade-in zoom-in-95">
            <div className="max-w-md mx-auto bg-white rounded-3xl shadow-2xl border border-black/10 p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black">Create a Poll</h3>
                <button onClick={() => setIsCreatingPoll(false)} className="text-slate-400 hover:text-ink">
                  <X size={24} />
                </button>
              </div>
              <div className="space-y-4">
                <label className="block text-sm font-black">Question
                  <input 
                    value={pollTitle} 
                    onChange={(e) => setPollTitle(e.target.value)}
                    placeholder="e.g. What time works best?" 
                    className="w-full mt-1 px-4 py-3 rounded-xl border border-black/10 bg-field font-semibold"
                  />
                </label>
                <div className="space-y-2">
                  <span className="text-sm font-black">Options</span>
                  {pollOptions.map((opt, i) => (
                    <input 
                      key={i}
                      value={opt}
                      onChange={(e) => {
                        const next = [...pollOptions];
                        next[i] = e.target.value;
                        setPollOptions(next);
                      }}
                      placeholder={`Option ${i + 1}`}
                      className="w-full px-4 py-3 rounded-xl border border-black/10 bg-field font-semibold"
                    />
                  ))}
                  <button 
                    onClick={() => setPollOptions([...pollOptions, ""])}
                    className="text-cyan text-sm font-black flex items-center gap-1 mt-2"
                  >
                    <Plus size={14} /> Add option
                  </button>
                </div>
                <button 
                  onClick={createPoll}
                  className="w-full bg-ink text-white py-4 rounded-2xl font-black mt-4 hover:bg-slate-800 transition"
                >
                  Post Poll to Chat
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 space-y-3 overflow-y-auto bg-white p-5">
          {selectedThread?.messages.map((message) => {
            const isPoll = message.kind === 'poll_prompt';
            const poll = isPoll && selectedThread.eventId ? activePolls[selectedThread.eventId] : null;

            return (
              <article className={`max-w-xl rounded-lg p-4 ${message.kind === 'event_invitation' ? 'bg-ink text-white' : 'bg-field text-ink'}`} key={message.id}>
                {isPoll && poll ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-cyan">
                      <ListTodo size={18} />
                      <span className="text-xs font-black uppercase tracking-wider">Active Poll</span>
                    </div>
                    <p className="text-base font-black leading-6">{poll.title}</p>
                    <div className="space-y-2">
                      {poll.options.map((opt: any) => (
                        <button 
                          key={opt.id}
                          className="w-full p-3 rounded-xl bg-white border border-black/5 flex justify-between items-center hover:border-cyan transition group"
                        >
                          <span className="font-bold text-sm">{opt.label}</span>
                          <span className="text-xs font-black text-slate-400 group-hover:text-cyan">{opt.voteCount} votes</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm font-bold leading-6">{message.body}</p>
                )}
                
                {message.kind === 'event_invitation' && message.eventId && (
                  <div className="mt-3">
                    <Link 
                      href={`/?event=${message.eventId}`} 
                      className="inline-flex items-center gap-2 bg-cyan text-ink px-4 py-2 rounded-full text-xs font-black transition hover:scale-105"
                    >
                      <ExternalLink size={14} />
                      View Event details
                    </Link>
                  </div>
                )}

                <p className={`mt-2 text-xs font-black ${message.kind === 'event_invitation' || isPoll ? 'text-cyan' : 'text-slate-500'}`}>
                  {message.kind.replace("_", " ")} · {formatEventTime(message.createdAt)}
                </p>
              </article>
            );
          })}
        </div>
        {selectedThread ? (
          <form action={send} className="flex gap-3 border-t border-black/10 p-4">
            <input
              className="min-w-0 flex-1 rounded-full border border-black/10 bg-field px-5 py-3 text-sm font-semibold"
              name="body"
              placeholder="Message"
            />
            <button
              className="rounded-full bg-ink px-5 py-3 text-sm font-black text-white disabled:opacity-60"
              disabled={isPending}
              type="submit"
            >
              Send
            </button>
          </form>
        ) : null}
      </section>
    </div>
  );
}
