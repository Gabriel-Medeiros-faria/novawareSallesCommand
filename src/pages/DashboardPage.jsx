import React from "react";
import { RoleBadge, MetricCard, Avatar, Badge, Spinner } from "../components/ui/Atoms";
import { fmt } from "../utils/constants";

export function DashboardPage({ leads, goals, profile, allUsers, stagesData }) {
  const { closerStages = [], getStageColor = () => "#6b7280", loading = false } = stagesData || {};

  const [sendingWA, setSendingWA] = React.useState(false);
  const [showQR, setShowQR] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [qrCode, setQrCode] = React.useState(null);

  React.useEffect(() => {
    let interval;
    if (showQR) {
      interval = setInterval(async () => {
        try {
          const res = await fetch("https://novaware-whatsapp.onrender.com/status");
          const data = await res.json();
          if (data.connected) {
            setShowQR(false);
            setQrCode(null);
            clearInterval(interval);
            setShowConfirm(true); // Abre o próximo modal ao conectar
          } else if (data.qr) {
            setQrCode(data.qr);
          }
        } catch (e) {
          console.error("Erro ao poll status:", e);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [showQR]);

  if (loading) return (
    <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center", padding: 100 }}>
      <Spinner size={40} />
    </div>
  );

  const handleSendWhatsApp = async () => {
    try {
      setSendingWA(true);
      
      const res = await fetch("https://novaware-whatsapp.onrender.com/status");
      const data = await res.json();

      if (!data.connected) {
        if (data.qr) {
          setQrCode(data.qr);
          setShowQR(true);
        } else {
          alert("⏳ Aguardando o servidor gerar o QR Code. Tente novamente em alguns segundos.");
        }
        setSendingWA(false);
        return;
      }

      // Se já estiver conectado, abre o modal de confirmação
      setShowConfirm(true);
      setSendingWA(false);
    } catch (err) {
      alert("❌ Erro: O serviço de WhatsApp parece estar offline.");
      setSendingWA(false);
    }
  };

  const executeSendReport = async () => {
    try {
      setSendingWA(true);
      setShowConfirm(false);
      const res = await fetch("https://novaware-whatsapp.onrender.com/send-report");
      const data = await res.json();
      if (data.success) {
        alert("🚀 Relatório enviado com sucesso!");
      } else {
        alert("❌ Erro ao enviar: " + (data.error || "Serviço offline"));
      }
    } catch (err) {
      alert("❌ Erro técnico ao enviar relatório.");
    } finally {
      setSendingWA(false);
    }
  };

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
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {profile?.role === "admin" && (
              <button 
                onClick={handleSendWhatsApp}
                disabled={sendingWA}
                style={{ 
                  background: sendingWA ? "rgba(34,197,94,0.1)" : "rgba(34,197,94,0.05)", 
                  border: "1px solid rgba(34,197,94,0.2)", 
                  color: "#22c55e", 
                  borderRadius: 2, 
                  padding: "8px 16px", 
                  fontSize: 11, 
                  fontWeight: 900, 
                  cursor: "pointer", 
                  textTransform: "uppercase", 
                  letterSpacing: "0.05em",
                  display: "flex",
                  alignItems: "center",
                  gap: 8
                }}
              >
                {sendingWA ? "ENVIANDO..." : "🟢 DISPARAR RESUMO WPP"}
              </button>
            )}
            <RoleBadge role={profile?.role} />
          </div>
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

      {showConfirm && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1001, backdropFilter: "blur(8px)" }}>
          <div style={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.08)", padding: 40, borderRadius: 2, textAlign: "center", maxWidth: 450, width: "95%" }}>
            <div style={{ fontSize: 40, marginBottom: 20 }}>✅</div>
            <h2 style={{ fontSize: 18, fontWeight: 900, color: "#f1f5f9", textTransform: "uppercase", marginBottom: 12, letterSpacing: "1px" }}>WHATSAPP CONECTADO</h2>
            <p style={{ fontSize: 13, color: "#94a3b8", fontWeight: 600, marginBottom: 32, lineHeight: "1.6" }}>
              A conexão com o servidor está ativa. Deseja disparar o relatório de performance para o grupo agora?
            </p>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <button 
                onClick={executeSendReport} 
                disabled={sendingWA}
                style={{ 
                  background: "#22c55e", 
                  color: "#fff", 
                  border: "none",
                  padding: "14px", 
                  fontWeight: 900, 
                  cursor: "pointer", 
                  textTransform: "uppercase", 
                  fontSize: 12,
                  letterSpacing: "0.05em",
                  borderRadius: 2
                }}
              >
                {sendingWA ? "ENVIANDO..." : "🚀 SIM, ENVIAR AGORA"}
              </button>
              
              <button 
                onClick={() => setShowConfirm(false)} 
                style={{ 
                  background: "transparent", 
                  border: "1px solid rgba(255,255,255,0.1)", 
                  color: "#94a3b8", 
                  padding: "12px", 
                  fontWeight: 800, 
                  cursor: "pointer", 
                  textTransform: "uppercase", 
                  fontSize: 11,
                  borderRadius: 2
                }}
              >
                APENAS VERIFICAR CONEXÃO
              </button>
            </div>
          </div>
        </div>
      )}

      {showQR && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(8px)" }}>
          <div style={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.08)", padding: 40, borderRadius: 2, textAlign: "center", maxWidth: 400, width: "90%" }}>
            <h2 style={{ fontSize: 18, fontWeight: 900, color: "#f1f5f9", textTransform: "uppercase", marginBottom: 24, letterSpacing: "1px" }}>CONECTAR WHATSAPP</h2>
            {qrCode ? (
              <div style={{ background: "white", padding: 16, borderRadius: 2, display: "inline-block", marginBottom: 24 }}>
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrCode)}`} alt="WhatsApp QR Code" />
              </div>
            ) : (
              <div style={{ padding: 40 }}><Spinner size={30} /></div>
            )}
            <p style={{ fontSize: 13, color: "#475569", fontWeight: 800, textTransform: "uppercase", marginBottom: 24 }}>ESCANEIE COM O SEU APP DO WHATSAPP PARA ATIVAR O SISTEMA</p>
            <button onClick={() => setShowQR(false)} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.06)", color: "#f8fafc", padding: "10px 20px", fontWeight: 900, cursor: "pointer", textTransform: "uppercase", fontSize: 11 }}>CANCELAR</button>
          </div>
        </div>
      )}
    </div>
  );
}
