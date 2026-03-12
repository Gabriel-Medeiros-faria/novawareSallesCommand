import { useState } from "react";
import { Spinner, RoleBadge, Avatar, Drawer, Field } from "../components/ui/Atoms";
import { SUPABASE_URL, SUPABASE_ANON, INP } from "../utils/constants";

export function UsersPage({ allUsers, onUserCreated }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "sdr" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const openAdd = () => {
    setEditingUser(null);
    setForm({ name: "", email: "", password: "", role: "sdr" });
    setError(""); setSuccess("");
    setShowAdd(true);
  };

  const openEdit = (user) => {
    setEditingUser(user);
    setForm({ name: user.name, email: user.email, password: "", role: user.role });
    setError(""); setSuccess("");
    setShowAdd(true);
  };

  const handleSubmit = async () => {
    setError(""); setSuccess("");
    if (!form.name || !form.email) { setError("Nome e email são obrigatórios."); return; }
    if (!editingUser && !form.password) { setError("A senha é obrigatória para novos usuários."); return; }
    
    setLoading(true);
    try {
      const session = JSON.parse(localStorage.getItem("sc_sess") || "{}");
      const token = session?.access_token || SUPABASE_ANON;
      
      const rpcName = editingUser ? "update_user_by_admin" : "create_user_by_admin";
      const payload = editingUser 
        ? { p_user_id: editingUser.id, p_name: form.name, p_role: form.role, p_password: form.password || null }
        : { p_email: form.email, p_password: form.password, p_name: form.name, p_role: form.role };

      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${rpcName}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_ANON,
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      
      const body = await res.json().catch(() => ({}));

      if (!res.ok || body.error) { 
        setError(body.error || body.message || `Erro ${res.status}`); 
        setLoading(false); 
        return; 
      }
      
      setSuccess(`Usuário ${form.name} ${editingUser ? "atualizado" : "criado"} com sucesso!`);
      onUserCreated && onUserCreated();
      setTimeout(() => { setSuccess(""); setShowAdd(false); }, 2000);
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const byRole = role => allUsers.filter(u => u.role === role).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div style={{ height: "100%", paddingBottom: 40 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: "#f1f5f9", margin: "0 0 8px", letterSpacing: "-1px", textTransform: "uppercase" }}>CONTROLE DE ACESSO</h1>
          <div style={{ fontSize: 13, color: "#475569", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em" }}>OPERADORES E COMANDANTES ESTRATÉGICOS ({allUsers.length})</div>
        </div>
        <button onClick={openAdd} style={{ background: "#6366f1", border: "none", color: "#fff", borderRadius: 2, padding: "12px 24px", cursor: "pointer", fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em" }}>+ NOVO ACESSO</button>
      </div>

      {success && (
        <div style={{ background: "rgba(45,212,191,0.05)", border: "1px solid rgba(45,212,191,0.15)", borderRadius: 2, padding: "16px 20px", fontSize: 13, fontWeight: 800, color: "#2dd4bf", marginBottom: 32, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          SUCESSO: {success}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
        {[
            { role: "admin", title: "ADMINISTRADORES", icon: "⚡" },
            { role: "sdr", title: "SDRs (PROSPECÇÃO)", icon: "📡" },
            { role: "closer", title: "CLOSERS (FECHAMENTO)", icon: "🎯" },
        ].map(section => {
            const users = byRole(section.role);
            return (
            <div key={section.role}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, borderLeft: "3px solid #6366f1", paddingLeft: 16 }}>
                    <span style={{ fontSize: 18 }}>{section.icon}</span>
                    <span style={{ fontSize: 14, fontWeight: 900, color: "#f1f5f9", letterSpacing: "0.12em", textTransform: "uppercase" }}>{section.title}</span>
                    <span style={{ fontSize: 11, background: "rgba(255,255,255,0.04)", borderRadius: 2, padding: "3px 10px", color: "#64748b", fontWeight: 800 }}>{users.length}</span>
                </div>
                
                {users.length === 0 ? (
                <div style={{ fontSize: 13, color: "#475569", fontWeight: 700, padding: 20, border: "1px dashed rgba(255,255,255,0.03)", borderRadius: 2, textAlign: "center", textTransform: "uppercase", letterSpacing: "0.05em" }}>NENHUM OPERADOR NESTA CATEGORIA</div>
                ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
                    {users.map(u => (
                    <div key={u.id} style={{ background: "rgba(255,255,255,0.015)", borderRadius: 2, padding: "20px", display: "flex", alignItems: "center", gap: 16, border: "1px solid rgba(255,255,255,0.04)", transition: "all 0.2s" }}
                         onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(99,102,241,0.2)"}
                         onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.04)"}>
                        <Avatar name={u.name} size={40} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 900, color: "#f1f5f9", textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", letterSpacing: "0.02em" }}>{u.name}</div>
                            <div style={{ fontSize: 11, color: "#475569", fontWeight: 800, textTransform: "uppercase", marginTop: 4, letterSpacing: "0.05em" }}>{u.email}</div>
                        </div>
                        <button onClick={() => openEdit(u)} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "#6366f1", borderRadius: 2, width: 36, height: 36, cursor: "pointer", fontSize: 16, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>✎</button>
                    </div>
                    ))}
                </div>
                )}
            </div>
            );
        })}
      </div>

      {showAdd && (
        <Drawer open={true} onClose={() => setShowAdd(false)} title={editingUser ? "Modificar Acesso" : "Criar Novo Acesso"}>
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <Field label="Nome Completo"><input type="text" value={form.name} onChange={set("name")} style={{ ...INP, padding: "12px 14px" }} /></Field>
                <Field label="E-mail Operacional"><input type="email" value={form.email} onChange={set("email")} style={{ ...INP, padding: "12px 14px" }} disabled={!!editingUser} /></Field>
                <Field label={editingUser ? "Redefinir Senha (opcional)" : "Senha de Acesso"}><input type="password" value={form.password} onChange={set("password")} style={{ ...INP, padding: "12px 14px" }} /></Field>
                
                <Field label="Cargo / Nível de Acesso">
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                    {[{ v: "sdr", l: "SDR" }, { v: "closer", l: "CLOSER" }, { v: "admin", l: "ADMIN" }].map(o => (
                        <button key={o.v} onClick={() => setForm(p => ({ ...p, role: o.v }))} style={{ padding: "14px 10px", borderRadius: 2, border: `1px solid ${form.role === o.v ? "#6366f1" : "rgba(255,255,255,0.08)"}`, background: form.role === o.v ? "rgba(99,102,241,0.05)" : "transparent", color: form.role === o.v ? "#f1f5f9" : "#475569", cursor: "pointer", fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em" }}>{o.l}</button>
                    ))}
                    </div>
                </Field>
            </div>

            {error && <div style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 2, padding: "16px", fontSize: 12, fontWeight: 800, color: "#ef4444", textTransform: "uppercase", letterSpacing: "0.05em" }}>ERRO NO COMANDO: {error}</div>}

            <div style={{ marginTop: "auto", display: "flex", gap: 16 }}>
                <button onClick={() => setShowAdd(false)} style={{ flex: 1, background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: "#475569", borderRadius: 2, padding: "14px", cursor: "pointer", fontSize: 13, fontWeight: 800, textTransform: "uppercase" }}>Arquivar</button>
                <button onClick={handleSubmit} disabled={loading} style={{ flex: 2, background: "#6366f1", border: "none", color: "#fff", borderRadius: 2, padding: "14px", cursor: "pointer", fontSize: 13, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", display: "flex", gap: 10, alignItems: "center", justifyContent: "center" }}>
                    {loading && <Spinner size={16} color="#fff" />}
                    {loading ? "PROCESSANDO..." : (editingUser ? "EFETUAR ALTERAÇÃO" : "GERAR ACESSO")}
                </button>
            </div>
          </div>
        </Drawer>
      )}
    </div>
  );
}
