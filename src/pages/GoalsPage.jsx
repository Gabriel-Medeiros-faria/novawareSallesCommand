import { useState } from "react";
import { Avatar, RoleBadge, ProgressBar, Spinner, Drawer, Field, Badge } from "../components/ui/Atoms";
import { goalLabel, periodLabel, periodColor, fmt, INP } from "../utils/constants";

export function GoalsPage({ goals, createGoal, updateGoal, deleteGoal, profile, allUsers }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [newGoal, setNewGoal] = useState({ user_id: "", type: "leads_qualificados", target: "", period: "mensal", month: new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" }) });
  const [saving, setSaving] = useState(false);
  
  // New States
  const [viewMode, setViewMode] = useState("cards"); // cards | table
  const [userFilter, setUserFilter] = useState("all");

  const userRole = profile?.role?.toLowerCase();
  const adminUsers = allUsers.filter(u => u.role?.toLowerCase() !== "admin");
  const visibleUsers = (userRole === "admin" ? adminUsers : [profile].filter(Boolean))
    .filter(u => userFilter === "all" || u.id === userFilter);

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
        <div style={{ display: "flex", gap: 12 }}>
          {userRole === "admin" && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.03)", padding: "4px 12px", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 2 }}>
              <span style={{ fontSize: 10, fontWeight: 900, color: "#475569", textTransform: "uppercase" }}>Filtrar por:</span>
              <select value={userFilter} onChange={e => setUserFilter(e.target.value)} style={{ background: "transparent", border: "none", color: "#f1f5f9", fontSize: 12, fontWeight: 800, cursor: "pointer", outline: "none", padding: "4px 0" }}>
                <option value="all">TODOS OS COLABORADORES</option>
                {adminUsers.map(u => <option key={u.id} value={u.id}>{u.name.toUpperCase()}</option>)}
              </select>
            </div>
          )}
          
          <div style={{ display: "flex", background: "rgba(255,255,255,0.03)", padding: 4, borderRadius: 2, border: "1px solid rgba(255,255,255,0.06)" }}>
            <button onClick={() => setViewMode("cards")} style={{ background: viewMode === "cards" ? "#6366f1" : "transparent", border: "none", color: viewMode === "cards" ? "#fff" : "#475569", padding: "6px 12px", borderRadius: 2, cursor: "pointer", fontSize: 10, fontWeight: 900, textTransform: "uppercase" }}>Cards</button>
            <button onClick={() => setViewMode("table")} style={{ background: viewMode === "table" ? "#6366f1" : "transparent", border: "none", color: viewMode === "table" ? "#fff" : "#475569", padding: "6px 12px", borderRadius: 2, cursor: "pointer", fontSize: 10, fontWeight: 900, textTransform: "uppercase" }}>Tabela</button>
          </div>

          {userRole === "admin" && <button onClick={handleOpenAdd} style={{ background: "#6366f1", border: "none", color: "#fff", borderRadius: 2, padding: "12px 24px", cursor: "pointer", fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em" }}>+ DEFINIR NOVA META</button>}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {visibleUsers.length === 0 && <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 2, padding: 60, textAlign: "center", fontSize: 13, fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em" }}>NENHUM ATIVO NO SISTEMA COM ESTE FILTRO</div>}

        {viewMode === "table" && visibleUsers.length > 0 && (
          <div style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 2, overflow: "hidden" }}>
             <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <th style={{ padding: "16px 24px", fontSize: 11, fontWeight: 900, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em" }}>Colaborador</th>
                    <th style={{ padding: "16px 24px", fontSize: 11, fontWeight: 900, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em" }}>Indicador</th>
                    <th style={{ padding: "16px 24px", fontSize: 11, fontWeight: 900, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em" }}>Período</th>
                    <th style={{ padding: "16px 24px", fontSize: 11, fontWeight: 900, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em" }}>Meta</th>
                    <th style={{ padding: "16px 24px", fontSize: 11, fontWeight: 900, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em" }}>Progresso</th>
                    <th style={{ padding: "16px 24px", fontSize: 11, fontWeight: 900, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em" }}>Ref.</th>
                    {userRole === "admin" && <th style={{ padding: "16px 24px", fontSize: 11, fontWeight: 900, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em", textAlign: "right" }}>Ações</th>}
                  </tr>
                </thead>
                <tbody>
                  {visibleUsers.flatMap(user => goals.filter(g => g.user_id === user.id).map(g => {
                    const pct = Math.min(100, g.target > 0 ? Math.round((g.current / g.target) * 100) : 0);
                    return (
                      <tr key={g.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.02)", transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.01)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        <td style={{ padding: "16px 24px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <Avatar name={user.name || "?"} size={28} />
                            <div style={{ fontSize: 13, fontWeight: 800, color: "#f1f5f9" }}>{(user.name || "N/A").toUpperCase()}</div>
                          </div>
                        </td>
                        <td style={{ padding: "16px 24px", fontSize: 12, fontWeight: 800, color: "#94a3b8" }}>{goalLabel(g.type).toUpperCase()}</td>
                        <td style={{ padding: "16px 24px" }}>
                          <Badge color={periodColor(g.period)} bg={`${periodColor(g.period)}08`}>{periodLabel(g.period).toUpperCase()}</Badge>
                        </td>
                        <td style={{ padding: "16px 24px" }}>
                          <div style={{ fontSize: 13, fontWeight: 900, color: "#f1f5f9" }}>{g.type === "valor_vendido" ? fmt(g.target) : g.target}</div>
                          <div style={{ fontSize: 10, color: "#475569", fontWeight: 800 }}>ATUAL: {g.type === "valor_vendido" ? fmt(g.current) : g.current}</div>
                        </td>
                        <td style={{ padding: "16px 24px", width: 140 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,0.04)", borderRadius: 0, overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${pct}%`, background: pct >= 100 ? "#2dd4bf" : pct >= 60 ? "#fbbf24" : "#6366f1" }} />
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 900, color: pct >= 100 ? "#2dd4bf" : "#475569" }}>{pct}%</span>
                          </div>
                        </td>
                        <td style={{ padding: "16px 24px", fontSize: 11, fontWeight: 800, color: "#1e293b" }}>{g.month.toUpperCase()}</td>
                        {userRole === "admin" && (
                          <td style={{ padding: "16px 24px", textAlign: "right" }}>
                            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                              <button onClick={() => handleOpenEdit(g)} style={{ background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.15)", color: "#6366f1", borderRadius: 2, padding: "6px 10px", cursor: "pointer", fontSize: 11, fontWeight: 900 }}>EDITAR</button>
                              <button onClick={() => handleDelete(g.id)} style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)", color: "#ef4444", borderRadius: 2, padding: "6px 10px", cursor: "pointer", fontSize: 11, fontWeight: 900 }}>EXCLUIR</button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  }))}
                </tbody>
             </table>
          </div>
        )}

        {viewMode === "cards" && visibleUsers.map(user => {
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
                            {userRole === "admin" && (
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
                        {allUsers.filter(u => u.role?.toLowerCase() !== "admin").map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
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
