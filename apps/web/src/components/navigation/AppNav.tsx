import Link from "next/link";
import { CalendarDays, MapPinned, MessageCircle, Sparkles, UserRound } from "lucide-react";

const items = [
  { href: "/messages", label: "Messages", icon: MessageCircle },
  { href: "/events", label: "Events", icon: CalendarDays },
  { href: "/", label: "Map", icon: MapPinned, primary: true },
  { href: "/matching", label: "Match", icon: Sparkles },
  { href: "/profile", label: "Profile", icon: UserRound }
];

export function AppNav() {
  return (
    <nav
      aria-label="Primary"
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 mx-auto flex w-full max-w-[36rem] items-end justify-center px-4"
    >
      <div className="flex w-full items-center justify-between gap-3 rounded-[3rem] bg-zinc-100/90 px-5 py-4 shadow-2xl backdrop-blur-xl border border-white/20">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              aria-label={item.label}
              className={`grid aspect-square place-items-center rounded-full transition-all duration-300 hover:-translate-y-2 hover:shadow-lg ${
                item.primary
                  ? "h-20 w-20 bg-[#25d9f5] text-[#101317] scale-110 shadow-xl"
                  : "h-14 w-14 bg-[#25d9f5] text-[#101317] md:h-16 md:w-16"
              }`}
              href={item.href}
              key={item.href}
              title={item.label}
            >
              <Icon
                aria-hidden="true"
                className={item.primary ? "h-10 w-10" : "h-7 w-7"}
                strokeWidth={2.5}
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
