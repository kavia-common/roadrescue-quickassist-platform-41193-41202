import { normalizeStatus } from "./statusUtils";
import { supabase, isSupabaseConfigured as isSupabaseConfiguredClient } from "./supabaseClient";

const LS_KEYS = {
  session: "rrqa.session",
  users: "rrqa.users",
  requests: "rrqa.requests",
  fees: "rrqa.fees",
  seeded: "rrqa.seeded",
};

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function readJson(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function ensureSeedData() {
  const seeded = readJson(LS_KEYS.seeded, false);
  if (seeded) return;

  const users = [
    { id: uid("u"), email: "user@example.com", password: "password123", role: "user", approved: true },
    { id: uid("m"), email: "mech@example.com", password: "password123", role: "mechanic", approved: false, profile: { name: "Alex Mechanic", serviceArea: "Downtown" } },
    { id: uid("a"), email: "admin@example.com", password: "password123", role: "admin", approved: true },
  ];

  const now = new Date().toISOString();
  const requests = [
    {
      id: uid("req"),
      createdAt: now,
      userId: users[0].id,
      userEmail: users[0].email,
      vehicle: { make: "Toyota", model: "Corolla", year: "2016", plate: "ABC-123" },
      issueDescription: "Car won't start, clicking noise.",
      contact: { name: "Sam Driver", phone: "555-0101" },
      status: "Submitted",
      assignedMechanicId: null,
      assignedMechanicEmail: null,
      notes: [],
    },
    {
      id: uid("req"),
      createdAt: now,
      userId: users[0].id,
      userEmail: users[0].email,
      vehicle: { make: "Honda", model: "Civic", year: "2018", plate: "XYZ-987" },
      issueDescription: "Flat tire on rear left.",
      contact: { name: "Sam Driver", phone: "555-0101" },
      status: "In Review",
      assignedMechanicId: null,
      assignedMechanicEmail: null,
      notes: [],
    },
  ];

  writeJson(LS_KEYS.users, users);
  writeJson(LS_KEYS.requests, requests);
  writeJson(LS_KEYS.fees, { baseFee: 25, perMile: 2.0, afterHoursMultiplier: 1.25 });
  writeJson(LS_KEYS.seeded, true);
}

function getLocalSession() {
  return readJson(LS_KEYS.session, null);
}

function setLocalSession(session) {
  writeJson(LS_KEYS.session, session);
}

function clearLocalSession() {
  window.localStorage.removeItem(LS_KEYS.session);
}

function getLocalUsers() {
  return readJson(LS_KEYS.users, []);
}

function setLocalUsers(users) {
  writeJson(LS_KEYS.users, users);
}

function getLocalRequests() {
  return readJson(LS_KEYS.requests, []);
}

function setLocalRequests(reqs) {
  writeJson(LS_KEYS.requests, reqs);
}

// PUBLIC_INTERFACE
function isSupabaseConfigured() {
  /** Returns true only when required REACT_APP_ Supabase env vars are present (React build-time). */
  return isSupabaseConfiguredClient();
}

function getSupabase() {
  // Use shared singleton client. If env vars missing, this is null (mock mode).
  return supabase;
}

async function supaGetUserRole(supa, userId, email) {
  // Minimal role table assumption: public.profiles(id uuid primary key, email text, role text, approved boolean)
  // If not present, default to "user".
  try {
    const { data, error } = await supa.from("profiles").select("role,approved").eq("id", userId).maybeSingle();
    if (error) return { role: "user", approved: true };
    if (!data) {
      await supa.from("profiles").insert({ id: userId, email, role: "user", approved: true });
      return { role: "user", approved: true };
    }
    return { role: data.role || "user", approved: data.approved ?? true };
  } catch {
    return { role: "user", approved: true };
  }
}

async function supaUserToAppUser(supaUser) {
  if (!supaUser) return null;
  const supa = getSupabase();
  if (!supa) return null;
  const roleInfo = await supaGetUserRole(supa, supaUser.id, supaUser.email);
  return { id: supaUser.id, email: supaUser.email, role: roleInfo.role, approved: roleInfo.approved };
}

/*
  FIELD MAPPING NOTES (MUST BE IDENTICAL ACROSS ALL 3 FRONTENDS/SERVICES)

  UI form fields (local): {vehicle: {make, model, year, plate}, contact: {name, phone}, issueDescription}
  Supabase DB columns (requests):
    - vehicle (jsonb: {make, model, year, plate}),
    - contact (jsonb: {name, phone}),
    - user_email,
    - assigned_mechanic_email,
    - notes (jsonb array),
    - status (text),
    - id (db-generated UUID or provided string for local),
    - created_at (timestamp),
    - user_id (uuid),
    - assigned_mechanic_id (uuid, nullable).

  - When reading, always reconstruct {vehicle} and {contact} if only primitives are present or if data is stringified.
  - When writing, always persist {vehicle} and {contact} as jsonb to Supabase.
  - If future backends provide only separate fields, include non-breaking fallback to recompose.
  - "vehicle" UI display: "${vehicle.make} ${vehicle.model} ${vehicle.year}" (never expect a single vehiclestring column unless legacy).
  - "contact" UI display: "${contact.name} (${contact.phone})"
  - Omit "id" on insert in Supabase mode; let Supabase assign. Always set status="open" on submit, leave assignments/mechanic UUIDs null unless set.

  These rules ensure consistent field display/persistence across User Website, Mechanic Portal, and Admin Panel.

*/
// PUBLIC_INTERFACE
export const dataService = {
  /** Data access facade: uses Supabase when configured; otherwise localStorage mock. */

  // PUBLIC_INTERFACE
  async register(email, password) {
    ensureSeedData();
    const supa = getSupabase();
    if (supa) {
      const { data, error } = await supa.auth.signUp({ email, password });
      if (error) throw new Error(error.message);
      // When email confirmation is enabled, user might be null; still return.
      const user = data.user;
      if (user) {
        const roleInfo = await supaGetUserRole(supa, user.id, email);
        return { id: user.id, email: user.email, role: roleInfo.role, approved: roleInfo.approved };
      }
      return { id: "pending", email, role: "user", approved: true };
    }

    const users = getLocalUsers();
    if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error("Email already registered.");
    }
    const user = { id: uid("u"), email, password, role: "user", approved: true };
    setLocalUsers([user, ...users]);
    setLocalSession({ userId: user.id });
    return { id: user.id, email: user.email, role: user.role, approved: user.approved };
  },

  // PUBLIC_INTERFACE
  async login(email, password) {
    ensureSeedData();
    const supa = getSupabase();
    if (supa) {
      const { data, error } = await supa.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
      const user = data.user;
      const roleInfo = await supaGetUserRole(supa, user.id, user.email);
      return { id: user.id, email: user.email, role: roleInfo.role, approved: roleInfo.approved };
    }

    const users = getLocalUsers();
    const match = users.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (!match) throw new Error("Invalid email or password.");
    setLocalSession({ userId: match.id });
    return { id: match.id, email: match.email, role: match.role, approved: match.approved };
  },

  // PUBLIC_INTERFACE
  async loginWithGoogle({ redirectTo } = {}) {
    /** Starts Supabase OAuth sign-in with Google (Supabase mode only). */
    const supa = getSupabase();
    if (!supa) {
      throw new Error("Supabase is not configured. Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_KEY to enable Google sign-in.");
    }

    const finalRedirect = redirectTo || window.location.origin;

    const { error } = await supa.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: finalRedirect,
      },
    });

    // On success the browser will redirect away; if we get here, it either errored or popup-based flows.
    if (error) throw new Error(error.message);
    return true;
  },

  // PUBLIC_INTERFACE
  async logout() {
    const supa = getSupabase();
    if (supa) {
      await supa.auth.signOut();
      return;
    }
    clearLocalSession();
  },

  // PUBLIC_INTERFACE
  async getCurrentUser() {
    ensureSeedData();
    const supa = getSupabase();

    // IMPORTANT:
    // In some environments the network call behind supabase.auth.getUser() can hang indefinitely
    // (e.g. bad URL, blocked network, captive portal). If that happens, the app boot can stall.
    // We enforce a small timeout and treat it as "logged out" so the app can still render.
    const withTimeout = async (promise, ms, label) => {
      let t;
      try {
        return await Promise.race([
          promise,
          new Promise((_, reject) => {
            t = window.setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
          }),
        ]);
      } finally {
        if (t) window.clearTimeout(t);
      }
    };

    if (supa) {
      try {
        const { data } = await withTimeout(supa.auth.getUser(), 3500, "Supabase getUser");
        const user = data?.user;
        if (!user) return null;

        // Role lookup should also be best-effort; if it hangs/fails, still return basic identity.
        try {
          const roleInfo = await withTimeout(supaGetUserRole(supa, user.id, user.email), 3500, "Supabase role lookup");
          return { id: user.id, email: user.email, role: roleInfo.role, approved: roleInfo.approved };
        } catch {
          return { id: user.id, email: user.email, role: "user", approved: true };
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("[dataService.getCurrentUser] Supabase unreachable; falling back to logged-out mode:", e?.message || e);
        return null;
      }
    }

    const session = getLocalSession();
    if (!session?.userId) return null;
    const users = getLocalUsers();
    const u = users.find((x) => x.id === session.userId);
    if (!u) return null;
    return { id: u.id, email: u.email, role: u.role, approved: u.approved, profile: u.profile };
  },

  // PUBLIC_INTERFACE
  subscribeToAuthChanges(onUserChanged) {
    /**
     * Subscribe to Supabase auth state changes.
     *
     * Returns an unsubscribe function.
     * No-op in mock mode.
     */
    const supa = getSupabase();
    if (!supa) return () => {};

    const {
      data: { subscription },
    } = supa.auth.onAuthStateChange(async (_event, session) => {
      try {
        const next = session?.user ? await supaUserToAppUser(session.user) : null;
        onUserChanged?.(next);
      } catch {
        // If role/profile fetch fails, still set basic identity to avoid blocking UX.
        onUserChanged?.(
          session?.user
            ? { id: session.user.id, email: session.user.email, role: "user", approved: true }
            : null
        );
      }
    });

    return () => subscription?.unsubscribe?.();
  },

  // PUBLIC_INTERFACE
  async listRequests({ forUserId } = {}) {
    ensureSeedData();
    const supa = getSupabase();
    if (supa) {
      const q = supa.from("requests").select("*").order("created_at", { ascending: false });
      const res = forUserId ? await q.eq("user_id", forUserId) : await q;
      if (res.error) throw new Error(res.error.message);
      return (res.data || []).map((r) => {
        // Defensive handling for "vehicle" and "contact" - ENFORCED: 'vehicle' is always normalized to {make,model}
        let vehicle = r.vehicle;
        if (!vehicle || typeof vehicle !== "object") {
          vehicle = {};
          if (r.vehicle_make) vehicle.make = r.vehicle_make;
          if (r.vehicle_model) vehicle.model = r.vehicle_model;
          // Legacy fallback: parse space-separated string
          if (!vehicle.make && typeof r.vehicle === "string") {
            const parts = r.vehicle.split(" ");
            vehicle.make = parts[0] || "";
            vehicle.model = parts[1] || "";
          }
        }
        // Only expose 'make' and 'model' keys; guaranteed present for UI
        vehicle = {
          make: typeof vehicle.make === "string" ? vehicle.make : "",
          model: typeof vehicle.model === "string" ? vehicle.model : "",
        };
        // Defensive for contact
        let contact = r.contact;
        if (!contact || typeof contact !== "object") {
          contact = {};
          if (r.contact_name) contact.name = r.contact_name;
          if (r.contact_phone) contact.phone = r.contact_phone;
          if (!contact.name && typeof r.contact === "string") contact.name = r.contact;
        }
        return {
          id: r.id,
          createdAt: r.created_at,
          userId: r.user_id,
          userEmail: r.user_email,
          vehicle,
          issueDescription: r.issue_description,
          contact,
          status: normalizeStatus(r.status),
          assignedMechanicId: r.assigned_mechanic_id,
          assignedMechanicEmail: r.assigned_mechanic_email,
          notes: r.notes || [],
        };
      });
    }

    const all = getLocalRequests();
    return (forUserId ? all.filter((r) => r.userId === forUserId) : all).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  // PUBLIC_INTERFACE
  async getRequestById(requestId) {
    const list = await this.listRequests();
    return list.find((r) => r.id === requestId) || null;
  },

  // PUBLIC_INTERFACE
  async createRequest({ user, vehicle, issueDescription, contact }) {
    ensureSeedData();
    const supa = getSupabase();
    const nowIso = new Date().toISOString();

    // ENFORCED: Write vehicle as {make, model} ONLY for every create (ignore year/plate).
    const safeVehicle = {
      make: vehicle && typeof vehicle.make === "string" ? vehicle.make : "",
      model: vehicle && typeof vehicle.model === "string" ? vehicle.model : "",
    };
    // Contact full, for UI/possible future
    const safeContact = {
      name: contact?.name || "",
      phone: contact?.phone || "",
    };

    // Prep mock request for localStorage mode
    const request = {
      id: uid("req"),
      createdAt: nowIso,
      userId: user.id,
      userEmail: user.email,
      vehicle: safeVehicle, // only make/model is stored for "vehicle"
      issueDescription,
      contact: safeContact,
      status: "Submitted",
      assignedMechanicId: null,
      assignedMechanicEmail: null,
      notes: [],
    };

    if (supa) {
      // Prepare payload for Supabase: vehicle={make,model}, status="open", omit id, only valid/null UUIDs, no custom fields.
      const insertPayload = {
        created_at: nowIso,
        user_id: user.id,
        user_email: user.email,
        vehicle: safeVehicle,
        issue_description: issueDescription,
        contact: safeContact,
        status: "open", // always open on create
        assigned_mechanic_id: null,
        assigned_mechanic_email: null,
        notes: [],
      };
      // Use .select() to get server-inserted row for ID
      const { data, error } = await supa.from("requests").insert(insertPayload).select().maybeSingle();

      if (error) throw new Error(error.message);
      if (!data) throw new Error("Failed to insert request.");

      // Always normalize vehicle to {make,model} in UI state
      let vehicleObj = data.vehicle;
      if (!vehicleObj || typeof vehicleObj !== "object") {
        vehicleObj = {};
        if (data.vehicle_make) vehicleObj.make = data.vehicle_make;
        if (data.vehicle_model) vehicleObj.model = data.vehicle_model;
      }
      vehicleObj = {
        make: typeof vehicleObj.make === "string" ? vehicleObj.make : "",
        model: typeof vehicleObj.model === "string" ? vehicleObj.model : "",
      };
      let contactObj = data.contact;
      if (!contactObj || typeof contactObj !== "object") {
        contactObj = {};
        if (data.contact_name) contactObj.name = data.contact_name;
        if (data.contact_phone) contactObj.phone = data.contact_phone;
      }

      return {
        id: data.id,
        createdAt: data.created_at,
        userId: data.user_id,
        userEmail: data.user_email,
        vehicle: vehicleObj,
        issueDescription: data.issue_description,
        contact: contactObj,
        status: data.status,
        assignedMechanicId: data.assigned_mechanic_id,
        assignedMechanicEmail: data.assigned_mechanic_email,
        notes: data.notes || [],
      };
    }

    // In mock mode, assign custom string ID.
    const all = getLocalRequests();
    setLocalRequests([request, ...all]);
    return request;
  },

  // PUBLIC_INTERFACE
  isSupabaseConfigured,
};
