/* ---- TC-S UNIVERSAL AGENT BOOTSTRAP ---- */
/* (Same block from previous message but minified for install script) */

export const API = process.env.NEXT_PUBLIC_API_BASE_URL;

export function getPersonalAgentId() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("tcs_agent_id");
}

export async function registerPersonalAgent(walletAddress: string, displayName: string) {
  const res = await fetch(`${API}/api/agents/register-personal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ walletAddress, displayName })
  });
  const data = await res.json();
  if (typeof window !== "undefined") {
    localStorage.setItem("tcs_agent_id", data.agent.id);
  }
  return data.agent;
}

export async function agentAction(actionType: string, payload: any, targetAgentId?: string) {
  const id = getPersonalAgentId();
  if (!id) throw new Error("No agent");
  const res = await fetch(`${API}/api/agents/${id}/actions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      actionType,
      payload,
      targetAgentId
    })
  });
  return res.json();
}

export async function getAgentStatus() {
  const id = getPersonalAgentId();
  if (!id) return null;
  const res = await fetch(`${API}/api/agents/${id}`);
  return res.json();
}
