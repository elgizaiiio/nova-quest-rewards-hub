import { useMemo, useState } from "react";
import {
  Bot,
  ChevronRight,
  Clock3,
  FileText,
  Library,
  Loader2,
  MessageSquareText,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Search,
  Users,
  X,
} from "lucide-react";
import type { AgentColor, AgentInfo, SessionInfo } from "@/lib/agentsky/client";
import type { AgentGroup, VoiceSettings } from "./hubStorage";
import { DEFAULT_VOICE } from "./hubStorage";
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
  const ar = lang === "ar";
  const [name, setName] = useState(initial?.name || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [prompt, setPrompt] = useState(initial?.prompt || "");
  const [color, setColor] = useState<AgentColor>(initial?.color || "aurora");
  const [folder, setFolder] = useState(category);
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>(voice);

  const previewVoice = () => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(ar ? "أهلًا، أنا جاهز أساعدك." : "Hi, I’m ready to help.");
    utterance.rate = voiceSettings.speed;
    if (voiceSettings.language !== "Auto") utterance.lang = voiceSettings.language;
    const selected = window.speechSynthesis.getVoices().find((item) => item.name === voiceSettings.voice);
    if (selected) utterance.voice = selected;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <section className="hub-panel hub-form-panel">
      <header className="hub-panel-header">
        <BackButton lang={lang} onClick={onCancel} />
        <h1>{initial ? (ar ? "تعديل البوت" : "Edit Bot") : ar ? "بوت جديد" : "New Bot"}</h1>
        <span className="hub-header-spacer" />
      </header>
      <form
        className="hub-form-scroll"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit({ name: name.trim(), description: description.trim(), prompt: prompt.trim(), color, category: folder.trim() || "Unassigned", voice: voiceSettings });
        }}
      >
        <div className="hub-form-hero">
          <BotAvatar agent={{ name: name || "New bot", color, isDefault: false }} size={76} state="hello" />
          <span>{ar ? "شخصية البوت هتتحرك مع حالته" : "Your bot’s character moves with its state"}</span>
        </div>
        <div className="hub-form-card">
          <label className="hub-field">
            <span>{ar ? "الاسم" : "Name"}</span>
            <input required minLength={2} maxLength={60} value={name} onChange={(event) => setName(event.target.value)} placeholder={ar ? "مثال: مساعد" : "e.g. Assistant"} />
          </label>
          <label className="hub-field">
            <span>{ar ? "وصف قصير" : "Short description"}</span>
            <input required minLength={10} maxLength={160} value={description} onChange={(event) => setDescription(event.target.value)} placeholder={ar ? "بيساعدك في إيه؟" : "What does it help with?"} />
          </label>
          <label className="hub-field">
            <span>{ar ? "التصنيف" : "Category"}</span>
            <input maxLength={40} value={folder} onChange={(event) => setFolder(event.target.value)} placeholder="Unassigned" />
          </label>
          <div className="hub-field">
            <span>{ar ? "اللون" : "Appearance"}</span>
            <ColorSwatches value={color} onChange={setColor} />
          </div>
        </div>
        <div className="hub-form-card">
          <label className="hub-field">
            <span>{ar ? "التعليمات" : "Instructions"}</span>
            <textarea required minLength={20} maxLength={6000} rows={6} value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder={ar ? "اكتب دور البوت، أسلوبه، حدوده، والنتيجة اللي عايزها…" : "Describe its role, tone, boundaries and what a successful result looks like…"} />
            <small>{ar ? "كل ما التعليمات تكون أوضح، البوت يبقى أدق." : "Clear instructions make the bot more useful and consistent."}</small>
          </label>
        </div>
        {initial && (
          <section className="hub-form-section">
            <h2>{ar ? "المكالمات الصوتية" : "Voice Calls"}</h2>
            <div className="hub-form-card">
              <label className="hub-field">
                <span>{ar ? "اللغة" : "Language"}</span>
                <select value={voiceSettings.language} onChange={(event) => setVoiceSettings((current) => ({ ...current, language: event.target.value }))}>
                  <option value="Auto">Auto</option><option value="ar-EG">العربية — مصر</option><option value="en-US">English — US</option><option value="en-GB">English — UK</option><option value="fr-FR">Français</option>
                </select>
              </label>
              <label className="hub-field">
                <span>{ar ? "السرعة" : "Speed"} · {voiceSettings.speed}×</span>
                <input className="hub-range" type="range" min="0.5" max="2" step="0.25" value={voiceSettings.speed} onChange={(event) => setVoiceSettings((current) => ({ ...current, speed: Number(event.target.value) }))} />
              </label>
              <button type="button" className="hub-voice-preview" onClick={previewVoice}><Play size={16} />{ar ? "تجربة الصوت" : "Preview voice"}</button>
            </div>
          </section>
        )}
        {error && <p className="hub-error" role="alert">{error}</p>}
        <FormFooter lang={lang} busy={busy} disabled={name.trim().length < 2 || description.trim().length < 10 || prompt.trim().length < 20} submitLabel={initial ? (ar ? "حفظ التعديلات" : "Save changes") : ar ? "إنشاء البوت" : "Create bot"} onCancel={onCancel} />
      </form>
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
  const ar = lang === "ar";
  const [name, setName] = useState(initial?.name || "");
  const [members, setMembers] = useState<string[]>(initial?.memberIds || []);
  const [category, setCategory] = useState(initial?.category || "Unassigned");
  const toggle = (id: string) => setMembers((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length >= 8 ? current : [...current, id]);
  const previewGroup: AgentGroup = initial || { id: "preview", name: name || "Group", coordinatorId: "", memberIds: members, category, createdAt: "" };

  return (
    <section className="hub-panel hub-form-panel">
      <header className="hub-panel-header"><BackButton lang={lang} onClick={onCancel} /><h1>{initial ? (ar ? "تعديل الجروب" : "Edit Group Chat") : ar ? "جروب جديد" : "New Group Chat"}</h1><span className="hub-header-spacer" /></header>
      <form className="hub-form-scroll" onSubmit={(event) => { event.preventDefault(); onSubmit({ name: name.trim(), memberIds: members, category: category.trim() || "Unassigned" }); }}>
        <div className="hub-form-hero"><GroupAvatar group={previewGroup} agents={agents} size={54} /><span>{ar ? `${members.length} من 8 بوتات` : `${members.length} of 8 bots selected`}</span></div>
        <div className="hub-form-card">
          <label className="hub-field"><span>{ar ? "اسم الجروب" : "Group name"}</span><input required minLength={2} maxLength={60} value={name} onChange={(event) => setName(event.target.value)} placeholder={ar ? "مثال: تداول — قيادة" : "e.g. Trading — Lead"} /></label>
          <label className="hub-field"><span>{ar ? "التصنيف" : "Category"}</span><input maxLength={40} value={category} onChange={(event) => setCategory(event.target.value)} /></label>
        </div>
        <section className="hub-form-section">
          <h2>{ar ? "اختار الأعضاء" : "Choose members"}</h2>
          <div className="hub-member-picker">
            {agents.map((agent) => (
              <button type="button" key={agent.id} onClick={() => toggle(agent.id)} data-selected={members.includes(agent.id)} disabled={!members.includes(agent.id) && members.length >= 8}>
                <BotAvatar agent={agent} size={37} />
                <span><strong>{agent.name}</strong><small>{agent.description || (ar ? "بوت شخصي" : "Personal bot")}</small></span>
                <SelectionToggle selected={members.includes(agent.id)} label={`${members.includes(agent.id) ? "Remove" : "Add"} ${agent.name}`} />
              </button>
            ))}
          </div>
          {agents.length < 2 && <p className="hub-form-note">{ar ? "اعمل بوت تاني الأول عشان تقدر تعمل جروب." : "Create another bot first so your group has at least two members."}</p>}
        </section>
        {error && <p className="hub-error" role="alert">{error}</p>}
        <FormFooter lang={lang} busy={busy} disabled={name.trim().length < 2 || members.length < 2} submitLabel={initial ? (ar ? "حفظ الجروب" : "Save group") : ar ? "إنشاء الجروب" : "Create group"} onCancel={onCancel} />
      </form>
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
