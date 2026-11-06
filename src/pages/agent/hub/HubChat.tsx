import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remarkGfm";
import {
  ArrowUp,
  Bot,
  Check,
  ChevronDown,
  Clock,
  EyeOff,
  History,
  Loader2,
  MessageSquarePlus,
  MoreHorizontal,
  Plus,
  Search,
  Square,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { agentApi, type AgentInfo, type SessionInfo } from "@/lib/agentsky/client";
import { refreshSessions, workspace } from "@/lib/agentsky/store";
import { useAgentSession } from "@/hooks/useAgentSession";
import { StepTimeline } from "@/components/agent/StepTimeline";
import { ApprovalCard, MediaCard, PlanCard, QuestionCard, TaskCard, VideoProposalCard } from "@/components/agent/Cards";
import { orbStateFor, type AgentTurn } from "@/lib/agentsky/transcript";
import type { AgentGroup } from "./hubStorage";
import { BackButton, BotAvatar, GroupAvatar, HubIconButton, HubSpinner, VoiceCaptureButton, type HubLang } from "./HubParts";

function HubComposer({
  lang,
  agentName,
  running,
  stopping,
  queue,
  onSend,
  onStop,
  onUnqueue,
  onNew,
  onConnect,
  autoFocus,
}: {
  lang: HubLang;
  agentName: string;
  running: boolean;
  stopping: boolean;
  queue: { id: string; text: string }[];
  onSend: (text: string) => void;
  onStop: () => void;
  onUnqueue: (id: string) => void;
  onNew: () => void;
  onConnect: () => void;
  autoFocus?: boolean;
}) {
  const [text, setText] = useState("");
  const [plusOpen, setPlusOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const recognition = useRef<{ stop: () => void } | null>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const ar = lang === "ar";

  useEffect(() => {
    const el = textarea.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 148)}px`;
  }, [text]);

  useEffect(() => () => recognition.current?.stop(), []);

  const submit = () => {
    const value = text.trim();
    if (!value) return;
    onSend(value);
    setText("");
  };

  const listen = () => {
    if (listening) {
      recognition.current?.stop();
      setListening(false);
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      textarea.current?.focus();
      return;
    }
    const instance = new SpeechRecognition();
    instance.lang = ar ? "ar-EG" : "en-US";
    instance.interimResults = true;
    instance.continuous = false;
    instance.onresult = (event: any) => {
      const transcript = Array.from(event.results as any[])
        .map((result: any) => result[0].transcript)
        .join(" ");
      setText(transcript);
    };
    instance.onend = () => setListening(false);
    instance.onerror = () => setListening(false);
    recognition.current = instance;
    instance.start();
    setListening(true);
  };

  return (
    <div className="hub-composer-wrap">
      {queue.map((queued) => (
        <div className="hub-queued" key={queued.id}>
          <Clock size={14} />
          <span>{queued.text}</span>
          <small>{ar ? "في الانتظار" : "Queued"}</small>
          <button type="button" onClick={() => onUnqueue(queued.id)} aria-label={ar ? "شيل من الانتظار" : "Remove queued message"}><X size={14} /></button>
        </div>
      ))}
      <div className="hub-composer" data-listening={listening}>
        <div className="hub-composer-plus-wrap">
          <HubIconButton label={ar ? "خيارات" : "More options"} onClick={() => setPlusOpen((open) => !open)} active={plusOpen}>
            <Plus size={20} />
          </HubIconButton>
          {plusOpen && (
            <div className="hub-menu hub-composer-menu" role="menu">
              <button type="button" role="menuitem" onClick={() => { onNew(); setPlusOpen(false); }}><MessageSquarePlus size={17} />{ar ? "محادثة جديدة" : "New conversation"}</button>
              <button type="button" role="menuitem" onClick={() => { onConnect(); setPlusOpen(false); }}><Plus size={17} />{ar ? "ربط التطبيقات" : "Connect apps"}</button>
            </div>
          )}
        </div>
        <textarea
          ref={textarea}
          rows={1}
          value={text}
          dir="auto"
          autoFocus={autoFocus}
          aria-label={ar ? `اسأل ${agentName}` : `Ask ${agentName}`}
          placeholder={ar ? `اسأل ${agentName}` : `Ask ${agentName}`}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              submit();
            }
          }}
        />
        {text.trim() ? (
          <HubIconButton label={running ? (ar ? "ضيف للطابور" : "Queue message") : ar ? "إرسال" : "Send"} onClick={submit} className="hub-send-button">
            <ArrowUp size={18} />
          </HubIconButton>
        ) : (
          <div className="hub-composer-voice">
            {running && (
              <HubIconButton label={ar ? "إيقاف" : "Stop"} onClick={onStop} disabled={stopping}>
                {stopping ? <Loader2 size={16} className="animate-spin" /> : <Square size={13} fill="currentColor" />}
              </HubIconButton>
            )}
            <VoiceCaptureButton lang={lang} listening={listening} onClick={listen} />
            <VoiceCaptureButton lang={lang} listening={listening} onClick={listen} waveform />
          </div>
        )}
      </div>
    </div>
  );
}

export function HubChat({
  lang,
  agent,
  group,
  agents,
  sessions,
  sessionId,
  tier,
  models,
  demo = false,
  onSession,
  onBack,
  onProfile,
  onHide,
  onDelete,
}: {
  lang: HubLang;
  agent: AgentInfo;
  group?: AgentGroup;
  agents: AgentInfo[];
  sessions: SessionInfo[];
  sessionId: string | null;
  tier: "free" | "pro";
  models: Parameters<typeof VideoProposalCard>[0]["models"];
  demo?: boolean;
  onSession: (id: string | null) => void;
  onBack: () => void;
  onProfile: () => void;
  onHide: () => void;
  onDelete?: () => void;
}) {
  const nav = useNavigate();
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [findOpen, setFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [pinned, setPinned] = useState(true);
  const scroller = useRef<HTMLDivElement>(null);
  const s = useAgentSession(demo ? null : sessionId, lang);
  const ar = lang === "ar";
  const title = group?.name || agent.name;

  const lastAgent = useMemo(
    () => [...s.turns].reverse().find((turn) => turn.type === "agent") as AgentTurn | undefined,
    [s.turns],
  );
  const orb = orbStateFor(lastAgent, s.running);

  useEffect(() => {
    setMenuOpen(false);
    setHistoryOpen(false);
    setFindOpen(false);
    setFindQuery("");
    setStartError("");
  }, [agent.id, sessionId]);

  useEffect(() => {
    const el = scroller.current;
    if (el && pinned) el.scrollTop = el.scrollHeight;
  }, [s.turns, s.queue, pinned]);

  useEffect(() => {
    if (!demo && !s.running) void refreshSessions();
  }, [s.running, demo]);

  const startConversation = async (text: string) => {
    if (demo) return;
    setStarting(true);
    setStartError("");
    try {
      const result = await agentApi.createSession({ agentId: agent.id, text });
      workspace.upsertSession(result.session);
      onSession(result.session.id);
    } catch (error) {
      setStartError(error instanceof Error ? error.message : ar ? "المحادثة مبدأتش، جرّب تاني." : "Could not start the conversation. Try again.");
    } finally {
      setStarting(false);
    }
  };

  const visibleTurns = findQuery.trim()
    ? s.turns.filter((turn) => turn.text.toLowerCase().includes(findQuery.trim().toLowerCase()))
    : s.turns;

  const demoTurns = demo && sessionId === "demo" ? [
    { id: "demo-user", type: "user" as const, text: ar ? "اعملي خطة محتوى بسيطة للأسبوع ده" : "Make a simple content plan for this week", images: [] },
    { id: "demo-agent", type: "agent" as const, text: ar ? "أكيد. هقسم الأسبوع لثلاث أفكار واضحة: تعريف بالمنتج، فائدة عملية، ثم سؤال يفتح نقاش مع جمهورك." : "Absolutely. I’ll split the week into three clear ideas: introduce the product, share a practical benefit, then ask a question that starts a conversation.", images: [], steps: [], cards: [] },
  ] : [];
  const turns = demo ? demoTurns : visibleTurns;

  return (
    <section className="hub-chat" aria-label={`${title} conversation`}>
      <header className="hub-chat-header">
        <BackButton lang={lang} onClick={onBack} label={ar ? "رجوع للرئيسية" : "Back to bots"} />
        <button type="button" className="hub-chat-identity" onClick={onProfile}>
          {group ? <GroupAvatar group={group} agents={agents} size={27} /> : <BotAvatar agent={agent} size={29} state={s.running ? "thinking" : "idle"} />}
          <span><strong>{title}</strong><small>{s.running ? (ar ? "شغال دلوقتي…" : "Working…") : group ? (ar ? `${group.memberIds.length} بوتات` : `${group.memberIds.length} bots`) : agent.description || (ar ? "بوت شخصي" : "Personal bot")}</small></span>
        </button>
        {sessions.length > 0 && (
          <HubIconButton label={ar ? "المحادثات السابقة" : "Conversation history"} onClick={() => { setHistoryOpen((open) => !open); setMenuOpen(false); }} active={historyOpen}>
            <History size={18} />
          </HubIconButton>
        )}
        <HubIconButton label={ar ? "قائمة المحادثة" : "Conversation menu"} onClick={() => { setMenuOpen((open) => !open); setHistoryOpen(false); }} active={menuOpen}>
          <MoreHorizontal size={20} />
        </HubIconButton>
        {menuOpen && (
          <div className="hub-menu hub-header-menu" role="menu">
            <button type="button" role="menuitem" onClick={() => { onProfile(); setMenuOpen(false); }}><UserRound size={17} />{ar ? "عرض البروفايل" : "View Profile"}</button>
            <button type="button" role="menuitem" onClick={() => { setFindOpen((open) => !open); setMenuOpen(false); }}><Search size={17} />{ar ? "دوّر في المحادثة" : "Find in Chat"}</button>
            <button type="button" role="menuitem" onClick={() => { onSession(null); setMenuOpen(false); }}><MessageSquarePlus size={17} />{ar ? "محادثة جديدة" : "New Chat"}</button>
            <button type="button" role="menuitem" onClick={() => { onHide(); setMenuOpen(false); }}><EyeOff size={17} />{ar ? "إخفاء المحادثة" : "Hide Chat"}</button>
            {onDelete && <button type="button" role="menuitem" className="hub-danger" onClick={() => { onDelete(); setMenuOpen(false); }}><Trash2 size={17} />{ar ? "حذف" : "Delete"}</button>}
          </div>
        )}
        {historyOpen && (
          <div className="hub-menu hub-history-menu" role="menu">
            <button type="button" role="menuitem" onClick={() => { onSession(null); setHistoryOpen(false); }}><MessageSquarePlus size={17} />{ar ? "محادثة جديدة" : "New conversation"}</button>
            {sessions.map((session) => (
              <button type="button" role="menuitem" key={session.id} data-active={session.id === sessionId} onClick={() => { onSession(session.id); setHistoryOpen(false); }}>
                <span className="hub-history-title">{session.title || (ar ? "محادثة" : "Conversation")}</span>
                {session.id === sessionId ? <Check size={15} /> : session.status === "running" ? <Loader2 size={14} className="animate-spin" /> : null}
              </button>
            ))}
          </div>
        )}
      </header>

      {findOpen && (
        <div className="hub-find-bar">
          <Search size={16} />
          <input autoFocus value={findQuery} onChange={(event) => setFindQuery(event.target.value)} placeholder={ar ? "دوّر في الرسائل…" : "Find in messages…"} aria-label={ar ? "دوّر في الرسائل" : "Find in messages"} />
          <HubIconButton label={ar ? "قفل البحث" : "Close search"} onClick={() => { setFindOpen(false); setFindQuery(""); }}><X size={16} /></HubIconButton>
        </div>
      )}

      {!sessionId && !demo ? (
        <div className="hub-chat-empty">
          <div className="hub-chat-welcome">
            {group ? <GroupAvatar group={group} agents={agents} size={58} /> : <BotAvatar agent={agent} size={82} state={starting ? "thinking" : "hello"} />}
            <div>
              <h1>{ar ? `اتكلم مع ${title}` : `Chat with ${title}`}</h1>
              <p>{group ? (ar ? "المنسق هيختار البوت المناسب، ويمكنك استخدام @ مع اسم أي بوت." : "The coordinator picks the right bot, and you can mention any bot with @.") : agent.description || (ar ? "اسأل، خطط، ابحث واعمل أي حاجة مع بوتك الشخصي." : "Ask, plan, research and get things done with your personal bot.")}</p>
            </div>
            {agent.isDefault && (
              <div className="hub-suggestions">
                <button type="button" onClick={() => nav("/chat", { state: { agentCreation: true } })}><Bot size={16} />{ar ? "اعملي بوت جديد" : "Create a new bot"}</button>
                <button type="button" onClick={() => startConversation(ar ? "اقترح عليّ حاجة أعملها دلوقتي" : "Suggest something useful we can do now")}><MessageSquarePlus size={16} />{ar ? "اقترح عليّ حاجة" : "Suggest something"}</button>
              </div>
            )}
          </div>
          {(startError || starting) && <div className="hub-start-status">{starting ? <HubSpinner label={ar ? "بنجهز المحادثة…" : "Starting your chat…"} /> : <p role="alert">{startError}</p>}</div>}
        </div>
      ) : (
        <div
          className="hub-message-scroll"
          ref={scroller}
          onScroll={(event) => {
            const el = event.currentTarget;
            setPinned(el.scrollHeight - el.scrollTop - el.clientHeight < 120);
          }}
        >
          <div className="hub-message-column">
            {s.loading && !turns.length && <HubSpinner label={ar ? "بنحمّل الرسائل…" : "Loading messages…"} />}
            {turns.map((turn: any, index) =>
              turn.type === "user" ? (
                <div className="hub-user-message" key={turn.id} dir="auto">{turn.text}</div>
              ) : (
                <article className="hub-agent-message" key={turn.id}>
                  <div className="hub-agent-message-avatar">
                    {group ? <GroupAvatar group={group} agents={agents} size={23} /> : <BotAvatar agent={agent} size={28} state={index === turns.length - 1 ? orb : "idle"} />}
                  </div>
                  <div className="hub-agent-message-body">
                    <span className="hub-message-author">{title}</span>
                    {turn.steps?.length > 0 && <StepTimeline steps={turn.steps} lang={lang} />}
                    {turn.cards?.filter((card: any) => card.kind === "plan").map((card: any) => <PlanCard key={card.id} title={card.title} steps={card.steps} lang={lang} />)}
                    {turn.text && <div className="hub-answer" dir="auto"><ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: (props) => <a {...props} target="_blank" rel="noreferrer" /> }}>{turn.text}</ReactMarkdown></div>}
                    {turn.cards?.map((card: any) => {
                      if (card.kind === "media") return <MediaCard key={card.id} media={card.media} lang={lang} />;
                      if (card.kind === "video") return <VideoProposalCard key={card.id} proposal={card.proposal} models={models} tier={tier} lang={lang} onUpgrade={() => nav("/pricing")} />;
                      if (card.kind === "question") return <QuestionCard key={card.id} question={card.question} options={card.options} allowFreeText={card.allowFreeText} answered={card.answered} lang={lang} onAnswer={(value) => s.send(value)} />;
                      if (card.kind === "task") return <TaskCard key={card.id} title={card.title} dueAt={card.dueAt} lang={lang} onOpen={() => nav("/agents")} />;
                      return null;
                    })}
                    {turn.running && !turn.text && !turn.steps?.length && <span className="hub-handling"><Loader2 size={15} className="animate-spin" />{ar ? "بشتغل عليها" : "Handling it"}</span>}
                    {turn.error && <p className="hub-error" role="alert">{turn.error}</p>}
                  </div>
                </article>
              ),
            )}
            {!demo && s.requests.map((request) => (
              <ApprovalCard key={request.id} request={request} lang={lang} onAnswer={(value) => { s.setRequests((requests) => requests.filter((item) => item.id !== request.id)); s.send(value); }} />
            ))}
            {s.error && <p className="hub-error" role="alert">{s.error}</p>}
            {!turns.length && findQuery && <p className="hub-no-message-results">{ar ? "مفيش رسائل مطابقة." : "No matching messages."}</p>}
          </div>
          {!pinned && <HubIconButton label={ar ? "انزل لآخر رسالة" : "Scroll to latest"} className="hub-scroll-latest" onClick={() => { setPinned(true); scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" }); }}><ChevronDown size={18} /></HubIconButton>}
        </div>
      )}

      <HubComposer
        lang={lang}
        agentName={title}
        running={s.running || starting}
        stopping={s.stopping}
        queue={s.queue}
        onSend={(text) => { setPinned(true); if (!sessionId && !demo) void startConversation(text); else s.send(text); }}
        onStop={s.stop}
        onUnqueue={s.unqueue}
        onNew={() => onSession(null)}
        onConnect={() => nav("/integrations")}
        autoFocus={!sessionId}
      />
    </section>
  );
}
