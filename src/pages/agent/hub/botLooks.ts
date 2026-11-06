/** Grok-style bot character looks: shape + solid colour, stored on this device per bot id. */
import type { AgentColor } from "@/lib/agentsky/client";

export type BotShape = { id: string; clip?: string; radius?: string };

export const BOT_SHAPES: BotShape[] = [
  { id: "circle", radius: "50%" },
  { id: "cloud", radius: "58% 52% 46% 54% / 60% 58% 44% 46%" },
  { id: "square", radius: "24%" },
  { id: "spark", clip: "polygon(50% 0%,62% 38%,100% 50%,62% 62%,50% 100%,38% 62%,0% 50%,38% 38%)" },
  { id: "puff", radius: "46% 54% 40% 60% / 52% 44% 56% 48%" },
  { id: "heart", radius: "50% 50% 50% 50% / 60% 60% 40% 40%" },
  { id: "flower", clip: "polygon(50% 0%,66% 14%,86% 14%,86% 34%,100% 50%,86% 66%,86% 86%,66% 86%,50% 100%,34% 86%,14% 86%,14% 66%,0% 50%,14% 34%,14% 14%,34% 14%)" },
  { id: "drop", radius: "50% 50% 50% 50% / 40% 40% 60% 60%" },
  { id: "pill", radius: "50% / 42%" },
  { id: "triangle", clip: "polygon(10% 8%,100% 55%,10% 95%)" },
  { id: "pebble", radius: "30% 40% 26% 34%" },
  { id: "star", clip: "polygon(50% 0%,61% 18%,82% 10%,80% 32%,100% 42%,84% 58%,92% 80%,68% 78%,56% 100%,42% 82%,20% 92%,20% 68%,0% 56%,16% 40%,8% 18%,32% 20%)" },
  { id: "hexagon", clip: "polygon(25% 4%,75% 4%,100% 50%,75% 96%,25% 96%,0% 50%)" },
];

export const BOT_COLORS: { hex: string; agent: AgentColor }[] = [
  { hex: "#ffffff", agent: "mono" },
  { hex: "#8f5e34", agent: "ember" },
  { hex: "#ff2d46", agent: "ember" },
  { hex: "#ff6a00", agent: "ember" },
  { hex: "#ff9f0a", agent: "sun" },
  { hex: "#14c96b", agent: "mint" },
  { hex: "#00b8a3", agent: "mint" },
  { hex: "#1484ff", agent: "ocean" },
  { hex: "#8a55ff", agent: "aurora" },
  { hex: "#ff2fa0", agent: "rose" },
  { hex: "#7a7a7a", agent: "mono" },
];

const FALLBACK: Record<AgentColor, string> = {
  aurora: "#8a55ff", ocean: "#1484ff", ember: "#ff2d46", mint: "#14c96b", sun: "#ff9f0a", rose: "#ff2fa0", mono: "#7a7a7a",
};

export type BotLook = { shape: string; hex: string };
const KEY = "ceyo_bot_looks_v1";

function readAll(): Record<string, BotLook> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(window.localStorage.getItem(KEY) || "{}") || {}; } catch { return {}; }
}

export function setBotLook(id: string, look: BotLook) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(KEY, JSON.stringify({ ...readAll(), [id]: look })); } catch { /* storage unavailable */ }
}

function hash(value: string) { let h = 0; for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) | 0; return Math.abs(h); }

export function lookFor(agent: { id?: string; name: string; color?: AgentColor; isDefault?: boolean }): BotLook {
  if (agent.isDefault) return { shape: "circle", hex: "#ffffff" };
  const stored = agent.id ? readAll()[agent.id] : undefined;
  if (stored) return stored;
  const seed = hash(agent.id || agent.name);
  return { shape: BOT_SHAPES[seed % BOT_SHAPES.length].id, hex: FALLBACK[agent.color || "mono"] };
}

export function shapeStyle(look: BotLook): Record<string, string> {
  const shape = BOT_SHAPES.find((s) => s.id === look.shape) || BOT_SHAPES[0];
  return { "--look-fill": look.hex, "--look-clip": shape.clip || "none", "--look-radius": shape.radius || "0" };
}

export function agentColorFor(hex: string): AgentColor {
  return BOT_COLORS.find((c) => c.hex === hex)?.agent || "mono";
}
