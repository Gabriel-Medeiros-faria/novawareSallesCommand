/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║               SALES COMMAND — Supabase Auth Edition             ║
 * ║  Autenticação real · RLS por role · Dados do banco ao vivo      ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * SETUP DO BANCO — Execute este SQL no Supabase SQL Editor:
 * (cole em: https://supabase.com/dashboard/project/hribnuztzuurqeslfvbp/sql)
 *
 * -- 1. Tabela de perfis (espelha auth.users)
 * create table public.profiles (
 *   id uuid references auth.users(id) on delete cascade primary key,
 *   name text not null,
 *   email text not null,
 *   role text not null check (role in ('admin','sdr','closer')),
 *   created_at timestamptz default now()
 * );
 * alter table public.profiles enable row level security;
 * create policy "profiles_own" on public.profiles
 *   for select using (auth.uid() = id);
 * create policy "profiles_admin" on public.profiles
 *   for select using (
 *     exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
 *   );
 *
 * -- 2. Tabela leads
 * create table public.leads (
 *   id uuid default gen_random_uuid() primary key,
 *   nome_lead text not null,
 *   empresa text not null,
 *   telefone text,
 *   email text,
 *   origem_lead text default 'Nao informado',
 *   temperatura text default 'Morno',
 *   qualidade text default 'Media',
 *   observacoes text,
 *   sdr_id uuid references public.profiles(id),
 *   closer_id uuid references public.profiles(id),
 *   status text default 'Novo Lead',
 *   deal_value numeric default 0,
 *   meeting_date date,
 *   last_interaction date default current_date,
 *   created_at timestamptz default now()
 * );
 * alter table public.leads enable row level security;
 * create policy "leads_access" on public.leads
 *   for all using (
 *     sdr_id = auth.uid() or closer_id = auth.uid() or
 *     exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
 *   );
 *
 * -- 3. Tabela lead_activities
 * create table public.lead_activities (
 *   id uuid default gen_random_uuid() primary key,
 *   lead_id uuid references public.leads(id) on delete cascade,
 *   type text not null,
 *   description text not null,
 *   created_by uuid references public.profiles(id),
 *   created_at timestamptz default now()
 * );
 * alter table public.lead_activities enable row level security;
 * create policy "activities_access" on public.lead_activities
 *   for all using (
 *     exists (
 *       select 1 from public.leads l where l.id = lead_id and (
 *         l.sdr_id = auth.uid() or l.closer_id = auth.uid() or
 *         exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
 *       )
 *     )
 *   );
 *
 * -- 4. Tabela goals
 * create table public.goals (
 *   id uuid default gen_random_uuid() primary key,
 *   user_id uuid references public.profiles(id),
 *   type text not null,
 *   target numeric not null,
 *   current numeric default 0,
 *   month text not null,
 *   created_at timestamptz default now()
 * );
 * alter table public.goals enable row level security;
 * create policy "goals_access" on public.goals
 *   for select using (
 *     user_id = auth.uid() or
 *     exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
 *   );
 * create policy "goals_insert_admin" on public.goals
 *   for insert with check (
 *     exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
 *   );
 *
 * -- 5. Trigger: criar perfil ao registrar usuario
 * create or replace function public.handle_new_user()
 * returns trigger language plpgsql security definer as $$
 * begin
 *   insert into public.profiles (id, name, email, role)
 *   values (
 *     new.id,
 *     coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
 *     new.email,
 *     coalesce(new.raw_user_meta_data->>'role', 'sdr')
 *   );
 *   return new;
 * end;
 * $$;
 * drop trigger if exists on_auth_user_created on auth.users;
 * create trigger on_auth_user_created
 *   after insert on auth.users
 *   for each row execute procedure public.handle_new_user();
 */

import { useState, useEffect, useCallback, createContext, useContext } from "react";

// ─── SUPABASE INLINE CLIENT ───────────────────────────────────────────────────
const SUPABASE_URL = "https://hribnuztzuurqeslfvbp.supabase.co";
// ⚠️ SUBSTITUA pela anon key do novo projeto (Settings > API > anon public)
const SUPABASE_ANON = "COLE_AQUI_A_NOVA_ANON_KEY";

const supabase = (() => {
  let _token = null;
  const _listeners = [];

  const baseHeaders = () => ({
    "Content-Type": "application/json",
    "apikey": SUPABASE_ANON,
    "Authorization": `Bearer ${_token || SUPABASE_ANON}`,
  });

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
        // Refresh token if needed (simple expiry check)
        const payload = JSON.parse(atob(s.access_token.split(".")[1]));
        if (payload.exp * 1000 < Date.now()) {
          localStorage.removeItem("sc_sess");
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
      const tok = _token;
      localStorage.removeItem("sc_sess");
      auth._emit("SIGNED_OUT", null);
      if (tok) await fetch(`${SUPABASE_URL}/auth/v1/logout`, { method: "POST", headers: baseHeaders() }).catch(() => {});
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
            const err = await resp.json().catch(() => ({}));
            return { data: null, error: { message: err.message || err.hint || `HTTP ${resp.status}` } };
          }
          const data = await resp.json();
          if (state.single || state.maybeSingle) return { data: Array.isArray(data) ? data[0] || null : data, error: null };
          return { data, error: null };
        } catch (e) { return { data: null, error: { message: e.message } }; }
      },
    };
    return b;
  };

  return { auth, from };
})();

// ─── AUTH CONTEXT ─────────────────────────────────────────────────────────────
const AuthCtx = createContext(null);
const useAuth = () => useContext(AuthCtx);

function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (data) setProfile(data);
    return data;
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user?.id) loadProfile(session.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      if (session?.user?.id) await loadProfile(session.user.id);
      else { setProfile(null); setLoading(false); }
    });
    return () => subscription.unsubscribe();
  }, [loadProfile]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  };

  return <AuthCtx.Provider value={{ session, profile, loading, signOut }}>{children}</AuthCtx.Provider>;
}

// ─── CONSTANTS & HELPERS ──────────────────────────────────────────────────────
const SDR_STAGES = ["Novo Lead","Tentativa de Contato","Qualificado","Follow-up","Reunião Agendada"];
const CLOSER_STAGES = ["Reunião Agendada","Reunião Realizada","Proposta Enviada","Negociação","Fechado - Ganho","Fechado - Perdido"];
const ALL_STAGES = [...SDR_STAGES,...CLOSER_STAGES.filter(s=>!SDR_STAGES.includes(s))];

const tempColor = t => t==="Quente"?"#ef4444":t==="Morno"?"#f59e0b":"#3b82f6";
const tempBg = t => t==="Quente"?"rgba(239,68,68,0.14)":t==="Morno"?"rgba(245,158,11,0.14)":"rgba(59,130,246,0.14)";
const stageColor = s => ({"Novo Lead":"#6366f1","Tentativa de Contato":"#8b5cf6","Qualificado":"#06b6d4","Follow-up":"#f59e0b","Reunião Agendada":"#10b981","Reunião Realizada":"#14b8a6","Proposta Enviada":"#3b82f6","Negociação":"#f97316","Fechado - Ganho":"#22c55e","Fechado - Perdido":"#ef4444"})[s]||"#6b7280";
const fmt = v => new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:0}).format(v||0);
const daysSince = d => { if(!d) return 99; return Math.floor((new Date()-new Date(d))/86400000); };
const goalLabel = t => ({leads_contatados:"Leads Contatados",leads_qualificados:"Leads Qualificados",reunioes_agendadas:"Reuniões Agendadas",reunioes_realizadas:"Reuniões Realizadas",contratos_fechados:"Contratos Fechados",valor_vendido:"Valor Vendido"})[t]||t;
const actIcon = t => ({email:"✉",call:"📞",meeting:"📅",meeting_scheduled:"📅",note:"📝"})[t]||"📝";

// ─── UI ATOMS ─────────────────────────────────────────────────────────────────
function Spinner({ size=24, color="#6366f1" }) {
  return <div style={{width:size,height:size,border:"2px solid rgba(255,255,255,0.08)",borderTopColor:color,borderRadius:"50%",animation:"spin 0.65s linear infinite",flexShrink:0}}/>;
}

function Avatar({ name="?", size=32 }) {
  const init = name.split(" ").slice(0,2).map(n=>n[0]).join("").toUpperCase();
  const colors = ["#6366f1","#8b5cf6","#06b6d4","#10b981","#f59e0b","#ef4444","#ec4899"];
  const bg = colors[(name.charCodeAt(0)||0)%colors.length];
  return <div style={{width:size,height:size,borderRadius:"50%",background:bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.37,fontWeight:700,color:"#fff",flexShrink:0}}>{init}</div>;
}

function Badge({ children, color, bg }) {
  return <span style={{display:"inline-flex",alignItems:"center",padding:"2px 8px",borderRadius:99,fontSize:11,fontWeight:600,color,background:bg,letterSpacing:"0.02em",whiteSpace:"nowrap"}}>{children}</span>;
}

function RoleBadge({ role }) {
  const m = {admin:["#fbbf24","rgba(251,191,36,0.14)","Admin"],sdr:["#818cf8","rgba(129,140,248,0.14)","SDR"],closer:["#34d399","rgba(52,211,153,0.14)","Closer"]};
  const [c,bg,l] = m[role]||["#64748b","rgba(100,116,139,0.14)",role];
  return <Badge color={c} bg={bg}>{l}</Badge>;
}

function ProgressBar({ value, max, color="#6366f1" }) {
  const pct = Math.min(100,max>0?Math.round((value/max)*100):0);
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
        <span style={{fontSize:11,color:"#475569"}}>{value} / {max}</span>
        <span style={{fontSize:11,fontWeight:700,color:"#e2e8f0"}}>{pct}%</span>
      </div>
      <div style={{height:5,background:"rgba(255,255,255,0.06)",borderRadius:99,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${pct}%`,background:color,borderRadius:99,transition:"width 0.7s ease"}}/>
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon, color="#6366f1", sub }) {
  return (
    <div style={{background:"rgba(255,255,255,0.025)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,padding:"16px 18px",position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",top:0,right:0,width:60,height:60,background:color,opacity:0.07,borderRadius:"0 0 0 60px"}}/>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}>
        <span style={{fontSize:12,color:"#334155",fontWeight:500}}>{label}</span>
        <span style={{fontSize:17}}>{icon}</span>
      </div>
      <div style={{fontSize:24,fontWeight:800,color:"#f1f5f9",letterSpacing:"-0.03em"}}>{value}</div>
      {sub&&<div style={{fontSize:11,color:"#1e293b",marginTop:3}}>{sub}</div>}
    </div>
  );
}

const INP = { background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.09)", color:"#e2e8f0", borderRadius:8, padding:"8px 11px", fontSize:13, outline:"none", fontFamily:"inherit", width:"100%", boxSizing:"border-box" };

// ─── DATA HOOKS ───────────────────────────────────────────────────────────────
function useLeads(profile) {
  const [leads, setLeads] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    const { data } = await supabase.from("profiles").select("id,name,email,role").order("name");
    if (data) setAllUsers(data);
  }, []);

  const fetchLeads = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const { data } = await supabase.from("leads").select("*").order("created_at",{ascending:false});
    if (data) setLeads(data);
    setLoading(false);
  }, [profile]);

  useEffect(() => { if (profile) { fetchUsers(); fetchLeads(); } }, [profile, fetchUsers, fetchLeads]);

  const updateLead = useCallback(async (id, updates) => {
    const payload = { ...updates, last_interaction: new Date().toISOString().split("T")[0] };
    const { error } = await supabase.from("leads").update(payload).eq("id", id);
    if (!error) setLeads(prev => prev.map(l => l.id===id ? {...l,...payload} : l));
    return { error };
  }, []);

  const createLead = useCallback(async (payload) => {
    const { data, error } = await supabase.from("leads").insert([payload]).select().single();
    if (data) setLeads(prev => [data,...prev]);
    return { data, error };
  }, []);

  return { leads, allUsers, loading, updateLead, createLead, refreshLeads: fetchLeads };
}

function useActivities(leadId) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!leadId) return;
    setLoading(true);
    supabase.from("lead_activities").select("id,type,description,created_at,created_by,profiles(name)")
      .eq("lead_id", leadId).order("created_at",{ascending:false})
      .then(({ data }) => { if (data) setActivities(data); setLoading(false); });
  }, [leadId]);

  const addActivity = async (type, description, createdBy) => {
    const { data } = await supabase.from("lead_activities")
      .insert([{ lead_id:leadId, type, description, created_by:createdBy }])
      .select("id,type,description,created_at,created_by,profiles(name)").single();
    if (data) setActivities(prev => [data,...prev]);
  };

  return { activities, loading, addActivity };
}

function useGoals(profile) {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    supabase.from("goals").select("*").order("created_at",{ascending:false})
      .then(({ data }) => { if (data) setGoals(data); setLoading(false); });
  }, [profile]);

  const createGoal = async (payload) => {
    const { data, error } = await supabase.from("goals").insert([payload]).select().single();
    if (data) setGoals(prev => [...prev, data]);
    return { data, error };
  };

  return { goals, loading, createGoal };
}

// ─── LOGIN PAGE (somente login — signup bloqueado) ────────────────────────────
function LoginPage() {
  const [form, setForm] = useState({ email:"", password:"" });
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");
  const set = k => e => setForm(p=>({...p,[k]:e.target.value}));

  const handleSubmit = async () => {
    setError("");
    if (!form.email||!form.password) { setError("Preencha email e senha."); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email:form.email, password:form.password });
    if (error) setError(error.message === "Invalid login credentials" ? "Email ou senha incorretos." : error.message);
    setLoading(false);
  };

  return (
    <div style={{minHeight:"100vh",background:"#030712",display:"flex",alignItems:"center",justifyContent:"center",padding:20,fontFamily:"'Sora','DM Sans',system-ui,sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fade{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        input:focus{border-color:rgba(99,102,241,0.55)!important}
      `}</style>

      {/* Glows de fundo */}
      <div style={{position:"fixed",top:"15%",left:"25%",width:500,height:500,background:"radial-gradient(circle,rgba(99,102,241,0.1) 0%,transparent 70%)",pointerEvents:"none"}}/>
      <div style={{position:"fixed",bottom:"10%",right:"20%",width:350,height:350,background:"radial-gradient(circle,rgba(139,92,246,0.08) 0%,transparent 70%)",pointerEvents:"none"}}/>

      <div style={{width:"100%",maxWidth:390,animation:"fade 0.4s ease"}}>
        {/* Logo */}
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{display:"inline-flex",width:52,height:52,borderRadius:16,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",alignItems:"center",justifyContent:"center",fontSize:23,marginBottom:12,boxShadow:"0 8px 30px rgba(99,102,241,0.3)"}}>⚡</div>
          <h1 style={{fontSize:22,fontWeight:800,color:"#f1f5f9",margin:"0 0 5px",letterSpacing:"-0.02em"}}>Sales Command</h1>
          <p style={{fontSize:13,color:"#334155",margin:0}}>Acesso restrito a colaboradores</p>
        </div>

        {/* Card de login */}
        <div style={{background:"rgba(255,255,255,0.028)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:18,padding:"26px 24px"}}>
          <p style={{fontSize:12,fontWeight:700,color:"#334155",margin:"0 0 18px",textTransform:"uppercase",letterSpacing:"0.05em"}}>Entrar na plataforma</p>

          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div>
              <label style={{display:"block",fontSize:11,color:"#475569",marginBottom:4,fontWeight:600}}>Email</label>
              <input type="email" value={form.email} onChange={set("email")} placeholder="seu@email.com"
                onKeyDown={e=>e.key==="Enter"&&handleSubmit()} style={INP}/>
            </div>
            <div>
              <label style={{display:"block",fontSize:11,color:"#475569",marginBottom:4,fontWeight:600}}>Senha</label>
              <input type="password" value={form.password} onChange={set("password")} placeholder="••••••••"
                onKeyDown={e=>e.key==="Enter"&&handleSubmit()} style={INP}/>
            </div>

            {error&&(
              <div style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.18)",borderRadius:9,padding:"9px 12px",fontSize:12,color:"#fca5a5",display:"flex",gap:6,alignItems:"center"}}>
                <span>⚠</span>{error}
              </div>
            )}

            <button onClick={handleSubmit} disabled={loading}
              style={{background:"linear-gradient(135deg,#6366f1,#8b5cf6)",border:"none",color:"#fff",borderRadius:11,padding:"12px",cursor:loading?"not-allowed":"pointer",fontSize:13,fontWeight:700,marginTop:4,display:"flex",alignItems:"center",justifyContent:"center",gap:8,opacity:loading?0.7:1,fontFamily:"inherit",boxShadow:"0 4px 14px rgba(99,102,241,0.28)"}}>
              {loading&&<Spinner size={15} color="#fff"/>}
              {loading?"Autenticando...":"Entrar"}
            </button>
          </div>
        </div>

        {/* Credenciais de demo */}
        <div style={{marginTop:14,background:"rgba(255,255,255,0.018)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:11,padding:"11px 14px"}}>
          <p style={{fontSize:10,color:"#1e293b",margin:"0 0 7px",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em"}}>Contas de demonstração (seeds)</p>
          {[
            {r:"Admin",   color:"#fbbf24", e:"admin@salescommand.com.br",          p:"Admin@2025!"},
            {r:"SDR",     color:"#818cf8", e:"ana.pereira@salescommand.com.br",    p:"Sdr@2025!"},
            {r:"Closer",  color:"#34d399", e:"diana.lima@salescommand.com.br",     p:"Closer@2025!"},
          ].map(u=>(
            <button key={u.r} onClick={()=>setForm({email:u.e,password:u.p})}
              style={{display:"flex",alignItems:"center",gap:6,width:"100%",textAlign:"left",background:"transparent",border:"none",color:"#334155",fontSize:11,cursor:"pointer",padding:"3px 0",fontFamily:"inherit",lineHeight:1.8}}>
              <RoleBadge role={u.r.toLowerCase()}/>
              <span style={{color:"#475569"}}>{u.e}</span>
            </button>
          ))}
          <p style={{fontSize:10,color:"#1e293b",margin:"8px 0 0",fontStyle:"italic"}}>
            Novos usuários só podem ser criados pelo Admin dentro da plataforma.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── KANBAN ───────────────────────────────────────────────────────────────────
function LeadCard({ lead, onOpen, allUsers }) {
  const sdr = allUsers.find(u=>u.id===lead.sdr_id);
  const closer = allUsers.find(u=>u.id===lead.closer_id);
  const days = daysSince(lead.last_interaction);

  return (
    <div draggable onDragStart={e=>e.dataTransfer.setData("leadId",lead.id)} onClick={()=>onOpen(lead)}
      style={{background:"rgba(8,15,30,0.9)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:11,padding:"11px 12px",cursor:"grab",marginBottom:7,userSelect:"none"}}
      onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(99,102,241,0.35)";e.currentTarget.style.transform="translateY(-1px)"}}
      onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.07)";e.currentTarget.style.transform="translateY(0)"}}
    >
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:5}}>
        <div>
          <div style={{fontWeight:700,fontSize:12,color:"#e2e8f0",marginBottom:1}}>{lead.nome_lead}</div>
          <div style={{fontSize:11,color:"#334155"}}>{lead.empresa}</div>
        </div>
        <Badge color={tempColor(lead.temperatura)} bg={tempBg(lead.temperatura)}>{lead.temperatura}</Badge>
      </div>
      {lead.deal_value>0&&<div style={{fontSize:12,fontWeight:700,color:"#10b981",marginBottom:5}}>{fmt(lead.deal_value)}</div>}
      {lead.observacoes&&<div style={{fontSize:11,color:"#1e293b",marginBottom:6,lineHeight:1.4,borderLeft:"2px solid rgba(255,255,255,0.07)",paddingLeft:6}}>{lead.observacoes.slice(0,60)}{lead.observacoes.length>60?"…":""}</div>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex",gap:3}}>{sdr&&<Avatar name={sdr.name} size={17}/>}{closer&&<Avatar name={closer.name} size={17}/>}</div>
        <span style={{fontSize:10,color:days>3?"#ef4444":"#1e293b"}}>{days===0?"Hoje":`${days}d`}</span>
      </div>
    </div>
  );
}

function KanbanCol({ stage, leads, onOpen, onDrop, allUsers }) {
  const [over, setOver] = useState(false);
  const total = leads.reduce((s,l)=>s+(l.deal_value||0),0);
  return (
    <div onDrop={e=>{e.preventDefault();onDrop(e.dataTransfer.getData("leadId"),stage);setOver(false);}} onDragOver={e=>{e.preventDefault();setOver(true);}} onDragLeave={()=>setOver(false)}
      style={{minWidth:220,maxWidth:240,flexShrink:0,background:over?"rgba(99,102,241,0.05)":"rgba(255,255,255,0.018)",border:`1px solid ${over?"rgba(99,102,241,0.28)":"rgba(255,255,255,0.04)"}`,borderRadius:13,padding:9,transition:"all 0.15s",display:"flex",flexDirection:"column",maxHeight:"calc(100vh - 200px)"}}
    >
      <div style={{marginBottom:8}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:2}}>
          <div style={{display:"flex",alignItems:"center",gap:5}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:stageColor(stage)}}/>
            <span style={{fontSize:11,fontWeight:700,color:"#475569"}}>{stage}</span>
          </div>
          <span style={{fontSize:10,background:"rgba(255,255,255,0.06)",borderRadius:99,padding:"1px 6px",color:"#334155"}}>{leads.length}</span>
        </div>
        {total>0&&<div style={{fontSize:10,color:"#1e293b",paddingLeft:11}}>{fmt(total)}</div>}
      </div>
      <div style={{overflowY:"auto",flex:1}}>
        {leads.map(l=><LeadCard key={l.id} lead={l} onOpen={onOpen} allUsers={allUsers}/>)}
        {leads.length===0&&<div style={{textAlign:"center",padding:"14px 0",fontSize:11,color:over?"#818cf8":"#111827"}}>{over?"Soltar aqui":"Vazio"}</div>}
      </div>
    </div>
  );
}

// ─── LEAD MODAL ───────────────────────────────────────────────────────────────
function LeadModal({ lead, onClose, onSave, profile, allUsers }) {
  const { activities, loading:actLoad, addActivity } = useActivities(lead.id);
  const [form, setForm] = useState({...lead});
  const [newAct, setNewAct] = useState("");
  const [actType, setActType] = useState("email");
  const [saving, setSaving] = useState(false);
  const set = k => e => setForm(p=>({...p,[k]:e.target.value}));
  const sdrs = allUsers.filter(u=>u.role==="sdr");
  const closers = allUsers.filter(u=>u.role==="closer");
  const canEdit = profile?.role==="admin" || profile?.id===lead.sdr_id || profile?.id===lead.closer_id;

  const handleSave = async () => {
    setSaving(true);
    await onSave(lead.id, { nome_lead:form.nome_lead, empresa:form.empresa, telefone:form.telefone, email:form.email, temperatura:form.temperatura, qualidade:form.qualidade, observacoes:form.observacoes, status:form.status, deal_value:Number(form.deal_value)||0, meeting_date:form.meeting_date||null, sdr_id:form.sdr_id||null, closer_id:form.closer_id||null });
    setSaving(false); onClose();
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",backdropFilter:"blur(10px)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:"#080e1d",border:"1px solid rgba(255,255,255,0.09)",borderRadius:18,width:"100%",maxWidth:640,maxHeight:"90vh",display:"flex",flexDirection:"column",overflow:"hidden"}}>
        {/* Header */}
        <div style={{padding:"18px 22px",borderBottom:"1px solid rgba(255,255,255,0.06)",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <h2 style={{fontSize:17,fontWeight:800,color:"#f1f5f9",margin:0}}>{lead.nome_lead}</h2>
              <Badge color={stageColor(lead.status)} bg={`${stageColor(lead.status)}18`}>{lead.status}</Badge>
            </div>
            <p style={{fontSize:12,color:"#334155",margin:"3px 0 0"}}>{lead.empresa}</p>
          </div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.06)",border:"none",color:"#475569",cursor:"pointer",borderRadius:8,width:30,height:30,fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>

        <div style={{flex:1,overflow:"auto",padding:"16px 22px",display:"flex",flexDirection:"column",gap:14}}>
          {/* Form */}
          {canEdit ? (
            <div style={{background:"rgba(255,255,255,0.02)",borderRadius:12,padding:14,display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {[["Nome","nome_lead","text"],["Empresa","empresa","text"],["Telefone","telefone","text"],["Email","email","email"],["Valor","deal_value","number"],["Reunião","meeting_date","date"]].map(([l,k,t])=>(
                <div key={k}><label style={{display:"block",fontSize:11,color:"#334155",marginBottom:3}}>{l}</label><input type={t} value={form[k]||""} onChange={set(k)} style={INP}/></div>
              ))}
              {[["Temperatura","temperatura",["Quente","Morno","Frio"]],["Qualidade","qualidade",["Alta","Média","Baixa"]],["Status","status",ALL_STAGES]].map(([l,k,opts])=>(
                <div key={k}><label style={{display:"block",fontSize:11,color:"#334155",marginBottom:3}}>{l}</label><select value={form[k]||""} onChange={set(k)} style={INP}>{opts.map(o=><option key={o}>{o}</option>)}</select></div>
              ))}
              {profile?.role==="admin"&&(
                <>
                  <div><label style={{display:"block",fontSize:11,color:"#334155",marginBottom:3}}>SDR</label><select value={form.sdr_id||""} onChange={set("sdr_id")} style={INP}><option value="">— Nenhum —</option>{sdrs.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                  <div><label style={{display:"block",fontSize:11,color:"#334155",marginBottom:3}}>Closer</label><select value={form.closer_id||""} onChange={set("closer_id")} style={INP}><option value="">— Nenhum —</option>{closers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                </>
              )}
              <div style={{gridColumn:"1/-1"}}><label style={{display:"block",fontSize:11,color:"#334155",marginBottom:3}}>Observações</label><textarea value={form.observacoes||""} onChange={set("observacoes")} rows={2} style={{...INP,resize:"vertical"}}/></div>
            </div>
          ) : (
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {[["Empresa",lead.empresa],["Telefone",lead.telefone||"—"],["Temperatura",lead.temperatura],["Valor",fmt(lead.deal_value)],["Última interação",lead.last_interaction||"—"],["Status",lead.status]].map(([k,v])=>(
                <div key={k} style={{background:"rgba(255,255,255,0.02)",borderRadius:9,padding:"9px 11px"}}>
                  <div style={{fontSize:10,color:"#1e293b",marginBottom:2,textTransform:"uppercase",letterSpacing:"0.04em"}}>{k}</div>
                  <div style={{fontSize:13,color:"#94a3b8",fontWeight:600}}>{v}</div>
                </div>
              ))}
            </div>
          )}

          {/* Activities */}
          <div>
            <div style={{fontSize:11,fontWeight:700,color:"#1e293b",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:9}}>Histórico de Atividades</div>
            {actLoad?<Spinner/>:activities.length===0?<div style={{fontSize:12,color:"#1e293b"}}>Nenhuma atividade ainda.</div>:(
              <div style={{display:"flex",flexDirection:"column",gap:7}}>
                {activities.map(a=>(
                  <div key={a.id} style={{display:"flex",gap:9}}>
                    <div style={{width:24,height:24,borderRadius:"50%",background:"rgba(255,255,255,0.04)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,flexShrink:0}}>{actIcon(a.type)}</div>
                    <div>
                      <div style={{fontSize:12,color:"#94a3b8"}}>{a.description}</div>
                      <div style={{fontSize:10,color:"#1e293b"}}>{a.profiles?.name||"—"} · {new Date(a.created_at).toLocaleString("pt-BR")}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div style={{marginTop:11,display:"flex",gap:7}}>
              <select value={actType} onChange={e=>setActType(e.target.value)} style={{...INP,width:"auto",flexShrink:0}}>
                <option value="email">✉ Email</option><option value="call">📞 Ligação</option><option value="meeting">📅 Reunião</option><option value="note">📝 Nota</option>
              </select>
              <input value={newAct} onChange={e=>setNewAct(e.target.value)} onKeyDown={e=>e.key==="Enter"&&newAct.trim()&&addActivity(actType,newAct.trim(),profile?.id).then(()=>setNewAct(""))} placeholder="Descrever atividade..." style={INP}/>
              <button onClick={()=>newAct.trim()&&addActivity(actType,newAct.trim(),profile?.id).then(()=>setNewAct(""))} style={{background:"#6366f1",border:"none",color:"#fff",borderRadius:8,padding:"7px 12px",cursor:"pointer",fontWeight:700,fontSize:13,flexShrink:0}}>+</button>
            </div>
          </div>
        </div>

        {canEdit&&(
          <div style={{padding:"13px 22px",borderTop:"1px solid rgba(255,255,255,0.06)",display:"flex",justifyContent:"flex-end",gap:8,flexShrink:0}}>
            <button onClick={onClose} style={{background:"rgba(255,255,255,0.05)",border:"none",color:"#475569",borderRadius:9,padding:"7px 15px",cursor:"pointer",fontSize:12,fontFamily:"inherit"}}>Cancelar</button>
            <button onClick={handleSave} disabled={saving} style={{background:"linear-gradient(135deg,#6366f1,#8b5cf6)",border:"none",color:"#fff",borderRadius:9,padding:"7px 17px",cursor:"pointer",fontSize:12,fontWeight:700,display:"flex",gap:6,alignItems:"center",fontFamily:"inherit"}}>
              {saving&&<Spinner size={13} color="#fff"/>}{saving?"Salvando...":"Salvar alterações"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── NEW LEAD MODAL ───────────────────────────────────────────────────────────
function NewLeadModal({ onClose, onCreate, profile, allUsers }) {
  const sdrs = allUsers.filter(u=>u.role==="sdr");
  const closers = allUsers.filter(u=>u.role==="closer");
  const [form, setForm] = useState({ nome_lead:"", empresa:"", telefone:"", email:"", origem_lead:"LinkedIn", temperatura:"Morno", qualidade:"Média", observacoes:"", sdr_id:profile?.role==="sdr"?profile.id:(sdrs[0]?.id||""), closer_id:"", deal_value:"" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const set = k => e => setForm(p=>({...p,[k]:e.target.value}));

  const handleCreate = async () => {
    if (!form.nome_lead||!form.empresa) { setError("Nome e empresa são obrigatórios."); return; }
    setLoading(true);
    const { error } = await onCreate({ ...form, deal_value:Number(form.deal_value)||0, sdr_id:form.sdr_id||null, closer_id:form.closer_id||null, status:"Novo Lead" });
    if (error) { setError(error.message); setLoading(false); } else onClose();
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",backdropFilter:"blur(10px)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:"#080e1d",border:"1px solid rgba(255,255,255,0.09)",borderRadius:18,width:"100%",maxWidth:510}}>
        <div style={{padding:"18px 22px",borderBottom:"1px solid rgba(255,255,255,0.06)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <h2 style={{fontSize:16,fontWeight:800,color:"#f1f5f9",margin:0}}>Novo Lead</h2>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.06)",border:"none",color:"#475569",cursor:"pointer",borderRadius:7,width:28,height:28,fontSize:13}}>✕</button>
        </div>
        <div style={{padding:"16px 22px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {[["Nome do Lead","nome_lead","text"],["Empresa","empresa","text"],["Telefone","telefone","text"],["Email","email","email"],["Valor","deal_value","number"]].map(([l,k,t])=>(
            <div key={k}><label style={{display:"block",fontSize:11,color:"#334155",marginBottom:3}}>{l}</label><input type={t} value={form[k]} onChange={set(k)} style={INP}/></div>
          ))}
          {[["Origem","origem_lead",["LinkedIn","Indicação","Site","Evento","Cold Outreach","Parceiro"]],["Temperatura","temperatura",["Quente","Morno","Frio"]],["Qualidade","qualidade",["Alta","Média","Baixa"]]].map(([l,k,opts])=>(
            <div key={k}><label style={{display:"block",fontSize:11,color:"#334155",marginBottom:3}}>{l}</label><select value={form[k]} onChange={set(k)} style={INP}>{opts.map(o=><option key={o}>{o}</option>)}</select></div>
          ))}
          {profile?.role==="admin"&&(
            <>
              <div><label style={{display:"block",fontSize:11,color:"#334155",marginBottom:3}}>SDR</label><select value={form.sdr_id} onChange={set("sdr_id")} style={INP}><option value="">— Nenhum —</option>{sdrs.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
              <div><label style={{display:"block",fontSize:11,color:"#334155",marginBottom:3}}>Closer</label><select value={form.closer_id} onChange={set("closer_id")} style={INP}><option value="">— Nenhum —</option>{closers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            </>
          )}
          <div style={{gridColumn:"1/-1"}}><label style={{display:"block",fontSize:11,color:"#334155",marginBottom:3}}>Observações</label><textarea value={form.observacoes} onChange={set("observacoes")} rows={2} style={{...INP,resize:"vertical"}}/></div>
          {error&&<div style={{gridColumn:"1/-1",background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.18)",borderRadius:8,padding:"8px 11px",fontSize:12,color:"#fca5a5"}}>{error}</div>}
        </div>
        <div style={{padding:"13px 22px",borderTop:"1px solid rgba(255,255,255,0.06)",display:"flex",justifyContent:"flex-end",gap:8}}>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.05)",border:"none",color:"#475569",borderRadius:9,padding:"7px 15px",cursor:"pointer",fontSize:12,fontFamily:"inherit"}}>Cancelar</button>
          <button onClick={handleCreate} disabled={loading} style={{background:"linear-gradient(135deg,#6366f1,#8b5cf6)",border:"none",color:"#fff",borderRadius:9,padding:"7px 17px",cursor:"pointer",fontSize:12,fontWeight:700,display:"flex",gap:6,alignItems:"center",fontFamily:"inherit"}}>
            {loading&&<Spinner size={13} color="#fff"/>}{loading?"Criando...":"Criar lead"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── PAGES ────────────────────────────────────────────────────────────────────
function DashboardPage({ leads, goals, profile, allUsers }) {
  const total = leads.length;
  const ganhos = leads.filter(l=>l.status==="Fechado - Ganho");
  const receita = ganhos.reduce((s,l)=>s+(l.deal_value||0),0);
  const pipeline = leads.filter(l=>!["Fechado - Ganho","Fechado - Perdido"].includes(l.status)).reduce((s,l)=>s+(l.deal_value||0),0);
  const taxa = total>0?((ganhos.length/total)*100).toFixed(1):0;

  const funnel = [
    {l:"Prospecção",c:leads.filter(l=>["Novo Lead","Tentativa de Contato"].includes(l.status)).length,color:"#6366f1"},
    {l:"Qualificados",c:leads.filter(l=>["Qualificado","Follow-up"].includes(l.status)).length,color:"#8b5cf6"},
    {l:"Reuniões",c:leads.filter(l=>["Reunião Agendada","Reunião Realizada"].includes(l.status)).length,color:"#06b6d4"},
    {l:"Negociação",c:leads.filter(l=>["Proposta Enviada","Negociação"].includes(l.status)).length,color:"#f59e0b"},
    {l:"Ganhos",c:ganhos.length,color:"#22c55e"},
  ];
  const maxF = Math.max(...funnel.map(d=>d.c),1);

  return (
    <div style={{paddingBottom:32}}>
      <div style={{marginBottom:20}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
          <div>
            <h1 style={{fontSize:21,fontWeight:800,color:"#f1f5f9",margin:"0 0 3px",letterSpacing:"-0.02em"}}>
              {profile?.role==="admin"?"Dashboard Geral":`Olá, ${profile?.name?.split(" ")[0]}`}
            </h1>
            <p style={{fontSize:12,color:"#1e293b",margin:0}}>
              {profile?.role==="admin"?"Visão completa da operação comercial":profile?.role==="sdr"?"Sua área de prospecção":"Suas negociações"}
            </p>
          </div>
          <RoleBadge role={profile?.role}/>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:9,marginBottom:18}}>
        <MetricCard label="Total Leads" value={total} icon="👥" color="#6366f1" sub={`${leads.filter(l=>l.status==="Novo Lead").length} novos`}/>
        <MetricCard label="Em Pipeline" value={leads.filter(l=>CLOSER_STAGES.includes(l.status)).length} icon="📅" color="#06b6d4"/>
        <MetricCard label="Ganhos" value={ganhos.length} icon="🏆" color="#22c55e" sub={`${leads.filter(l=>l.status==="Fechado - Perdido").length} perdidos`}/>
        <MetricCard label="Receita" value={fmt(receita)} icon="💰" color="#10b981"/>
        <MetricCard label="Pipeline" value={fmt(pipeline)} icon="📊" color="#f59e0b"/>
        <MetricCard label="Conversão" value={`${taxa}%`} icon="🎯" color="#8b5cf6"/>
      </div>

      <div style={{display:"grid",gridTemplateColumns:profile?.role==="admin"?"1fr 1fr":"1fr",gap:12}}>
        <div style={{background:"rgba(255,255,255,0.018)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:12,padding:16}}>
          <h3 style={{fontSize:11,fontWeight:700,color:"#1e293b",textTransform:"uppercase",letterSpacing:"0.06em",margin:"0 0 13px"}}>Funil de Vendas</h3>
          {funnel.map(d=>(
            <div key={d.l} style={{marginBottom:9}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{fontSize:12,color:"#475569"}}>{d.l}</span>
                <span style={{fontSize:12,fontWeight:700,color:d.color}}>{d.c}</span>
              </div>
              <div style={{height:6,background:"rgba(255,255,255,0.04)",borderRadius:99,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${(d.c/maxF)*100}%`,background:d.color,borderRadius:99,transition:"width 0.8s ease"}}/>
              </div>
            </div>
          ))}
        </div>

        {profile?.role==="admin"&&(
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {[{title:"SDRs",users:allUsers.filter(u=>u.role==="sdr"),getStats:u=>({a:`${leads.filter(l=>l.sdr_id===u.id).length} leads`,b:`${leads.filter(l=>l.sdr_id===u.id&&CLOSER_STAGES.includes(l.status)).length} para closer`})},
              {title:"Closers",users:allUsers.filter(u=>u.role==="closer"),getStats:u=>({a:`${leads.filter(l=>l.closer_id===u.id&&l.status==="Fechado - Ganho").length} ganhos`,b:fmt(leads.filter(l=>l.closer_id===u.id&&l.status==="Fechado - Ganho").reduce((s,l)=>s+(l.deal_value||0),0))})}
            ].map(g=>(
              <div key={g.title} style={{background:"rgba(255,255,255,0.018)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:12,padding:14,flex:1}}>
                <h3 style={{fontSize:11,fontWeight:700,color:"#1e293b",textTransform:"uppercase",letterSpacing:"0.06em",margin:"0 0 11px"}}>{g.title}</h3>
                {g.users.length===0?<div style={{fontSize:12,color:"#1e293b"}}>Nenhum cadastrado.</div>:g.users.map(u=>{
                  const s = g.getStats(u);
                  return <div key={u.id} style={{display:"flex",alignItems:"center",gap:9,marginBottom:9}}>
                    <Avatar name={u.name} size={26}/>
                    <div><div style={{fontSize:12,color:"#94a3b8"}}>{u.name}</div><div style={{display:"flex",gap:8,marginTop:2}}><span style={{fontSize:11,color:"#6366f1"}}>{s.a}</span><span style={{fontSize:11,color:"#22c55e"}}>{s.b}</span></div></div>
                  </div>;
                })}
              </div>
            ))}
          </div>
        )}

        {profile?.role!=="admin"&&(
          <div style={{background:"rgba(255,255,255,0.018)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:12,padding:14}}>
            <h3 style={{fontSize:11,fontWeight:700,color:"#1e293b",textTransform:"uppercase",letterSpacing:"0.06em",margin:"0 0 11px"}}>Leads Recentes</h3>
            {leads.slice(0,5).map(l=>(
              <div key={l.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,padding:"7px 9px",background:"rgba(0,0,0,0.2)",borderRadius:8}}>
                <div><div style={{fontSize:12,color:"#94a3b8",fontWeight:600}}>{l.nome_lead}</div><div style={{fontSize:11,color:"#1e293b"}}>{l.empresa}</div></div>
                <Badge color={stageColor(l.status)} bg={`${stageColor(l.status)}18`}>{l.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PipelinePage({ leads, updateLead, pipelineType, onOpen, allUsers }) {
  const stages = pipelineType==="sdr"?SDR_STAGES:CLOSER_STAGES;
  const visibleLeads = s => leads.filter(l=>l.status===s&&(pipelineType==="sdr"?SDR_STAGES:CLOSER_STAGES).includes(l.status));
  const handleDrop = async (id, stage) => { if (id) await updateLead(id, { status:stage }); };

  return (
    <div style={{paddingBottom:32}}>
      <div style={{marginBottom:16}}>
        <h1 style={{fontSize:21,fontWeight:800,color:"#f1f5f9",margin:"0 0 3px",letterSpacing:"-0.02em"}}>Pipeline {pipelineType==="sdr"?"SDR":"Closer"}</h1>
        <p style={{fontSize:12,color:"#1e293b",margin:0}}>{pipelineType==="sdr"?"Prospecção e qualificação de leads":"Negociações e fechamentos"}</p>
      </div>
      <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:8}}>
        {stages.map(stage=><KanbanCol key={stage} stage={stage} leads={visibleLeads(stage)} onOpen={onOpen} onDrop={handleDrop} allUsers={allUsers}/>)}
      </div>
    </div>
  );
}

function LeadsPage({ leads, onOpen, allUsers }) {
  const [search, setSearch] = useState("");
  const [fStatus, setFStatus] = useState("Todos");
  const [fTemp, setFTemp] = useState("Todos");
  const filtered = leads.filter(l=>{
    const ms=!search||l.nome_lead.toLowerCase().includes(search.toLowerCase())||l.empresa.toLowerCase().includes(search.toLowerCase());
    const mst=fStatus==="Todos"||l.status===fStatus;
    const mt=fTemp==="Todos"||l.temperatura===fTemp;
    return ms&&mst&&mt;
  });

  return (
    <div style={{paddingBottom:32}}>
      <div style={{marginBottom:16}}>
        <h1 style={{fontSize:21,fontWeight:800,color:"#f1f5f9",margin:"0 0 3px",letterSpacing:"-0.02em"}}>Todos os Leads</h1>
        <p style={{fontSize:12,color:"#1e293b",margin:0}}>{filtered.length} de {leads.length} leads</p>
      </div>
      <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Buscar por nome ou empresa..." style={{...INP,flex:1,minWidth:180}}/>
        <select value={fStatus} onChange={e=>setFStatus(e.target.value)} style={{...INP,width:"auto"}}>{["Todos",...ALL_STAGES].map(s=><option key={s}>{s}</option>)}</select>
        <select value={fTemp} onChange={e=>setFTemp(e.target.value)} style={{...INP,width:"auto"}}>{["Todos","Quente","Morno","Frio"].map(t=><option key={t}>{t}</option>)}</select>
      </div>
      <div style={{background:"rgba(255,255,255,0.015)",border:"1px solid rgba(255,255,255,0.05)",borderRadius:11,overflow:"hidden"}}>
        <div style={{display:"grid",gridTemplateColumns:"2fr 1.4fr 1fr 1fr 1.1fr",gap:8,padding:"7px 13px",borderBottom:"1px solid rgba(255,255,255,0.05)",fontSize:10,color:"#1e293b",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em"}}>
          <span>Lead / Empresa</span><span>Status</span><span>Temp.</span><span>Valor</span><span>Interação</span>
        </div>
        {filtered.length===0&&<div style={{padding:"22px",textAlign:"center",fontSize:12,color:"#1e293b"}}>Nenhum lead encontrado.</div>}
        {filtered.map((lead,i)=>(
          <div key={lead.id} onClick={()=>onOpen(lead)} style={{display:"grid",gridTemplateColumns:"2fr 1.4fr 1fr 1fr 1.1fr",gap:8,padding:"10px 13px",borderBottom:i<filtered.length-1?"1px solid rgba(255,255,255,0.03)":"none",cursor:"pointer",transition:"background 0.1s"}}
            onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.022)"}
            onMouseLeave={e=>e.currentTarget.style.background="transparent"}
          >
            <div><div style={{fontSize:12,fontWeight:600,color:"#cbd5e1"}}>{lead.nome_lead}</div><div style={{fontSize:11,color:"#1e293b"}}>{lead.empresa}</div></div>
            <div style={{display:"flex",alignItems:"center"}}><Badge color={stageColor(lead.status)} bg={`${stageColor(lead.status)}16`}>{lead.status}</Badge></div>
            <div style={{display:"flex",alignItems:"center"}}><Badge color={tempColor(lead.temperatura)} bg={tempBg(lead.temperatura)}>{lead.temperatura}</Badge></div>
            <div style={{fontSize:12,color:lead.deal_value?"#10b981":"#1e293b",fontWeight:600,display:"flex",alignItems:"center"}}>{lead.deal_value?fmt(lead.deal_value):"—"}</div>
            <div style={{fontSize:11,color:daysSince(lead.last_interaction)>3?"#ef4444":"#1e293b",display:"flex",alignItems:"center"}}>{lead.last_interaction||"—"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GoalsPage({ goals, createGoal, profile, allUsers }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newGoal, setNewGoal] = useState({ user_id:"", type:"leads_qualificados", target:"", month:new Date().toLocaleDateString("pt-BR",{month:"long",year:"numeric"}) });
  const [saving, setSaving] = useState(false);
  const visibleUsers = profile?.role==="admin" ? allUsers.filter(u=>u.role!=="admin") : [profile].filter(Boolean);

  const handleAdd = async () => {
    if (!newGoal.target||!newGoal.user_id) return;
    setSaving(true);
    await createGoal({ ...newGoal, target:Number(newGoal.target), current:0 });
    setSaving(false); setShowAdd(false);
    setNewGoal(p=>({...p,user_id:"",target:""}));
  };

  return (
    <div style={{paddingBottom:32}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div>
          <h1 style={{fontSize:21,fontWeight:800,color:"#f1f5f9",margin:"0 0 3px",letterSpacing:"-0.02em"}}>Metas</h1>
          <p style={{fontSize:12,color:"#1e293b",margin:0}}>Acompanhamento mensal</p>
        </div>
        {profile?.role==="admin"&&<button onClick={()=>setShowAdd(true)} style={{background:"linear-gradient(135deg,#6366f1,#8b5cf6)",border:"none",color:"#fff",borderRadius:11,padding:"8px 15px",cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:"inherit"}}>+ Nova Meta</button>}
      </div>

      {visibleUsers.length===0&&<div style={{background:"rgba(255,255,255,0.018)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:12,padding:20,textAlign:"center",fontSize:13,color:"#1e293b"}}>Nenhum usuário encontrado.</div>}

      {visibleUsers.map(user=>{
        const userGoals = goals.filter(g=>g.user_id===user.id);
        return (
          <div key={user.id} style={{background:"rgba(255,255,255,0.018)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:12,padding:16,marginBottom:12}}>
            <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:13}}>
              <Avatar name={user.name||"?"} size={32}/>
              <div>
                <div style={{fontWeight:700,fontSize:13,color:"#e2e8f0"}}>{user.name}</div>
                <div style={{display:"flex",gap:5,marginTop:2}}><RoleBadge role={user.role}/>{userGoals[0]&&<span style={{fontSize:11,color:"#1e293b"}}>{userGoals[0].month}</span>}</div>
              </div>
            </div>
            {userGoals.length===0?(
              <div style={{fontSize:12,color:"#1e293b",textAlign:"center",padding:"8px 0"}}>Sem metas definidas {profile?.role==="admin"?"para este usuário.":"ainda."}</div>
            ):(
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10}}>
                {userGoals.map(g=>{
                  const pct = Math.min(100,g.target>0?Math.round((g.current/g.target)*100):0);
                  const color = pct>=100?"#22c55e":pct>=60?"#f59e0b":"#6366f1";
                  return (
                    <div key={g.id} style={{background:"rgba(0,0,0,0.22)",borderRadius:11,padding:"12px 14px"}}>
                      <div style={{fontSize:11,color:"#334155",marginBottom:7}}>{goalLabel(g.type)}</div>
                      <div style={{fontSize:20,fontWeight:800,color:"#f1f5f9",marginBottom:7}}>{g.type==="valor_vendido"?fmt(g.current):g.current}</div>
                      <ProgressBar value={g.current} max={g.target} color={color}/>
                      <div style={{marginTop:4,fontSize:11,color}}>{pct}% da meta</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {showAdd&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",backdropFilter:"blur(10px)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={e=>e.target===e.currentTarget&&setShowAdd(false)}>
          <div style={{background:"#080e1d",border:"1px solid rgba(255,255,255,0.09)",borderRadius:16,width:390,padding:22}}>
            <h2 style={{fontSize:16,fontWeight:800,color:"#f1f5f9",marginTop:0,marginBottom:16}}>Nova Meta</h2>
            <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:16}}>
              {[["Colaborador","user_id","select",allUsers.filter(u=>u.role!=="admin").map(u=>({value:u.id,label:u.name}))],["Tipo","type","select",[{value:"leads_contatados",label:"Leads Contatados"},{value:"leads_qualificados",label:"Leads Qualificados"},{value:"reunioes_agendadas",label:"Reuniões Agendadas"},{value:"reunioes_realizadas",label:"Reuniões Realizadas"},{value:"contratos_fechados",label:"Contratos Fechados"},{value:"valor_vendido",label:"Valor Vendido"}]],["Meta","target","number",null],["Mês","month","text",null]].map(([l,k,t,opts])=>(
                <div key={k}>
                  <label style={{display:"block",fontSize:11,color:"#334155",marginBottom:3}}>{l}</label>
                  {t==="select"?(
                    <select value={newGoal[k]} onChange={e=>setNewGoal(p=>({...p,[k]:e.target.value}))} style={INP}><option value="">Selecionar...</option>{opts.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>
                  ):(
                    <input type={t} value={newGoal[k]} onChange={e=>setNewGoal(p=>({...p,[k]:e.target.value}))} style={INP}/>
                  )}
                </div>
              ))}
            </div>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
              <button onClick={()=>setShowAdd(false)} style={{background:"rgba(255,255,255,0.05)",border:"none",color:"#475569",borderRadius:9,padding:"7px 14px",cursor:"pointer",fontSize:12,fontFamily:"inherit"}}>Cancelar</button>
              <button onClick={handleAdd} disabled={saving} style={{background:"linear-gradient(135deg,#6366f1,#8b5cf6)",border:"none",color:"#fff",borderRadius:9,padding:"7px 14px",cursor:"pointer",fontSize:12,fontWeight:700,display:"flex",gap:5,alignItems:"center",fontFamily:"inherit"}}>
                {saving&&<Spinner size={12} color="#fff"/>}{saving?"Salvando...":"Criar Meta"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── USERS PAGE (exclusivo admin) ────────────────────────────────────────────
function UsersPage({ allUsers, onUserCreated }) {
  const [showAdd, setShowAdd]   = useState(false);
  const [form, setForm]         = useState({ name:"", email:"", password:"", role:"sdr" });
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState("");
  const set = k => e => setForm(p=>({...p,[k]:e.target.value}));

  const handleCreate = async () => {
    setError(""); setSuccess("");
    if (!form.name||!form.email||!form.password) { setError("Preencha todos os campos."); return; }
    if (form.password.length < 8) { setError("A senha deve ter pelo menos 8 caracteres."); return; }
    setLoading(true);
    try {
      const session = JSON.parse(localStorage.getItem("sc_sess")||"{}");
      const token = session?.access_token || SUPABASE_ANON;
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/create_user_by_admin`, {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          "apikey":        SUPABASE_ANON,
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ p_email:form.email, p_password:form.password, p_name:form.name, p_role:form.role }),
      });
      const body = await res.json().catch(()=>({}));
      if (!res.ok) { setError(body.message||body.hint||`Erro ${res.status}`); setLoading(false); return; }
      setSuccess(`Usuário ${form.name} (${form.role.toUpperCase()}) criado com sucesso!`);
      setForm({ name:"", email:"", password:"", role:"sdr" });
      onUserCreated && onUserCreated();
      setTimeout(()=>{ setSuccess(""); setShowAdd(false); }, 3000);
    } catch(e) { setError(e.message); }
    setLoading(false);
  };

  const byRole = role => allUsers.filter(u=>u.role===role).sort((a,b)=>a.name.localeCompare(b.name));

  return (
    <div style={{paddingBottom:32}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
        <div>
          <h1 style={{fontSize:21,fontWeight:800,color:"#f1f5f9",margin:"0 0 3px",letterSpacing:"-0.02em"}}>Usuários</h1>
          <p style={{fontSize:12,color:"#1e293b",margin:0}}>Gerencie a equipe · {allUsers.length} colaboradores cadastrados</p>
        </div>
        <button onClick={()=>{setShowAdd(true);setError("");setSuccess("");}}
          style={{background:"linear-gradient(135deg,#6366f1,#8b5cf6)",border:"none",color:"#fff",borderRadius:11,padding:"9px 16px",cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:"inherit"}}>
          + Novo Usuário
        </button>
      </div>

      {success&&(
        <div style={{background:"rgba(34,197,94,0.1)",border:"1px solid rgba(34,197,94,0.18)",borderRadius:10,padding:"10px 14px",fontSize:13,color:"#86efac",marginBottom:16,display:"flex",gap:8,alignItems:"center"}}>
          <span>✓</span>{success}
        </div>
      )}

      {[
        {role:"admin",  title:"Administradores", icon:"⚡", desc:"Acesso total à plataforma"},
        {role:"sdr",    title:"SDRs",             icon:"📡", desc:"Prospecção e qualificação"},
        {role:"closer", title:"Closers",           icon:"🎯", desc:"Negociação e fechamento"},
      ].map(section => {
        const users = byRole(section.role);
        return (
          <div key={section.role} style={{background:"rgba(255,255,255,0.018)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:13,padding:16,marginBottom:12}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14,paddingBottom:12,borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
              <div style={{width:32,height:32,borderRadius:9,background:"rgba(99,102,241,0.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>{section.icon}</div>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:"#e2e8f0"}}>{section.title}</div>
                <div style={{fontSize:11,color:"#1e293b"}}>{section.desc}</div>
              </div>
              <span style={{marginLeft:"auto",fontSize:11,background:"rgba(255,255,255,0.06)",borderRadius:99,padding:"3px 9px",color:"#475569"}}>{users.length}</span>
            </div>
            {users.length===0 ? (
              <div style={{fontSize:12,color:"#1e293b",textAlign:"center",padding:"8px 0"}}>Nenhum cadastrado ainda.</div>
            ) : (
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(250px,1fr))",gap:9}}>
                {users.map(u=>(
                  <div key={u.id} style={{background:"rgba(0,0,0,0.2)",borderRadius:10,padding:"11px 13px",display:"flex",alignItems:"center",gap:10,border:"1px solid rgba(255,255,255,0.04)"}}>
                    <Avatar name={u.name} size={36}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:700,color:"#e2e8f0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.name}</div>
                      <div style={{fontSize:11,color:"#334155",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.email}</div>
                      <div style={{marginTop:4}}><RoleBadge role={u.role}/></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {showAdd&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",backdropFilter:"blur(10px)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
          onClick={e=>e.target===e.currentTarget&&setShowAdd(false)}>
          <div style={{background:"#080e1d",border:"1px solid rgba(255,255,255,0.1)",borderRadius:18,width:"100%",maxWidth:420}}>
            <div style={{padding:"18px 22px",borderBottom:"1px solid rgba(255,255,255,0.06)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <h2 style={{fontSize:16,fontWeight:800,color:"#f1f5f9",margin:0}}>Novo Colaborador</h2>
                <p style={{fontSize:11,color:"#334155",margin:"3px 0 0"}}>Acesso criado pelo administrador · email confirmado automaticamente</p>
              </div>
              <button onClick={()=>setShowAdd(false)} style={{background:"rgba(255,255,255,0.06)",border:"none",color:"#475569",cursor:"pointer",borderRadius:7,width:28,height:28,fontSize:13,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
            </div>

            <div style={{padding:"18px 22px",display:"flex",flexDirection:"column",gap:12}}>
              {[["Nome completo","name","text","Ex: João Alves"],["Email corporativo","email","email","joao@empresa.com"],["Senha inicial","password","password","Mínimo 8 caracteres"]].map(([label,key,type,ph])=>(
                <div key={key}>
                  <label style={{display:"block",fontSize:11,color:"#475569",marginBottom:4,fontWeight:600}}>{label}</label>
                  <input type={type} value={form[key]} onChange={set(key)} placeholder={ph} style={INP}/>
                </div>
              ))}

              <div>
                <label style={{display:"block",fontSize:11,color:"#475569",marginBottom:6,fontWeight:600}}>Função</label>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:7}}>
                  {[{value:"sdr",label:"SDR",icon:"📡",desc:"Prospecção"},{value:"closer",label:"Closer",icon:"🎯",desc:"Fechamento"},{value:"admin",label:"Admin",icon:"⚡",desc:"Gestão"}].map(opt=>(
                    <button key={opt.value} onClick={()=>setForm(p=>({...p,role:opt.value}))}
                      style={{padding:"10px 8px",borderRadius:9,border:`1px solid ${form.role===opt.value?"rgba(99,102,241,0.5)":"rgba(255,255,255,0.07)"}`,background:form.role===opt.value?"rgba(99,102,241,0.14)":"rgba(255,255,255,0.02)",cursor:"pointer",textAlign:"center",transition:"all 0.15s",fontFamily:"inherit"}}>
                      <div style={{fontSize:16,marginBottom:2}}>{opt.icon}</div>
                      <div style={{fontSize:11,fontWeight:700,color:form.role===opt.value?"#a5b4fc":"#475569"}}>{opt.label}</div>
                      <div style={{fontSize:10,color:"#1e293b"}}>{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {error&&<div style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.18)",borderRadius:9,padding:"9px 12px",fontSize:12,color:"#fca5a5",display:"flex",gap:6}}><span>⚠</span>{error}</div>}

              <div style={{background:"rgba(245,158,11,0.06)",border:"1px solid rgba(245,158,11,0.12)",borderRadius:9,padding:"8px 11px",fontSize:11,display:"flex",gap:6}}>
                <span style={{color:"#fbbf24",flexShrink:0}}>ℹ</span>
                <span style={{color:"#78716c"}}>Informe as credenciais ao colaborador manualmente. O email já é confirmado automaticamente.</span>
              </div>
            </div>

            <div style={{padding:"13px 22px",borderTop:"1px solid rgba(255,255,255,0.06)",display:"flex",justifyContent:"flex-end",gap:8}}>
              <button onClick={()=>setShowAdd(false)} style={{background:"rgba(255,255,255,0.05)",border:"none",color:"#475569",borderRadius:9,padding:"8px 16px",cursor:"pointer",fontSize:12,fontFamily:"inherit"}}>Cancelar</button>
              <button onClick={handleCreate} disabled={loading}
                style={{background:"linear-gradient(135deg,#6366f1,#8b5cf6)",border:"none",color:"#fff",borderRadius:9,padding:"8px 18px",cursor:loading?"not-allowed":"pointer",fontSize:12,fontWeight:700,display:"flex",gap:6,alignItems:"center",fontFamily:"inherit",opacity:loading?0.7:1}}>
                {loading&&<Spinner size={13} color="#fff"/>}
                {loading?"Criando...":"Criar Usuário"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


function CopilotPage({ leads }) {
  const [chat, setChat] = useState([{ role:"assistant", text:"Olá! Sou o Sales Copilot. Analisei sua pipeline e estou pronto para ajudar. Posso detectar leads paralisados, recomendar follow-ups e estimar probabilidades de fechamento." }]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);

  const insights = (() => {
    const r=[];
    leads.forEach(l=>{
      const d=daysSince(l.last_interaction);
      if(d>=4&&!["Fechado - Ganho","Fechado - Perdido"].includes(l.status)) r.push({lead:l,type:"stalled",msg:`Sem contato há ${d} dias. Recomenda-se follow-up.`,priority:d>7?"alta":"média"});
      if(l.status==="Negociação"&&l.deal_value>50000) r.push({lead:l,type:"high_value",msg:`Alto valor (${fmt(l.deal_value)}) em negociação.`,priority:"alta"});
      if(l.status==="Follow-up"&&l.temperatura==="Quente") r.push({lead:l,type:"hot",msg:"Lead quente aguardando follow-up. Alta chance de avanço.",priority:"alta"});
    });
    return r.slice(0,5);
  })();

  const send = (text) => {
    const q=text||input.trim(); if(!q) return;
    setInput(""); setChat(p=>[...p,{role:"user",text:q}]); setThinking(true);
    setTimeout(()=>{
      const ql=q.toLowerCase(); let resp="";
      if(ql.includes("urgente")||ql.includes("atenção")) {
        const st=leads.filter(l=>daysSince(l.last_interaction)>=4&&!["Fechado - Ganho","Fechado - Perdido"].includes(l.status));
        resp=`${st.length} lead(s) precisam de atenção:\n\n${st.map(l=>`• ${l.nome_lead} (${l.empresa}) — ${daysSince(l.last_interaction)} dias · ${l.status}`).join("\n")||"Nenhum ✓"}`;
      } else if(ql.includes("conversão")||ql.includes("taxa")) {
        const g=leads.filter(l=>l.status==="Fechado - Ganho").length;
        const t=leads.length>0?((g/leads.length)*100).toFixed(1):0;
        resp=`Taxa de conversão: ${t}% (${g} de ${leads.length} leads). Referência do setor: 15-25%.`;
      } else if(ql.includes("fechar")||ql.includes("probabilidade")||ql.includes("chance")) {
        const hot=leads.filter(l=>l.temperatura==="Quente"&&!["Fechado - Ganho","Fechado - Perdido"].includes(l.status));
        resp=`Top ${hot.length} leads quentes:\n\n${hot.slice(0,4).map(l=>`• ${l.nome_lead} — ${l.status} | ${l.deal_value>0?fmt(l.deal_value):"—"}`).join("\n")||"Nenhum lead quente ativo."}\n\nPotencial estimado: ${fmt(hot.reduce((s,l)=>s+(l.deal_value||0)*0.6,0))}`;
      } else if(ql.includes("risco")) {
        const risk=leads.filter(l=>daysSince(l.last_interaction)>7&&!["Fechado - Ganho","Fechado - Perdido"].includes(l.status));
        resp=`${risk.length} lead(s) em risco:\n\n${risk.map(l=>`• ${l.nome_lead} — ${daysSince(l.last_interaction)} dias sem contato`).join("\n")||"Nenhum em risco crítico ✓"}`;
      } else {
        resp=`Pipeline: ${leads.length} leads · ${leads.filter(l=>l.temperatura==="Quente").length} quentes · Potencial ${fmt(leads.filter(l=>!["Fechado - Ganho","Fechado - Perdido"].includes(l.status)).reduce((s,l)=>s+(l.deal_value||0),0))}.\n\nComo posso ajudar?`;
      }
      setChat(p=>[...p,{role:"assistant",text:resp}]); setThinking(false);
    }, 1000);
  };

  return (
    <div style={{paddingBottom:32}}>
      <div style={{marginBottom:16}}>
        <h1 style={{fontSize:21,fontWeight:800,color:"#f1f5f9",margin:"0 0 3px",letterSpacing:"-0.02em"}}>Sales Copilot ✦ AI</h1>
        <p style={{fontSize:12,color:"#1e293b",margin:0}}>Análise inteligente da sua pipeline</p>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 290px",gap:12}}>
        <div style={{background:"rgba(255,255,255,0.018)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:13,display:"flex",flexDirection:"column",height:490}}>
          <div style={{padding:"11px 14px",borderBottom:"1px solid rgba(255,255,255,0.05)",display:"flex",alignItems:"center",gap:7}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:"#22c55e",boxShadow:"0 0 5px #22c55e"}}/>
            <span style={{fontSize:12,fontWeight:700,color:"#334155"}}>Copilot Online</span>
          </div>
          <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:9}}>
            {chat.map((m,i)=>(
              <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
                <div style={{maxWidth:"82%",background:m.role==="user"?"linear-gradient(135deg,#6366f1,#8b5cf6)":"rgba(255,255,255,0.04)",borderRadius:m.role==="user"?"12px 12px 3px 12px":"12px 12px 12px 3px",padding:"9px 12px",fontSize:12,color:"#e2e8f0",lineHeight:1.65,whiteSpace:"pre-wrap"}}>{m.text}</div>
              </div>
            ))}
            {thinking&&<div style={{display:"flex"}}><div style={{background:"rgba(255,255,255,0.04)",borderRadius:"12px 12px 12px 3px",padding:"9px 13px",display:"flex",gap:4}}>{[0,1,2].map(i=><div key={i} style={{width:5,height:5,borderRadius:"50%",background:"#6366f1",animation:`pulse ${0.7+i*0.2}s ease-in-out infinite`}}/>)}</div></div>}
          </div>
          <div style={{padding:"9px 12px",borderTop:"1px solid rgba(255,255,255,0.05)"}}>
            <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:7}}>
              {["Leads urgentes?","Taxa de conversão?","Chance de fechar?","Leads em risco?"].map(q=>(
                <button key={q} onClick={()=>send(q)} style={{background:"rgba(99,102,241,0.1)",border:"1px solid rgba(99,102,241,0.2)",color:"#818cf8",borderRadius:99,padding:"3px 8px",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>{q}</button>
              ))}
            </div>
            <div style={{display:"flex",gap:6}}>
              <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Pergunte sobre sua pipeline..." style={INP}/>
              <button onClick={()=>send()} style={{background:"linear-gradient(135deg,#6366f1,#8b5cf6)",border:"none",color:"#fff",borderRadius:8,padding:"7px 12px",cursor:"pointer",fontSize:13,fontWeight:700,flexShrink:0}}>→</button>
            </div>
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:7}}>
          <div style={{fontSize:10,fontWeight:700,color:"#1e293b",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:2}}>Alertas Automáticos</div>
          {insights.length===0&&<div style={{background:"rgba(34,197,94,0.07)",border:"1px solid rgba(34,197,94,0.14)",borderRadius:10,padding:"11px 13px",fontSize:12,color:"#22c55e"}}>✓ Pipeline saudável!</div>}
          {insights.map((ins,i)=>(
            <div key={i} style={{background:"rgba(255,255,255,0.018)",border:`1px solid ${ins.priority==="alta"?"rgba(239,68,68,0.16)":"rgba(245,158,11,0.16)"}`,borderRadius:9,padding:"10px 11px"}}>
              <div style={{display:"flex",gap:7}}>
                <span style={{fontSize:14,flexShrink:0}}>{ins.type==="stalled"?"⏰":ins.type==="high_value"?"💎":"🔥"}</span>
                <div>
                  <div style={{fontSize:11,fontWeight:700,color:"#e2e8f0",marginBottom:2}}>{ins.lead.nome_lead}</div>
                  <div style={{fontSize:11,color:"#475569",lineHeight:1.5}}>{ins.msg}</div>
                  <div style={{marginTop:4}}><Badge color={ins.priority==="alta"?"#ef4444":"#f59e0b"} bg={ins.priority==="alta"?"rgba(239,68,68,0.13)":"rgba(245,158,11,0.13)"}>Prioridade {ins.priority}</Badge></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── APP SHELL ────────────────────────────────────────────────────────────────
function AppShell() {
  const { profile, signOut } = useAuth();
  const [page, setPage] = useState("dashboard");
  const [selectedLead, setSelectedLead] = useState(null);
  const [showNewLead, setShowNewLead] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { leads, allUsers, loading, updateLead, createLead, refreshLeads } = useLeads(profile);
  const { goals, createGoal } = useGoals(profile);

  const navItems = [
    { id:"dashboard",       label:"Dashboard",       icon:"◈" },
    ...(["admin","sdr"].includes(profile?.role)    ? [{ id:"sdr_pipeline",    label:"Pipeline SDR",    icon:"⟫" }] : []),
    ...(["admin","closer"].includes(profile?.role) ? [{ id:"closer_pipeline", label:"Pipeline Closer", icon:"⟫" }] : []),
    { id:"leads",   label:"Leads",      icon:"⊞" },
    { id:"goals",   label:"Metas",      icon:"◎" },
    { id:"copilot", label:"Copilot AI", icon:"✦", accent:true },
    ...(profile?.role==="admin" ? [{ id:"users", label:"Usuários", icon:"👥", divider:true }] : []),
  ];

  return (
    <div style={{display:"flex",height:"100vh",background:"#030712",fontFamily:"'Sora','DM Sans',system-ui,sans-serif",color:"#e2e8f0",overflow:"hidden"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:3px;height:3px}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.07);border-radius:99px}
        select option{background:#080e1d;color:#e2e8f0}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:0.3;transform:scale(0.8)}50%{opacity:1;transform:scale(1.2)}}
        input:focus,select:focus,textarea:focus{border-color:rgba(99,102,241,0.5)!important;outline:none}
      `}</style>

      {/* Sidebar */}
      <div style={{width:sidebarOpen?210:52,background:"rgba(255,255,255,0.015)",borderRight:"1px solid rgba(255,255,255,0.045)",display:"flex",flexDirection:"column",transition:"width 0.25s ease",flexShrink:0}}>
        <div style={{padding:sidebarOpen?"16px 14px 12px":"16px 9px 12px",borderBottom:"1px solid rgba(255,255,255,0.045)",display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:28,height:28,borderRadius:8,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0,boxShadow:"0 2px 10px rgba(99,102,241,0.25)"}}>⚡</div>
          {sidebarOpen&&<span style={{fontSize:13,fontWeight:800,color:"#f1f5f9",letterSpacing:"-0.02em",whiteSpace:"nowrap"}}>Sales Command</span>}
        </div>

        {sidebarOpen&&profile&&(
          <div style={{margin:"9px 10px 0",padding:"8px 10px",background:"rgba(99,102,241,0.07)",borderRadius:9,border:"1px solid rgba(99,102,241,0.1)"}}>
            <div style={{display:"flex",alignItems:"center",gap:7}}>
              <Avatar name={profile.name||"?"} size={24}/>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",lineHeight:1.2}}>{profile.name?.split(" ").slice(0,2).join(" ")}</div>
                <div style={{marginTop:2}}><RoleBadge role={profile.role}/></div>
              </div>
            </div>
          </div>
        )}

        <nav style={{flex:1,padding:"8px 5px"}}>
          {navItems.map(item=>{
            const active=page===item.id;
            return (
              <>
                {item.divider&&sidebarOpen&&<div style={{height:1,background:"rgba(255,255,255,0.05)",margin:"5px 4px 6px"}}/>}
                {item.divider&&!sidebarOpen&&<div style={{height:1,background:"rgba(255,255,255,0.05)",margin:"5px 2px 6px"}}/>}
                <button key={item.id} onClick={()=>setPage(item.id)} style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:sidebarOpen?"7px 9px":"7px",borderRadius:8,border:"none",background:active?"rgba(99,102,241,0.17)":"transparent",color:active?"#a5b4fc":item.accent?"#fbbf24":item.divider?"#64748b":"#1e293b",cursor:"pointer",marginBottom:1,transition:"all 0.12s",textAlign:"left",position:"relative",fontFamily:"inherit"}}>
                  {active&&<div style={{position:"absolute",left:0,top:"22%",height:"56%",width:2.5,background:"linear-gradient(180deg,#6366f1,#8b5cf6)",borderRadius:"0 3px 3px 0"}}/>}
                  <span style={{fontSize:12,flexShrink:0}}>{item.icon}</span>
                  {sidebarOpen&&<span style={{fontSize:12,fontWeight:active?700:500,whiteSpace:"nowrap"}}>{item.label}</span>}
                </button>
              </>
            );
          })}
        </nav>

        <div style={{padding:"7px 5px",borderTop:"1px solid rgba(255,255,255,0.045)"}}>
          <button onClick={signOut} style={{display:"flex",alignItems:"center",gap:7,width:"100%",padding:sidebarOpen?"6px 9px":"6px",borderRadius:8,border:"none",background:"transparent",color:"#1e293b",cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"}}
            onMouseEnter={e=>{e.currentTarget.style.color="#ef4444";e.currentTarget.style.background="rgba(239,68,68,0.07)"}}
            onMouseLeave={e=>{e.currentTarget.style.color="#1e293b";e.currentTarget.style.background="transparent"}}
          >
            <span style={{fontSize:12}}>⎋</span>{sidebarOpen&&<span style={{fontSize:11,fontWeight:500}}>Sair</span>}
          </button>
          <button onClick={()=>setSidebarOpen(p=>!p)} style={{display:"flex",alignItems:"center",justifyContent:"center",width:"100%",padding:"5px",borderRadius:7,border:"none",background:"transparent",color:"#111827",cursor:"pointer",fontSize:11,fontFamily:"inherit"}}>
            {sidebarOpen?"◀":"▶"}
          </button>
        </div>
      </div>

      {/* Main */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{height:50,borderBottom:"1px solid rgba(255,255,255,0.045)",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 20px",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:5}}>
            <span style={{fontSize:11,color:"#111827"}}>Sales Command</span>
            <span style={{color:"#111827",fontSize:11}}>›</span>
            <span style={{fontSize:11,color:"#334155",fontWeight:700}}>{navItems.find(n=>n.id===page)?.label}</span>
          </div>
          <div style={{display:"flex",gap:7,alignItems:"center"}}>
            {loading&&<Spinner size={15}/>}
            <button onClick={()=>setShowNewLead(true)} style={{background:"linear-gradient(135deg,#6366f1,#8b5cf6)",border:"none",color:"#fff",borderRadius:9,padding:"6px 12px",cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:"inherit",boxShadow:"0 2px 10px rgba(99,102,241,0.22)"}}>+ Novo Lead</button>
          </div>
        </div>

        <div style={{flex:1,overflowY:"auto",padding:"20px 22px",animation:"fade 0.22s ease"}}>
          {page==="dashboard"&&<DashboardPage leads={leads} goals={goals} profile={profile} allUsers={allUsers}/>}
          {page==="sdr_pipeline"&&<PipelinePage leads={leads} updateLead={updateLead} pipelineType="sdr" onOpen={setSelectedLead} allUsers={allUsers}/>}
          {page==="closer_pipeline"&&<PipelinePage leads={leads} updateLead={updateLead} pipelineType="closer" onOpen={setSelectedLead} allUsers={allUsers}/>}
          {page==="leads"&&<LeadsPage leads={leads} onOpen={setSelectedLead} allUsers={allUsers}/>}
          {page==="goals"&&<GoalsPage goals={goals} createGoal={createGoal} profile={profile} allUsers={allUsers}/>}
          {page==="copilot"&&<CopilotPage leads={leads} profile={profile}/>}
          {page==="users"&&profile?.role==="admin"&&<UsersPage allUsers={allUsers} onUserCreated={refreshLeads}/>}
        </div>
      </div>

      {selectedLead&&<LeadModal lead={selectedLead} onClose={()=>setSelectedLead(null)} onSave={async(id,u)=>{await updateLead(id,u);setSelectedLead(null);}} profile={profile} allUsers={allUsers}/>}
      {showNewLead&&<NewLeadModal onClose={()=>setShowNewLead(false)} onCreate={createLead} profile={profile} allUsers={allUsers}/>}
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
function AppContent() {
  const { session, loading } = useAuth();

  if (loading) return (
    <div style={{minHeight:"100vh",background:"#030712",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:14,fontFamily:"'Sora',system-ui,sans-serif"}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{width:34,height:34,borderRadius:10,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>⚡</div>
      <Spinner size={26}/>
      <span style={{fontSize:12,color:"#1e293b"}}>Carregando...</span>
    </div>
  );

  return session ? <AppShell/> : <LoginPage/>;
}

export default function App() {
  return <AuthProvider><AppContent/></AuthProvider>;
}
