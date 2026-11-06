import "@/styles/agent-hub.css";
import { AgentForm, GroupForm } from "@/pages/agent/hub/HubPanels";
const agents:any[]=[{id:"a",name:"Ceyo",color:"mono",isDefault:true},{id:"b",name:"Trader",color:"ocean"},{id:"c",name:"Writer",color:"rose"}];
export default function P(){const g=location.search.includes("g");return <div className="agent-hub">{g?<GroupForm lang="en" agents={agents} busy={false} error="" onSubmit={()=>{}} onCancel={()=>{}}/>:<AgentForm lang="en" busy={false} error="" onSubmit={()=>{}} onCancel={()=>{}}/>}</div>}
