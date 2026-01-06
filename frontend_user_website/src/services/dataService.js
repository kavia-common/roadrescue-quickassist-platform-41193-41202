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
      vehicle: { make: "Toyota", model: "Corolla", year: "2016", plate: "ABC-123" },
      issueDescription: "Car won't start, clicking noise.",
      contact: { name: "Sam Driver", phone: "555-0101" },
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
      contact: { name: "Sam Driver", phone: "555-0101" },
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
  return readJson(LS_KEYS.requests, []);
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

async function supaGetUserRole(supabase, userId, email) {
  try {
    const { data, error } = await supabase.from("profiles").select("role,approved").eq("id", userId).maybeSingle();
    if (error) return { role: "user", approved: true };
    if (!data) {
      await supabase.from("profiles").insert({ id: userId, email, role: "user", approved: true });
      return { role: "user", approved: true };
    }
    return { role: data.role || "user", approved: data.approved ?? true };
  } catch {
    return { role: "user", approved: true };
  }
}

// ---- Serialization helpers ----
function canonicalizeVehicle(vehicle, fallback) {
  // Returns {make, model, year, plate}
  if (!vehicle || typeof vehicle !== "object") return fallback || { make: "", model: "", year: "", plate: "" };
  return {
    make: vehicle.make || "",
    model: vehicle.model || "",
    year: vehicle.year || "",
    plate: vehicle.plate || "",
  };
}
function canonicalizeContact(contact, fallback) {
  if (!contact || typeof contact !== "object") return fallback || { name: "", phone: "", email: "" };
  return {
    name: contact.name || "",
    phone: contact.phone || "",
    email: contact.email || "",
  };
}
function deriveVehicleString(vehicle) {
  // "${make} ${model}" with null-safe guards
  if (!vehicle) return "";
  return [vehicle.make, vehicle.model].filter(Boolean).join(" ");
}
function deriveVehicleFull(vehicle) {
  // "${year} ${make} ${model}" with null-safe guards
  if (!vehicle) return "";
  return [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ");
}

function parseLegacyVehicleStr(vehicleStr) {
  // Try split on spaces, best effort for legacy fallback
  if (typeof vehicleStr !== "string") return { make: "", model: "", year: "", plate: "" };
  const parts = vehicleStr.split(" ");
  return {
    year: parts.length === 3 ? parts[0] : "",
    make: parts.length >= 2 ? parts[parts.length - 2] : "",
    model: parts.length >= 1 ? parts[parts.length - 1] : "",
    plate: "",
  };
}

function parseLegacyContactStr(contactStr) {
  // e.g., "Sam Driver (555-0101)"
  if (typeof contactStr !== "string") return { name: "", phone: "", email: "" };
  const match = contactStr.match(/^(.*?) *\((.*?)\)/);
  if (match) { return { name: match[1].trim(), phone: match[2].trim(), email: "" }; }
  return { name: contactStr.trim(), phone: "", email: "" };
}

/*
 CANONICAL KEYS: 
 - make, model, year, plate (vehicle), 
 - contact_name, contact_phone, contact_email,
 - notes, user_email, assigned_mechanic_email,
 - priority, status, id, created_at, user_id, assigned_mechanic_id
 - status: always 'open' on insert
 - priority: defaults to 'normal'
 - id: omitted on Supabase insert (let it generate uuid)
 - On read: gracefully fallback if old record fields.
*/

// PUBLIC_INTERFACE
export const dataService = {
  async register(email, password) {
    ensureSeedData();
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw new Error(error.message);
      const user = data.user;
      if (user) {
        const roleInfo = await supaGetUserRole(supabase, user.id, email);
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

  async login(email, password) {
    ensureSeedData();
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
      const user = data.user;
      const roleInfo = await supaGetUserRole(supabase, user.id, user.email);
      return { id: user.id, email: user.email, role: roleInfo.role, approved: roleInfo.approved };
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
      const roleInfo = await supaGetUserRole(supabase, user.id, user.email);
      return { id: user.id, email: user.email, role: roleInfo.role, approved: roleInfo.approved };
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
        // Vehicle/Contact mapping: prefer canonical JSON, else fallback to legacy/separate fields
        let vehicle = canonicalizeVehicle(r.vehicle);
        // old: individual fields
        if ((!vehicle.make || !vehicle.model) && (r.vehicle_make || r.vehicle_model)) {
          vehicle.make = r.vehicle_make || "";
          vehicle.model = r.vehicle_model || "";
          vehicle.year = r.vehicle_year || "";
          vehicle.plate = r.vehicle_plate || "";
        }
        // fallback to string
        if (!vehicle.make && typeof r.vehicle === "string") {
          Object.assign(vehicle, parseLegacyVehicleStr(r.vehicle));
        }

        let contact = canonicalizeContact(r.contact);
        if ((!contact.name || !contact.phone) && (r.contact_name || r.contact_phone)) {
          contact.name = r.contact_name || "";
          contact.phone = r.contact_phone || "";
          contact.email = r.contact_email || "";
        }
        if (!contact.name && typeof r.contact === "string") {
          Object.assign(contact, parseLegacyContactStr(r.contact));
        }

        // Canonical keys
        return {
          id: r.id,
          createdAt: r.created_at || r.createdAt,
          userId: r.user_id,
          userEmail: r.user_email,
          vehicle,
          vehicleStr: deriveVehicleString(vehicle),
          vehicleFull: deriveVehicleFull(vehicle),
          issueDescription: r.issue_description || r.issueDescription || "",
          contact,
          contactName: contact.name,
          contactPhone: contact.phone,
          contactEmail: contact.email || r.contact_email || "",
          notes: r.notes || [],
          status: r.status || "open",
          assignedMechanicId: r.assigned_mechanic_id || null,
          assignedMechanicEmail: r.assigned_mechanic_email || null,
          priority: r.priority || "normal",
        };
      });
    }
    // Local/mock mode
    const all = getLocalRequests().map((r) => {
      const vehicle = canonicalizeVehicle(r.vehicle);
      const contact = canonicalizeContact(r.contact);
      return {
        ...r,
        vehicle,
        vehicleStr: deriveVehicleString(vehicle),
        vehicleFull: deriveVehicleFull(vehicle),
        contact,
        contactName: contact.name,
        contactPhone: contact.phone,
        contactEmail: contact.email || "",
        priority: r.priority || "normal",
        status: r.status || "open",
        notes: r.notes || [],
        assignedMechanicId: r.assignedMechanicId || null,
        assignedMechanicEmail: r.assignedMechanicEmail || null,
      };
    });
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

    // Canonicalize vehicle/contact
    const safeVehicle = canonicalizeVehicle(vehicle);
    const safeContact = canonicalizeContact(contact);

    priority = priority || "normal";

    if (supabase) {
      // Only send canonical keys
      const insertPayload = {
        // No "id", Supabase generates UUID
        created_at: nowIso,
        user_id: user.id,
        user_email: user.email,
        vehicle: safeVehicle,
        issue_description: issueDescription,
        contact: safeContact,
        notes: Array.isArray(notes) ? notes : [],
        status: "open", // always "open" on create
        assigned_mechanic_id: null,
        assigned_mechanic_email: null,
        priority,
      };
      // Use .select() to get inserted row including Supabase UUID
      const { data, error } = await supabase
        .from("requests")
        .insert(insertPayload)
        .select()
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!data) throw new Error("Failed to insert request.");

      let vehicleObj = canonicalizeVehicle(data.vehicle, {});
      let contactObj = canonicalizeContact(data.contact, {});

      return {
        id: data.id,
        createdAt: data.created_at,
        userId: data.user_id,
        userEmail: data.user_email,
        vehicle: vehicleObj,
        vehicleStr: deriveVehicleString(vehicleObj),
        vehicleFull: deriveVehicleFull(vehicleObj),
        issueDescription: data.issue_description,
        contact: contactObj,
        contactName: contactObj.name,
        contactPhone: contactObj.phone,
        contactEmail: contactObj.email,
        notes: data.notes || [],
        status: data.status || "open",
        assignedMechanicId: data.assigned_mechanic_id || null,
        assignedMechanicEmail: data.assigned_mechanic_email || null,
        priority: data.priority || "normal",
      };
    }

    // Local/mock mode - behave identically except for ID and createdAt key
    const request = {
      id: uid("req"),
      createdAt: nowIso,
      userId: user.id,
      userEmail: user.email,
      vehicle: safeVehicle,
      vehicleStr: deriveVehicleString(safeVehicle),
      vehicleFull: deriveVehicleFull(safeVehicle),
      issueDescription,
      contact: safeContact,
      contactName: safeContact.name,
      contactPhone: safeContact.phone,
      contactEmail: safeContact.email,
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
