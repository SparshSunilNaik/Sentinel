/** Simulated live agent traffic for the operator dashboard. */

export interface MockRequestTemplate {
  agent_id: string;
  action: string;
  amount: number;
  customer_risk: "LOW" | "MEDIUM" | "HIGH";
  customer_id?: string;
}

export const LIVE_REQUEST_POOL: MockRequestTemplate[] = [
  { agent_id: "AGT-TRAVEL-01", action: "Rebook Flight", amount: 35000, customer_risk: "LOW" },
  { agent_id: "AGT-TRAVEL-01", action: "Upgrade Cabin", amount: 28000, customer_risk: "MEDIUM" },
  { agent_id: "AGT-TRAVEL-01", action: "Issue Travel Credit", amount: 12000, customer_risk: "LOW" },
  { agent_id: "AGT-DISPUTE-01", action: "Reverse Transaction", amount: 4500, customer_risk: "MEDIUM" },
  { agent_id: "AGT-DISPUTE-01", action: "Issue Provisional Credit", amount: 18500, customer_risk: "HIGH" },
  { agent_id: "AGT-DISPUTE-01", action: "Open Dispute Case", amount: 3200, customer_risk: "LOW" },
  {
    agent_id: "AGT-BENEFITS-01",
    action: "Approve Purchase Protection",
    amount: 2000,
    customer_risk: "LOW",
  },
  {
    agent_id: "AGT-BENEFITS-01",
    action: "Approve Extended Warranty",
    amount: 8500,
    customer_risk: "MEDIUM",
  },
  { agent_id: "AGT-SERVICING-01", action: "Waive Annual Fee", amount: 12500, customer_risk: "MEDIUM" },
  { agent_id: "AGT-SERVICING-01", action: "Issue Statement Credit", amount: 1500, customer_risk: "LOW" },
  { agent_id: "AGT-SERVICING-01", action: "Adjust Credit Limit", amount: 50000, customer_risk: "HIGH" },
];

export function pickRandomRequest(): MockRequestTemplate {
  const base = LIVE_REQUEST_POOL[Math.floor(Math.random() * LIVE_REQUEST_POOL.length)];
  const jitter = 0.85 + Math.random() * 0.35;
  return {
    ...base,
    amount: Math.round(base.amount * jitter),
    customer_id: `CUST-${Math.floor(1000 + Math.random() * 9000)}`,
  };
}
