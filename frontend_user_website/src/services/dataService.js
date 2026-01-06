import { createClient } from "@supabase/supabase-js";

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
      // CANONICAL: vehicle fields
      vehicle: { make: "Toyota", model: "Corolla", year: "2016", plate: "ABC-123" },
      issueDescription: "Car won't start, clicking noise.",
      contact: { name: "Sam Driver", phone: "555-0101", email: "" },
      notes: [],
      status: "open",
      assignedMechanicId: null,
      assignedMechanicEmail: null,
      priority: "normal"
    },
    {
      id: uid("req"),
      createdAt: now,
      userId: users[0].id,
      userEmail: users[0].email,
      vehicle: { make: "Honda", model: "Civic", year: "2018", plate: "XYZ-987" },
      issueDescription: "Flat tire on rear left.",
      contact: { name: "Sam Driver", phone: "555-0101", email: "" },
      notes: [],
      status: "open",
      assignedMechanicId: null,
      assignedMechanicEmail: null,
      priority: "normal"
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
  // Canonicalize every request object here to match canonical keys strictly
  const reqs = readJson(LS_KEYS.requests, []);
  return reqs.map((r) => ({
    // Omit legacy fields, enforce canonical column structure:
    id: r.id,
    createdAt: r.createdAt,
    userId: r.userId,
    userEmail: r.userEmail,
    vehicle: {
      make: (r.vehicle?.make ?? ""),
      model: (r.vehicle?.model ?? ""),
      year: (r.vehicle?.year ?? ""),
      plate: (r.vehicle?.plate ?? ""),
    },
    issueDescription: r.issueDescription,
    contact: {
      name: (r.contact?.name ?? ""),
      phone: (r.contact?.phone ?? ""),
      email: (r.contact?.email ?? ""),
    },
    notes: Array.isArray(r.notes) ? r.notes : [],
    status: r.status || "open",
    assignedMechanicId: r.assignedMechanicId || null,
    assignedMechanicEmail: r.assignedMechanicEmail || null,
    priority: r.priority || "normal"
  }));
}
function setLocalRequests(reqs) {
  writeJson(LS_KEYS.requests, reqs);
}
function getSupabaseEnv() {
  const url = process.env.REACT_APP_SUPABASE_URL;
  const key = process.env.REACT_APP_SUPABASE_KEY;
  return { url, key };
}

// PUBLIC_INTERFACE
function isSupabaseConfigured() {
  const { url, key } = getSupabaseEnv();
  return Boolean(url && key);
}
function getSupabase() {
  const { url, key } = getSupabaseEnv();
  if (!url || !key) return null;
  try {
    return createClient(url, key);
  } catch {
    return null;
  }
}

// Only ever operate using canonical columns hereafter
function canonicalizeVehicle(vehicle) {
  return {
    make: (vehicle && typeof vehicle === "object" && vehicle.make) || "",
    model: (vehicle && typeof vehicle === "object" && vehicle.model) || "",
    year: (vehicle && typeof vehicle === "object" && vehicle.year) || "",
    plate: (vehicle && typeof vehicle === "object" && vehicle.plate) || "",
  };
}
function canonicalizeContact(contact) {
  return {
    name: (contact && typeof contact === "object" && contact.name) || "",
    phone: (contact && typeof contact === "object" && contact.phone) || "",
    email: (contact && typeof contact === "object" && contact.email) || "",
  };
}
function deriveVehicleString(vehicle) {
  if (!vehicle) return "";
  return [vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(" ");
}

// PUBLIC_INTERFACE
export const dataService = {
  async register(email, password) {
    ensureSeedData();
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw new Error(error.message);
      const user = data.user;
      return user ? { id: user.id, email: user.email, role: "user", approved: true } : { id: "pending", email, role: "user", approved: true };
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

  async login(email, password) {
    ensureSeedData();
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
      const user = data.user;
      return { id: user.id, email: user.email, role: "user", approved: true };
    }
    const users = getLocalUsers();
    const match = users.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (!match) throw new Error("Invalid email or password.");
    setLocalSession({ userId: match.id });
    return { id: match.id, email: match.email, role: match.role, approved: match.approved };
  },

  async logout() {
    const supabase = getSupabase();
    if (supabase) {
      await supabase.auth.signOut();
      return;
    }
    clearLocalSession();
  },

  async getCurrentUser() {
    ensureSeedData();
    const supabase = getSupabase();
    if (supabase) {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      if (!user) return null;
      return { id: user.id, email: user.email, role: "user", approved: true };
    }
    const session = getLocalSession();
    if (!session?.userId) return null;
    const users = getLocalUsers();
    const u = users.find((x) => x.id === session.userId);
    if (!u) return null;
    return { id: u.id, email: u.email, role: u.role, approved: u.approved, profile: u.profile };
  },

  async listRequests({ forUserId } = {}) {
    ensureSeedData();
    const supabase = getSupabase();
    if (supabase) {
      const q = supabase.from("requests").select("*").order("created_at", { ascending: false });
      const res = forUserId ? await q.eq("user_id", forUserId) : await q;
      if (res.error) throw new Error(res.error.message);
      return (res.data || []).map((r) => {
        // STRICTLY use canonical JSON columns only
        const vehicle = canonicalizeVehicle(r.vehicle);
        const contact = canonicalizeContact(r.contact);
        return {
          id: r.id,
          createdAt: r.created_at,
          userId: r.user_id,
          userEmail: r.user_email,
          vehicle,
          issueDescription: r.issue_description,
          contact,
          notes: r.notes || [],
          status: r.status || "open",
          assignedMechanicId: r.assigned_mechanic_id || null,
          assignedMechanicEmail: r.assigned_mechanic_email || null,
          priority: r.priority || "normal",
        };
      });
    }
    // Local/mock mode; already canonicalized in getLocalRequests
    const all = getLocalRequests();
    return (forUserId ? all.filter((r) => r.userId === forUserId) : all).sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  },

  async getRequestById(requestId) {
    const list = await this.listRequests();
    return list.find((r) => r.id === requestId) || null;
  },

  async createRequest({ user, vehicle, issueDescription, contact, notes, priority }) {
    ensureSeedData();
    const supabase = getSupabase();
    const nowIso = new Date().toISOString();

    // Canonicalize strictly
    const safeVehicle = canonicalizeVehicle(vehicle);
    const safeContact = canonicalizeContact(contact);
    priority = priority || "normal";

    if (supabase) {
      // Write ONLY canonical keys, no ID, let Supabase handle id/uuid generation
      const insertPayload = {
        created_at: nowIso,
        user_id: user.id,
        user_email: user.email,
        vehicle: safeVehicle,
        issue_description: issueDescription,
        contact: safeContact,
        notes: Array.isArray(notes) ? notes : [],
        status: "open", // always 'open' on create
        assigned_mechanic_id: null,
        assigned_mechanic_email: null,
        priority,
      };
      const { data, error } = await supabase
        .from("requests")
        .insert(insertPayload)
        .select()
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!data) throw new Error("Failed to insert request.");

      const vehicleObj = canonicalizeVehicle(data.vehicle);
      const contactObj = canonicalizeContact(data.contact);

      return {
        id: data.id,
        createdAt: data.created_at,
        userId: data.user_id,
        userEmail: data.user_email,
        vehicle: vehicleObj,
        issueDescription: data.issue_description,
        contact: contactObj,
        notes: data.notes || [],
        status: data.status || "open",
        assignedMechanicId: data.assigned_mechanic_id || null,
        assignedMechanicEmail: data.assigned_mechanic_email || null,
        priority: data.priority || "normal",
      };
    }

    // Local/mock mode - canonical structure, only canonical keys
    const request = {
      id: uid("req"),
      createdAt: nowIso,
      userId: user.id,
      userEmail: user.email,
      vehicle: safeVehicle,
      issueDescription,
      contact: safeContact,
      notes: Array.isArray(notes) ? notes : [],
      status: "open",
      assignedMechanicId: null,
      assignedMechanicEmail: null,
      priority,
    };
    const all = getLocalRequests();
    setLocalRequests([request, ...all]);
    return request;
  },

  isSupabaseConfigured,
};
