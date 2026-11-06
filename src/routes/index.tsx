import { createFileRoute } from "@tanstack/react-router";
import { SpaMount } from "@/lib/spaMount";

// The home page is the Megsy SPA itself (same mount as the catch-all `$` route).
export const Route = createFileRoute("/")({
  ssr: false,
  component: SpaMount,
  head: () => ({
    meta: [
      { title: "Megsy AI — Your Personal Bots and Group Chats" },
      {
        name: "description",
        content:
          "Meet your primary Megsy bot, create personal AI bots, coordinate group chats and pick up every conversation from one calm home.",
      },
      { property: "og:title", content: "Megsy AI — Your Personal Bots and Group Chats" },
      {
        property: "og:description",
        content:
          "Create personal AI bots and coordinated group chats, then continue every conversation from one clean, animated home.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Megsy AI — Your Personal Bots and Group Chats" },
      {
        name: "twitter:description",
        content:
          "Create personal AI bots and coordinated group chats, then continue every conversation from one clean, animated home.",
      },
    ],
  }),
});
