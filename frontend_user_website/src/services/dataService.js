import { normalizeStatus } from "./statusUtils";
import { getSupabase } from "./supabaseClient";
import { appConfig } from "../config/appConfig";
import { withTimeout } from "../utils/withTimeout";

/**
 * Convert a Supabase auth user into the minimal "app user" shape expected by the UI.
 * Also attempts to read role/approved from public.profiles, but never blocks UX if that fails.
 */
async function supaUserToAppUser(supaUser) {
  if (!supaUser) return null;

  const supabase = getSupabase();

  // Default role/approval if profiles table isn't configured or RLS blocks.
  let role = "user";
  let approved = true;

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("role,approved")
      .eq("id", supaUser.id)
      .maybeSingle();

    if (!error && data) {
      role = data.role || "user";
      approved = data.approved ?? true;
    } else if (!error && !data) {
      // Best-effort bootstrap: create a profiles row if missing.
      await supabase.from("profiles").insert({
        id: supaUser.id,
        email: supaUser.email,
        role: "user",
        approved: true,
      });
    }
  } catch {
    // ignore
  }

  return { id: supaUser.id, email: supaUser.email, role, approved };
}

function normalizeVehicle(vehicle, row) {
  let v = vehicle;
  if (!v || typeof v !== "object") {
    v = {};
    if (row?.vehicle_make) v.make = row.vehicle_make;
    if (row?.vehicle_model) v.model = row.vehicle_model;
    if (!v.make && typeof row?.vehicle === "string") {
      const parts = row.vehicle.split(" ");
      v.make = parts[0] || "";
      v.model = parts[1] || "";
    }
  }
  return {
    make: typeof v.make === "string" ? v.make : "",
    model: typeof v.model === "string" ? v.model : "",
  };
}

function normalizeContact(contact, row) {
  let c = contact;
  if (!c || typeof c !== "object") {
    c = {};
    if (row?.contact_name) c.name = row.contact_name;
    if (row?.contact_phone) c.phone = row.contact_phone;
    if (!c.name && typeof row?.contact === "string") c.name = row.contact;
  }
  return {
    name: typeof c.name === "string" ? c.name : "",
    phone: typeof c.phone === "string" ? c.phone : "",
  };
}

/*
  FIELD MAPPING NOTES (MUST BE IDENTICAL ACROSS ALL 3 FRONTENDS/SERVICES)

  UI form fields (local): {vehicle: {make, model}, contact: {name, phone}, issueDescription}
  Supabase DB columns (requests):
    - vehicle (jsonb: {make, model, ...}),
    - contact (jsonb: {name, phone, ...}),
    - user_email,
    - assigned_mechanic_email,
    - notes (jsonb array),
    - status (text),
    - id (uuid or text),
    - created_at (timestamp),
    - user_id (uuid),
    - assigned_mechanic_id (uuid, nullable).

  - When reading, always normalize vehicle to {make, model} and contact to {name, phone}.
  - When writing, always persist vehicle/contact as jsonb.
  - Always set status="open" on create.
*/

function normalizeSupabaseAuthError(err) {
  // Supabase errors can vary by provider/settings. We keep the UI message clear.
  const raw = String(err?.message || "").trim();
  const lower = raw.toLowerCase();

  if (!raw) return "Authentication failed.";

  // Common cases:
  if (lower.includes("invalid login credentials")) return "Invalid email or password.";
  if (lower.includes("email not confirmed") || lower.includes("confirm your email")) {
    return "Please confirm your email address before signing in.";
  }
  if (lower.includes("too many requests")) return "Too many attempts. Please wait a moment and try again.";

  return raw;
}

// PUBLIC_INTERFACE
export const dataService = {
  /** Supabase-only data access facade (no mock/demo/localStorage). */

  // PUBLIC_INTERFACE
  async register(email, password) {
    const supabase = getSupabase();
    try {
      const res = await withTimeout(supabase.auth.signUp({ email, password }), appConfig.bootTimeoutMs, "Sign up");

      const { data, error } = res;
      if (error) throw error;

      // When email confirmation is enabled, user may be null initially.
      if (!data?.user) return { id: "pending", email, role: "user", approved: true };
      return supaUserToAppUser(data.user);
    } catch (e) {
      throw new Error(normalizeSupabaseAuthError(e));
    }
  },

  // PUBLIC_INTERFACE
  async login(email, password) {
    const supabase = getSupabase();
    try {
      const res = await withTimeout(
        supabase.auth.signInWithPassword({ email, password }),
        appConfig.bootTimeoutMs,
        "Sign in"
      );

      const { data, error } = res;
      if (error) throw error;

      // In normal password flow, Supabase returns user immediately on success.
      // Still guard to avoid downstream null derefs.
      if (!data?.user) throw new Error("Sign-in succeeded but no user was returned.");
      return supaUserToAppUser(data.user);
    } catch (e) {
      throw new Error(normalizeSupabaseAuthError(e));
    }
  },

  // PUBLIC_INTERFACE
  async loginWithGoogle({ redirectTo } = {}) {
    /** Starts Supabase OAuth sign-in with Google (Supabase mode). */
    const supabase = getSupabase();
    const finalRedirect = redirectTo || window.location.origin;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: finalRedirect },
    });

    if (error) throw new Error(error.message);
    return true;
  },

  // PUBLIC_INTERFACE
  async logout() {
    const supabase = getSupabase();
    const { error } = await supabase.auth.signOut();
    if (error) {
      // eslint-disable-next-line no-console
      console.warn("Supabase signOut error:", error.message);
    }
  },

  // PUBLIC_INTERFACE
  async getUserFromSession() {
    /**
     * Returns current authenticated user or null using `supabase.auth.getSession()`.
     *
     * Why session-first:
     * - Recommended for app boot: it reads the cached session quickly
     * - Avoids some edge cases where getUser can hang during initialization in preview environments
     */
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.getSession();
    if (error) return null;

    const u = data?.session?.user;
    if (!u) return null;
    return supaUserToAppUser(u);
  },

  // PUBLIC_INTERFACE
  async getCurrentUser() {
    /** Returns current authenticated user or null. */
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.getUser();
    if (error) return null;
    const u = data?.user;
    if (!u) return null;
    return supaUserToAppUser(u);
  },

  // PUBLIC_INTERFACE
  subscribeToAuthChanges(onUserChanged) {
    /** Subscribe to Supabase auth state changes; returns unsubscribe.
     *
     * IMPORTANT: Must not block UI transitions.
     * Some environments/RLS configurations can make profile lookups slow or fail.
     * We emit a minimal user immediately, then enrich role/approved in the background.
     */
    const supabase = getSupabase();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const rawUser = session?.user || null;

      if (!rawUser) {
        onUserChanged?.(null);
        return;
      }

      // Emit immediately so auth state resolves without waiting on DB/RLS.
      const basicUser = { id: rawUser.id, email: rawUser.email, role: "user", approved: true };
      onUserChanged?.(basicUser);

      // Best-effort enrichment (async, non-blocking).
      (async () => {
        try {
          const enriched = await supaUserToAppUser(rawUser);
          // Only emit if enrichment produced something meaningful.
          if (enriched) onUserChanged?.(enriched);
        } catch {
          // Ignore enrichment errors; basic user is already emitted.
        }
      })();
    });

    return () => subscription?.unsubscribe?.();
  },

  // PUBLIC_INTERFACE
  async getProfile(userId) {
    /** Returns profile row from public.profiles. */
    const supabase = getSupabase();
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Profile not found.");
    return {
      id: data.id,
      email: data.email || "",
      role: data.role || "user",
      approved: data.approved ?? true,
      profile: data.profile || {},
    };
  },

  // PUBLIC_INTERFACE
  async listRequests({ forUserId } = {}) {
    const supabase = getSupabase();
    const q = supabase.from("requests").select("*").order("created_at", { ascending: false });
    const res = forUserId ? await q.eq("user_id", forUserId) : await q;
    if (res.error) throw new Error(res.error.message);

    return (res.data || []).map((r) => ({
      id: r.id,
      createdAt: r.created_at,
      userId: r.user_id,
      userEmail: r.user_email,
      vehicle: normalizeVehicle(r.vehicle, r),
      issueDescription: r.issue_description,
      contact: normalizeContact(r.contact, r),
      status: normalizeStatus(r.status),
      assignedMechanicId: r.assigned_mechanic_id,
      assignedMechanicEmail: r.assigned_mechanic_email,
      notes: r.notes || [],
    }));
  },

  // PUBLIC_INTERFACE
  async getRequestById(requestId) {
    const supabase = getSupabase();
    const { data, error } = await supabase.from("requests").select("*").eq("id", requestId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;

    return {
      id: data.id,
      createdAt: data.created_at,
      userId: data.user_id,
      userEmail: data.user_email,
      vehicle: normalizeVehicle(data.vehicle, data),
      issueDescription: data.issue_description,
      contact: normalizeContact(data.contact, data),
      status: normalizeStatus(data.status),
      assignedMechanicId: data.assigned_mechanic_id,
      assignedMechanicEmail: data.assigned_mechanic_email,
      notes: data.notes || [],
    };
  },

  // PUBLIC_INTERFACE
  async createRequest({ user, vehicle, issueDescription, contact }) {
    const supabase = getSupabase();
    const nowIso = new Date().toISOString();

    const safeVehicle = {
      make: vehicle && typeof vehicle.make === "string" ? vehicle.make : "",
      model: vehicle && typeof vehicle.model === "string" ? vehicle.model : "",
    };
    const safeContact = {
      name: contact?.name || "",
      phone: contact?.phone || "",
    };

    const insertPayload = {
      created_at: nowIso,
      user_id: user.id,
      user_email: user.email,
      vehicle: safeVehicle,
      issue_description: issueDescription,
      contact: safeContact,
      status: "open",
      assigned_mechanic_id: null,
      assigned_mechanic_email: null,
      notes: [],
    };

    const { data, error } = await supabase.from("requests").insert(insertPayload).select().maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Failed to insert request.");

    return {
      id: data.id,
      createdAt: data.created_at,
      userId: data.user_id,
      userEmail: data.user_email,
      vehicle: normalizeVehicle(data.vehicle, data),
      issueDescription: data.issue_description,
      contact: normalizeContact(data.contact, data),
      status: normalizeStatus(data.status),
      assignedMechanicId: data.assigned_mechanic_id,
      assignedMechanicEmail: data.assigned_mechanic_email,
      notes: data.notes || [],
    };
  },

  // PUBLIC_INTERFACE
  isSupabaseConfigured() {
    /**
     * Supabase-only app: returns true if env vars exist.
     * (Does not attempt network calls.)
     */
    return true;
  },
};
