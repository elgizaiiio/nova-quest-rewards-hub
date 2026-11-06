import { createFileRoute } from "@tanstack/react-router";
import { ProfilePanel } from "@/pages/agent/hub/HubPanels";
import type { AgentInfo } from "@/lib/agentsky/client";

export const Route = createFileRoute("/__pv")({
  ssr: false,
  component: Preview,
});

const mk = (id: string, name: string, color: AgentInfo["color"], isDefault = false): AgentInfo => ({
  id,
  name,
  description: "",
  color,
  prompt: "",
  isDefault,
  createdAt: new Date().toISOString(),
});

const agents: AgentInfo[] = [
  mk("a1", "Ceyo", "mono", true),
  mk("a2", "Isla", "ocean"),
  mk("a3", "Copper", "ember"),
  mk("a4", "Vera", "mint"),
  mk("a5", "Sol", "sun"),
];

function Preview() {
  const group = {
    id: "g1",
    name: "Trading Floor",
    coordinatorId: "a1",
    memberIds: ["a1", "a2", "a3", "a4", "a5"],
    category: "Unassigned",
    createdAt: new Date().toISOString(),
  };
  const noop = () => {};
  return (
    <div className="agent-hub ceyo-page" style={{ height: "100vh", background: "#000" }}>
      <ProfilePanel
        lang="en"
        agent={agents[0]}
        group={group}
        agents={agents}
        sessions={[]}
        onBack={noop}
        onEdit={noop}
        onOpenChat={noop}
      />
    </div>
  );
}
