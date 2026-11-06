import { createFileRoute } from "@tanstack/react-router";
import "@/styles/agent-hub.css";
import { AgentForm, GroupForm } from "@/pages/agent/hub/HubPanels";
export const Route = createFileRoute("/zz-form-preview")({ component: P });
const agents:any[]=[{id:"a",name:"Ceyo",color:"mono",isDefault:true},{id:"b",name:"Trader",color:"ocean"},{id:"c",name:"Writer",color:"rose"}];
function P(){const g=typeof location!=="undefined"&&location.search.includes("g");return <div className="agent-hub">{g?<GroupForm lang="en" agents={agents} busy={false} error="" onSubmit={()=>{}} onCancel={()=>{}}/>:<AgentForm lang="en" busy={false} error="" onSubmit={()=>{}} onCancel={()=>{}}/>}</div>}
