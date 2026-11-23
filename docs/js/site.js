/* Sentinel product site */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var S = window.SentinelEngine;
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function inr(x) { return "₹" + Math.round(x).toLocaleString("en-IN"); }
  var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  var GATES = ["Identity", "Permission", "Budget", "Risk", "Decision"];

  /* run one request on a fresh seeded copy */
  function run(o) {
    var st = S.seed(Date.UTC(2026, 10, 23, 12)), ag = st.agents.filter(function (a) { return a.agent_id === o.agent_id; })[0];
    if (ag && o.agent) Object.assign(ag, o.agent);
    if (o.kill) { st.system.kill_switch_active = true; }
    var hour = o.hour == null ? 12 : o.hour;
    var E = new S.Engine(st, { now: function () { return Date.UTC(2026, 10, 23, hour, 30); } });
    var req = E.evaluate({ agent_id: o.agent_id, action: o.action, amount: o.amount, customer_risk: o.customer_risk, customer_id: "CUST-4821" });
    return { req: req, agent: ag, policy: ag ? st.policies.filter(function (p) { return p.policy_id === ag.policy_id; })[0] : null };
  }

  /* ---------- hero replay ---------- */
  var DEMOS = [
    { agent_id: "AGT-BENEFITS-01", action: "Approve Purchase Protection", amount: 2000, customer_risk: "LOW" },
    { agent_id: "AGT-DISPUTE-01", action: "Issue Provisional Credit", amount: 18500, customer_risk: "HIGH" },
    { agent_id: "AGT-SERVICING-01", action: "Adjust Credit Limit", amount: 50000, customer_risk: "HIGH" },
    { agent_id: "AGT-TRAVEL-01", action: "Upgrade Cabin", amount: 28000, customer_risk: "MEDIUM" }
  ];
  var hi = 0;
  function hero() {
    var d = DEMOS[hi++ % DEMOS.length], r = run(d).req, el = $("hero-gates");
    el.innerHTML = '<div class="note" style="margin-bottom:2px">' + esc(r.agent_name) + ' asks to <b style="color:var(--ink)">' + esc(d.action.toLowerCase()) + '</b> for ' + inr(d.amount) + ', customer risk ' + d.customer_risk.toLowerCase() + '</div>' +
      r.pipeline_steps.map(function (s, i) { return '<div class="gate" data-i="' + i + '"><i>' + (i + 1) + '</i><div><b>' + s.step + '</b><span class="m">' + esc(s.message) + '</span></div><span class="chip s-' + s.status + '" style="visibility:hidden">' + s.status + '</span></div>'; }).join("");
    var rows = el.querySelectorAll(".gate");
    rows.forEach(function (row, i) {
      setTimeout(function () { row.classList.add("lit"); row.querySelector(".chip").style.visibility = "visible"; if (i) rows[i - 1].classList.remove("lit"); }, reduced ? 0 : 350 + i * 450);
    });
  }
  hero();
  if (!reduced) setInterval(function () { if (!document.hidden) hero(); }, 5200);

  /* ---------- live dashboard ---------- */
  function fit() { var s = $("screen"), f = s.querySelector("iframe"); if (f) f.style.transform = "scale(" + (s.clientWidth / 1440) + ")"; }
  $("boot").addEventListener("click", function () {
    var f = document.createElement("iframe");
    f.src = "app/"; f.title = "Sentinel operator dashboard running in the browser";
    $("screen").appendChild(f); fit(); $("cover").remove();
  });
  addEventListener("resize", fit);
  var tour = document.querySelectorAll("#tour li"), saved = (store("sn-tour") || "").split(",");
  tour.forEach(function (li, i) {
    var cb = li.querySelector("input");
    cb.checked = saved.indexOf(String(i)) >= 0; li.classList.toggle("done", cb.checked);
    cb.addEventListener("change", function () {
      li.classList.toggle("done", cb.checked);
      var on = []; tour.forEach(function (l, j) { if (l.querySelector("input").checked) on.push(j); });
      store("sn-tour", on.join(","));
    });
  });

  /* ---------- composer ---------- */
  var ALL_ACTIONS = S.POLICIES.map(function (p) { return [p.name.replace(" Governance", ""), p.allowed_actions]; }).concat([["Not in any policy", ["Wire Transfer"]]]);
  var C = { agent_id: "AGT-DISPUTE-01", action: "Issue Provisional Credit", amount: 18500, customer_risk: "HIGH", hour: 12, kill: false, agent: null };
  function agentDefaults(id) { var a = S.AGENTS.filter(function (x) { return x.agent_id === id; })[0]; return a ? { current_usage: a.current_usage, request_count_today: a.request_count_today, trust_score: a.trust_score, status: a.status } : null; }
  C.agent = agentDefaults(C.agent_id);
  function buildComposer() {
    var h = '<h3>Request</h3>';
    h += '<div class="field"><span class="lbl">Agent</span><select id="c-agent">' + S.AGENTS.map(function (a) { return '<option value="' + a.agent_id + '">' + a.name + ' (' + a.department + ')</option>'; }).join("") + '<option value="AGT-ROGUE-99">Unregistered agent (AGT-ROGUE-99)</option></select></div>';
    h += '<div class="field"><span class="lbl">Action</span><select id="c-action">' + ALL_ACTIONS.map(function (g) { return '<optgroup label="' + g[0] + '">' + g[1].map(function (a) { return '<option>' + a + '</option>'; }).join("") + '</optgroup>'; }).join("") + '</select></div>';
    h += '<div class="field"><span class="lbl">Amount</span><div class="range-row"><input type="range" id="c-amount" min="500" max="100000" step="500" aria-label="Amount in rupees"><output id="c-amount-out"></output></div></div>';
    h += '<div class="field"><span class="lbl">Customer risk</span><div class="seg" role="group" aria-label="Customer risk" id="c-risk"><button type="button" data-v="LOW">LOW</button><button type="button" data-v="MEDIUM">MEDIUM</button><button type="button" data-v="HIGH">HIGH</button></div></div>';
    h += '<div class="field"><span class="lbl">Time of request (UTC)</span><div class="range-row"><input type="range" id="c-hour" min="0" max="23" step="1" aria-label="Hour of day in UTC"><output id="c-hour-out"></output></div></div>';
    h += '<label class="switch"><input type="checkbox" id="c-kill"> Emergency kill switch on</label>';
    h += '<details class="adv"><summary>Agent state today</summary><div class="row2">' +
      '<div class="field"><span class="lbl">Spent today (₹)</span><input type="number" id="c-usage" min="0" step="500"></div>' +
      '<div class="field"><span class="lbl">Requests today</span><input type="number" id="c-count" min="0" step="1"></div>' +
      '<div class="field"><span class="lbl">Trust score</span><input type="number" id="c-trust" min="0" max="1" step="0.01"></div>' +
      '<div class="field"><span class="lbl">Status</span><select id="c-status"><option>ACTIVE</option><option>DEGRADED</option><option>PAUSED</option><option>STOPPED</option></select></div>' +
      '</div></details>';
    h += '<div class="mf-row" style="display:flex;gap:6px;flex-wrap:wrap">' + [["Small claim", "AGT-BENEFITS-01", "Approve Purchase Protection", 2000, "LOW"], ["Risky credit", "AGT-DISPUTE-01", "Issue Provisional Credit", 18500, "HIGH"], ["Over the limit", "AGT-SERVICING-01", "Adjust Credit Limit", 50000, "HIGH"], ["Wrong desk", "AGT-TRAVEL-01", "Reverse Transaction", 5000, "LOW"]].map(function (p) { return '<button class="btn small" type="button" data-p="' + p.slice(1).join("|") + '">' + p[0] + '</button>'; }).join("") + '</div>';
    $("composer").innerHTML = h;
    sync();
    $("composer").addEventListener("input", read);
    $("composer").addEventListener("change", read);
    $("composer").addEventListener("click", function (e) {
      var b = e.target.closest("#c-risk button"), p = e.target.closest("[data-p]");
      if (b) { C.customer_risk = b.dataset.v; sync(); evaluate(); }
      if (p) { var v = p.dataset.p.split("|"); C.agent_id = v[0]; C.action = v[1]; C.amount = +v[2]; C.customer_risk = v[3]; C.agent = agentDefaults(C.agent_id); C.kill = false; C.hour = 12; sync(); evaluate(); }
    });
  }
  function sync() {
    $("c-agent").value = C.agent_id; $("c-action").value = C.action; $("c-amount").value = C.amount; $("c-amount-out").textContent = inr(C.amount);
    $("c-hour").value = C.hour; $("c-hour-out").textContent = String(C.hour).padStart(2, "0") + ":30 UTC"; $("c-kill").checked = C.kill;
    document.querySelectorAll("#c-risk button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.v === C.customer_risk)); });
    var dis = !C.agent; ["c-usage", "c-count", "c-trust", "c-status"].forEach(function (id) { $(id).disabled = dis; });
    if (C.agent) { $("c-usage").value = C.agent.current_usage; $("c-count").value = C.agent.request_count_today; $("c-trust").value = C.agent.trust_score; $("c-status").value = C.agent.status; }
  }
  function read(e) {
    var t = e.target;
    if (t.id === "c-agent") {
      C.agent_id = t.value; C.agent = agentDefaults(C.agent_id);
      var a = S.AGENTS.filter(function (x) { return x.agent_id === C.agent_id; })[0];
      if (a && a.permissions.indexOf(C.action) < 0) C.action = a.permissions[0];
    }
    if (t.id === "c-action") C.action = t.value;
    if (t.id === "c-amount") C.amount = +t.value;
    if (t.id === "c-hour") C.hour = +t.value;
    if (t.id === "c-kill") C.kill = t.checked;
    if (C.agent) {
      if (t.id === "c-usage") C.agent.current_usage = Math.max(0, +t.value || 0);
      if (t.id === "c-count") C.agent.request_count_today = Math.max(0, Math.round(+t.value || 0));
      if (t.id === "c-trust") C.agent.trust_score = Math.min(1, Math.max(0, +t.value || 0));
      if (t.id === "c-status") C.agent.status = t.value;
    }
    if (e.type === "input" && (t.id === "c-amount" || t.id === "c-hour")) { sync(); evaluate(true); return; }
    sync(); evaluate();
  }
  var FCOL = ["var(--f1)", "var(--f2)", "var(--f3)", "var(--f4)", "var(--f5)"], FNAME = ["Amount", "Agent trust", "Budget pressure", "Request frequency", "Customer risk"], FKEY = ["amount_factor", "trust_factor", "budget_factor", "frequency_factor", "customer_factor"], FMAX = [40, 25, 25, 15, 40];
  function evaluate(quiet) {
    var o = run({ agent_id: C.agent_id, action: C.action, amount: C.amount, customer_risk: C.customer_risk, hour: C.hour, kill: C.kill, agent: C.agent }), r = o.req, pol = o.policy;
    var h = '<h3>Decision</h3><div class="verdict"><span class="big chip d-' + r.status + '">' + r.status + '</span><span class="reason">' + esc(r.reason) + '</span></div>';
    h += '<div class="steps">' + r.pipeline_steps.map(function (s) { return '<div class="step' + (quiet || reduced ? " on" : "") + '"><b>' + s.step + '<span class="chip s-' + s.status + '">' + s.status + '</span></b><p>' + esc(s.message) + '</p></div>'; }).join("") + '</div>';
    h += '<div class="riskviz"><div>';
    if (r.risk_score != null) {
      var dec = r.pipeline_steps.filter(function (s) { return s.step === "Risk"; })[0].detail;
      h += '<span class="lbl">Risk score ' + r.risk_score + ' of 100, ' + r.risk_level + '</span><div class="stack" role="img" aria-label="Risk score made of five factors">' +
        FKEY.map(function (k, i) { return '<i style="width:' + dec[k] + '%;background:' + FCOL[i] + '" title="' + FNAME[i] + ' ' + dec[k] + '"></i>'; }).join("") +
        '<span class="mark" style="left:' + pol.escalate_above + '%;background:var(--warn)" title="Escalate at ' + pol.escalate_above + '"></span><span class="mark" style="left:' + pol.risk_threshold + '%;background:var(--bad)" title="Deny at ' + pol.risk_threshold + '"></span></div>';
      h += '<ul class="flist">' + FKEY.map(function (k, i) { return '<li><i style="background:' + FCOL[i] + '"></i><span>' + FNAME[i] + '</span><span>' + dec[k] + ' / ' + FMAX[i] + '</span></li>'; }).join("") + '</ul>';
      h += '<p class="note" style="margin-top:8px">Escalate at ' + pol.escalate_above + ' or at level HIGH (65), deny at ' + pol.risk_threshold + ' for ' + pol.name + '.</p>';
    } else {
      var at = r.pipeline_steps.filter(function (s) { return s.status === "FAIL"; })[0];
      h += '<span class="lbl">No risk score</span><p class="note">The request stopped at the ' + (at ? at.step.toLowerCase() : "first") + ' gate, so Sentinel never scored it.</p>';
    }
    h += '</div><div class="curve">' + (pol && C.agent ? curve(pol) : '<span class="lbl">Score by amount</span><p class="note">No policy is bound to an unregistered agent.</p>') + '</div></div>';
    var ex = r.explanation;
    h += '<div class="explain"><div><span>Policy matched</span>' + esc(ex.policy_matched) + '</div><div><span>Budget status</span>' + esc(ex.budget_status) + '</div><div style="grid-column:1/-1"><span>Explanation summary</span>' + esc(ex.summary) + '</div></div>';
    $("result").innerHTML = h;
    if (!quiet && !reduced) $("result").querySelectorAll(".step").forEach(function (el, i) { setTimeout(function () { el.classList.add("on"); }, 120 + i * 140); });
  }
  function curve(pol) {
    var a = C.agent, W = 420, H = 230, L = 34, R = 10, T = 12, B = 30, maxA = Math.max(pol.transaction_limit * 1.4, C.amount * 1.1);
    var eff = Math.min(pol.daily_budget, S.AGENTS.filter(function (x) { return x.agent_id === C.agent_id; })[0].daily_budget), remaining = eff - a.current_usage;
    var x = function (v) { return L + v / maxA * (W - L - R); }, y = function (v) { return T + (1 - v / 100) * (H - T - B); };
    var ag = Object.assign({}, a), pts = [];
    for (var i = 0; i <= 80; i++) { var amt = maxA * i / 80 || 1; pts.push(x(amt).toFixed(1) + "," + y(S.computeRisk({ amount: amt, agent: ag, customer_risk: C.customer_risk, transaction_limit: pol.transaction_limit, daily_budget: eff }).score).toFixed(1)); }
    var cur = S.computeRisk({ amount: C.amount, agent: ag, customer_risk: C.customer_risk, transaction_limit: pol.transaction_limit, daily_budget: eff }).score;
    var s = '<span class="lbl">Score by amount for this agent</span><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Risk score rising with amount, with escalation and denial lines">';
    s += '<rect x="' + L + '" y="' + y(100) + '" width="' + (W - L - R) + '" height="' + (y(pol.risk_threshold) - y(100)) + '" fill="var(--bad-soft)"/><rect x="' + L + '" y="' + y(pol.risk_threshold) + '" width="' + (W - L - R) + '" height="' + (y(pol.escalate_above) - y(pol.risk_threshold)) + '" fill="var(--warn-soft)"/>';
    [0, 25, 50, 75, 100].forEach(function (v) { s += '<text x="' + (L - 6) + '" y="' + (y(v) + 4) + '" text-anchor="end" font-size="10.5" font-family="var(--mono)" fill="var(--ink-3)">' + v + '</text>'; });
    var lim = Math.min(pol.transaction_limit, Math.max(remaining, 0));
    s += '<rect x="' + x(lim) + '" y="' + T + '" width="' + (W - R - x(lim)) + '" height="' + (H - T - B) + '" fill="var(--skip-soft)" opacity=".85"/>';
    s += '<text x="' + (x(lim) + 4) + '" y="' + (T + 12) + '" font-size="10.5" font-family="var(--mono)" fill="var(--ink-3)">budget gate</text>';
    s += '<polyline points="' + pts.join(" ") + '" fill="none" stroke="var(--accent)" stroke-width="2.4" stroke-linejoin="round"/>';
    s += '<circle cx="' + x(C.amount) + '" cy="' + y(cur) + '" r="6" fill="var(--surface)" stroke="var(--ink)" stroke-width="2.4"/>';
    s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + (H - B) + '" y2="' + (H - B) + '" stroke="var(--line)"/><text x="' + L + '" y="' + (H - 10) + '" font-size="10.5" font-family="var(--mono)" fill="var(--ink-3)">₹0</text><text x="' + (W - R) + '" y="' + (H - 10) + '" text-anchor="end" font-size="10.5" fill="var(--ink-3)">' + inr(maxA) + '</text></svg>';
    s += '<div class="legend"><span><i style="background:var(--warn)"></i>escalate zone</span><span><i style="background:var(--bad)"></i>deny zone</span><span><i style="background:var(--skip)"></i>denied before scoring</span></div>';
    return s;
  }
  buildComposer(); evaluate(true);

  /* ---------- policies ---------- */
  var ph = '<table class="pol"><thead><tr><th>Policy</th><th>Agent</th><th>Allowed actions</th><th>Per transaction</th><th>Daily budget</th><th>Hours UTC</th><th>Escalate / deny</th></tr></thead><tbody>';
  S.POLICIES.forEach(function (p) {
    var a = S.AGENTS.filter(function (x) { return x.policy_id === p.policy_id; })[0];
    ph += '<tr><td><b>' + p.name.replace(" Governance", "") + '</b><br><span class="note">' + p.policy_id + '</span></td><td>' + a.name + '<br><span class="note">trust ' + a.trust_score + ', spent ' + inr(a.current_usage) + '</span></td><td><div class="acts">' + p.allowed_actions.map(function (x) { return '<span class="chip">' + x + '</span>'; }).join("") + '</div></td><td class="n">' + inr(p.transaction_limit) + '</td><td class="n">' + inr(p.daily_budget) + '</td><td class="n">' + String(p.allowed_hours_start).padStart(2, "0") + ':00 to ' + String(p.allowed_hours_end).padStart(2, "0") + ':59</td><td class="n">' + p.escalate_above + ' / ' + p.risk_threshold + '</td></tr>';
  });
  $("pol").innerHTML = ph + '</tbody></table>';

  /* ---------- architecture ---------- */
  function box(x, y, w, h, t, sub, c) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="10" fill="var(--surface-2)" stroke="' + c + '" stroke-width="1.6"/><text x="' + (x + 14) + '" y="' + (y + 24) + '" font-size="14.5" font-weight="800" fill="var(--ink)">' + t + '</text><text x="' + (x + 14) + '" y="' + (y + 43) + '" font-size="11.5" font-family="var(--mono)" fill="var(--ink-3)">' + sub + '</text>'; }
  function arr(x1, y1, x2, y2, label) { return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="var(--ink-3)" stroke-width="1.6" marker-end="url(#ah)"/>' + (label ? '<text x="' + ((x1 + x2) / 2 + 6) + '" y="' + ((y1 + y2) / 2 + 4) + '" font-size="11" font-family="var(--mono)" fill="var(--ink-3)">' + label + '</text>' : ""); }
  var svg = '<svg viewBox="0 0 520 430" role="img" aria-label="Agents and the operator dashboard call the FastAPI service, which runs the decision engine and stores requests and audit logs in SQLite."><defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--ink-3)"/></marker></defs>' +
    box(10, 10, 230, 58, "Financial AI agents", "propose actions", "var(--f3)") + box(280, 10, 230, 58, "Operator dashboard", "Next.js 16, port 3000", "var(--f2)") +
    arr(125, 68, 210, 118, "") + arr(395, 68, 310, 118, "") +
    box(110, 120, 300, 58, "FastAPI service", "/api/v1, JWT bearer, port 8000", "var(--accent)") + arr(260, 178, 260, 214, "") +
    box(60, 216, 400, 106, "Decision engine", "", "var(--f1)") +
    GATES.map(function (g, i) { return '<rect x="' + (74 + i * 76) + '" y="' + 254 + '" width="68" height="28" rx="6" fill="var(--accent-soft)"/><text x="' + (108 + i * 76) + '" y="272" text-anchor="middle" font-size="11" font-weight="700" fill="var(--accent)">' + g + '</text>'; }).join("") +
    '<text x="74" y="306" font-size="11" font-family="var(--mono)" fill="var(--ink-3)">policy_engine + risk_engine, 5 risk factors</text>' + arr(260, 322, 260, 358, "") +
    box(110, 360, 300, 58, "SQLite", "agents, policies, requests, audit_logs", "var(--f4)") + '</svg>';
  var API = [["POST", "/auth/login", "Operator sign-in, returns a JWT"], ["GET", "/dashboard/metrics", "Counts, spend, latency, alerts"], ["GET", "/agents", "Registry with budget remaining"], ["PATCH", "/agents/{id}", "Status, budget, permissions, trust"], ["GET", "/policies", "Policies, sorted by name"], ["PATCH", "/policies/{id}", "Edit limits; bumps the version"], ["POST", "/requests/evaluate", "Run the pipeline on one action"], ["POST", "/requests/{id}/resolve", "Approve or deny an escalation"], ["GET", "/audit", "Search by text or decision"], ["POST", "/kill-switch", "Stop or restart every agent"]];
  $("arch").innerHTML = '<div class="card"><h3>How a request flows</h3>' + svg + '</div><div class="card"><h3>API, under /api/v1</h3><table class="api"><tbody>' + API.map(function (a) { return '<tr><td>' + a[0] + '</td><td>' + a[1] + '</td><td>' + a[2] + '</td></tr>'; }).join("") + '</tbody></table><p class="note" style="margin-top:10px">Every route except login needs the operator token. Agents do not have credentials of their own; requests are sent on the operator\'s behalf.</p></div>';

  /* ---------- notes ---------- */
  var NOTES = [
    ["bad", "Policy", "Agent permissions widen the policy", "An action passes the permission gate if it is in the policy's list or in the agent's own list. Editing an agent's permissions can grant actions its policy never allowed. It should require both."],
    ["bad", "Identity", "Identity is a lookup, not a check", "Requests carry an agent id and the operator's token. Anyone with the operator token can submit as any agent; agents have no keys of their own."],
    ["warn", "Budget", "Today never ends", "Spent today and requests today are never reset, so daily budgets fill up for good and the frequency factor keeps climbing."],
    ["warn", "Escalation", "Approved escalations count twice", "The request count goes up when a request is escalated, and again when an operator approves it, which inflates the frequency factor."],
    ["warn", "Kill switch", "Clearing it restarts stopped agents", "Turning the switch off sets every STOPPED agent back to ACTIVE, including agents an operator had stopped on purpose. A stopped agent's requests also say the global switch is on when it is not."],
    ["warn", "Seed data", "History the engine could not produce", "The seeded Servicing 'Waive Annual Fee' of ₹12,500 shows a risk score of 68, but the limit is ₹10,000, so the engine would deny it at the budget gate without scoring. The seed also leaves two escalations open, while its comment says one."],
    ["warn", "Security", "Secrets in the source", "The JWT signing key and the operator password are defaults in config.py and printed in the README. Fine for a hackathon demo, worth an environment variable next."],
    ["acc", "Hours", "UTC windows, inclusive end", "Allowed hours are compared in UTC and include the whole end hour, so 08 to 20 means 08:00 to 20:59 UTC, or 13:30 to 02:29 in India."],
    ["acc", "Tests", "No automated tests yet", "The decision engine is a pure function of state and request, which makes it easy to cover. The 800-operation comparison used for this page would be a good start."]
  ];
  $("notes-list").innerHTML = NOTES.map(function (n) { return '<div class="card"><span class="chip ' + n[0] + '">' + n[1] + '</span><h3>' + n[2] + '</h3><p>' + esc(n[3]) + '</p></div>'; }).join("");

  document.addEventListener("click", function (e) {
    var b = e.target.closest(".copy"); if (!b) return;
    var t = b.previousElementSibling.textContent;
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { b.textContent = "Copied"; }, function () { b.textContent = "Select it"; });
    setTimeout(function () { b.textContent = "Copy"; }, 1400);
  });
})();
