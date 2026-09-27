import fs from "fs";
import path from "path";

export interface UserSubscription {
  id: string; // User ID or Email
  user_id?: string;
  email: string;
  full_name?: string;
  subscription_plan: "free" | "premium";
  subscription_status: "active" | "canceled" | "refunded" | "chargeback" | "refused" | "none";
  cakto_customer_id?: string;
  cakto_product_id?: string;
  cakto_subscription_id?: string;
  subscription_started_at?: string;
  subscription_expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionEventRecord {
  id: string;
  event_id: string;
  event_type: "purchase_approved" | "purchase_refused" | "subscription_renewed" | "subscription_canceled" | "refund" | "chargeback" | string;
  user_id?: string;
  user_email?: string;
  cakto_product_id?: string;
  cakto_subscription_id?: string;
  payload: any;
  processed_at: string;
  created_at: string;
}

// Persistent file storage directory
const DATA_DIR = path.join(process.cwd(), "data");
const SUBSCRIPTIONS_FILE = path.join(DATA_DIR, "subscriptions.json");
const EVENTS_FILE = path.join(DATA_DIR, "subscription_events.json");

// Ensure directory and files exist
function ensureDataStore() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(SUBSCRIPTIONS_FILE)) {
      fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify({}, null, 2), "utf-8");
    }
    if (!fs.existsSync(EVENTS_FILE)) {
      fs.writeFileSync(EVENTS_FILE, JSON.stringify([], null, 2), "utf-8");
    }
  } catch (err) {
    console.error("[DataStore] Erro ao inicializar diretório de dados:", err);
  }
}

ensureDataStore();

// Read all subscriptions
export function getAllSubscriptions(): Record<string, UserSubscription> {
  try {
    ensureDataStore();
    const data = fs.readFileSync(SUBSCRIPTIONS_FILE, "utf-8");
    return JSON.parse(data || "{}");
  } catch (e) {
    console.error("[DataStore] Erro ao ler subscriptions.json:", e);
    return {};
  }
}

// Save all subscriptions
export function saveAllSubscriptions(subs: Record<string, UserSubscription>): void {
  try {
    ensureDataStore();
    fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(subs, null, 2), "utf-8");
  } catch (e) {
    console.error("[DataStore] Erro ao gravar subscriptions.json:", e);
  }
}

// Read all events
export function getAllEvents(): SubscriptionEventRecord[] {
  try {
    ensureDataStore();
    const data = fs.readFileSync(EVENTS_FILE, "utf-8");
    return JSON.parse(data || "[]");
  } catch (e) {
    console.error("[DataStore] Erro ao ler subscription_events.json:", e);
    return [];
  }
}

// Save event record (Idempotency and Audit)
export function recordSubscriptionEvent(event: SubscriptionEventRecord): void {
  try {
    ensureDataStore();
    const events = getAllEvents();
    // Prepend new event
    events.unshift(event);
    // Keep last 500 events to prevent boundless growth
    const trimmed = events.slice(0, 500);
    fs.writeFileSync(EVENTS_FILE, JSON.stringify(trimmed, null, 2), "utf-8");
  } catch (e) {
    console.error("[DataStore] Erro ao salvar subscription_events:", e);
  }
}

// Check if an event was already processed (Idempotency)
export function isEventAlreadyProcessed(eventId: string): boolean {
  if (!eventId) return false;
  const events = getAllEvents();
  return events.some((ev) => ev.event_id === eventId);
}

// Get subscription by user email (case-insensitive)
export function getSubscriptionByEmail(email: string): UserSubscription | null {
  if (!email) return null;
  const normalizedEmail = email.toLowerCase().trim();
  const subs = getAllSubscriptions();
  return subs[normalizedEmail] || null;
}

// Process Cakto Webhook Event
export interface ProcessWebhookResult {
  success: boolean;
  status: "processed" | "duplicate" | "ignored" | "error";
  reason?: string;
  subscription?: UserSubscription;
  event_id?: string;
}

export function processCaktoWebhook(payload: any): ProcessWebhookResult {
  const now = new Date().toISOString();

  // 1. Identify Event Type
  const eventType = payload.event || payload.event_type || payload.type;
  if (!eventType) {
    return {
      success: false,
      status: "error",
      reason: "Campo 'event' ausente no payload do webhook da Cakto."
    };
  }

  // Allowed official events
  const allowedEvents = [
    "purchase_approved",
    "purchase_refused",
    "subscription_renewed",
    "subscription_canceled",
    "refund",
    "chargeback"
  ];

  if (!allowedEvents.includes(eventType)) {
    return {
      success: true,
      status: "ignored",
      reason: `Evento '${eventType}' recebido mas não requer atualização de assinatura.`
    };
  }

  // 2. Extract Customer Information
  const customerEmail = (
    payload.data?.customer?.email ||
    payload.data?.email ||
    payload.customer?.email ||
    payload.email ||
    payload.data?.client?.email ||
    payload.data?.buyer?.email ||
    ""
  ).toLowerCase().trim();

  if (!customerEmail) {
    return {
      success: false,
      status: "error",
      reason: "E-mail do cliente não identificado no payload."
    };
  }

  const customerName =
    payload.data?.customer?.name ||
    payload.data?.name ||
    payload.customer?.name ||
    customerEmail.split("@")[0];

  const customerId =
    payload.data?.customer?.id ||
    payload.data?.customer_id ||
    payload.customer?.id ||
    "";

  const productId =
    payload.data?.product?.id ||
    payload.data?.product_id ||
    payload.product?.id ||
    "";

  const subscriptionId =
    payload.data?.subscription?.id ||
    payload.data?.subscription_id ||
    payload.subscription?.id ||
    payload.data?.id ||
    "";

  // 3. Extract Unique Event ID for Idempotency
  const eventId = String(
    payload.id ||
    payload.event_id ||
    payload.data?.event_id ||
    payload.data?.id ||
    `${eventType}_${subscriptionId || customerEmail}_${payload.created_at || Date.now()}`
  );

  // Check idempotency
  if (isEventAlreadyProcessed(eventId)) {
    return {
      success: true,
      status: "duplicate",
      event_id: eventId,
      reason: `O evento '${eventId}' já foi processado anteriormente.`
    };
  }

  // 4. Determine new subscription status and plan
  let newPlan: "free" | "premium" = "free";
  let newStatus: "active" | "canceled" | "refunded" | "chargeback" | "refused" | "none" = "none";

  if (eventType === "purchase_approved" || eventType === "subscription_renewed") {
    newPlan = "premium";
    newStatus = "active";
  } else if (eventType === "subscription_canceled") {
    newPlan = "free";
    newStatus = "canceled";
  } else if (eventType === "refund") {
    newPlan = "free";
    newStatus = "refunded";
  } else if (eventType === "chargeback") {
    newPlan = "free";
    newStatus = "chargeback";
  } else if (eventType === "purchase_refused") {
    newPlan = "free";
    newStatus = "refused";
  }

  // 5. Update or Create User Subscription Record
  const subs = getAllSubscriptions();
  const existing = subs[customerEmail];

  // 30 days period for active subscriptions
  const expiresAt = (newStatus === "active")
    ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    : (existing?.subscription_expires_at || now);

  const updatedSubscription: UserSubscription = {
    id: existing?.id || customerEmail,
    email: customerEmail,
    full_name: customerName,
    subscription_plan: newPlan,
    subscription_status: newStatus,
    cakto_customer_id: customerId || existing?.cakto_customer_id || "",
    cakto_product_id: productId || existing?.cakto_product_id || "",
    cakto_subscription_id: subscriptionId || existing?.cakto_subscription_id || "",
    subscription_started_at: (newStatus === "active") ? (existing?.subscription_started_at || now) : existing?.subscription_started_at,
    subscription_expires_at: expiresAt,
    created_at: existing?.created_at || now,
    updated_at: now
  };

  subs[customerEmail] = updatedSubscription;
  saveAllSubscriptions(subs);

  // 6. Record Event for Audit & Idempotency
  const eventRecord: SubscriptionEventRecord = {
    id: `ev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    event_id: eventId,
    event_type: eventType,
    user_email: customerEmail,
    cakto_product_id: productId,
    cakto_subscription_id: subscriptionId,
    payload: {
      event: eventType,
      id: eventId,
      customer: { email: customerEmail, name: customerName, id: customerId },
      product: { id: productId },
      subscription: { id: subscriptionId }
    },
    processed_at: now,
    created_at: payload.created_at || now
  };

  recordSubscriptionEvent(eventRecord);

  console.log(`[Cakto Webhook] Evento ${eventType} processado com sucesso para ${customerEmail}. Plano: ${newPlan}, Status: ${newStatus}`);

  return {
    success: true,
    status: "processed",
    event_id: eventId,
    subscription: updatedSubscription
  };
}
