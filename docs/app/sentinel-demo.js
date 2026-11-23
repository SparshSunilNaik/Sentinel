/* Sentinel, in the browser.
   A JavaScript port of backend/app: seed data, the Identity -> Permission -> Budget -> Risk -> Decision
   pipeline (services/decision_engine.py), the risk model (services/risk_engine.py), dashboard metrics,
   the kill switch and every API route the dashboard calls. State lives in localStorage. */
(function (root) {
  "use strict";

  /* ---------- Python-compatible helpers ---------- */
  function pyRound(x, n) {
    var p = Math.pow(10, n), m = x * p, f = Math.floor(m);
    if (m - f === 0.5 && (f + 0.5) / p === x) return (f % 2 === 0 ? f : f + 1) / p; // exact tie: half to even
    return +x.toFixed(n);
  }
  function fmt0(x) { // f"{x:,.0f}"
    var s = pyRound(x, 0).toFixed(0), neg = s[0] === "-";
    if (neg) s = s.slice(1);
    return (neg ? "-" : "") + s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  function pyNum(x) { // str(float) for whole numbers keeps ".0"
    return Number.isInteger(x) ? x.toFixed(1) : String(x);
  }
  function hex(n) { var s = ""; while (s.length < n) s += Math.floor(Math.random() * 16).toString(16); return s.toUpperCase(); }
  function newId(prefix) { return prefix + "-" + hex(10); }
  function iso(d) { return d ? new Date(d).toISOString() : null; }
  function pad2(n) { return (n < 10 ? "0" : "") + n; }

  /* ---------- seed (backend/app/seed.py) ---------- */
  var POLICIES = [
    { policy_id: "POL-TRAVEL", name: "Travel Agent Governance", description: "Controls rebooking, upgrades, and travel reimbursements.", allowed_actions: ["Rebook Flight", "Upgrade Cabin", "Issue Travel Credit", "Cancel Booking"], allowed_departments: ["Travel"], transaction_limit: 50000, daily_budget: 200000, allowed_hours_start: 0, allowed_hours_end: 23, risk_threshold: 75, escalate_above: 50 },
    { policy_id: "POL-DISPUTE", name: "Dispute Resolution Governance", description: "Governs chargebacks, reversals, and provisional credits.", allowed_actions: ["Reverse Transaction", "Issue Provisional Credit", "Open Dispute Case", "Close Dispute"], allowed_departments: ["Disputes"], transaction_limit: 25000, daily_budget: 150000, allowed_hours_start: 6, allowed_hours_end: 22, risk_threshold: 70, escalate_above: 45 },
    { policy_id: "POL-BENEFITS", name: "Card Benefits Governance", description: "Purchase protection, extended warranty, and benefit claims.", allowed_actions: ["Approve Purchase Protection", "Approve Extended Warranty", "Deny Benefit Claim", "Request Documentation"], allowed_departments: ["Benefits"], transaction_limit: 15000, daily_budget: 80000, allowed_hours_start: 8, allowed_hours_end: 20, risk_threshold: 65, escalate_above: 40 },
    { policy_id: "POL-SERVICING", name: "Customer Servicing Governance", description: "Account servicing actions including fee waivers and limit changes.", allowed_actions: ["Waive Annual Fee", "Adjust Credit Limit", "Update Contact Info", "Issue Statement Credit"], allowed_departments: ["Servicing"], transaction_limit: 10000, daily_budget: 60000, allowed_hours_start: 7, allowed_hours_end: 21, risk_threshold: 60, escalate_above: 35 }
  ];
  var AGENTS = [
    { agent_id: "AGT-TRAVEL-01", name: "Travel Agent", department: "Travel", description: "Autonomous agent for itinerary changes and travel reimbursements.", status: "ACTIVE", risk_level: "LOW", trust_score: 0.92, permissions: ["Rebook Flight", "Upgrade Cabin", "Issue Travel Credit", "Cancel Booking"], daily_budget: 200000, current_usage: 42500, request_count_today: 4, policy_id: "POL-TRAVEL" },
    { agent_id: "AGT-DISPUTE-01", name: "Dispute Agent", department: "Disputes", description: "Handles transaction disputes, chargebacks, and provisional credits.", status: "ACTIVE", risk_level: "MEDIUM", trust_score: 0.81, permissions: ["Reverse Transaction", "Issue Provisional Credit", "Open Dispute Case", "Close Dispute"], daily_budget: 150000, current_usage: 28750, request_count_today: 6, policy_id: "POL-DISPUTE" },
    { agent_id: "AGT-BENEFITS-01", name: "Benefits Agent", department: "Benefits", description: "Evaluates purchase protection and card member benefit claims.", status: "ACTIVE", risk_level: "LOW", trust_score: 0.88, permissions: ["Approve Purchase Protection", "Approve Extended Warranty", "Deny Benefit Claim", "Request Documentation"], daily_budget: 80000, current_usage: 12400, request_count_today: 3, policy_id: "POL-BENEFITS" },
    { agent_id: "AGT-SERVICING-01", name: "Servicing Agent", department: "Servicing", description: "Customer account servicing, fee waivers, and limit adjustments.", status: "ACTIVE", risk_level: "MEDIUM", trust_score: 0.76, permissions: ["Waive Annual Fee", "Adjust Credit Limit", "Update Contact Info", "Issue Statement Credit"], daily_budget: 60000, current_usage: 18500, request_count_today: 5, policy_id: "POL-SERVICING" }
  ];
  var SAMPLE_HISTORY = [
    ["AGT-TRAVEL-01", "Travel Agent", "Rebook Flight", 18500, "APPROVED", 28.5, "LOW", "POL-TRAVEL"],
    ["AGT-DISPUTE-01", "Dispute Agent", "Reverse Transaction", 4500, "APPROVED", 32.0, "LOW", "POL-DISPUTE"],
    ["AGT-BENEFITS-01", "Benefits Agent", "Approve Purchase Protection", 2000, "APPROVED", 22.0, "LOW", "POL-BENEFITS"],
    ["AGT-SERVICING-01", "Servicing Agent", "Waive Annual Fee", 12500, "DENIED", 68.0, "HIGH", "POL-SERVICING"],
    ["AGT-DISPUTE-01", "Dispute Agent", "Issue Provisional Credit", 22000, "ESCALATED", 58.0, "MEDIUM", "POL-DISPUTE"],
    ["AGT-TRAVEL-01", "Travel Agent", "Upgrade Cabin", 42000, "ESCALATED", 61.0, "MEDIUM", "POL-TRAVEL"]
  ];
  var OPERATOR = { id: 1, email: "operator@amex.com", full_name: "Sentinel Operator", role: "operator", password: "sentinel2026" };

  function seed(nowMs) {
    var now = nowMs || Date.now(), t = iso(now);
    var s = {
      policies: POLICIES.map(function (p) { return Object.assign({}, p, { allowed_actions: p.allowed_actions.slice(), allowed_departments: p.allowed_departments.slice(), is_active: true, version: 1, updated_at: t }); }),
      agents: AGENTS.map(function (a) { return Object.assign({}, a, { permissions: a.permissions.slice(), updated_at: t }); }),
      system: { kill_switch_active: false, kill_switch_reason: null, kill_switch_activated_by: null, kill_switch_activated_at: null },
      requests: [], audits: []
    };
    SAMPLE_HISTORY.forEach(function (h, i) {
      var ts = iso(now - ((6 - i) * 3600 + i * 7 * 60) * 1000), rid = "REQ-SEED-" + String(i + 1).padStart(3, "0");
      var decision = h[4], score = h[5], level = h[6], decided = ts;
      if (decision === "ESCALATED" && i === 4) decided = null;
      s.requests.push({
        request_id: rid, agent_id: h[0], agent_name: h[1], action: h[2], amount: h[3], currency: "INR",
        customer_id: "CUST-" + (2000 + i), customer_risk: score > 50 ? "MEDIUM" : "LOW",
        status: decision, decision: decision, risk_score: score, risk_level: level, policy_id: h[7],
        reason: "Seeded historical decision: " + decision,
        explanation: { summary: decision + ": Seeded historical evaluation", decision_rationale: "Historical sample — " + decision, budget_status: "Within daily budget at time of evaluation", policy_matched: h[7], risk_factors: ["Score " + pyNum(score), "Level " + level],
          why_approved: decision === "APPROVED" ? "Passed all gates" : null, why_denied: decision === "DENIED" ? "Risk or budget threshold" : null, why_escalated: decision === "ESCALATED" ? "Requires human review" : null },
        pipeline_steps: [
          { step: "Identity", status: "PASS", message: "Verified", detail: null },
          { step: "Permission", status: "PASS", message: "Authorized", detail: null },
          { step: "Budget", status: "PASS", message: "Within limits", detail: null },
          { step: "Risk", status: level !== "LOW" ? "WARN" : "PASS", message: "Score " + pyNum(score), detail: null },
          { step: "Decision", status: decision === "APPROVED" ? "PASS" : decision === "ESCALATED" ? "WARN" : "FAIL", message: decision, detail: null }
        ],
        created_at: ts, decided_at: decided, latency_ms: 12.0 + i * 3.5
      });
      s.audits.push({ audit_id: "AUD-SEED-" + String(i + 1).padStart(3, "0"), timestamp: ts, agent_id: h[0], agent_name: h[1], action: h[2], amount: h[3], decision: decision, reason: "Seeded historical decision: " + decision, risk_score: score, risk_level: level, policy_id: h[7], request_id: rid, operator: null });
    });
    return s;
  }

  /* ---------- risk model (services/risk_engine.py) ---------- */
  var CUSTOMER_RISK_WEIGHTS = { LOW: 5.0, MEDIUM: 20.0, HIGH: 40.0 };
  function computeRisk(o) {
    var amount = o.amount, agent = o.agent;
    var amount_factor = Math.min(40.0, (amount / Math.max(o.transaction_limit, 1.0)) * 40.0);
    var trust_factor = (1.0 - agent.trust_score) * 25.0;
    var remaining = Math.max(o.daily_budget - agent.current_usage, 0.0);
    var budget_factor = remaining <= 0 ? 25.0 : Math.min(25.0, (amount / remaining) * 20.0);
    var frequency_factor = Math.min(15.0, Math.max(0.0, (agent.request_count_today - 5) * 2.5));
    var cr = String(o.customer_risk).toUpperCase();
    var customer_factor = CUSTOMER_RISK_WEIGHTS.hasOwnProperty(cr) ? CUSTOMER_RISK_WEIGHTS[cr] : 20.0;
    var score = pyRound(amount_factor + trust_factor + budget_factor + frequency_factor + customer_factor, 1);
    score = Math.min(100.0, Math.max(0.0, score));
    var level = score < 35 ? "LOW" : score < 65 ? "MEDIUM" : "HIGH";
    return { amount_factor: pyRound(amount_factor, 1), trust_factor: pyRound(trust_factor, 1), budget_factor: pyRound(budget_factor, 1), frequency_factor: pyRound(frequency_factor, 1), customer_factor: pyRound(customer_factor, 1), score: score, level: level };
  }
  function withinHours(policy, now) {
    var hour = new Date(now).getUTCHours(), start = policy.allowed_hours_start, end = policy.allowed_hours_end;
    if (start <= end) return start <= hour && hour <= end;
    return hour >= start || hour <= end;
  }

  /* ---------- decision pipeline (services/decision_engine.py) ---------- */
  function step(name, status, message, detail) { return { step: name, status: status, message: message, detail: detail === undefined ? null : detail }; }
  function explanation(o) {
    var agent = o.agent, policy = o.policy, risk = o.risk, payload = o.payload, reason = o.reason, decision = o.decision;
    var eff = policy ? Math.min(agent.daily_budget, policy.daily_budget) : agent.daily_budget;
    var remaining = Math.max(eff - agent.current_usage, 0.0);
    var factors = risk ? [
      "Transaction amount contribution: " + pyNum(risk.amount_factor),
      "Agent trust contribution: " + pyNum(risk.trust_factor) + " (trust=" + agent.trust_score + ")",
      "Budget pressure contribution: " + pyNum(risk.budget_factor),
      "Request frequency contribution: " + pyNum(risk.frequency_factor),
      "Customer risk contribution: " + pyNum(risk.customer_factor) + " (" + payload.customer_risk + ")"
    ] : [];
    return {
      summary: decision + ": " + reason, decision_rationale: reason,
      budget_status: "₹" + fmt0(agent.current_usage) + " used of ₹" + fmt0(eff) + " (₹" + fmt0(remaining) + " remaining)",
      policy_matched: policy ? policy.name + " (" + policy.policy_id + ") v" + policy.version : "No policy matched",
      risk_factors: factors,
      why_approved: decision === "APPROVED" ? reason : null, why_denied: decision === "DENIED" ? reason : null, why_escalated: decision === "ESCALATED" ? reason : null
    };
  }

  function Engine(state, opts) {
    this.s = state; this.opts = opts || {};
  }
  Engine.prototype.now = function () { return this.opts.now ? this.opts.now() : Date.now(); };
  Engine.prototype.agent = function (id) { return this.s.agents.filter(function (a) { return a.agent_id === id; })[0] || null; };
  Engine.prototype.policy = function (id) { return this.s.policies.filter(function (p) { return p.policy_id === id; })[0] || null; };
  Engine.prototype.audit = function (req, operator) {
    this.s.audits.push({ audit_id: newId("AUD"), timestamp: iso(this.now()), agent_id: req.agent_id, agent_name: req.agent_name, action: req.action, amount: req.amount, decision: req.decision || req.status, reason: req.reason || "", risk_score: req.risk_score || 0.0, risk_level: req.risk_level || "LOW", policy_id: req.policy_id || "N/A", request_id: req.request_id, operator: operator || null });
  };
  Engine.prototype.persist = function (o) {
    var agent = o.agent, payload = o.payload, risk = o.risk, now = o.now;
    var req = {
      request_id: newId("REQ"), agent_id: agent.agent_id, agent_name: agent.name, action: payload.action, amount: payload.amount, currency: payload.currency,
      customer_id: payload.customer_id, customer_risk: payload.customer_risk, status: o.status, decision: o.decision,
      risk_score: risk ? risk.score : null, risk_level: risk ? risk.level : null, policy_id: o.policy ? o.policy.policy_id : agent.policy_id,
      reason: o.reason, explanation: o.explanation, pipeline_steps: o.steps, created_at: iso(now), decided_at: o.decision !== "ESCALATED" ? iso(now) : null,
      latency_ms: o.latency
    };
    if (o.applyUsage) { agent.current_usage += payload.amount; agent.request_count_today += 1; }
    else if (o.decision === "ESCALATED") agent.request_count_today += 1;
    if (risk && risk.level === "HIGH") agent.risk_level = "HIGH";
    else if (risk && risk.level === "MEDIUM" && agent.risk_level === "LOW") agent.risk_level = "MEDIUM";
    this.s.requests.push(req); this.audit(req);
    return req;
  };
  Engine.prototype.evaluate = function (payload) {
    var t0 = (root.performance || Date).now(), now = this.now(), self = this, steps = [];
    payload = Object.assign({ currency: "INR", customer_id: "CUST-1001", customer_risk: "LOW" }, payload);
    var latency = function () { return pyRound(((root.performance || Date).now() - t0), 2); };
    var state = this.s.system, agent = this.agent(payload.agent_id), policy = null;
    if (!agent) {
      steps.push(step("Identity", "FAIL", "Agent not registered in Sentinel control plane", { agent_id: payload.agent_id }));
      ["Permission", "Budget", "Risk"].forEach(function (n) { steps.push(step(n, "SKIP", "Skipped")); });
      steps.push(step("Decision", "FAIL", "Unregistered agent"));
      var r0 = { request_id: newId("REQ"), agent_id: payload.agent_id, agent_name: "Unknown", action: payload.action, amount: payload.amount, currency: payload.currency, customer_id: payload.customer_id, customer_risk: payload.customer_risk, status: "DENIED", decision: "DENIED", risk_score: null, risk_level: null, policy_id: null, reason: "Unregistered agent",
        explanation: { summary: "DENIED: Unregistered agent", decision_rationale: "Unregistered agent", budget_status: "N/A", policy_matched: "N/A", risk_factors: [], why_approved: null, why_denied: "Unregistered agent", why_escalated: null },
        pipeline_steps: steps, created_at: iso(now), decided_at: iso(now), latency_ms: latency() };
      this.s.requests.push(r0); this.audit(r0); return r0;
    }
    steps.push(step("Identity", "PASS", "Agent verified: " + agent.name, { agent_id: agent.agent_id, department: agent.department, trust_score: agent.trust_score, status: agent.status }));

    if (state.kill_switch_active || agent.status === "STOPPED") {
      steps.push(step("Permission", "FAIL", "Emergency kill switch active — all agent execution halted", { kill_switch: state.kill_switch_active, agent_status: agent.status }));
      ["Budget", "Risk", "Decision"].forEach(function (n) { steps.push(step(n, "SKIP", "Skipped due to kill switch")); });
      return this.persist({ agent: agent, payload: payload, decision: "DENIED", status: "BLOCKED", reason: "Kill switch active — request blocked", steps: steps, risk: null, policy: null, now: now, latency: latency(),
        explanation: explanation({ decision: "DENIED", agent: agent, policy: null, risk: null, payload: payload, reason: "Global emergency kill switch is active. No agent actions may execute." }) });
    }

    policy = this.policy(agent.policy_id);
    if (!policy || !policy.is_active) {
      steps.push(step("Permission", "FAIL", "No active policy bound to agent", { policy_id: agent.policy_id }));
      steps.push(step("Budget", "SKIP", "Skipped"), step("Risk", "SKIP", "Skipped"), step("Decision", "FAIL", "Denied — missing policy"));
      return this.persist({ agent: agent, payload: payload, decision: "DENIED", status: "DENIED", reason: "No active policy", steps: steps, risk: null, policy: null, now: now, latency: latency(),
        explanation: explanation({ decision: "DENIED", agent: agent, policy: null, risk: null, payload: payload, reason: "Agent has no active governance policy." }) });
    }

    var msgs = [];
    if (policy.allowed_actions.indexOf(payload.action) < 0 && agent.permissions.indexOf(payload.action) < 0) msgs.push("Action '" + payload.action + "' not in allowed actions");
    if (policy.allowed_departments.indexOf(agent.department) < 0) msgs.push("Department '" + agent.department + "' not permitted by policy");
    if (!withinHours(policy, now)) msgs.push("Outside allowed hours (" + pad2(policy.allowed_hours_start) + ":00–" + pad2(policy.allowed_hours_end) + ":00 UTC)");
    if (agent.status !== "ACTIVE" && agent.status !== "DEGRADED") msgs.push("Agent status is " + agent.status);
    if (msgs.length) {
      steps.push(step("Permission", "FAIL", msgs.join("; "), { allowed_actions: policy.allowed_actions, allowed_departments: policy.allowed_departments }));
      steps.push(step("Budget", "SKIP", "Skipped"), step("Risk", "SKIP", "Skipped"), step("Decision", "FAIL", "Denied at permission gate"));
      return this.persist({ agent: agent, payload: payload, decision: "DENIED", status: "DENIED", reason: msgs.join("; "), steps: steps, risk: null, policy: policy, now: now, latency: latency(),
        explanation: explanation({ decision: "DENIED", agent: agent, policy: policy, risk: null, payload: payload, reason: msgs.join("; ") }) });
    }
    steps.push(step("Permission", "PASS", "Action '" + payload.action + "' authorized for " + agent.department, { action: payload.action, policy: policy.policy_id }));

    var eff = Math.min(agent.daily_budget, policy.daily_budget), projected = agent.current_usage + payload.amount, bmsgs = [];
    if (payload.amount > policy.transaction_limit) bmsgs.push("Amount ₹" + fmt0(payload.amount) + " exceeds transaction limit ₹" + fmt0(policy.transaction_limit));
    if (projected > eff) bmsgs.push("Would exceed daily budget (usage ₹" + fmt0(agent.current_usage) + " + ₹" + fmt0(payload.amount) + " > ₹" + fmt0(eff) + ")");
    if (bmsgs.length) {
      steps.push(step("Budget", "FAIL", bmsgs.join("; "), { amount: payload.amount, transaction_limit: policy.transaction_limit, daily_budget: eff, current_usage: agent.current_usage }));
      steps.push(step("Risk", "SKIP", "Skipped"), step("Decision", "FAIL", "Denied at budget gate"));
      return this.persist({ agent: agent, payload: payload, decision: "DENIED", status: "DENIED", reason: bmsgs.join("; "), steps: steps, risk: null, policy: policy, now: now, latency: latency(),
        explanation: explanation({ decision: "DENIED", agent: agent, policy: policy, risk: null, payload: payload, reason: bmsgs.join("; ") }) });
    }
    var remaining = eff - agent.current_usage, warn = payload.amount > remaining * 0.5;
    steps.push(step("Budget", warn ? "WARN" : "PASS", "Budget check passed — ₹" + fmt0(remaining) + " remaining of ₹" + fmt0(eff) + (warn ? " (high utilization)" : ""), { remaining: remaining, daily_budget: eff, current_usage: agent.current_usage }));

    var risk = computeRisk({ amount: payload.amount, agent: agent, customer_risk: payload.customer_risk, transaction_limit: policy.transaction_limit, daily_budget: eff });
    var rs = risk.level === "LOW" ? "PASS" : risk.level === "MEDIUM" ? "WARN" : "FAIL";
    steps.push(step("Risk", risk.score < policy.risk_threshold ? rs : "FAIL", "Risk score " + pyNum(risk.score) + " (" + risk.level + ")", Object.assign({}, risk)));

    var decision, reason;
    if (risk.score >= policy.risk_threshold) {
      decision = "DENIED"; reason = "Risk score " + pyNum(risk.score) + " exceeds denial threshold " + pyNum(policy.risk_threshold) + " (level=" + risk.level + ")";
      steps.push(step("Decision", "FAIL", reason));
    } else if (risk.score >= policy.escalate_above || risk.level === "HIGH") {
      decision = "ESCALATED"; reason = "Risk score " + pyNum(risk.score) + " requires human approval (escalate ≥ " + pyNum(policy.escalate_above) + ")";
      steps.push(step("Decision", "WARN", reason));
    } else {
      decision = "APPROVED"; reason = "All governance gates passed — risk " + pyNum(risk.score) + " (" + risk.level + ")";
      steps.push(step("Decision", "PASS", reason));
    }
    var ex = explanation({ decision: decision, agent: agent, policy: policy, risk: risk, payload: payload, reason: reason });
    return this.persist({ agent: agent, payload: payload, decision: decision, status: decision, reason: reason, steps: steps, risk: risk, policy: policy, now: now, latency: latency(), explanation: ex, applyUsage: decision === "APPROVED" });
  };
  Engine.prototype.resolve = function (id, approve, operator, note) {
    var req = this.s.requests.filter(function (r) { return r.request_id === id; })[0];
    if (!req) throw new Error("Request not found");
    if (req.status !== "ESCALATED") throw new Error("Request is not pending escalation");
    var agent = this.agent(req.agent_id);
    if (this.s.system.kill_switch_active) throw new Error("Kill switch active — cannot resolve escalation");
    var decision = approve ? "APPROVED" : "DENIED", reason = note || ("Human operator " + (approve ? "approved" : "denied") + " escalated request");
    req.decision = decision; req.status = decision; req.reason = reason + " (operator: " + operator + ")"; req.decided_at = iso(this.now());
    if (approve && agent) { agent.current_usage += req.amount; agent.request_count_today += 1; }
    if (req.explanation) {
      var e = req.explanation;
      e.summary = "Operator " + decision.toLowerCase() + ": " + reason; e.decision_rationale = req.reason;
      if (approve) { e.why_approved = req.reason; e.why_escalated = null; } else { e.why_denied = req.reason; e.why_escalated = null; }
    }
    this.audit(req, operator);
    return req;
  };
  Engine.prototype.setKill = function (active, reason, operator) {
    var st = this.s.system, t = iso(this.now());
    st.kill_switch_active = active;
    if (active) {
      st.kill_switch_reason = reason || "Emergency stop activated by operator"; st.kill_switch_activated_by = operator; st.kill_switch_activated_at = t;
      this.s.agents.forEach(function (a) { a.status = "STOPPED"; });
    } else {
      st.kill_switch_reason = null; st.kill_switch_activated_by = null; st.kill_switch_activated_at = null;
      this.s.agents.forEach(function (a) { if (a.status === "STOPPED") a.status = "ACTIVE"; });
    }
    this.s.audits.push({ audit_id: "AUD-KS-" + hex(10), timestamp: t, agent_id: "SYSTEM", agent_name: "Sentinel Control Plane", action: active ? "KILL_SWITCH_ON" : "KILL_SWITCH_OFF", amount: 0.0, decision: "SYSTEM", reason: reason || (active ? "Activated" : "Deactivated"), risk_score: active ? 100.0 : 0.0, risk_level: active ? "HIGH" : "LOW", policy_id: "SYSTEM", request_id: "SYS-" + hex(8), operator: operator });
    return this.killState();
  };
  Engine.prototype.killState = function () { var st = this.s.system; return { active: st.kill_switch_active, reason: st.kill_switch_reason, activated_by: st.kill_switch_activated_by, activated_at: st.kill_switch_activated_at }; };
  Engine.prototype.metrics = function () {
    var s = this.s, d = new Date(this.now()), start = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    var todays = s.requests.filter(function (r) { return Date.parse(r.created_at) >= start && r.decision != null; });
    var lat = todays.map(function (r) { return r.latency_ms; }).filter(function (x) { return x != null; });
    var spend = s.agents.reduce(function (a, x) { return a + x.current_usage; }, 0), budgets = s.agents.reduce(function (a, x) { return a + x.daily_budget; }, 0) || 1.0;
    return {
      active_agents: s.agents.filter(function (a) { return a.status === "ACTIVE"; }).length, total_agents: s.agents.length,
      pending_requests: s.requests.filter(function (r) { return r.status === "PENDING" || r.status === "ESCALATED"; }).length,
      todays_decisions: todays.length,
      approved_today: todays.filter(function (r) { return r.decision === "APPROVED"; }).length,
      denied_today: todays.filter(function (r) { return r.decision === "DENIED"; }).length,
      escalated_today: todays.filter(function (r) { return r.decision === "ESCALATED" || r.status === "ESCALATED"; }).length,
      average_policy_latency_ms: lat.length ? pyRound(lat.reduce(function (a, x) { return a + x; }, 0) / lat.length, 2) : 0.0,
      risk_alerts: s.requests.filter(function (r) { return Date.parse(r.created_at) >= start && r.risk_level === "HIGH"; }).length,
      kill_switch_active: s.system.kill_switch_active, total_spend_today: spend, budget_utilization_pct: budgets ? pyRound(spend / budgets * 100, 1) : 0.0
    };
  };
  function byName(x, y) { return x.name < y.name ? -1 : x.name > y.name ? 1 : 0; }
  function agentOut(a) { return Object.assign({}, a, { permissions: a.permissions.slice(), budget_remaining: Math.max(a.daily_budget - a.current_usage, 0.0) }); }
  function clone(x) { return JSON.parse(JSON.stringify(x)); }

  /* ---------- HTTP-shaped API ---------- */
  var KEY = "sentinel-demo-state-v1";
  function load() { try { var j = root.localStorage && root.localStorage.getItem(KEY); if (j) return JSON.parse(j); } catch (e) {} return seed(); }
  function save(s) { try { root.localStorage && root.localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
  function res(status, body) { return { status: status, body: body }; }
  function err(status, detail) { return res(status, { detail: detail }); }
  var TOKEN = "demo-token.operator@amex.com";

  function handle(method, url, body, token, opts) {
    var s = (opts && opts.state) || load(), E = new Engine(s, opts), u = new URL(url, "http://x"), path = u.pathname.replace(/^.*\/api\/v1/, ""), q = u.searchParams, m, out;
    if (method === "POST" && path === "/auth/login") {
      if (!body || String(body.email || "").toLowerCase() !== OPERATOR.email || body.password !== OPERATOR.password) return err(401, "Incorrect email or password");
      return res(200, { access_token: TOKEN, token_type: "bearer" });
    }
    if (!token) return err(401, "Not authenticated");
    if (token !== TOKEN) return err(401, "Invalid or expired token");
    try {
      if (method === "GET" && path === "/auth/me") out = res(200, { id: OPERATOR.id, email: OPERATOR.email, full_name: OPERATOR.full_name, role: OPERATOR.role });
      else if (method === "GET" && path === "/dashboard/metrics") out = res(200, E.metrics());
      else if (method === "GET" && path === "/agents") out = res(200, s.agents.slice().sort(byName).map(agentOut));
      else if ((m = path.match(/^\/agents\/([^/]+)$/))) {
        var a = E.agent(decodeURIComponent(m[1]));
        if (!a) out = err(404, "Agent not found");
        else if (method === "GET") out = res(200, agentOut(a));
        else if (method === "PATCH") {
          ["status", "daily_budget", "permissions", "trust_score"].forEach(function (k) { if (body && body[k] !== undefined && body[k] !== null) a[k] = k === "permissions" ? body[k].slice() : body[k]; });
          a.updated_at = iso(E.now()); out = res(200, agentOut(a));
        }
      }
      else if (method === "GET" && path === "/policies") out = res(200, clone(s.policies.slice().sort(byName)));
      else if ((m = path.match(/^\/policies\/([^/]+)$/))) {
        var p = E.policy(decodeURIComponent(m[1]));
        if (!p) out = err(404, "Policy not found");
        else if (method === "GET") out = res(200, clone(p));
        else if (method === "PATCH") {
          Object.keys(body || {}).forEach(function (k) { if (body[k] !== null && body[k] !== undefined && k in p && k !== "policy_id" && k !== "version") p[k] = Array.isArray(body[k]) ? body[k].slice() : body[k]; });
          p.version += 1; p.updated_at = iso(E.now()); out = res(200, clone(p));
        }
      }
      else if (method === "GET" && path === "/requests") {
        var list = s.requests.slice().sort(function (x, y) { return Date.parse(y.created_at) - Date.parse(x.created_at); });
        if (q.get("status")) list = list.filter(function (r) { return r.status === q.get("status").toUpperCase(); });
        if (q.get("agent_id")) list = list.filter(function (r) { return r.agent_id === q.get("agent_id"); });
        out = res(200, clone(list.slice(0, Math.min(200, +(q.get("limit") || 50)))));
      }
      else if (method === "POST" && path === "/requests/evaluate") {
        if (!body || !(body.amount > 0)) out = err(422, "amount: Input should be greater than 0");
        else out = res(200, clone(E.evaluate(body)));
      }
      else if ((m = path.match(/^\/requests\/([^/]+)\/resolve$/)) && method === "POST") {
        try { out = res(200, clone(E.resolve(decodeURIComponent(m[1]), !!body.approve, OPERATOR.email, body.note))); } catch (e) { out = err(400, e.message); }
      }
      else if ((m = path.match(/^\/requests\/([^/]+)$/)) && method === "GET") {
        var r = s.requests.filter(function (x) { return x.request_id === decodeURIComponent(m[1]); })[0];
        out = r ? res(200, clone(r)) : err(404, "Request not found");
      }
      else if (method === "GET" && path === "/audit") {
        var logs = s.audits.slice().sort(function (x, y) { return Date.parse(y.timestamp) - Date.parse(x.timestamp); });
        if (q.get("decision")) logs = logs.filter(function (l) { return l.decision === q.get("decision").toUpperCase(); });
        if (q.get("q")) { var needle = q.get("q").toLowerCase(); logs = logs.filter(function (l) { return [l.agent_name, l.action, l.decision, l.request_id, l.agent_id, l.reason].some(function (f) { return String(f).toLowerCase().indexOf(needle) >= 0; }); }); }
        out = res(200, clone(logs.slice(0, Math.min(500, +(q.get("limit") || 100)))));
      }
      else if (path === "/kill-switch" && method === "GET") out = res(200, E.killState());
      else if (path === "/kill-switch" && method === "POST") out = res(200, E.setKill(!!body.active, body.reason, OPERATOR.email));
      else if (path === "/settings" && method === "GET") out = res(200, { app_name: "Sentinel Governance Control Plane", app_version: "0.1.0", environment: "mvp", auth_enabled: true, mock_enterprise_apis: true, operator_email: OPERATOR.email });
      else out = err(404, "Not Found");
    } finally { if (!(opts && opts.state)) save(s); }
    return out;
  }

  var api = { seed: seed, Engine: Engine, computeRisk: computeRisk, withinHours: withinHours, handle: handle, pyRound: pyRound, fmt0: fmt0, POLICIES: POLICIES, AGENTS: AGENTS,
    reset: function () { try { root.localStorage.removeItem(KEY); } catch (e) {} } };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.SentinelEngine = api;
})(typeof window !== "undefined" ? window : globalThis);
/* Routes the dashboard's API calls to the in-browser engine instead of the FastAPI server. */
(function () {
  var BASE = "https://sentinel-demo.invalid/api/v1";
  var realFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    var url = typeof input === "string" ? input : input && input.url;
    if (!url || url.indexOf(BASE) !== 0) return realFetch(input, init);
    init = init || {};
    var headers = new Headers(init.headers || (typeof input !== "string" && input.headers) || {});
    var auth = headers.get("Authorization") || "", token = auth.indexOf("Bearer ") === 0 ? auth.slice(7) : null;
    var body = null;
    try { body = init.body ? JSON.parse(init.body) : null; } catch (e) {}
    var out = window.SentinelEngine.handle((init.method || "GET").toUpperCase(), url, body, token);
    return new Promise(function (resolve) {
      setTimeout(function () {
        resolve(new Response(JSON.stringify(out.body), { status: out.status, headers: { "Content-Type": "application/json" } }));
      }, 25 + Math.random() * 40);
    });
  };

  function badge() {
    if (document.getElementById("sentinel-demo-badge")) return;
    var d = document.createElement("div");
    d.id = "sentinel-demo-badge";
    d.setAttribute("role", "note");
    d.style.cssText = "position:fixed;right:14px;bottom:14px;z-index:2147483000;display:flex;gap:6px;align-items:center;padding:6px 6px 6px 12px;border-radius:999px;background:#0b1220;color:#dbe4f0;font:600 12px/1 system-ui,-apple-system,Segoe UI,sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.35);border:1px solid #24324a";
    d.innerHTML = '<span>Demo: decisions run in your browser</span>' +
      '<button type="button" style="border:0;border-radius:999px;padding:6px 10px;background:#1e2b42;color:#dbe4f0;font:inherit;cursor:pointer">Reset data</button>' +
      '<a href="/Sentinel/" style="border-radius:999px;padding:6px 10px;background:#2f6bff;color:#fff;text-decoration:none">About Sentinel</a>';
    d.querySelector("button").addEventListener("click", function () {
      if (!confirm("Reset agents, requests and audit log to the seeded demo state?")) return;
      window.SentinelEngine.reset(); location.reload();
    });
    document.body.appendChild(d);
  }
  if (window.self === window.top) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", badge); else badge();
  }
})();
