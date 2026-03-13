import { SUPABASE_URL, SUPABASE_ANON } from '../utils/constants';

const supabase = (() => {
  let _token = null;
  const _listeners = [];

  const baseHeaders = () => {
    if (!_token) {
      try {
        const raw = localStorage.getItem("sc_sess");
        if (raw) {
          const s = JSON.parse(raw);
          if (s?.access_token) _token = s.access_token;
        }
      } catch (e) { }
    }
    return {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON,
      "Authorization": `Bearer ${_token || SUPABASE_ANON}`,
    };
  };

  const auth = {
    _emit(event, session) {
      _token = session?.access_token || null;
      _listeners.forEach(fn => fn(event, session));
    },
    onAuthStateChange(cb) {
      _listeners.push(cb);
      return { data: { subscription: { unsubscribe: () => _listeners.splice(_listeners.indexOf(cb), 1) } } };
    },
    async getSession() {
      try {
        const raw = localStorage.getItem("sc_sess");
        if (!raw) return { data: { session: null } };
        const s = JSON.parse(raw);
        if (!s?.access_token) return { data: { session: null } };
        const payload = JSON.parse(atob(s.access_token.split(".")[1]));
        if (payload.exp * 1000 < Date.now()) {
          localStorage.removeItem("sc_sess");
          _token = null;
          return { data: { session: null } };
        }
        _token = s.access_token;
        return { data: { session: s } };
      } catch { return { data: { session: null } }; }
    },
    async signInWithPassword({ email, password }) {
      try {
        const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
          method: "POST", headers: baseHeaders(), body: JSON.stringify({ email, password }),
        });
        const d = await r.json();
        if (d.access_token) {
          localStorage.setItem("sc_sess", JSON.stringify(d));
          auth._emit("SIGNED_IN", d);
          return { data: d, error: null };
        }
        return { data: null, error: { message: d.error_description || d.message || "Credenciais inválidas" } };
      } catch (e) { return { data: null, error: { message: "Erro de conexão" } }; }
    },
    async signUp({ email, password, options = {} }) {
      try {
        const r = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
          method: "POST", headers: baseHeaders(),
          body: JSON.stringify({ email, password, data: options.data }),
        });
        const d = await r.json();
        if (d.id || d.access_token) {
          if (d.access_token) {
            localStorage.setItem("sc_sess", JSON.stringify(d));
            auth._emit("SIGNED_IN", d);
          }
          return { data: d, error: null };
        }
        return { data: null, error: { message: d.msg || d.error_description || "Erro ao criar conta" } };
      } catch (e) { return { data: null, error: { message: "Erro de conexão" } }; }
    },
    async signOut() {
      const headers = baseHeaders();
      localStorage.removeItem("sc_sess");
      _token = null;
      auth._emit("SIGNED_OUT", null);
      try {
        await fetch(`${SUPABASE_URL}/auth/v1/logout`, { method: "POST", headers });
      } catch (e) { }
      return { error: null };
    },
  };

  const from = (table) => {
    const state = { table, method: "GET", params: new URLSearchParams(), body: null, extraHeaders: {} };

    const b = {
      select(cols = "*") { state.params.set("select", cols); return b; },
      insert(data) { state.method = "POST"; state.body = JSON.stringify(data); state.extraHeaders["Prefer"] = "return=representation"; return b; },
      update(data) { state.method = "PATCH"; state.body = JSON.stringify(data); state.extraHeaders["Prefer"] = "return=representation"; return b; },
      upsert(data) { state.method = "POST"; state.body = JSON.stringify(data); state.extraHeaders["Prefer"] = "resolution=merge-duplicates,return=representation"; return b; },
      delete() { state.method = "DELETE"; return b; },
      eq(col, val) { state.params.append(col, `eq.${val}`); return b; },
      order(col, { ascending = true } = {}) { state.params.set("order", `${col}.${ascending ? "asc" : "desc"}`); return b; },
      limit(n) { state.params.set("limit", n); return b; },
      single() { state.extraHeaders["Accept"] = "application/vnd.pgrst.object+json"; state.single = true; return b; },
      maybeSingle() { state.maybeSingle = true; return b; },
      then(res, rej) { return b._run().then(res, rej); },
      async _run() {
        try {
          const url = `${SUPABASE_URL}/rest/v1/${state.table}?${state.params}`;
          const resp = await fetch(url, {
            method: state.method,
            headers: { ...baseHeaders(), ...state.extraHeaders },
            body: state.body,
          });
          if (resp.status === 204) return { data: null, error: null };
          if (!resp.ok) {
            const errText = await resp.text();
            console.error(`Supabase Error [${state.table}]:`, errText);
            let errJSON = {};
            try { errJSON = JSON.parse(errText); } catch (e) { }
            return { data: null, error: { message: errJSON.message || errJSON.hint || `HTTP ${resp.status}: ${errText}` } };
          }
          const data = await resp.json();
          if (state.single || state.maybeSingle) return { data: Array.isArray(data) ? data[0] || null : data, error: null };
          return { data, error: null };
        } catch (e) {
          console.error(`Fetch Error [${state.table}]:`, e);
          return { data: null, error: { message: e.message } };
        }
      },
    };
    return b;
  };

  return { auth, from };
})();

export default supabase;
