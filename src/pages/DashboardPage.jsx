import { RoleBadge, MetricCard, Avatar, Badge, Spinner } from "../components/ui/Atoms";
import { fmt } from "../utils/constants";

export function DashboardPage({ leads, goals, profile, allUsers, stagesData }) {
  const { closerStages = [], getStageColor = () => "#6b7280", loading = false } = stagesData || {};

  if (loading) return (
    <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center", padding: 100 }}>
      <Spinner size={40} />
    </div>
  );

  const closerStageNames = closerStages.map(s => s.name);
  const total = leads.length;
  const ganhos = leads.filter(l => l.status === "Fechado - Ganho");
  const receita = ganhos.reduce((s, l) => s + (l.deal_value || 0), 0);
  const pipeline = leads.filter(l => !["Fechado - Ganho", "Fechado - Perdido"].includes(l.status)).reduce((s, l) => s + (l.deal_value || 0), 0);
  const taxa = total > 0 ? ((ganhos.length / total) * 100).toFixed(1) : 0;

  const funnel = [
    { l: "Prospecção", c: leads.filter(l => ["Novo Lead", "Tentativa de Contato"].includes(l.status)).length, color: "#6366f1" },
    { l: "Qualificados", c: leads.filter(l => ["Qualificado", "Follow-up"].includes(l.status)).length, color: "#8b5cf6" },
    { l: "Reuniões", c: leads.filter(l => ["Reunião Agendada", "Reunião Realizada"].includes(l.status)).length, color: "#06b6d4" },
    { l: "Negociação", c: leads.filter(l => ["Proposta Enviada", "Negociação"].includes(l.status)).length, color: "#f59e0b" },
    { l: "Ganhos", c: ganhos.length, color: "#22c55e" },
  ];
  const maxF = Math.max(...funnel.map(d => d.c), 1);

  return (
    <div style={{ paddingBottom: 40 }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 900, color: "#f1f5f9", margin: "0 0 6px", letterSpacing: "-1px", textTransform: "uppercase" }}>
              {profile?.role === "admin" ? "DASHBOARD GERAL" : `OLÁ, ${profile?.name?.split(" ")[0]}`}
            </h1>
            <p style={{ fontSize: 13, color: "#475569", fontWeight: 800, margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {profile?.role === "admin" ? "VISÃO TÁTICA DA OPERAÇÃO COMERCIAL" : profile?.role === "sdr" ? "SUA ÁREA DE PROSPECÇÃO" : "SUAS NEGOCIAÇÕES"}
            </p>
          </div>
          <RoleBadge role={profile?.role} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 16, marginBottom: 32 }}>
        <MetricCard label="Total Leads" value={total} icon="👥" color="#6366f1" sub={`${leads.filter(l => l.status === "Novo Lead").length} NOVOS HOJE`} />
        <MetricCard label="Em Pipeline" value={leads.filter(l => closerStageNames.includes(l.status)).length} icon="📅" color="#06b6d4" />
        <MetricCard label="Ganhos" value={ganhos.length} icon="🏆" color="#22c55e" sub={`${leads.filter(l => l.status === "Fechado - Perdido").length} PERDIDOS`} />
        <MetricCard label="Receita" value={fmt(receita)} icon="💰" color="#10b981" />
        <MetricCard label="Pipeline" value={fmt(pipeline)} icon="📊" color="#f59e0b" />
        <MetricCard label="Conversão" value={`${taxa}%`} icon="🎯" color="#8b5cf6" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: profile?.role === "admin" ? "1fr 1fr" : "1fr", gap: 24 }}>
        <div style={{ background: "rgba(255,255,255,0.018)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 2, padding: 32 }}>
          <h3 style={{ fontSize: 14, fontWeight: 900, color: "#f1f5f9", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 32 }}>FUNIL DE VENDAS</h3>
          {funnel.map(d => (
            <div key={d.l} style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: "#475569", textTransform: "uppercase" }}>{d.l}</span>
                <span style={{ fontSize: 14, fontWeight: 900, color: d.color }}>{d.c}</span>
              </div>
              <div style={{ height: 8, background: "rgba(255,255,255,0.04)", borderRadius: 0, overflow: "hidden", border: "1px solid rgba(255,255,255,0.02)" }}>
                <div style={{ height: "100%", width: `${(d.c / maxF) * 100}%`, background: d.color, transition: "width 0.8s ease" }} />
              </div>
            </div>
          ))}
        </div>

        {profile?.role === "admin" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[{
              title: "EQUIPE SDR", users: allUsers.filter(u => u.role === "sdr"), getStats: u => ({
                a: `${leads.filter(l => l.sdr_id === u.id).length} LEADS`,
                b: `${leads.filter(l => l.sdr_id === u.id && closerStageNames.includes(l.status)).length} QUALIF`
              })
            },
            {
              title: "EQUIPE CLOSER", users: allUsers.filter(u => u.role === "closer"), getStats: u => ({
                a: `${leads.filter(l => l.closer_id === u.id && l.status === "Fechado - Ganho").length} GANHOS`,
                b: fmt(leads.filter(l => l.closer_id === u.id && l.status === "Fechado - Ganho").reduce((s, l) => s + (l.deal_value || 0), 0))
              })
            },
            {
              title: "EQUIPE DE VENDAS", users: allUsers.filter(u => u.role === "vendedor"), getStats: u => ({
                a: `${leads.filter(l => l.sdr_id === u.id).length} LEADS`,
                b: `${leads.filter(l => l.closer_id === u.id && l.status === "Fechado - Ganho").length} GANHOS`
              })
            }
            ].map(g => (
              <div key={g.title} style={{ background: "rgba(255,255,255,0.018)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 2, padding: 24, flex: 1 }}>
                <h3 style={{ fontSize: 14, fontWeight: 900, color: "#f1f5f9", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 20 }}>{g.title}</h3>
                {g.users.length === 0 ? <div style={{ fontSize: 13, color: "#475569" }}>Nenhum estratégico cadastrado.</div> : g.users.map(u => {
                  const s = g.getStats(u);
                  return <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <Avatar name={u.name} size={32} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 900, color: "#f1f5f9", textTransform: "uppercase" }}>{u.name}</div>
                      <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: "#6366f1", textTransform: "uppercase" }}>{s.a}</span>
                        <span style={{ fontSize: 11, fontWeight: 800, color: "#22c55e", textTransform: "uppercase" }}>{s.b}</span>
                      </div>
                    </div>
                  </div>;
                })}
              </div>
            ))}
          </div>
        )}

        {profile?.role !== "admin" && (
          <div style={{ background: "rgba(255,255,255,0.018)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 2, padding: 24 }}>
            <h3 style={{ fontSize: 14, fontWeight: 900, color: "#f1f5f9", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 20 }}>LEADS RECENTES</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {leads.slice(0, 5).map(l => (
                <div key={l.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 2 }}>
                  <div>
                    <div style={{ fontSize: 14, color: "#f1f5f9", fontWeight: 900, textTransform: "uppercase" }}>{l.nome_lead}</div>
                    <div style={{ fontSize: 11, color: "#475569", fontWeight: 800, textTransform: "uppercase", marginTop: 2 }}>{l.empresa}</div>
                  </div>
                  <Badge color={getStageColor(l.status)} bg={`${getStageColor(l.status)}15`}>{l.status}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
