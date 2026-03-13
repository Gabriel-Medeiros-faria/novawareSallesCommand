import { useState } from "react";
import supabase from "../lib/supabase";
import { Spinner, RoleBadge } from "../components/ui/Atoms";
import { INP } from "../utils/constants";

export function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async () => {
    setError("");
    if (!form.email || !form.password) { setError("Preencha email e senha."); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
    if (error) setError(error.message === "Invalid login credentials" ? "Email ou senha incorretos." : error.message);
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#030712", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "'Sora','DM Sans',system-ui,sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fade{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        input:focus{border-color:rgba(99,102,241,0.55)!important}
      `}</style>

      {/* Glows de fundo */}
      <div style={{ position: "fixed", top: "15%", left: "25%", width: 500, height: 500, background: "radial-gradient(circle,rgba(99,102,241,0.1) 0%,transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "fixed", bottom: "10%", right: "20%", width: 350, height: 350, background: "radial-gradient(circle,rgba(139,92,246,0.08) 0%,transparent 70%)", pointerEvents: "none" }} />

      <div style={{ width: "100%", maxWidth: 390, animation: "fade 0.4s ease" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <img src="/logo.png" alt="Logo" style={{ width: 80, height: "auto", marginBottom: 16, filter: "drop-shadow(0 8px 15px rgba(99,102,241,0.2))" }} />
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#f1f5f9", margin: "0 0 5px", letterSpacing: "-0.03em" }}>Novaware - Sales Command</h1>
          <p style={{ fontSize: 13, color: "#475569", margin: 0 }}>Acesso restrito a colaboradores</p>
        </div>

        {/* Card de login */}
        <div style={{ background: "rgba(255,255,255,0.028)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 18, padding: "26px 24px" }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#334155", margin: "0 0 18px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Entrar na plataforma</p>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, color: "#475569", marginBottom: 4, fontWeight: 600 }}>Email</label>
              <input type="email" value={form.email} onChange={set("email")} placeholder="seu@email.com"
                onKeyDown={e => e.key === "Enter" && handleSubmit()} style={INP} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, color: "#475569", marginBottom: 4, fontWeight: 600 }}>Senha</label>
              <input type="password" value={form.password} onChange={set("password")} placeholder="••••••••"
                onKeyDown={e => e.key === "Enter" && handleSubmit()} style={INP} />
            </div>

            {error && (
              <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.18)", borderRadius: 9, padding: "9px 12px", fontSize: 12, color: "#fca5a5", display: "flex", gap: 6, alignItems: "center" }}>
                <span>⚠</span>{error}
              </div>
            )}

            <button onClick={handleSubmit} disabled={loading}
              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", color: "#fff", borderRadius: 11, padding: "12px", cursor: loading ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 700, marginTop: 4, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: loading ? 0.7 : 1, fontFamily: "inherit", boxShadow: "0 4px 14px rgba(99,102,241,0.28)" }}>
              {loading && <Spinner size={15} color="#fff" />}
              {loading ? "Autenticando..." : "Entrar"}
            </button>
          </div>
        </div>

        {/* Credenciais de demo */}
        <div style={{ marginTop: 14, background: "rgba(255,255,255,0.018)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 11, padding: "11px 14px" }}>
          <p style={{ fontSize: 10, color: "#1e293b", margin: "0 0 7px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Contas de demonstração (seeds)</p>
          {[
            { r: "Admin", color: "#fbbf24", e: "admin@salescommand.com.br", p: "Admin@2025!" },
            { r: "SDR", color: "#818cf8", e: "ana.pereira@salescommand.com.br", p: "Sdr@2025!" },
            { r: "Closer", color: "#34d399", e: "diana.lima@salescommand.com.br", p: "Closer@2025!" },
          ].map(u => (
            <button key={u.r} onClick={() => setForm({ email: u.e, password: u.p })}
              style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", textAlign: "left", background: "transparent", border: "none", color: "#334155", fontSize: 11, cursor: "pointer", padding: "3px 0", fontFamily: "inherit", lineHeight: 1.8 }}>
              <RoleBadge role={u.r.toLowerCase()} />
              <span style={{ color: "#475569" }}>{u.e}</span>
            </button>
          ))}
          <p style={{ fontSize: 10, color: "#1e293b", margin: "8px 0 0", fontStyle: "italic" }}>
            Novos usuários só podem ser criados pelo Admin dentro da plataforma.
          </p>
        </div>
      </div>
    </div>
  );
}
