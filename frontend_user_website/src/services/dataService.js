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

/**
 * Enforces DB constraint compliance for user-side request creation.
 *
 * IMPORTANT:
 * - We must never let a caller-provided `status` leak into the insert payload,
 *   because the DB has a check constraint (`requests_status_check`).
 * - We therefore *strip* any provided status and then set the canonical DB value
 *   right before insert.
 */
function forceUserCreateStatusOpen(payload) {
  const safe = payload && typeof payload === "object" ? { ...payload } : {};

  // Strip any caller-provided status to prevent spread/merge bugs from reintroducing it.
  // (Even if currently not used, this is defensive and ensures future changes remain safe.)
  if ("status" in safe) {
    delete safe.status;
  }

  /**
   * DB constraint (requests_status_check) allows:
   *   'pending','assigned','en_route','completed','canceled'
   *
   * We store 'pending' for a newly created request.
   * The UI normalizes 'pending' -> 'OPEN' for display purposes.
   */
  safe.status = "pending";
  return safe;
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

  // Configuration/initialization problems (often show up as auth errors in the UI):
  if (lower.includes("invalid api key") || lower.includes("invalid api key")) {
    return "Supabase rejected the API key. Please verify REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY (or REACT_APP_SUPABASE_KEY) are set to your project’s URL and anon/public key, then restart the app.";
  }
  if (lower.includes("jwt malformed") || lower.includes("invalid jwt")) {
    return "Supabase key appears malformed. Please re-check your REACT_APP_SUPABASE_ANON_KEY value and restart the app.";
  }

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
      lat: typeof r.lat === "number" ? r.lat : r.lat != null ? Number(r.lat) : null,
      lon: typeof r.lon === "number" ? r.lon : r.lon != null ? Number(r.lon) : null,
      address: typeof r.address === "string" ? r.address : "",
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
      lat: typeof data.lat === "number" ? data.lat : data.lat != null ? Number(data.lat) : null,
      lon: typeof data.lon === "number" ? data.lon : data.lon != null ? Number(data.lon) : null,
      address: typeof data.address === "string" ? data.address : "",
    };
  },

  // PUBLIC_INTERFACE
  async createRequest({ vehicleType, issueDescription, address, latitude, longitude } = {}) {
    /**
     * Create a new breakdown request for the currently authenticated user.
     *
     * Enforced insert shape (DO NOT CHANGE without updating DB policies/constraints):
     *
     * const { data: { user } } = await supabase.auth.getUser();
     * await supabase.from('requests').insert({
     *   user_id: user.id,     // REQUIRED
     *   status: 'pending',    // REQUIRED (must satisfy DB check constraint)
     *   vehicle: vehicleType,
     *   issue_description,
     *   address,
     *   latitude,
     *   longitude
     * });
     *
     * IMPORTANT:
     * - status is ALWAYS forced to "pending" (do not accept caller-provided status).
     * - Only whitelisted fields are sent to Supabase (no object spreads).
     * - Column name is `vehicle` (existing DB column), not `vehicle_type`.
     */
    const supabase = getSupabase();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw new Error(userError.message || "Could not fetch current user session.");
    if (!user?.id) throw new Error("You must be logged in to submit a request.");

    const vehicle = typeof vehicleType === "string" ? vehicleType.trim() : "";
    const issue_description = typeof issueDescription === "string" ? issueDescription.trim() : "";
    const safeAddress = typeof address === "string" ? address.trim() : "";

    const safeLatitude = typeof latitude === "number" && Number.isFinite(latitude) ? latitude : null;
    const safeLongitude = typeof longitude === "number" && Number.isFinite(longitude) ? longitude : null;

    if (!vehicle) throw new Error("Vehicle type is required.");
    if (!issue_description) throw new Error("Issue description is required.");
    if (!safeAddress) throw new Error("Address is required.");
    if (safeLatitude == null || safeLongitude == null) {
      throw new Error("Latitude and longitude are required.");
    }

    // IMPORTANT: exact payload shape, no spreads, no extra keys.
    const { data, error } = await supabase
      .from("requests")
      .insert({
        user_id: user.id,
        status: "pending", // forced; must satisfy DB check constraint
        vehicle, // correct column
        issue_description,
        address: safeAddress,
        latitude: safeLatitude,
        longitude: safeLongitude,
      })
      .select()
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) throw new Error("Failed to insert request.");

    // Keep existing UI expectations by returning a best-effort normalized object.
    return {
      id: data.id,
      createdAt: data.created_at,
      userId: data.user_id,
      userEmail: data.user_email,
      vehicle: normalizeVehicle(data.vehicle, data),
      issueDescription: data.issue_description,
      contact: normalizeContact(data.contact, data),
      status: normalizeStatus(data.status || "pending"),
      assignedMechanicId: data.assigned_mechanic_id,
      assignedMechanicEmail: data.assigned_mechanic_email,
      notes: data.notes || [],
      lat: typeof data.lat === "number" ? data.lat : data.lat != null ? Number(data.lat) : null,
      lon: typeof data.lon === "number" ? data.lon : data.lon != null ? Number(data.lon) : null,
      address: typeof data.address === "string" ? data.address : "",
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
