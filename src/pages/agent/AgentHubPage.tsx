/** Grok-style home for Ceyo bots and multi-bot groups, backed by real AgentSky chats. */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Bot,
  ChevronDown,
  ChevronRight,
  EyeOff,
  Grid2X2,
  Loader2,
  MessageSquareText,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Users,
} from "lucide-react";
import SEOHead from "@/components/common/SEOHead";
import { supabase } from "@/integrations/supabase/client";
import { agentApi, type AgentInfo, type SessionInfo } from "@/lib/agentsky/client";
import { loadWorkspace, useWorkspaceStore, workspace } from "@/lib/agentsky/store";
import { promptUpgrade } from "@/lib/upgradeMoment";
import { isPaidUser } from "@/lib/subscriptionGating";
import { HubChat } from "./hub/HubChat";
import { AgentForm, GroupForm, ProfilePanel, SearchOverlay, type AgentFormValue } from "./hub/HubPanels";
import { BotAvatar, CreateHint, GroupAvatar, HubIconButton, HubSpinner, type HubLang } from "./hub/HubParts";
import {
  EMPTY_HUB_LOCAL,
  groupPrompt,
  itemKey,
  loadHubLocal,
  makeGroup,
  saveHubLocal,
  voiceFor,
  type AgentGroup,
  type HubLocalState,
} from "./hub/hubStorage";

const DEMO_AGENTS: AgentInfo[] = [
  { id: "demo-main", name: "اخوو", description: "المساعد الأساسي", color: "mono", prompt: "", isDefault: true, createdAt: "" },
  { id: "demo-helper", name: "مساعد", description: "تنظيم المهام والردود", color: "ember", prompt: "", isDefault: false, createdAt: "" },
  { id: "demo-analyst", name: "محلل", description: "بحث وتحليل البيانات", color: "mint", prompt: "", isDefault: false, createdAt: "" },
  { id: "demo-lead", name: "تداول — قيادة", description: "منسق الجروب", color: "rose", prompt: "", isDefault: false, createdAt: "" },
];
const DEMO_GROUP: AgentGroup = { id: "demo-group", name: "تداول — قيادة", coordinatorId: "demo-lead", memberIds: ["demo-main", "demo-analyst", "demo-helper"], category: "Trading", createdAt: "" };
const DEMO_SESSIONS: SessionInfo[] = [
  { id: "demo-session-1", agentId: "demo-lead", title: "موافقتي سارية مع أمر التحويل", status: "idle", createdAt: new Date().toISOString() },
  { id: "demo-session-2", agentId: "demo-helper", title: "التنظيف خلص، واتفقنا على الخطوة الجاية", status: "idle", createdAt: new Date(Date.now() - 720000).toISOString() },
];

function relativeTime(iso: string | undefined, lang: HubLang) {
  if (!iso) return "";
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return lang === "ar" ? "دلوقتي" : "now";
  if (minutes < 60) return lang === "ar" ? `${minutes} د` : `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return lang === "ar" ? `${hours} س` : `${hours}h`;
  return new Date(iso).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", { month: "short", day: "numeric" });
}

function parseTarget(value: string | null): { kind: "bot" | "group"; id: string } | null {
  if (!value) return null;
  const [kind, ...rest] = value.split(":");
  const id = rest.join(":");
  return (kind === "bot" || kind === "group") && id ? { kind, id } : null;
}

export default function AgentHubPage({ demo = false }: { demo?: boolean }) {
  const live = useWorkspaceStore();
  const ws = demo
    ? { ready: true, error: null, agents: DEMO_AGENTS, tier: "pro" as const, models: [], sessions: DEMO_SESSIONS }
    : live;
  const lang = "en" as HubLang;
  const ar = lang === "ar";
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const [userId, setUserId] = useState(demo ? "demo" : "");
  const [local, setLocal] = useState<HubLocalState>(demo ? { ...EMPTY_HUB_LOCAL, groups: [DEMO_GROUP] } : EMPTY_HUB_LOCAL);
  const [storageReady, setStorageReady] = useState(demo);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [plusOpen, setPlusOpen] = useState(false);
  const [appsOpen, setAppsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [hiddenOpen, setHiddenOpen] = useState(false);

  useEffect(() => {
    if (!demo) void loadWorkspace();
  }, [demo]);

  useEffect(() => {
    if (demo) return;
    let active = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (active) setUserId(data.user?.id || "device");
    });
    return () => { active = false; };
  }, [demo]);

  useEffect(() => {
    if (!userId || demo) return;
    setLocal(loadHubLocal(userId));
    setStorageReady(true);
  }, [userId, demo]);

  const updateLocal = useCallback((recipe: (current: HubLocalState) => HubLocalState) => {
    setLocal((current) => {
      const next = recipe(current);
      if (!demo && userId) saveHubLocal(userId, next);
      return next;
    });
  }, [demo, userId]);

  const coordinatorIds = useMemo(() => new Set(local.groups.map((group) => group.coordinatorId)), [local.groups]);
  const directoryAgents = useMemo(
    () => ws.agents.filter((agent) => !coordinatorIds.has(agent.id) && !agent.isTemplate && !agent.mediaOnly),
    [ws.agents, coordinatorIds],
  );
  const primary = directoryAgents.find((agent) => agent.isDefault) || directoryAgents[0] || null;
  const orderedAgents = [...directoryAgents].sort((a, b) => Number(a.isDefault) - Number(b.isDefault));
  const groupMembersAgents = demo ? DEMO_AGENTS.filter((agent) => agent.id !== "demo-lead") : ws.agents.filter((agent) => !coordinatorIds.has(agent.id) && !agent.isTemplate && !agent.mediaOnly);

  const chatTarget = parseTarget(params.get("chat"));
  const profileTarget = parseTarget(params.get("profile"));
  const editTarget = parseTarget(params.get("edit"));
  const newKind = params.get("new");
  const activeTarget = profileTarget || editTarget || chatTarget;
  const activeGroup = activeTarget?.kind === "group" ? local.groups.find((group) => group.id === activeTarget.id) : undefined;
  const activeAgent = activeTarget
    ? ws.agents.find((agent) => agent.id === (activeTarget.kind === "group" ? activeGroup?.coordinatorId : activeTarget.id))
    : null;
  const activeSessions = activeAgent ? ws.sessions.filter((session) => session.agentId === activeAgent.id) : [];
  const selectedSession = chatTarget ? params.get("session") : null;
  const contentOpen = !!newKind || !!activeTarget;
  const paid = isPaidUser(ws.tier);

  const go = useCallback((next: Record<string, string>, replace = false) => {
    setPlusOpen(false);
    setAppsOpen(false);
    setSearchOpen(false);
    setFormError("");
    setParams(next, { replace });
  }, [setParams]);

  const goHome = useCallback(() => go({}, false), [go]);

  const openChat = useCallback((kind: "bot" | "group", id: string, latest = true, sessionId?: string | null) => {
    const next: Record<string, string> = { chat: itemKey(kind, id) };
    const group = kind === "group" ? local.groups.find((item) => item.id === id) : undefined;
    const agentId = group?.coordinatorId || id;
    const latestSession = latest ? ws.sessions.find((session) => session.agentId === agentId) : null;
    const chosen = sessionId === undefined ? latestSession?.id : sessionId;
    if (chosen) next.session = chosen;
    go(next);
  }, [go, local.groups, ws.sessions]);

  const latestFor = useCallback((agentId: string) => ws.sessions.find((session) => session.agentId === agentId), [ws.sessions]);

  const toggleHidden = (key: string, hide: boolean) => {
    updateLocal((current) => ({ ...current, hidden: hide ? [...new Set([...current.hidden, key])] : current.hidden.filter((item) => item !== key) }));
    if (hide) goHome();
  };

  const saveAgent = async (value: AgentFormValue, initial?: AgentInfo | null) => {
    if (demo) { setFormError("Design preview"); return; }
    if (!initial && !paid) {
      promptUpgrade("New bot", "Create your own bots with custom instructions.");
      return;
    }
    setBusy(true);
    setFormError("");
    try {
      const payload = { name: value.name, description: value.description, prompt: value.prompt, color: value.color };
      const result = initial ? await agentApi.updateAgent(initial.id, payload) : await agentApi.createAgent(payload);
      if (initial) workspace.updateAgent(result.agent); else workspace.addAgent(result.agent);
      const id = result.agent.id;
      updateLocal((current) => ({
        ...current,
        categories: { ...current.categories, [itemKey("bot", id)]: value.category },
        voices: { ...current.voices, [id]: value.voice },
      }));
      openChat("bot", id, false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : ar ? "معرفناش نحفظ البوت." : "Could not save the bot.");
    } finally {
      setBusy(false);
    }
  };

  const saveGroup = async (value: { name: string; memberIds: string[]; category: string }, initial?: AgentGroup | null) => {
    if (demo) { setFormError("Design preview"); return; }
    if (!initial && !paid) {
      promptUpgrade("New group chat", "Create a coordinated group with your bots.");
      return;
    }
    setBusy(true);
    setFormError("");
    try {
      const members = value.memberIds.map((id) => ws.agents.find((agent) => agent.id === id)).filter((agent): agent is AgentInfo => !!agent);
      const payload = { name: value.name, description: `${members.length} coordinated bots`, prompt: groupPrompt(value.name, members), color: "rose" as const };
      const result = initial ? await agentApi.updateAgent(initial.coordinatorId, payload) : await agentApi.createAgent(payload);
      if (initial) workspace.updateAgent(result.agent); else workspace.addAgent(result.agent);
      const group = makeGroup({ id: initial?.id, createdAt: initial?.createdAt, name: value.name, coordinatorId: result.agent.id, memberIds: value.memberIds, category: value.category });
      updateLocal((current) => ({ ...current, groups: [...current.groups.filter((item) => item.id !== group.id), group] }));
      openChat("group", group.id, false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : ar ? "معرفناش نحفظ الجروب." : "Could not save the group.");
    } finally {
      setBusy(false);
    }
  };

  const deleteBot = async (agent: AgentInfo) => {
    if (demo) return;
    if (!window.confirm(ar ? `تحذف ${agent.name} وكل تعليماته؟` : `Delete ${agent.name} and its instructions?`)) return;
    try {
      await agentApi.deleteAgent(agent.id);
      workspace.removeAgent(agent.id);
      updateLocal((current) => ({
        ...current,
        groups: current.groups.map((group) => ({ ...group, memberIds: group.memberIds.filter((id) => id !== agent.id) })),
        categories: Object.fromEntries(Object.entries(current.categories).filter(([key]) => key !== itemKey("bot", agent.id))),
        hidden: current.hidden.filter((key) => key !== itemKey("bot", agent.id)),
      }));
      goHome();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : ar ? "الحذف مكملش." : "Could not delete the bot.");
    }
  };

  const deleteGroup = async (group: AgentGroup) => {
    if (demo) return;
    if (!window.confirm(ar ? `تحذف جروب ${group.name}؟` : `Delete ${group.name}?`)) return;
    try {
      await agentApi.deleteAgent(group.coordinatorId);
      workspace.removeAgent(group.coordinatorId);
      updateLocal((current) => ({ ...current, groups: current.groups.filter((item) => item.id !== group.id), hidden: current.hidden.filter((key) => key !== itemKey("group", group.id)) }));
      goHome();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : ar ? "الحذف مكملش." : "Could not delete the group.");
    }
  };

  const categoryFor = (kind: "bot" | "group", id: string, group?: AgentGroup) => group?.category || local.categories[itemKey(kind, id)] || "Unassigned";
  const categories = new Set<string>(["Unassigned"]);
  orderedAgents.forEach((agent) => { if (!agent.isDefault) categories.add(categoryFor("bot", agent.id)); });
  local.groups.forEach((group) => categories.add(categoryFor("group", group.id, group)));

  const renderBotRow = (agent: AgentInfo, hidden = false) => {
    const latest = latestFor(agent.id);
    const key = itemKey("bot", agent.id);
    return (
      <div className="hub-list-row" key={key}>
        <button type="button" className="hub-list-row-main" onClick={() => openChat("bot", agent.id)} aria-label={`${ar ? "افتح" : "Open"} ${agent.name}`}>
          <BotAvatar agent={agent} size={43} />
          <span className="hub-row-copy"><span className="hub-row-title"><strong>{agent.name}</strong><time>{relativeTime(latest?.createdAt, lang)}</time></span><span className="hub-row-preview">{latest?.title || agent.description || (ar ? "بوت شخصي" : "Personal bot")}</span></span>
        </button>
        {hidden && <HubIconButton label={ar ? "إظهار" : "Unhide"} onClick={() => toggleHidden(key, false)}><EyeOff size={16} /></HubIconButton>}
      </div>
    );
  };

  const renderGroupRow = (group: AgentGroup, hidden = false) => {
    const latest = latestFor(group.coordinatorId);
    const key = itemKey("group", group.id);
    const members = group.memberIds.map((id) => ws.agents.find((agent) => agent.id === id)).filter((agent): agent is AgentInfo => !!agent);
    return (
      <div className="hub-list-row" key={key}>
        <button type="button" className="hub-list-row-main" onClick={() => openChat("group", group.id)} aria-label={`${ar ? "افتح" : "Open"} ${group.name}`}>
          <GroupAvatar group={group} agents={ws.agents} size={35} />
          <span className="hub-row-copy"><span className="hub-row-title"><strong>{group.name}</strong><time>{relativeTime(latest?.createdAt, lang)}</time></span><span className="hub-row-preview">{latest?.title || members.map((member) => member.name).join(" · ")}</span></span>
        </button>
        {hidden && <HubIconButton label={ar ? "إظهار" : "Unhide"} onClick={() => toggleHidden(key, false)}><EyeOff size={16} /></HubIconButton>}
      </div>
    );
  };

  const listContent = (
    <aside className="hub-home" aria-label={ar ? "البوتات والجروبات" : "Bots and groups"}>
      <header className="hub-home-header">
        <HubIconButton label={ar ? "الإعدادات" : "Settings"} className="hub-account-button" onClick={() => nav("/settings")}><span className="hub-account-orb"><Sparkles size={19} /></span></HubIconButton>
        <span className="hub-home-wordmark">Ceyo</span>
        <div className="hub-plus-wrap">
          <HubIconButton label={ar ? "إنشاء" : "Create"} onClick={() => setPlusOpen((open) => !open)} active={plusOpen}><Plus size={22} /></HubIconButton>
          {plusOpen && <div className="hub-menu hub-plus-menu" role="menu"><button type="button" role="menuitem" onClick={() => go({ new: "bot" })}><Bot size={18} />{ar ? "بوت جديد" : "New Bot"}</button><button type="button" role="menuitem" onClick={() => go({ new: "group" })}><Users size={18} />{ar ? "جروب جديد" : "New Group Chat"}</button></div>}
        </div>
      </header>

      <div className="hub-home-scroll">
        {primary ? (
          <button type="button" className="hub-primary-button" onClick={() => openChat("bot", primary.id)}>
            <span className="hub-primary-character"><BotAvatar agent={primary} size={76} state="hello" /><i /></span>
            <strong>{primary.name}</strong>
            <small><span />{ar ? "متصل" : "Online"}</small>
          </button>
        ) : !ws.ready ? <div className="hub-primary-skeleton"><Loader2 size={24} className="animate-spin" /></div> : null}

        {!ws.ready && <HubSpinner label={ar ? "بنجهز البوتات…" : "Loading your bots…"} />}
        {ws.error && <div className="hub-workspace-error"><p>{ar ? "البوتات مش متاحة دلوقتي. المحادثة الأساسية لسه شغالة." : "Your bots are unavailable right now. Quick Chat still works."}</p><button type="button" onClick={() => void loadWorkspace(true)}>{ar ? "حاول تاني" : "Try again"}</button></div>}

        {ws.ready && (() => {
          const bots = orderedAgents.filter((agent) => !agent.isDefault && categoryFor("bot", agent.id) === "Unassigned" && !local.hidden.includes(itemKey("bot", agent.id)));
          const groups = local.groups.filter((group) => categoryFor("group", group.id, group) === "Unassigned" && !local.hidden.includes(itemKey("group", group.id)));
          if (!bots.length && !groups.length) return null;
          return <div className="hub-category-rows hub-flat-rows">{groups.map((group) => renderGroupRow(group))}{bots.map((agent) => renderBotRow(agent))}</div>;
        })()}

        {ws.ready && [...categories].filter((category) => category !== "Unassigned").sort((a, b) => a.localeCompare(b)).map((category) => {
          const bots = orderedAgents.filter((agent) => !agent.isDefault && categoryFor("bot", agent.id) === category && !local.hidden.includes(itemKey("bot", agent.id)));
          const groups = local.groups.filter((group) => categoryFor("group", group.id, group) === category && !local.hidden.includes(itemKey("group", group.id)));
          if (!bots.length && !groups.length) return null;
          const isCollapsed = collapsed.has(category);
          return (
            <section className="hub-category" key={category}>
              <button type="button" className="hub-category-title" onClick={() => setCollapsed((current) => { const next = new Set(current); if (next.has(category)) next.delete(category); else next.add(category); return next; })} aria-expanded={!isCollapsed}><span>{category}</span><ChevronDown size={14} /></button>
              {!isCollapsed && <div className="hub-category-rows">{groups.map((group) => renderGroupRow(group))}{bots.map((agent) => renderBotRow(agent))}</div>}
            </section>
          );
        })}

        {ws.ready && storageReady && orderedAgents.filter((agent) => !agent.isDefault).length === 0 && local.groups.length === 0 && (
          <CreateHint lang={lang} onClick={() => go({ new: "bot" })} />
        )}

        {local.hidden.length > 0 && (
          <section className="hub-hidden-section">
            <button type="button" className="hub-hidden-title" onClick={() => setHiddenOpen((open) => !open)}><span>{ar ? "المحادثات المخفية" : "Hidden chats"}<small>{local.hidden.length}</small></span><ChevronRight size={15} /></button>
            {hiddenOpen && <div className="hub-category-rows">{local.groups.filter((group) => local.hidden.includes(itemKey("group", group.id))).map((group) => renderGroupRow(group, true))}{orderedAgents.filter((agent) => local.hidden.includes(itemKey("bot", agent.id))).map((agent) => renderBotRow(agent, true))}</div>}
          </section>
        )}
      </div>

      <div className="hub-home-bottom">
        <div className="hub-apps-wrap">
          <HubIconButton label={ar ? "التطبيقات" : "Apps"} onClick={() => setAppsOpen((open) => !open)} active={appsOpen}><Grid2X2 size={19} /></HubIconButton>
          {appsOpen && <div className="hub-menu hub-apps-menu" role="menu"><button type="button" role="menuitem" onClick={() => primary && openChat("bot", primary.id, false)}><MessageSquareText size={18} />{ar ? "المحادثة الأساسية" : "New chat"}</button><button type="button" role="menuitem" onClick={() => nav("/settings")}><Settings2 size={18} />{ar ? "الإعدادات" : "Settings"}</button><button type="button" role="menuitem" onClick={() => nav("/settings/apps")}><Grid2X2 size={18} />{ar ? "ربط التطبيقات" : "Connect apps"}</button></div>}
        </div>
        <button type="button" className="hub-search-trigger" onClick={() => setSearchOpen(true)}><Search size={18} /><span>{ar ? "بحث" : "Search"}</span></button>
      </div>
    </aside>
  );

  let content = (
    <div className="hub-desktop-empty">
      {primary && <BotAvatar agent={primary} size={92} state="idle" />}
      <h1>{ar ? "كل بوتاتك في مكان واحد" : "All your bots, one calm place"}</h1>
      <p>{ar ? "اختار بوت أو جروب وابدأ. ولو عايز بوت جديد، Ceyo هيساعدك تعمله." : "Pick a bot or group to begin. If you need a new bot, Ceyo will help you create it."}</p>
      <button type="button" className="hub-button hub-button-secondary" onClick={() => primary && openChat("bot", primary.id, false)}><MessageSquareText size={17} />{ar ? "ابدأ محادثة" : "Start chatting"}</button>
    </div>
  );

  if (newKind === "bot") content = <AgentForm lang={lang} busy={busy} error={formError} onSubmit={(value) => void saveAgent(value)} onCancel={goHome} />;
  else if (newKind === "group") content = <GroupForm lang={lang} agents={groupMembersAgents} busy={busy} error={formError} onSubmit={(value) => void saveGroup(value)} onCancel={goHome} />;
  else if (profileTarget && activeAgent) content = <ProfilePanel lang={lang} agent={activeAgent} group={activeGroup} agents={ws.agents} sessions={activeSessions} onBack={() => chatTarget ? openChat(chatTarget.kind, chatTarget.id, false, selectedSession) : goHome()} onEdit={() => go({ edit: itemKey(profileTarget.kind, profileTarget.id) })} onOpenChat={() => openChat(profileTarget.kind, profileTarget.id)} />;
  else if (editTarget?.kind === "bot" && activeAgent) content = <AgentForm lang={lang} initial={activeAgent} category={categoryFor("bot", activeAgent.id)} voice={voiceFor(local, activeAgent.id)} busy={busy} error={formError} onSubmit={(value) => void saveAgent(value, activeAgent)} onCancel={() => go({ profile: itemKey("bot", activeAgent.id) })} />;
  else if (editTarget?.kind === "group" && activeGroup) content = <GroupForm lang={lang} initial={activeGroup} agents={groupMembersAgents} busy={busy} error={formError} onSubmit={(value) => void saveGroup(value, activeGroup)} onCancel={() => go({ profile: itemKey("group", activeGroup.id) })} />;
  else if (chatTarget && activeAgent) content = <HubChat lang={lang} agent={activeAgent} group={activeGroup} agents={ws.agents} sessions={activeSessions} sessionId={demo ? "demo" : selectedSession} tier={ws.tier} models={ws.models} demo={demo} onSession={(id) => openChat(chatTarget.kind, chatTarget.id, false, id)} onBack={goHome} onProfile={() => go({ profile: itemKey(chatTarget.kind, chatTarget.id) })} onHide={() => toggleHidden(itemKey(chatTarget.kind, chatTarget.id), true)} onDelete={!activeAgent.isDefault ? () => activeGroup ? void deleteGroup(activeGroup) : void deleteBot(activeAgent) : undefined} />;
  else if (activeTarget && ws.ready && storageReady) content = <div className="hub-desktop-empty"><Bot size={38} /><h1>{ar ? "المحادثة دي مش موجودة" : "This chat is not available"}</h1><button type="button" className="hub-button hub-button-secondary" onClick={goHome}>{ar ? "ارجع للرئيسية" : "Back home"}</button></div>;

  return (
    <div className="agent-hub" data-content-open={contentOpen} dir={ar ? "rtl" : "ltr"} data-no-translate>
      <SEOHead path="/" title={ar ? "Ceyo — بوتاتك وجروباتك" : "Ceyo — Your bots and groups"} description={ar ? "اتكلم مع Ceyo واعمل بوتات وجروبات ذكية لكل شغلك." : "Chat with Ceyo and create personal bots and coordinated groups for your work."} />
      {listContent}
      <main className="hub-content">{content}</main>
      {searchOpen && <SearchOverlay lang={lang} agents={orderedAgents} groups={local.groups} sessions={ws.sessions} onClose={() => setSearchOpen(false)} onBot={(id) => openChat("bot", id)} onGroup={(id) => openChat("group", id)} onSession={(session) => { const group = local.groups.find((item) => item.coordinatorId === session.agentId); openChat(group ? "group" : "bot", group?.id || session.agentId, false, session.id); }} />}
      {(plusOpen || appsOpen) && <button type="button" className="hub-menu-dismiss" aria-label={ar ? "قفل القائمة" : "Dismiss menu"} onClick={() => { setPlusOpen(false); setAppsOpen(false); }} />}
    </div>
  );
}

export function AgentHubNewPage() {
  const navigate = useNavigate();
  useEffect(() => { navigate("/?new=bot", { replace: true }); }, [navigate]);
  return null;
}
