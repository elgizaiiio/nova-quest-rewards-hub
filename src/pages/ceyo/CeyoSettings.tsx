/** Ceyo settings — every screen from the reference set, one dark list style. */
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Brain, Check, ChevronLeft, ChevronRight, Copy, CreditCard, Gauge, HelpCircle, KeyRound, Languages,
  LayoutGrid, LogOut, Monitor, Moon, Plus, Search, Shield, Smartphone, Trash2, User, UserPlus, Vibrate, Vault,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCredits } from "@/hooks/useCredits";
import { getStoredTheme, setTheme, type ThemeMode } from "@/lib/theme";
import { integrations as CATALOG, type Integration } from "@/lib/integrationsData";
import {
  disconnectIntegration, loadIntegrationConnections, startIntegrationConnection, waitForConnectionRefresh,
} from "@/lib/integrationBackend";
import { IntegrationLogo } from "@/components/chat/integrations/IntegrationRow";
import "@/styles/agent-hub.css";
import "@/styles/ceyo.css";

type Nav = (to: string) => void;

function Shell({ title, back, children, action }: { title: string; back: () => void; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="agent-hub ceyo-page" data-no-translate>
      <header className="ceyo-top">
        <button type="button" className="hub-icon-button" aria-label="Back" onClick={back}><ChevronLeft size={22} /></button>
        <h1>{title}</h1>
        <span className="ceyo-top-action">{action}</span>
      </header>
      <div className="ceyo-scroll">{children}</div>
    </div>
  );
}

function Row({ icon, label, value, onClick, danger, right }: { icon?: ReactNode; label: string; value?: string; onClick?: () => void; danger?: boolean; right?: ReactNode }) {
  return (
    <button type="button" className="ceyo-row" data-danger={danger} onClick={onClick}>
      {icon && <span className="ceyo-row-icon">{icon}</span>}
      <span className="ceyo-row-label">{label}</span>
      {value && <span className="ceyo-row-value">{value}</span>}
      {right ?? (onClick && !danger ? <ChevronRight size={17} className="ceyo-row-chev" /> : null)}
    </button>
  );
}

const Group = ({ children, title }: { children: ReactNode; title?: string }) => (
  <section className="ceyo-group">{title && <h2>{title}</h2>}<div>{children}</div></section>
);

async function signOut(nav: Nav) {
  await supabase.auth.signOut();
  nav("/welcome");
}

/* ── Main ─────────────────────────────────────────────── */
function Main({ nav }: { nav: Nav }) {
  const [email, setEmail] = useState("");
  const [haptics, setHaptics] = useState(true);
  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email || ""));
    setHaptics(localStorage.getItem("ceyo_haptics") !== "off");
  }, []);
  const theme = getStoredTheme();
  return (
    <Shell title="Settings" back={() => nav("/")}>
      <Group>
        <Row icon={<User size={18} />} label="Account" value={email} onClick={() => nav("/settings/account")} />
        <Row icon={<Gauge size={18} />} label="Usage" onClick={() => nav("/settings/usage")} />
        <Row icon={<CreditCard size={18} />} label="Subscription" onClick={() => nav("/settings/usage")} />
      </Group>
      <Group>
        <Row icon={<Vault size={18} />} label="Vault" onClick={() => nav("/settings/vault")} />
        <Row icon={<LayoutGrid size={18} />} label="Connect apps" onClick={() => nav("/settings/apps")} />
        <Row icon={<Monitor size={18} />} label="Devices" onClick={() => nav("/settings/devices")} />
        <Row icon={<Brain size={18} />} label="Import memory" onClick={() => nav("/settings/memory")} />
      </Group>
      <Group>
        <Row icon={<Moon size={18} />} label="Appearance" value={theme === "system" ? "System" : theme === "dark" ? "Dark" : "Light"} onClick={() => nav("/settings/appearance")} />
        <Row icon={<Languages size={18} />} label="Language" value="English" onClick={() => nav("/settings/language")} />
        <Row
          icon={<Vibrate size={18} />}
          label="Haptics"
          onClick={() => { const next = !haptics; setHaptics(next); localStorage.setItem("ceyo_haptics", next ? "on" : "off"); }}
          right={<span className="ceyo-switch" data-on={haptics}><i /></span>}
        />
      </Group>
      <Group>
        <Row icon={<HelpCircle size={18} />} label="Help" onClick={() => window.open("mailto:support@ceyo.si")} />
        <Row icon={<Shield size={18} />} label="Privacy policy" onClick={() => nav("/privacy")} />
        <Row icon={<LogOut size={18} />} label="Sign out" danger onClick={() => void signOut(nav)} />
      </Group>
      <p className="ceyo-foot">Ceyo · ceyo.si</p>
    </Shell>
  );
}

/* ── Account ──────────────────────────────────────────── */
function Account({ nav }: { nav: Nav }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email || "");
      setName((data.user?.user_metadata?.full_name as string) || (data.user?.user_metadata?.name as string) || "");
    });
  }, []);
  return (
    <Shell title="Account" back={() => nav("/settings")}>
      <div className="ceyo-account-card">
        <span className="ceyo-avatar">{(name || email || "C").charAt(0).toUpperCase()}</span>
        <span><strong>{name || "Ceyo account"}</strong><small>{email}</small></span>
        <Check size={18} />
      </div>
      <Group>
        <Row icon={<UserPlus size={18} />} label="Add or switch account" onClick={() => void signOut(nav).then(() => nav("/auth"))} />
        <Row icon={<KeyRound size={18} />} label="Change password" onClick={() => nav("/settings/change-password")} />
        <Row icon={<Shield size={18} />} label="Two-factor authentication" onClick={() => nav("/settings/two-factor")} />
      </Group>
      <Group>
        <Row icon={<LogOut size={18} />} label="Sign out" danger onClick={() => void signOut(nav)} />
        <Row icon={<Trash2 size={18} />} label="Delete account" danger onClick={() => nav("/settings/delete-account")} />
      </Group>
    </Shell>
  );
}

/* ── Usage ────────────────────────────────────────────── */
function Usage({ nav }: { nav: Nav }) {
  const { credits, plan, loading } = useCredits() as { credits: number | null; plan: string; loading: boolean };
  const cap = plan === "free" ? 50 : plan.includes("max") || plan.includes("ultra") ? 5000 : 1000;
  const left = Math.max(0, Number(credits ?? 0));
  const used = Math.min(100, Math.round(((cap - Math.min(left, cap)) / cap) * 100));
  return (
    <Shell title="Usage" back={() => nav("/settings")}>
      <div className="ceyo-card">
        <div className="ceyo-usage-head"><strong>Weekly limit</strong><span>{loading ? "…" : `${used}% used`}</span></div>
        <div className="ceyo-bar"><i style={{ width: `${loading ? 0 : used}%` }} /></div>
        <p>{loading ? "Loading your balance…" : `${left.toLocaleString()} credits left on the ${plan} plan.`}</p>
      </div>
      <Group title="Subscription">
        <Row label="Current plan" value={plan.charAt(0).toUpperCase() + plan.slice(1)} />
      </Group>
    </Shell>
  );
}

/* ── Vault ────────────────────────────────────────────── */
type VaultItem = { id: string; kind: "login" | "card" | "contact"; title: string; detail: string };
const VAULT_KEY = "ceyo_vault_v1";
function Vault_({ nav }: { nav: Nav }) {
  const [tab, setTab] = useState<"all" | VaultItem["kind"]>("all");
  const [items, setItems] = useState<VaultItem[]>([]);
  const [adding, setAdding] = useState<VaultItem["kind"] | null>(null);
  const [menu, setMenu] = useState(false);
  const [q, setQ] = useState("");
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  useEffect(() => { try { setItems(JSON.parse(localStorage.getItem(VAULT_KEY) || "[]")); } catch { setItems([]); } }, []);
  const save = (next: VaultItem[]) => { setItems(next); localStorage.setItem(VAULT_KEY, JSON.stringify(next)); };
  const shown = items.filter((i) => (tab === "all" || i.kind === tab) && `${i.title} ${i.detail}`.toLowerCase().includes(q.toLowerCase()));
  const labels = { login: "Login", card: "Card", contact: "Contact info" } as const;
  return (
    <Shell
      title="Vault"
      back={() => nav("/settings")}
      action={<div className="hub-plus-wrap"><button type="button" className="hub-icon-button" aria-label="Add" onClick={() => setMenu((m) => !m)}><Plus size={21} /></button>
        {menu && <div className="hub-menu hub-plus-menu" role="menu">{(["login", "card", "contact"] as const).map((k) => <button type="button" key={k} onClick={() => { setAdding(k); setMenu(false); setTitle(""); setDetail(""); }}>{labels[k]}</button>)}</div>}</div>}
    >
      <div className="hub-search-filters ceyo-tabs">
        {(["all", "login", "card", "contact"] as const).map((k) => <button type="button" key={k} data-active={tab === k} onClick={() => setTab(k)}>{k === "all" ? "All" : k === "login" ? "Logins" : k === "card" ? "Payments" : "Contact info"}</button>)}
      </div>
      {adding && (
        <form className="ceyo-card" onSubmit={(e) => { e.preventDefault(); if (!title.trim()) return; save([{ id: crypto.randomUUID(), kind: adding, title: title.trim(), detail: detail.trim() }, ...items]); setAdding(null); }}>
          <strong>New {labels[adding].toLowerCase()}</strong>
          <input className="ceyo-input" placeholder={adding === "login" ? "Website" : adding === "card" ? "Card name" : "Name"} value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          <input className="ceyo-input" placeholder={adding === "login" ? "Username or email" : adding === "card" ? "Last 4 digits" : "Phone or address"} value={detail} onChange={(e) => setDetail(e.target.value)} />
          <div className="hub-form-footer"><button type="submit" className="hub-button hub-button-primary">Save</button><button type="button" className="hub-button hub-button-secondary" onClick={() => setAdding(null)}>Cancel</button></div>
        </form>
      )}
      {shown.length ? <Group>{shown.map((i) => <Row key={i.id} icon={i.kind === "card" ? <CreditCard size={18} /> : i.kind === "login" ? <KeyRound size={18} /> : <User size={18} />} label={i.title} value={i.detail} right={<span role="button" tabIndex={0} aria-label="Delete" className="ceyo-row-chev" onClick={() => save(items.filter((x) => x.id !== i.id))}><Trash2 size={16} /></span>} />)}</Group>
        : !adding && <div className="hub-empty-state"><span className="hub-empty-icon"><Vault size={22} /></span><strong>Your vault is empty</strong><p>Save logins, cards and contact info your bots can use. Stored on this device.</p></div>}
      <div className="ceyo-bottom-search"><Search size={17} /><input placeholder="Search vault" value={q} onChange={(e) => setQ(e.target.value)} /></div>
    </Shell>
  );
}

/* ── Connect apps ─────────────────────────────────────── */
function Apps({ nav, appId }: { nav: Nav; appId?: string }) {
  const [connected, setConnected] = useState<Record<string, boolean>>({});
  const [cat, setCat] = useState("Suggested");
  const [busy, setBusy] = useState("");
  const refresh = async (): Promise<boolean> => {
    try { const s = await loadIntegrationConnections(CATALOG); setConnected(s.connectedApps as Record<string, boolean>); return true; } catch { return false; }
  };
  useEffect(() => { void refresh(); }, []);
  const [q, setQ] = useState("");
  const cats = useMemo(() => ["All", ...Array.from(new Set(CATALOG.map((i) => i.category)))], []);
  const filtered = CATALOG.filter((i) => (cat === "All" || cat === "Suggested" || i.category === cat) && (!q || `${i.name} ${i.description}`.toLowerCase().includes(q.toLowerCase())));
  const count = Object.values(connected).filter(Boolean).length;
  const toggle = async (item: Integration) => {
    setBusy(item.app);
    try {
      if (connected[item.app]) { await disconnectIntegration(item); toast.success(`${item.name} disconnected`); }
      else {
        const res = await startIntegrationConnection(item);
        if ("popup" in res && res.popup) await waitForConnectionRefresh(refresh, res.popup);
        toast.success(`${item.name} connected`);
      }
      await refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not connect"); } finally { setBusy(""); }
  };
  const label = (item: Integration) => connected[item.app] ? "Connected" : item.type === "oauth" || item.type === "pipedream" ? "Authorize" : "Connect";
  const btn = (item: Integration, big = false) => <button type="button" className={big ? "gx-connect-big" : "gx-pill"} data-kind={connected[item.app] ? "on" : label(item) === "Authorize" ? "auth" : "plain"} disabled={busy === item.app} onClick={(e) => { e.stopPropagation(); void toggle(item); }}>{busy === item.app ? "…" : label(item)}</button>;
  const detail = appId ? CATALOG.find((i) => i.app === appId) : undefined;
  if (detail) return (
    <div className="gx-apps gx-sheet">
      <button type="button" className="gx-round" aria-label="Close" onClick={() => nav("/settings/apps")}><X size={22} /></button>
      <div className="gx-detail"><span className="gx-logo gx-logo-lg"><IntegrationLogo item={detail} size={44} /></span><h2>{detail.name}</h2><p>{detail.description}</p></div>
      <div className="gx-detail-cta">{btn(detail, true)}</div>
    </div>
  );
  const row = (item: Integration) => (
    <div key={item.id} className="gx-app-row" role="button" tabIndex={0} onClick={() => nav(`/settings/apps/${encodeURIComponent(item.app)}`)}>
      <span className="gx-logo"><IntegrationLogo item={item} size={30} /></span>
      <span className="gx-app-copy"><strong>{item.name}</strong><small>{item.description}</small></span>
      {btn(item)}
    </div>
  );
  return (
    <div className="gx-apps">
      <header className="gx-apps-head"><button type="button" className="gx-round" aria-label="Back" onClick={() => nav("/")}><ChevronLeft size={24} /></button><h1>Connect apps</h1><span className="gx-count">{count} connected</span></header>
      <div className="gx-chips">{cats.map((c) => <button type="button" key={c} data-active={cat === c || (c === "All" && cat === "Suggested")} onClick={() => setCat(c)}>{c}</button>)}</div>
      <div className="gx-apps-scroll">
        {cat === "All" || cat === "Suggested" ? (<>
          {!q && <><h3 className="gx-sec">For You <ChevronRight size={18} /></h3>{filtered.slice(0, 4).map(row)}<h3 className="gx-sec">Featured plugins <ChevronRight size={18} /></h3></>}
          {(q ? filtered : filtered.slice(4)).map(row)}
        </>) : filtered.map(row)}
      </div>
      <div className="gx-bottom-search"><Search size={20} /><input placeholder="Search across apps and skills" value={q} onChange={(e) => setQ(e.target.value)} /></div>
    </div>
  );
}

/* ── Devices ─────────────────────────────────────────── */
function Devices({ nav }: { nav: Nav }) {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const name = /Android/i.test(ua) ? "Android" : /iPhone|iPad/i.test(ua) ? "iPhone" : /Mac/i.test(ua) ? "Mac" : /Windows/i.test(ua) ? "Windows" : "This device";
  return (
    <Shell title="Devices" back={() => nav("/settings")}>
      <Group title="This device">
        <Row icon={<Smartphone size={18} />} label={name} value="Active now" right={<span className="ceyo-dot" />} />
      </Group>
      <p className="ceyo-note">Devices you sign in on appear here. Sign out to remove this device.</p>
    </Shell>
  );
}

/* ── Import memory ───────────────────────────────────── */
const MEMORY_PROMPT = "List everything you remember about me — preferences, projects, people, goals and how I like answers — as short bullet points. Output only the list.";
function Memory({ nav }: { nav: Nav }) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const add = async () => {
    if (!text.trim()) return;
    setSaving(true);
    try {
      const { data } = await supabase.auth.getUser();
      if (!data.user) throw new Error("Sign in first");
      const { error } = await supabase.from("user_knowledge").insert({ user_id: data.user.id, name: "Imported memory", use_when: "Always", content: text.trim().slice(0, 5000) } as never);
      if (error) throw error;
      setText("");
      toast.success("Memory added");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not add memory"); } finally { setSaving(false); }
  };
  return (
    <Shell title="Import memory" back={() => nav("/settings")}>
      <Group title="1. Copy this prompt into your other assistant">
        <div className="ceyo-prompt"><p>{MEMORY_PROMPT}</p><button type="button" className="hub-icon-button" aria-label="Copy" onClick={() => { void navigator.clipboard.writeText(MEMORY_PROMPT); toast.success("Copied"); }}><Copy size={16} /></button></div>
      </Group>
      <Group title="2. Paste the answer here">
        <textarea className="ceyo-input ceyo-textarea" placeholder="Paste memory…" value={text} onChange={(e) => setText(e.target.value)} />
      </Group>
      <button type="button" className="hub-button hub-button-primary ceyo-wide" disabled={!text.trim() || saving} onClick={() => void add()}>{saving ? "Adding…" : "Add to memory"}</button>
    </Shell>
  );
}

/* ── Appearance / Language ───────────────────────────── */
function Appearance({ nav }: { nav: Nav }) {
  const [mode, setMode] = useState<ThemeMode>("dark");
  useEffect(() => setMode(getStoredTheme()), []);
  const opts: [ThemeMode, string][] = [["system", "Follow system"], ["light", "Light"], ["dark", "Dark"]];
  return (
    <Shell title="Appearance" back={() => nav("/settings")}>
      <Group>{opts.map(([m, l]) => <Row key={m} label={l} onClick={() => { setTheme(m); setMode(m); }} right={mode === m ? <Check size={18} /> : <span />} />)}</Group>
    </Shell>
  );
}
function Language({ nav }: { nav: Nav }) {
  return (
    <Shell title="Language" back={() => nav("/settings")}>
      <Group><Row label="English" right={<Check size={18} />} /></Group>
      <p className="ceyo-note">More languages are coming soon.</p>
    </Shell>
  );
}

export default function CeyoSettings() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const nav: Nav = (to) => navigate(to);
  const [, , section, sub] = pathname.split("/");
  switch (section) {
    case "account": return <Account nav={nav} />;
    case "usage": return <Usage nav={nav} />;
    case "vault": return <Vault_ nav={nav} />;
    case "apps": return <Apps nav={nav} appId={sub ? decodeURIComponent(sub) : undefined} />;
    case "devices": return <Devices nav={nav} />;
    case "memory": return <Memory nav={nav} />;
    case "appearance": return <Appearance nav={nav} />;
    case "language": return <Language nav={nav} />;
    default: return <Main nav={nav} />;
  }
}
