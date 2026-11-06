import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowUp,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Clock,
  Copy,
  Flag,
  Loader2,
  MessageSquareDot,
  MessageSquarePlus,
  MoreHorizontal,
  Plus,
  Reply,
  Search,
  SmilePlus,
  Square,
  TextCursor,
  Trash2,
  UserRound,
  X,
  CircleAlert,
  Mic,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { agentApi, type AgentInfo, type SessionInfo } from "@/lib/agentsky/client";
import { refreshSessions, workspace } from "@/lib/agentsky/store";
import { useAgentSession } from "@/hooks/useAgentSession";
import { StepTimeline } from "@/components/agent/StepTimeline";
import { ApprovalCard, MediaCard, PlanCard, QuestionCard, TaskCard, VideoProposalCard } from "@/components/agent/Cards";
import { AgentProposalCard } from "@/components/agent/AgentProposalCard";
import { orbStateFor, type AgentTurn } from "@/lib/agentsky/transcript";
import { groupTranscript, type AgentGroup } from "./hubStorage";
import { BotAvatar, GroupAvatar, HubSpinner, type HubLang } from "./HubParts";
import { readReactions, writeReactions, REACTIONS } from "./chatPrefs";

type Bubble = {
  key: string;
  turnId: string;
  role: "user" | "agent";
  text: string;
  at?: string;
  speaker?: AgentInfo;
  turn: any;
  partIndex: number;
  lastPart: boolean;
  turnIndex: number;
};

function fmtTime(at?: string) {
  if (!at) return "";
  const d = new Date(at);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function Highlight({ text, q }: { text: string; q: string }): ReactNode {
  if (!q) return text;
  const parts = text.split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "ig"));
  return parts.map((p, i) => (p.toLowerCase() === q.toLowerCase() ? <mark key={i}>{p}</mark> : p));
}

function Composer({
  lang,
  placeholder,
  running,
  stopping,
  queue,
  replyTo,
  onCancelReply,
  onSend,
  onStop,
  onUnqueue,
  onNew,
  onConnect,
}: {
  lang: HubLang;
  placeholder: string;
  running: boolean;
  stopping: boolean;
  queue: { id: string; text: string }[];
  replyTo: string | null;
  onCancelReply: () => void;
  onSend: (text: string) => void;
  onStop: () => void;
  onUnqueue: (id: string) => void;
  onNew: () => void;
  onConnect: () => void;
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
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [text]);
  useEffect(() => { if (replyTo) textarea.current?.focus(); }, [replyTo]);
  useEffect(() => () => recognition.current?.stop(), []);

  const submit = () => {
    const value = text.trim();
    if (!value) return;
    onSend(replyTo ? `> ${replyTo.slice(0, 200).replace(/\n/g, " ")}\n\n${value}` : value);
    setText("");
    onCancelReply();
  };

  const listen = () => {
    if (listening) { recognition.current?.stop(); setListening(false); return; }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { textarea.current?.focus(); return; }
    const r = new SR();
    r.lang = ar ? "ar-EG" : "en-US";
    r.interimResults = true;
    r.onresult = (e: any) => setText(Array.from(e.results as any[]).map((x: any) => x[0].transcript).join(" "));
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    recognition.current = r;
    r.start();
    setListening(true);
  };

  return (
    <div className="cx-composer-wrap">
      {queue.map((q) => (
        <div className="cx-queued" key={q.id}>
          <Clock size={14} /><span>{q.text}</span>
          <button type="button" onClick={() => onUnqueue(q.id)} aria-label="Remove"><X size={14} /></button>
        </div>
      ))}
      {replyTo && (
        <div className="cx-reply-chip"><Reply size={14} /><span dir="auto">{replyTo}</span><button type="button" aria-label="Cancel reply" onClick={onCancelReply}><X size={14} /></button></div>
      )}
      {plusOpen && <div className="cx-scrim" onPointerDown={() => setPlusOpen(false)} />}
      <div className="cx-composer" data-listening={listening}>
        <div className="cx-plus-wrap">
          <button type="button" className="cx-circle" aria-label="More" onClick={() => setPlusOpen((o) => !o)}><Plus size={20} /></button>
          {plusOpen && (
            <div className="cx-pop cx-pop-up" role="menu">
              <button type="button" onClick={() => { onNew(); setPlusOpen(false); }}><MessageSquarePlus size={18} />{ar ? "محادثة جديدة" : "New conversation"}</button>
              <button type="button" onClick={() => { onConnect(); setPlusOpen(false); }}><Plus size={18} />{ar ? "ربط التطبيقات" : "Connect apps"}</button>
            </div>
          )}
        </div>
        <textarea
          ref={textarea}
          rows={1}
          value={text}
          dir="auto"
          aria-label={placeholder}
          placeholder={placeholder}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit(); }
          }}
        />
        {text.trim() ? (
          <button type="button" className="cx-circle cx-send" aria-label="Send" onClick={submit}><ArrowUp size={18} /></button>
        ) : running ? (
          <button type="button" className="cx-circle" aria-label="Stop" onClick={onStop} disabled={stopping}>
            {stopping ? <Loader2 size={16} className="animate-spin" /> : <Square size={12} fill="currentColor" />}
          </button>
        ) : (
          <button type="button" className="cx-circle" data-active={listening} aria-label="Voice" onClick={listen}><Mic size={18} /></button>
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
  onMarkUnread,
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
  onMarkUnread?: () => void;
}) {
  void sessions; void onHide;
  const nav = useNavigate();
  const [starting, setStarting] = useState(false);
  const [toast, setToast] = useState<{ title: string; body?: string; tone?: "error" } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [findOpen, setFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [findIdx, setFindIdx] = useState(0);
  const [pinned, setPinned] = useState(true);
  const [sheet, setSheet] = useState<Bubble | null>(null);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [selectable, setSelectable] = useState<string | null>(null);
  const [reactions, setReactions] = useState<Record<string, string>>({});
  const [swipe, setSwipe] = useState(0);
  const swipeStart = useRef<{ x: number; y: number; active: boolean } | null>(null);
  const press = useRef<number | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const s = useAgentSession(demo ? null : sessionId, lang);
  const ar = lang === "ar";
  const title = group?.name || agent.name;

  useEffect(() => { setReactions(readReactions()); }, []);
  useEffect(() => { if (!toast) return; const t = window.setTimeout(() => setToast(null), 3200); return () => window.clearTimeout(t); }, [toast]);

  const lastAgent = useMemo(() => [...s.turns].reverse().find((t) => t.type === "agent") as AgentTurn | undefined, [s.turns]);
  const orb = orbStateFor(lastAgent, s.running);

  useEffect(() => { setMenuOpen(false); setFindOpen(false); setFindQuery(""); setSheet(null); setReplyTo(null); }, [agent.id, sessionId]);
  useEffect(() => { const el = scroller.current; if (el && pinned) el.scrollTop = el.scrollHeight; }, [s.turns, s.queue, pinned]);
  useEffect(() => { if (!demo && !s.running) void refreshSessions(); }, [s.running, demo]);
  useEffect(() => {
    const err = lastAgent?.error || s.error;
    if (err) setToast({ title: ar ? "البوت مقدرش يرد" : "Bot failed to respond", body: err, tone: "error" });
  }, [lastAgent?.error, s.error, ar]);

  const startConversation = async (text: string) => {
    if (demo) return;
    setStarting(true);
    try {
      const result = await agentApi.createSession({ agentId: agent.id, text });
      workspace.upsertSession(result.session);
      onSession(result.session.id);
    } catch (error) {
      setToast({ title: ar ? "المحادثة مبدأتش" : "Could not start chat", body: error instanceof Error ? error.message : undefined, tone: "error" });
    } finally {
      setStarting(false);
    }
  };

  // Flatten turns into bubbles (group replies split per speaker).
  const bubbles = useMemo<Bubble[]>(() => {
    const out: Bubble[] = [];
    let lastAt: string | undefined;
    s.turns.forEach((turn: any, turnIndex) => {
      if (turn.type === "user") {
        lastAt = turn.at || lastAt;
        out.push({ key: turn.id, turnId: turn.id, role: "user", text: turn.text, at: turn.at, turn, partIndex: 0, lastPart: true, turnIndex });
        return;
      }
      const parsed = group ? groupTranscript(turn.text || "") : [{ speaker: "", text: turn.text || "" }];
      const parts = parsed.length ? parsed : [{ speaker: "", text: "" }];
      parts.forEach((part, partIndex) => {
        const speaker = group && part.speaker ? agents.find((a) => group.memberIds.includes(a.id) && a.name === part.speaker) : undefined;
        out.push({ key: `${turn.id}-${partIndex}`, turnId: turn.id, role: "agent", text: part.text, at: lastAt, speaker: speaker || agent, turn, partIndex, lastPart: partIndex === parts.length - 1, turnIndex });
      });
    });
    return out;
  }, [s.turns, group, agents, agent]);

  const q = findQuery.trim();
  const matches = useMemo(() => (q ? bubbles.filter((b) => b.text.toLowerCase().includes(q.toLowerCase())).map((b) => b.key) : []), [bubbles, q]);
  useEffect(() => { setFindIdx(matches.length ? matches.length - 1 : 0); }, [q, matches.length]);
  useEffect(() => {
    const key = matches[findIdx];
    if (key) document.getElementById(`cx-${key}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [findIdx, matches]);

  const workingNames = useMemo(() => {
    if (!s.running && !starting) return [];
    if (!group) return [agent.name];
    return group.memberIds.map((id) => agents.find((a) => a.id === id)?.name).filter(Boolean) as string[];
  }, [s.running, starting, group, agents, agent.name]);

  const startPress = (b: Bubble) => {
    if (press.current) window.clearTimeout(press.current);
    press.current = window.setTimeout(() => { setSheet(b); navigator.vibrate?.(8); }, 430);
  };
  const cancelPress = () => { if (press.current) { window.clearTimeout(press.current); press.current = null; } };

  const react = (key: string, emoji: string) => {
    setReactions((cur) => {
      const next = { ...cur };
      if (next[key] === emoji) delete next[key]; else next[key] = emoji;
      writeReactions(next);
      return next;
    });
    setSheet(null);
  };
  const copy = async (text: string, label: string) => {
    try { await navigator.clipboard.writeText(text); setToast({ title: label }); } catch { setToast({ title: ar ? "النسخ مش متاح" : "Copy unavailable", tone: "error" }); }
    setSheet(null);
  };

  const placeholder = ar ? `رسالة لـ ${title}` : `Message ${title}`;
  const empty = (!sessionId && !demo) || (!s.loading && bubbles.length === 0);

  return (
    <section className="cx-chat" aria-label={`${title} conversation`}>
      <header className="cx-head">
        <button type="button" className="cx-circle cx-glass" aria-label={ar ? "رجوع" : "Back"} onClick={onBack}><ChevronLeft size={22} /></button>
        <button type="button" className="cx-title-pill cx-glass" onClick={onProfile}>
          {group ? <GroupAvatar group={group} agents={agents} size={22} /> : <BotAvatar agent={agent} size={24} state={s.running ? "thinking" : "idle"} />}
          <strong dir="auto">{title}</strong>
        </button>
        <button type="button" className="cx-circle cx-glass cx-more" aria-label="Menu" onClick={() => setMenuOpen((o) => !o)}><MoreHorizontal size={20} /></button>
        {menuOpen && <div className="cx-scrim" onPointerDown={() => setMenuOpen(false)} />}
        {menuOpen && (
          <div className="cx-pop cx-pop-down" role="menu">
            <button type="button" onClick={() => { setMenuOpen(false); onProfile(); }}><UserRound size={19} />{ar ? "عرض البروفايل" : "View Profile"}</button>
            <button type="button" onClick={() => { setMenuOpen(false); setFindOpen(true); }}><Search size={19} />{ar ? "دوّر في الشات" : "Find in Chat"}</button>
            {onDelete && <button type="button" data-danger="true" onClick={() => { setMenuOpen(false); onDelete(); }}><Trash2 size={19} />{ar ? "حذف" : "Delete"}</button>}
          </div>
        )}
      </header>

      {toast && (
        <div className="cx-toast" data-tone={toast.tone} role="status">
          {toast.tone === "error" && <CircleAlert size={18} />}
          <span><strong>{toast.title}</strong>{toast.body && <small>{toast.body}</small>}</span>
        </div>
      )}

      <div
        className="cx-scroll"
        ref={scroller}
        onScroll={(e) => { const el = e.currentTarget; setPinned(el.scrollHeight - el.scrollTop - el.clientHeight < 120); }}
        onPointerDown={(e) => { swipeStart.current = { x: e.clientX, y: e.clientY, active: false }; }}
        onPointerMove={(e) => {
          const st = swipeStart.current; if (!st) return;
          const dx = e.clientX - st.x, dy = e.clientY - st.y;
          if (!st.active && Math.abs(dx) > 14 && Math.abs(dx) > Math.abs(dy) * 1.5) { st.active = true; cancelPress(); }
          if (st.active) setSwipe(Math.max(-90, Math.min(0, ar ? -dx : dx)));
        }}
        onPointerUp={() => { swipeStart.current = null; setSwipe(0); }}
        onPointerCancel={() => { swipeStart.current = null; setSwipe(0); }}
      >
        {empty ? (
          <div className="cx-empty">{(s.loading || starting) && <HubSpinner label={ar ? "لحظة…" : "One moment…"} />}</div>
        ) : (
          <div className="cx-column" style={{ transform: swipe ? `translateX(${ar ? -swipe : swipe}px)` : undefined, transition: swipe ? "none" : undefined }}>
            {s.loading && !bubbles.length && <HubSpinner label={ar ? "بنحمّل الرسائل…" : "Loading messages…"} />}
            {bubbles.map((b, i) => {
              const prev = bubbles[i - 1];
              const showDay = b.at && (!prev?.at || new Date(prev.at).toDateString() !== new Date(b.at).toDateString() || (new Date(b.at).getTime() - new Date(prev.at).getTime()) > 3600_000);
              const hit = matches[findIdx] === b.key;
              const handlers = {
                onPointerDown: () => startPress(b),
                onPointerUp: cancelPress,
                onPointerLeave: cancelPress,
                onContextMenu: (e: React.MouseEvent) => { e.preventDefault(); cancelPress(); setSheet(b); },
              };
              const reaction = reactions[b.key];
              const time = fmtTime(b.at);
              return (
                <div key={b.key} id={`cx-${b.key}`} className="cx-row-wrap">
                  {showDay && <p className="cx-day">{new Date(b.at!).toDateString() === new Date().toDateString() ? (ar ? "النهارده " : "Today ") : ""}{time}</p>}
                  {b.role === "user" ? (
                    <div className="cx-row cx-row-user">
                      <div className="cx-bubble cx-bubble-user" data-hit={hit} data-select={selectable === b.key} dir="auto" {...handlers}>
                        {b.text.startsWith("> ") ? (() => { const [quote, ...rest] = b.text.split("\n\n"); return <><span className="cx-quote">{quote.slice(2)}</span><Highlight text={rest.join("\n\n")} q={q} /></>; })() : <Highlight text={b.text} q={q} />}
                        {reaction && <em className="cx-reaction">{reaction}</em>}
                      </div>
                      <span className="cx-time">{time}</span>
                    </div>
                  ) : (
                    <div className="cx-row cx-row-agent">
                      <div className="cx-avatar"><BotAvatar agent={b.speaker!} size={22} state={b.turnIndex === s.turns.length - 1 && b.lastPart ? orb : "idle"} /></div>
                      <div className="cx-agent-body">
                        {(group || b.partIndex === 0) && <span className="cx-author" dir="auto">{b.speaker?.name || title}</span>}
                        {b.partIndex === 0 && b.turn.steps?.length > 0 && <StepTimeline steps={b.turn.steps} lang={lang} />}
                        {b.lastPart && b.turn.cards?.filter((c: any) => c.kind === "plan").map((c: any) => <PlanCard key={c.id} title={c.title} steps={c.steps} lang={lang} />)}
                        {b.text && (
                          <div className="cx-bubble cx-bubble-agent" data-hit={hit} data-select={selectable === b.key} dir="auto" {...handlers}>
                            {q ? <p><Highlight text={b.text} q={q} /></p> : (
                              <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                                a: (props) => <a {...props} target="_blank" rel="noreferrer" />,
                                p: ({ children }) => <p>{mentionify(children, group, agents)}</p>,
                                li: ({ children }) => <li>{mentionify(children, group, agents)}</li>,
                              }}>{b.text}</ReactMarkdown>
                            )}
                            {reaction && <em className="cx-reaction">{reaction}</em>}
                          </div>
                        )}
                        {b.lastPart && b.turn.cards?.map((card: any) => {
                          if (card.kind === "agent-proposal") return <AgentProposalCard key={card.id} proposal={card.proposal} />;
                          if (card.kind === "media") return <MediaCard key={card.id} media={card.media} lang={lang} />;
                          if (card.kind === "video") return <VideoProposalCard key={card.id} proposal={card.proposal} models={models} tier={tier} lang={lang} onUpgrade={() => nav("/pricing")} />;
                          if (card.kind === "question") return <QuestionCard key={card.id} question={card.question} options={card.options} allowFreeText={card.allowFreeText} answered={card.answered} lang={lang} onAnswer={(v) => s.send(v)} />;
                          if (card.kind === "task") return <TaskCard key={card.id} title={card.title} dueAt={card.dueAt} lang={lang} onOpen={() => nav("/agents")} />;
                          return null;
                        })}
                      </div>
                      <span className="cx-time">{time}</span>
                    </div>
                  )}
                </div>
              );
            })}
            {!demo && s.requests.map((r) => (
              <ApprovalCard key={r.id} request={r} lang={lang} onAnswer={(v) => { s.setRequests((rs) => rs.filter((x) => x.id !== r.id)); s.send(v); }} />
            ))}
            {workingNames.length > 0 && (
              <div className="cx-working">
                <BotAvatar agent={group ? (agents.find((a) => a.id === group.coordinatorId) || agent) : agent} size={22} state="thinking" />
                <span dir="auto">{workingNames.length > 2 ? `${workingNames.slice(0, 2).join(", ")} ${ar ? `و${workingNames.length - 2} كمان شغالين…` : `and ${workingNames.length - 2} others are working…`}` : `${workingNames.join(", ")} ${ar ? "شغال…" : workingNames.length > 1 ? "are working…" : "is working…"}`}</span>
              </div>
            )}
          </div>
        )}
        {!pinned && !empty && (
          <button type="button" className="cx-circle cx-glass cx-latest" aria-label="Scroll to latest" onClick={() => { setPinned(true); scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" }); }}><ChevronDown size={20} /></button>
        )}
      </div>

      {findOpen ? (
        <div className="cx-find">
          <label className="cx-find-input"><Search size={18} /><input autoFocus value={findQuery} onChange={(e) => setFindQuery(e.target.value)} placeholder={ar ? "دوّر في الشات" : "Find in chat"} />{q && <small>{matches.length ? findIdx + 1 : 0}/{matches.length}</small>}</label>
          <button type="button" className="cx-circle cx-glass cx-lg" aria-label="Previous" disabled={!matches.length} onClick={() => setFindIdx((i) => Math.max(0, i - 1))}><ChevronUp size={20} /></button>
          <button type="button" className="cx-circle cx-glass cx-lg" aria-label="Next" disabled={!matches.length} onClick={() => setFindIdx((i) => Math.min(matches.length - 1, i + 1))}><ChevronDown size={20} /></button>
          <button type="button" className="cx-done cx-glass" onClick={() => { setFindOpen(false); setFindQuery(""); }}>{ar ? "تم" : "Done"}</button>
        </div>
      ) : (
        <Composer
          lang={lang}
          placeholder={placeholder}
          running={s.running || starting}
          stopping={s.stopping}
          queue={s.queue}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
          onSend={(text) => { setPinned(true); setSelectable(null); if (!sessionId && !demo) void startConversation(text); else s.send(text); }}
          onStop={s.stop}
          onUnqueue={s.unqueue}
          onNew={() => onSession(null)}
          onConnect={() => nav("/settings/apps")}
        />
      )}

      {sheet && (
        <>
          <div className="cx-sheet-scrim" onPointerDown={() => setSheet(null)} />
          <div className="cx-sheet" role="dialog" aria-label="Message options">
            <span className="cx-grip" />
            <div className="cx-emoji-grid">
              {REACTIONS.map((e) => <button type="button" key={e} data-active={reactions[sheet.key] === e} onClick={() => react(sheet.key, e)}>{e}</button>)}
              <button type="button" aria-label="More reactions" onClick={() => { const v = window.prompt(ar ? "اكتب إيموجي" : "Type an emoji")?.trim(); if (v) react(sheet.key, v.slice(0, 4)); }}><SmilePlus size={22} /></button>
            </div>
            <div className="cx-sheet-group">
              <button type="button" onClick={() => { setReplyTo(sheet.text); setSheet(null); }}><Reply size={20} />{ar ? "رد" : "Reply"}</button>
              <button type="button" onClick={() => { onMarkUnread?.(); setSheet(null); setToast({ title: ar ? "اتعلمت غير مقروءة" : "Marked as unread" }); }}><MessageSquareDot size={20} />{ar ? "علّمها غير مقروءة" : "Mark as unread"}</button>
            </div>
            <div className="cx-sheet-group">
              <button type="button" onClick={() => void copy(sheet.text, ar ? "اتنسخت" : "Copied")}><Copy size={20} />{ar ? "نسخ" : "Copy"}</button>
              <button type="button" onClick={() => { setSelectable(sheet.key); setSheet(null); }}><TextCursor size={20} />{ar ? "تحديد النص" : "Select Text"}</button>
              <button type="button" onClick={() => void copy(sheet.turnId, ar ? "اتنسخ رقم الطلب" : "Request ID copied")}><Copy size={20} />{ar ? "نسخ رقم الطلب" : "Copy Request ID"}</button>
            </div>
            <div className="cx-sheet-group">
              <button type="button" onClick={() => { setSheet(null); setToast({ title: ar ? "شكرًا، وصلنا البلاغ" : "Thanks, report received" }); }}><Flag size={20} />{ar ? "إبلاغ" : "Report"}</button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function mentionify(children: ReactNode, group: AgentGroup | undefined, agents: AgentInfo[]): ReactNode {
  if (!group) return children;
  const names = group.memberIds.map((id) => agents.find((a) => a.id === id)?.name).filter(Boolean) as string[];
  if (!names.length) return children;
  const re = new RegExp(`(@?(?:${names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")}))`, "g");
  const walk = (node: ReactNode): ReactNode => {
    if (typeof node === "string") return node.split(re).map((p, i) => (names.includes(p.replace(/^@/, "")) ? <span key={i} className="cx-mention">{p}</span> : p));
    if (Array.isArray(node)) return node.map((n, i) => <span key={i} style={{ display: "contents" }}>{walk(n)}</span>);
    return node;
  };
  return walk(children);
}
