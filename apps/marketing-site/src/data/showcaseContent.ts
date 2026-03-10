export type ChatMessage = {
  side: "left" | "right";
  text?: string;
  imageUrl?: string;
  status?: string;
};

export type ShowcaseData = {
  id: string;
  title: string;
  type: string;
  category: string;
  shortDescription: string;
  fullContent: string;
  imageUrl: string;
  aspectRatio: number;
  messages: ChatMessage[];
};

export const SHOWCASE_CARDS: ShowcaseData[] = [
  {
    id: "card-1",
    title: "Pre-Meeting Intelligence",
    type: "Meetings",
    category: "communication",
    shortDescription:
      "Get briefed before every meeting with context from your docs, Slack, and inbox.",
    fullContent:
      "## Before every call\n- Pulls relevant notes and docs\n- Flags prior decisions and unresolved threads\n- Surfaces risks and follow-up tasks",
    imageUrl:
      "https://images.unsplash.com/photo-1557426272-fc759fdf7a8d?auto=format&fit=crop&q=80&w=800",
    aspectRatio: 1.2,
    messages: [
      { side: "right", text: "brief me on the meeting with sarah in 30 min" },
      { side: "left", text: "pulling context from your last 3 convos and shared docs..." },
      { side: "left", imageUrl: "https://images.unsplash.com/photo-1557426272-fc759fdf7a8d?auto=format&fit=crop&q=80&w=800" },
      { side: "left", text: "key points: pricing discussion paused at $120k arr. she mentioned budget approval coming this week. follow up on timeline.", status: "delivered" },
    ],
  },
  {
    id: "card-2",
    title: "Unified Knowledge Search",
    type: "Knowledge",
    category: "operations",
    shortDescription:
      "Find answers across files, notes, and threads without switching tools.",
    fullContent:
      "## One place to ask\n- Searches your connected systems\n- Returns concise answers with context\n- Keeps a running memory of what matters",
    imageUrl:
      "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&q=80&w=800",
    aspectRatio: 0.9,
    messages: [
      { side: "right", text: "what did we decide about the api pricing model?" },
      { side: "left", text: "searching across slack, docs, and meeting notes..." },
      { side: "left", text: "found it. you landed on usage-based with a $500/mo floor. decision made in the oct 12 strategy doc. team agreed via slack on oct 15.", status: "delivered" },
    ],
  },
  {
    id: "card-3",
    title: "Follow-Up Autopilot",
    type: "Communication",
    category: "communication",
    shortDescription:
      "Never miss a follow-up. Sage drafts and schedules next steps automatically.",
    fullContent:
      "## Stays on top of every thread\n- Detects where action is needed\n- Drafts personalized follow-ups\n- Keeps your pipeline moving",
    imageUrl:
      "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&q=80&w=800",
    aspectRatio: 1.1,
    messages: [
      { side: "left", text: "alex hasn't replied to your pricing email from tuesday. want me to follow up?" },
      { side: "right", text: "yeah, send it" },
      { side: "left", text: "draft: 'hey alex, wanted to circle back on the proposal. any questions on the pricing structure?'" },
      { side: "right", text: "perfect. send it." },
      { side: "left", text: "sent. i'll remind you if no reply in 2 days.", status: "delivered" },
    ],
  },
  {
    id: "card-4",
    title: "Priority Triage",
    type: "Operations",
    category: "operations",
    shortDescription:
      "Sage filters noise and highlights what needs your attention right now.",
    fullContent:
      "## Daily operator view\n- Sorts by urgency and impact\n- Groups related tasks\n- Recommends next best actions",
    imageUrl:
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=800",
    aspectRatio: 0.95,
    messages: [
      { side: "right", text: "what needs my attention today?" },
      { side: "left", text: "3 things: 1) investor deck review due by 2pm. 2) maria needs your approval on the hire. 3) stripe integration broken, dev team waiting." },
      { side: "right", text: "got it. i'll handle the deck first." },
      { side: "left", text: "smart. highest impact. i'll remind you about maria at 1pm.", status: "delivered" },
    ],
  },
  {
    id: "card-5",
    title: "Client Context Memory",
    type: "CRM",
    category: "operations",
    shortDescription:
      "Every client preference, promise, and detail stays available when you need it.",
    fullContent:
      "## Relationship memory\n- Captures important details automatically\n- Recalls commitments before outreach\n- Helps maintain a consistent experience",
    imageUrl:
      "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&q=80&w=800",
    aspectRatio: 1,
    messages: [
      { side: "right", text: "remind me about jessica's company before our call" },
      { side: "left", text: "jessica runs a 12-person dev shop. prefers async communication. mentioned she's launching a new product in q1. you promised to intro her to your designer friend." },
      { side: "right", text: "perfect, thanks" },
      { side: "left", text: "also her team uses notion. mentioned last time.", status: "delivered" },
    ],
  },
  {
    id: "card-6",
    title: "Decision Briefs",
    type: "Strategy",
    category: "strategy",
    shortDescription:
      "Turn messy data into clear options with tradeoffs and recommendations.",
    fullContent:
      "## Clear, fast decisions\n- Summarizes what changed\n- Compares options and risks\n- Recommends a path with rationale",
    imageUrl:
      "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=800",
    aspectRatio: 1.05,
    messages: [
      { side: "right", text: "should we launch the feature now or wait for the redesign?" },
      { side: "left", text: "comparing both paths..." },
      { side: "left", text: "launch now: ship in 3 days, get feedback faster, but ui is rough. wait for redesign: polished experience, but delays by 2 weeks and blocks other features." },
      { side: "left", text: "recommend: launch now with feature flag. iterate based on feedback.", status: "delivered" },
    ],
  },
  {
    id: "card-7",
    title: "Daily Executive Digest",
    type: "Reporting",
    category: "operations",
    shortDescription:
      "Wake up to one concise overview of performance, blockers, and priorities.",
    fullContent:
      "## Morning brief\n- Key updates in plain language\n- Outliers, wins, and risks\n- Recommended plan for the day",
    imageUrl:
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800",
    aspectRatio: 1.15,
    messages: [
      { side: "left", text: "good morning. daily summary:" },
      { side: "left", text: "revenue: $8.2k yesterday (+12% vs avg). new signups: 4. churn: 1 account ($400). top blocker: payment provider down for 2 hours." },
      { side: "left", text: "priority today: close the acme deal. sarah's ready to sign.", status: "delivered" },
    ],
  },
  {
    id: "card-8",
    title: "Workflow Automation",
    type: "Automation",
    category: "automation",
    shortDescription:
      "Automate recurring work across your stack with policy-aware guardrails.",
    fullContent:
      "## Automate the repetitive work\n- Trigger actions from real events\n- Human approval where it matters\n- Audit trail for every action",
    imageUrl:
      "https://images.unsplash.com/photo-1518773553398-650c184e0bb3?auto=format&fit=crop&q=80&w=800",
    aspectRatio: 0.92,
    messages: [
      { side: "right", text: "auto-send welcome emails when users sign up" },
      { side: "left", text: "got it. i'll watch for new signups and send the welcome template within 5 min. want to review before i start?" },
      { side: "right", text: "nope, just run it" },
      { side: "left", text: "automation live. i'll log every send.", status: "delivered" },
    ],
  },
  {
    id: "card-9",
    title: "Launch Readiness",
    type: "Launch",
    category: "operations",
    shortDescription:
      "Coordinate launch tasks, owners, and deadlines with fewer dropped handoffs.",
    fullContent:
      "## Ship with less chaos\n- Tracks dependencies and blockers\n- Keeps owners aligned\n- Highlights what can slip launch",
    imageUrl:
      "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&q=80&w=800",
    aspectRatio: 1.08,
    messages: [
      { side: "right", text: "launch status check" },
      { side: "left", text: "7/10 tasks done. blockers: design assets delayed (maya) and legal review pending (jake). launch date: friday. risk: medium." },
      { side: "right", text: "ping maya and jake for me" },
      { side: "left", text: "on it. sending reminders now.", status: "delivered" },
    ],
  },
];
