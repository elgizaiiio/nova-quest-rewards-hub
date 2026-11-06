import "@/styles/ceyo.css";
import { useMemo, useState } from "react";
import {
  Bot,
  Check,
  ChevronRight,
  Clock3,
  FileText,
  Library,
  MessageSquareText,
  Pencil,
  Play,
  RotateCcw,
  Search,
  Users,
  X,
} from "lucide-react";
import type { AgentColor, AgentInfo, SessionInfo } from "@/lib/agentsky/client";
import type { AgentGroup, VoiceSettings } from "./hubStorage";
import { DEFAULT_VOICE } from "./hubStorage";
import { BOT_COLORS, BOT_SHAPES, agentColorFor, lookFor, type BotLook } from "./botLooks";
import {
  BackButton,
  BotAvatar,
  ColorSwatches,
  EmptySearch,
  FormFooter,
  GroupAvatar,
  HubIconButton,
  SelectionToggle,
  type HubLang,
} from "./HubParts";

export type AgentFormValue = {
  name: string;
  description: string;
  prompt: string;
  color: AgentColor;
  category: string;
  voice: VoiceSettings;
  look?: BotLook;
};

export function AgentForm({
  lang,
  initial,
  category = "Unassigned",
  voice = DEFAULT_VOICE,
  busy,
  error,
  onSubmit,
  onCancel,
}: {
  lang: HubLang;
  initial?: AgentInfo | null;
  category?: string;
  voice?: VoiceSettings;
  busy: boolean;
  error: string;
  onSubmit: (value: AgentFormValue) => void;
  onCancel: () => void;
}) {
  const start = initial ? lookFor(initial) : { shape: "square", hex: "#7a7a7a" };
  const [name, setName] = useState(initial?.name || "");
  const [shape, setShape] = useState(start.shape);
  const [hex, setHex] = useState(start.hex);
  const look = { shape, hex };
  const ok = name.trim().length >= 2 && !busy;
  const submit = () => {
    if (!ok) return;
    const n = name.trim();
    onSubmit({
      name: n,
      description: initial?.description || `${n} — personal Ceyo bot`,
      prompt: initial?.prompt || `You are ${n}, a personal bot inside Ceyo. Be helpful, clear and concise. Reply in the user's language.`,
      color: agentColorFor(hex),
      category,
      voice,
      look,
    });
  };
  return (
    <section className="gx-create">
      <header className="gx-create-head"><button type="button" className="gx-round" aria-label="Close" onClick={onCancel}><X size={22} /></button><h1>{initial ? "Edit Bot" : "Create New Bot"}</h1></header>
      <div className="gx-create-body">
        <div className="gx-create-preview"><BotAvatar agent={{ name: name || "Bot", color: agentColorFor(hex), isDefault: false }} look={look} size={96} /></div>
        <input className="gx-name" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} placeholder="Name your Bot" onKeyDown={(e) => { if (e.key === "Enter") submit(); }} />
        <div className="gx-shapes">{BOT_SHAPES.map((s) => (
          <button type="button" key={s.id} aria-label={s.id} data-active={shape === s.id} onClick={() => setShape(s.id)}>
            <BotAvatar agent={{ name: s.id, color: "mono", isDefault: false }} look={{ shape: s.id, hex: "#7a7a7a" }} size={34} />
          </button>
        ))}</div>
        <div className="gx-colors">{BOT_COLORS.map((c) => <button type="button" key={c.hex} aria-label={c.hex} data-active={hex === c.hex} style={{ background: c.hex }} onClick={() => setHex(c.hex)} />)}</div>
      </div>
      {error && <p className="gx-error" role="alert">{error}</p>}
      <button type="button" className="gx-create-cta" disabled={!ok} onClick={submit}>{busy ? "…" : initial ? "Save" : "Create"}</button>
    </section>
  );
}

export function GroupForm({
  lang,
  initial,
  agents,
  busy,
  error,
  onSubmit,
  onCancel,
}: {
  lang: HubLang;
  initial?: AgentGroup | null;
  agents: AgentInfo[];
  busy: boolean;
  error: string;
  onSubmit: (value: { name: string; memberIds: string[]; category: string }) => void;
  onCancel: () => void;
}) {
  void lang;
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState(initial?.name || "");
  const [members, setMembers] = useState<string[]>(initial?.memberIds || []);
  const [q, setQ] = useState("");
  const category = initial?.category || "Unassigned";
  const toggle = (id: string) => setMembers((c) => c.includes(id) ? c.filter((x) => x !== id) : c.length >= 8 ? c : [...c, id]);
  const shown = agents.filter((a) => !q || a.name.toLowerCase().includes(q.toLowerCase()));
  const chosen = members.map((id) => agents.find((a) => a.id === id)).filter((a): a is AgentInfo => !!a);
  const finish = (skip: boolean) => {
    const n = skip || !name.trim() ? chosen.map((a) => a.name).slice(0, 3).join(", ") : name.trim();
    onSubmit({ name: n.slice(0, 60), memberIds: members, category });
  };
  if (step === 2) return (
    <section className="gx-create">
      <header className="gx-create-head"><button type="button" className="gx-round" aria-label="Back" onClick={() => setStep(1)}><ChevronRight size={22} style={{ transform: "rotate(180deg)" }} /></button><h1>New Group Chat</h1></header>
      <div className="gx-create-body gx-center">
        <div className="gx-group-preview">{chosen.slice(0, 3).map((a, i) => <span key={a.id} style={{ zIndex: 3 - i }}><BotAvatar agent={a} size={56} /></span>)}</div>
        <input className="gx-name gx-name-soft" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Project Falcon" />
        {error && <p className="hub-error" role="alert">{error}</p>}
      </div>
      <button type="button" className="gx-create-cta" data-variant={name.trim() ? "solid" : "outline"} disabled={busy} onClick={() => finish(!name.trim())}>{busy ? "…" : name.trim() ? "Create" : "Skip"}</button>
    </section>
  );
  return (
    <section className="gx-create">
      <header className="gx-create-head"><button type="button" className="gx-round" aria-label="Close" onClick={onCancel}><X size={22} /></button><h1>New Group Chat</h1><button type="button" className="gx-next" disabled={members.length < 2} onClick={() => setStep(2)}>Next</button></header>
      <div className="gx-pick-list">
        {members.length > 0 && <p className="gx-selected">{members.length} selected</p>}
        {shown.map((a) => (
          <button type="button" key={a.id} className="gx-pick" onClick={() => toggle(a.id)}>
            <BotAvatar agent={a} size={30} /><span>{a.name}</span>{members.includes(a.id) && <Check size={22} />}
          </button>
        ))}
        {agents.length < 2 && <p className="gx-selected">Create at least two bots first.</p>}
      </div>
      <div className="gx-bottom-search gx-abs"><Search size={20} /><input placeholder={members.length ? "Add another" : "Search Bots"} value={q} onChange={(e) => setQ(e.target.value)} /></div>
    </section>
  );
}

export function ProfilePanel({
  lang,
  agent,
  group,
  agents,
  sessions,
  onBack,
  onEdit,
  onOpenChat,
}: {
  lang: HubLang;
  agent: AgentInfo;
  group?: AgentGroup;
  agents: AgentInfo[];
  sessions: SessionInfo[];
  onBack: () => void;
  onEdit: () => void;
  onOpenChat: () => void;
}) {
  const ar = lang === "ar";
  const title = group?.name || agent.name;
  const members = group?.memberIds.map((id) => agents.find((item) => item.id === id)).filter((item): item is AgentInfo => !!item) || [];
  return (
    <section className="hub-panel hub-profile-panel">
      <header className="hub-panel-header"><BackButton lang={lang} onClick={onBack} /><h1>{ar ? "البروفايل" : "Profile"}</h1><HubIconButton label={ar ? "تعديل" : "Edit"} onClick={onEdit}><Pencil size={18} /></HubIconButton></header>
      <div className="hub-profile-scroll">
        <div className="hub-profile-hero">
          {group ? <GroupAvatar group={group} agents={agents} size={66} /> : <BotAvatar agent={agent} size={92} state="hello" />}
          <h2>{title}</h2>
          <p>{group ? (ar ? `${members.length} بوتات شغالين مع بعض` : `${members.length} bots working together`) : agent.description}</p>
          <button type="button" className="hub-button hub-button-secondary" onClick={onOpenChat}><MessageSquareText size={16} />{ar ? "افتح المحادثة" : "Open chat"}</button>
        </div>
        <div className="hub-profile-card">
          <button type="button" onClick={onOpenChat}><Clock3 size={18} /><span>{ar ? "الروتينات" : "Routines"}</span><small>{sessions.filter((item) => item.status === "running").length} {ar ? "شغال" : "on"}</small><ChevronRight size={16} /></button>
          <button type="button" onClick={onOpenChat}><Library size={18} /><span>{ar ? "المحادثات" : "Library"}</span><small>{sessions.length}</small><ChevronRight size={16} /></button>
          {group && <div className="hub-profile-static-row"><Users size={18} /><span>{ar ? "الأعضاء" : "Members"}</span><small>{members.length}</small></div>}
        </div>
        {group && (
          <section className="hub-profile-members"><h3>{ar ? "الأعضاء" : "Members"}</h3>{members.map((member) => <div key={member.id}><BotAvatar agent={member} size={38} /><span><strong>{member.name}</strong><small>{member.description}</small></span>{member.isDefault && <em>{ar ? "أساسي" : "Primary"}</em>}</div>)}</section>
        )}
        {!group && <div className="hub-profile-instructions"><h3>{ar ? "دور البوت" : "Bot instructions"}</h3><p>{agent.prompt || (ar ? "البوت الأساسي بيتكلم ويساعدك في كل مهامك." : "Your primary assistant for questions, research and getting things done.")}</p></div>}
      </div>
    </section>
  );
}

const filters = ["All", "Messages", "Bots", "Group Chats", "Files", "Routines"] as const;
type SearchFilter = (typeof filters)[number];

export function SearchOverlay({
  lang,
  agents,
  groups,
  sessions,
  onClose,
  onBot,
  onGroup,
  onSession,
}: {
  lang: HubLang;
  agents: AgentInfo[];
  groups: AgentGroup[];
  sessions: SessionInfo[];
  onClose: () => void;
  onBot: (id: string) => void;
  onGroup: (id: string) => void;
  onSession: (session: SessionInfo) => void;
}) {
  const ar = lang === "ar";
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<SearchFilter>("All");
  const q = query.trim().toLowerCase();
  const matchingAgents = useMemo(() => agents.filter((agent) => !q || `${agent.name} ${agent.description}`.toLowerCase().includes(q)), [agents, q]);
  const matchingGroups = useMemo(() => groups.filter((group) => !q || group.name.toLowerCase().includes(q)), [groups, q]);
  const matchingSessions = useMemo(() => sessions.filter((session) => q && session.title.toLowerCase().includes(q)), [sessions, q]);
  const localizedFilter = (value: SearchFilter) => ar ? ({ All: "الكل", Messages: "الرسائل", Bots: "البوتات", "Group Chats": "الجروبات", Files: "الملفات", Routines: "الروتينات" }[value]) : value;
  const noResults = !matchingAgents.length && !matchingGroups.length && !matchingSessions.length;

  return (
    <section className="hub-search-overlay" aria-label={ar ? "بحث" : "Search"}>
      <div className="hub-search-filters" role="tablist">
        {filters.map((item) => <button type="button" role="tab" aria-selected={filter === item} data-active={filter === item} key={item} onClick={() => setFilter(item)}>{localizedFilter(item)}</button>)}
      </div>
      <div className="hub-search-results">
        {(filter === "All" || filter === "Bots") && matchingAgents.map((agent) => (
          <button type="button" className="hub-search-row" key={agent.id} onClick={() => onBot(agent.id)}><BotAvatar agent={agent} size={40} /><span><strong>{agent.name}</strong><small>{agent.description}</small></span><em>{ar ? "بوت" : "Bot"}</em></button>
        ))}
        {(filter === "All" || filter === "Group Chats") && matchingGroups.map((group) => (
          <button type="button" className="hub-search-row" key={group.id} onClick={() => onGroup(group.id)}><GroupAvatar group={group} agents={agents} size={34} /><span><strong>{group.name}</strong><small>{group.category}</small></span><em>{ar ? "جروب" : "Group Chat"}</em></button>
        ))}
        {(filter === "All" || filter === "Messages") && matchingSessions.map((session) => (
          <button type="button" className="hub-search-row" key={session.id} onClick={() => onSession(session)}><span className="hub-search-file-icon"><MessageSquareText size={20} /></span><span><strong>{session.title}</strong><small>{agents.find((agent) => agent.id === session.agentId)?.name || (groups.find((group) => group.coordinatorId === session.agentId)?.name ?? "")}</small></span><em>{ar ? "رسالة" : "Message"}</em></button>
        ))}
        {(filter === "Files" || filter === "Routines") && <div className="hub-empty-state"><span className="hub-empty-icon">{filter === "Files" ? <FileText size={22} /> : <RotateCcw size={22} />}</span><strong>{ar ? "مفيش حاجة هنا لسه" : "Nothing here yet"}</strong><p>{filter === "Files" ? (ar ? "الملفات اللي البوتات هتشاركها هتظهر هنا." : "Files shared by your bots will appear here.") : ar ? "الروتينات الشغالة هتظهر هنا." : "Active routines will appear here."}</p></div>}
        {noResults && (filter === "All" || filter === "Messages" || filter === "Bots" || filter === "Group Chats") && <EmptySearch lang={lang} query={query} />}
      </div>
      <div className="hub-search-bottom">
        <Search size={19} />
        <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder={ar ? "دوّر في كل حاجة" : "Search everything"} aria-label={ar ? "دوّر في كل حاجة" : "Search everything"} />
        <HubIconButton label={ar ? "قفل البحث" : "Close search"} onClick={onClose}><X size={19} /></HubIconButton>
      </div>
    </section>
  );
}
