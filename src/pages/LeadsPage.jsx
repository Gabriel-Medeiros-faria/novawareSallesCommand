import { useState } from "react";
import { Badge } from "../components/ui/Atoms";
import { ALL_STAGES, stageColor, tempColor, tempBg, fmt, daysSince, INP } from "../utils/constants";

export function LeadsPage({ leads, onOpen, allUsers }) {
  const [search, setSearch] = useState("");
  const [fStatus, setFStatus] = useState("Todos");
  const [fTemp, setFTemp] = useState("Todos");
  
  const filtered = leads.filter(l => {
    const ms = !search || l.nome_lead.toLowerCase().includes(search.toLowerCase()) || l.empresa.toLowerCase().includes(search.toLowerCase());
    const mst = fStatus === "Todos" || l.status === fStatus;
    const mt = fTemp === "Todos" || l.temperatura === fTemp;
    return ms && mst && mt;
  });

  return (
    <div style={{ paddingBottom: 40 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 900, color: "#f1f5f9", margin: "0 0 6px", letterSpacing: "-1px", textTransform: "uppercase" }}>Todos os Leads</h1>
        <p style={{ fontSize: 13, color: "#475569", fontWeight: 800, margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>{filtered.length} de {leads.length} registros ativos</p>
      </div>
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Buscar por nome ou empresa..." style={{ ...INP, flex: 1, minWidth: 240, padding: "12px 16px" }} />
        <select value={fStatus} onChange={e => setFStatus(e.target.value)} style={{ ...INP, width: "auto", padding: "12px 16px" }}>{["Todos", ...ALL_STAGES].map(s => <option key={s}>{s}</option>)}</select>
        <select value={fTemp} onChange={e => setFTemp(e.target.value)} style={{ ...INP, width: "auto", padding: "12px 16px" }}>{["Todos", "Quente", "Morno", "Frio"].map(t => <option key={t}>{t}</option>)}</select>
      </div>
      <div style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1.4fr 1fr 1fr 1.1fr", gap: 12, padding: "16px 24px", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: 11, color: "#475569", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          <span>Lead / Empresa</span><span>Status</span><span>Temp.</span><span>Valor</span><span>Interação</span>
        </div>
        {filtered.length === 0 && <div style={{ padding: "40px", textAlign: "center", fontSize: 14, color: "#475569" }}>Nenhum lead encontrado na bússola comercial.</div>}
        {filtered.map((lead, i) => (
          <div key={lead.id} onClick={() => onOpen(lead)} style={{ display: "grid", gridTemplateColumns: "2fr 1.4fr 1fr 1fr 1.1fr", gap: 12, padding: "20px 24px", borderBottom: i < filtered.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none", cursor: "pointer", transition: "background 0.1s" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.022)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            <div>
                <div style={{ fontSize: 14, fontWeight: 900, color: "#f1f5f9", textTransform: "uppercase", letterSpacing: "0.02em" }}>{lead.nome_lead}</div>
                <div style={{ fontSize: 11, color: "#475569", fontWeight: 800, textTransform: "uppercase", marginTop: 2 }}>{lead.empresa}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center" }}><Badge color={stageColor(lead.status)} bg={`${stageColor(lead.status)}15`}>{lead.status}</Badge></div>
            <div style={{ display: "flex", alignItems: "center" }}><Badge color={tempColor(lead.temperatura)} bg={tempBg(lead.temperatura)}>{lead.temperatura}</Badge></div>
            <div style={{ fontSize: 14, color: lead.deal_value ? "#f1f5f9" : "#475569", fontWeight: 900, display: "flex", alignItems: "center" }}>{lead.deal_value ? fmt(lead.deal_value) : "—"}</div>
            <div style={{ fontSize: 12, color: daysSince(lead.last_interaction) > 3 ? "#ef4444" : "#475569", fontWeight: 800, display: "flex", alignItems: "center" }}>{lead.last_interaction || "—"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
