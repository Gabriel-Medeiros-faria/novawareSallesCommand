import { useState } from "react";
import { Avatar, RoleBadge, ProgressBar, Spinner, Drawer, Field, Badge } from "../components/ui/Atoms";
import { goalLabel, periodLabel, periodColor, fmt, INP } from "../utils/constants";

export function GoalsPage({ goals, createGoal, updateGoal, deleteGoal, profile, allUsers }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [newGoal, setNewGoal] = useState({ user_id: "", type: "leads_qualificados", target: "", period: "mensal", month: new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" }) });
  const [saving, setSaving] = useState(false);
  const visibleUsers = profile?.role === "admin" ? allUsers.filter(u => u.role !== "admin") : [profile].filter(Boolean);

  const handleOpenAdd = () => {
    setEditingGoal(null);
    setNewGoal({ user_id: "", type: "leads_qualificados", target: "", period: "mensal", month: new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" }) });
    setShowAdd(true);
  };

  const handleOpenEdit = (goal) => {
    setEditingGoal(goal);
    setNewGoal({ user_id: goal.user_id, type: goal.type, target: goal.target, period: goal.period, month: goal.month });
    setShowAdd(true);
  };

  const handleSave = async () => {
    if (!newGoal.target || !newGoal.user_id) return;
    setSaving(true);
    if (editingGoal) {
      await updateGoal(editingGoal.id, { ...newGoal, target: Number(newGoal.target) });
    } else {
      await createGoal({ ...newGoal, target: Number(newGoal.target), current: 0 });
    }
    setSaving(false); setShowAdd(false);
    setNewGoal(p => ({ ...p, user_id: "", target: "" }));
  };

  const handleDelete = async (id) => {
    if (confirm("Tem certeza que deseja excluir esta meta tática?")) {
      await deleteGoal(id);
    }
  };

  return (
    <div style={{ height: "100%", paddingBottom: 40 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: "#f1f5f9", margin: "0 0 8px", letterSpacing: "-1px", textTransform: "uppercase" }}>GESTÃO DE METAS</h1>
          <div style={{ fontSize: 13, color: "#475569", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em" }}>PERFORMANCE E MÉTRICAS TÁTICAS DA EQUIPE</div>
        </div>
        {profile?.role === "admin" && <button onClick={handleOpenAdd} style={{ background: "#6366f1", border: "none", color: "#fff", borderRadius: 2, padding: "12px 24px", cursor: "pointer", fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em" }}>+ DEFINIR NOVA META</button>}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {visibleUsers.length === 0 && <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 2, padding: 60, textAlign: "center", fontSize: 13, fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em" }}>NENHUM ATIVO NO SISTEMA</div>}

        {visibleUsers.map(user => {
          const userGoals = goals.filter(g => g.user_id === user.id);
          return (
            <div key={user.id} style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 2, padding: 32 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
                <Avatar name={user.name || "?"} size={48} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 900, fontSize: 20, color: "#f1f5f9", textTransform: "uppercase", letterSpacing: "0.02em" }}>{user.name}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6 }}>
                    <RoleBadge role={user.role} />
                    <div style={{ width: 1, height: 12, background: "rgba(255,255,255,0.1)" }} />
                    <span style={{ fontSize: 12, color: "#475569", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em" }}>{userGoals.length} METAS ATIVAS</span>
                  </div>
                </div>
              </div>
              
              {userGoals.length === 0 ? (
                <div style={{ fontSize: 13, color: "#475569", padding: "16px 0", fontStyle: "italic", fontWeight: 700 }}>Sem objetivos táticos configurados para este colaborador.</div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>
                  {userGoals.map(g => {
                    const pct = Math.min(100, g.target > 0 ? Math.round((g.current / g.target) * 100) : 0);
                    return (
                      <div key={g.id} style={{ background: "rgba(3,7,18,0.4)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 2, padding: 24, position: "relative" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                            {profile?.role === "admin" && (
                              <div style={{ display: "flex", gap: 6, marginRight: 8 }}>
                                <button onClick={() => handleOpenEdit(g)} style={{ background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.15)", color: "#6366f1", borderRadius: 2, width: 24, height: 24, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>✎</button>
                                <button onClick={() => handleDelete(g.id)} style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)", color: "#ef4444", borderRadius: 2, width: 24, height: 24, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                              </div>
                            )}
                            <div style={{ fontSize: 12, color: "#475569", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em" }}>{goalLabel(g.type)}</div>
                          </div>
                          <Badge color={periodColor(g.period)} bg={`${periodColor(g.period)}08`}>
                            {periodLabel(g.period)}
                          </Badge>
                        </div>
                        <div style={{ fontSize: 32, fontWeight: 900, color: "#f1f5f9", marginBottom: 16, letterSpacing: "-1px" }}>
                            {g.type === "valor_vendido" ? fmt(g.current) : g.current} 
                            <span style={{ fontSize: 16, color: "#334155", fontWeight: 700, marginLeft: 10 }}>/ {g.type === "valor_vendido" ? fmt(g.target) : g.target}</span>
                        </div>
                        <ProgressBar value={g.current} max={g.target} color={pct >= 100 ? "#2dd4bf" : pct >= 60 ? "#fbbf24" : "#6366f1"} height={6} />
                        <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: 12, fontWeight: 900, color: pct >= 100 ? "#2dd4bf" : "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>{pct}% CONCLUÍDO</span>
                            <span style={{ fontSize: 11, color: "#1e293b", fontWeight: 800, textTransform: "uppercase" }}>REF: {g.month}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showAdd && (
        <Drawer open={true} onClose={() => setShowAdd(false)} title={editingGoal ? "Modificar Meta Tática" : "Configurar Nova Meta"}>
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <Field label="Colaborador Alvo">
                    <select value={newGoal.user_id} onChange={e => setNewGoal(p => ({ ...p, user_id: e.target.value }))} style={{ ...INP, padding: "12px 14px" }} disabled={!!editingGoal}>
                        <option value="">Selecionar estratégico...</option>
                        {allUsers.filter(u => u.role !== "admin").map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                </Field>

                <Field label="Indicador de Performance (KPI)">
                    <select value={newGoal.type} onChange={e => setNewGoal(p => ({ ...p, type: e.target.value }))} style={{ ...INP, padding: "12px 14px" }}>
                    {[
                        { value: "leads_contatados", label: "Leads Contatados" }, 
                        { value: "leads_qualificados", label: "Leads Qualificados" }, 
                        { value: "reunioes_agendadas", label: "Reuniões Agendadas" }, 
                        { value: "reunioes_realizadas", label: "Reuniões Realizadas" }, 
                        { value: "contratos_fechados", label: "Contratos Fechados" }, 
                        { value: "valor_vendido", label: "Valor Vendido" }
                    ].map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </Field>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                    <Field label="Frequência">
                        <select value={newGoal.period} onChange={e => setNewGoal(p => ({ ...p, period: e.target.value }))} style={{ ...INP, padding: "12px 14px" }}>
                            {["diaria", "semanal", "mensal", "anual"].map(v => <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>)}
                        </select>
                    </Field>
                    <Field label="Valor da Meta">
                        <input type="number" value={newGoal.target} onChange={e => setNewGoal(p => ({ ...p, target: e.target.value }))} style={{ ...INP, padding: "12px 14px" }} placeholder="0" />
                    </Field>
                </div>

                <Field label="Mês/Período de Referência">
                    <input type="text" value={newGoal.month} onChange={e => setNewGoal(p => ({ ...p, month: e.target.value }))} style={{ ...INP, padding: "12px 14px" }} />
                </Field>
            </div>

            <div style={{ marginTop: "auto", display: "flex", gap: 16 }}>
                <button onClick={() => setShowAdd(false)} style={{ flex: 1, background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: "#475569", borderRadius: 2, padding: "14px", cursor: "pointer", fontSize: 13, fontWeight: 800, textTransform: "uppercase" }}>Descartar</button>
                <button onClick={handleSave} disabled={saving} style={{ flex: 2, background: "#6366f1", border: "none", color: "#fff", borderRadius: 2, padding: "14px", cursor: "pointer", fontSize: 13, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", display: "flex", gap: 10, alignItems: "center", justifyContent: "center" }}>
                {saving && <Spinner size={16} color="#fff" />}
                {saving ? "PROCESSANDO..." : editingGoal ? "EFETUAR ALTERAÇÃO" : "CONFIRMAR ESTRATÉGIA"}
                </button>
            </div>
          </div>
        </Drawer>
      )}
    </div>
  );
}
