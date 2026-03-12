import { useState } from "react";
import { daysSince, fmt, INP } from "../utils/constants";
import { Badge } from "../components/ui/Atoms";

export function CopilotPage({ leads }) {
  const [chat, setChat] = useState([{ role: "assistant", text: "Olá! Sou o Sales Copilot. Analisei sua pipeline e estou pronto para ajudar. Posso detectar leads paralisados, recomendar follow-ups e estimar probabilidades de fechamento." }]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);

  const insights = (() => {
    const r = [];
    leads.forEach(l => {
      const d = daysSince(l.last_interaction);
      if (d >= 4 && !["Fechado - Ganho", "Fechado - Perdido"].includes(l.status)) r.push({ lead: l, type: "stalled", msg: `Sem contato há ${d} dias. Recomenda-se follow-up.`, priority: d > 7 ? "alta" : "média" });
      if (l.status === "Negociação" && l.deal_value > 50000) r.push({ lead: l, type: "high_value", msg: `Alto valor (${fmt(l.deal_value)}) em negociação.`, priority: "alta" });
      if (l.status === "Follow-up" && l.temperatura === "Quente") r.push({ lead: l, type: "hot", msg: "Lead quente aguardando follow-up. Alta chance de avanço.", priority: "alta" });
    });
    return r.slice(0, 5);
  })();

  const send = (text) => {
    const q = text || input.trim(); if (!q) return;
    setInput(""); setChat(p => [...p, { role: "user", text: q }]); setThinking(true);
    setTimeout(() => {
      const ql = q.toLowerCase(); let resp = "";
      if (ql.includes("urgente") || ql.includes("atenção")) {
        const st = leads.filter(l => daysSince(l.last_interaction) >= 4 && !["Fechado - Ganho", "Fechado - Perdido"].includes(l.status));
        resp = `${st.length} lead(s) precisam de atenção:\n\n${st.map(l => `• ${l.nome_lead} (${l.empresa}) — ${daysSince(l.last_interaction)} dias · ${l.status}`).join("\n") || "Nenhum ✓"}`;
      } else if (ql.includes("conversão") || ql.includes("taxa")) {
        const g = leads.filter(l => l.status === "Fechado - Ganho").length;
        const t = leads.length > 0 ? ((g / leads.length) * 100).toFixed(1) : 0;
        resp = `Taxa de conversão: ${t}% (${g} de ${leads.length} leads). Referência do setor: 15-25%.`;
      } else if (ql.includes("fechar") || ql.includes("probabilidade") || ql.includes("chance")) {
        const hot = leads.filter(l => l.temperatura === "Quente" && !["Fechado - Ganho", "Fechado - Perdido"].includes(l.status));
        resp = `Top ${hot.length} leads quentes:\n\n${hot.slice(0, 4).map(l => `• ${l.nome_lead} — ${l.status} | ${l.deal_value > 0 ? fmt(l.deal_value) : "—"}`).join("\n") || "Nenhum lead quente ativo."}\n\nPotencial estimado: ${fmt(hot.reduce((s, l) => s + (l.deal_value || 0) * 0.6, 0))}`;
      } else if (ql.includes("risco")) {
        const risk = leads.filter(l => daysSince(l.last_interaction) > 7 && !["Fechado - Ganho", "Fechado - Perdido"].includes(l.status));
        resp = `${risk.length} lead(s) em risco:\n\n${risk.map(l => `• ${l.nome_lead} — ${daysSince(l.last_interaction)} dias sem contato`).join("\n") || "Nenhum em risco crítico ✓"}`;
      } else {
        resp = `Pipeline: ${leads.length} leads · ${leads.filter(l => l.temperatura === "Quente").length} quentes · Potencial ${fmt(leads.filter(l => !["Fechado - Ganho", "Fechado - Perdido"].includes(l.status)).reduce((s, l) => s + (l.deal_value || 0), 0))}.\n\nComo posso ajudar?`;
      }
      setChat(p => [...p, { role: "assistant", text: resp }]); setThinking(false);
    }, 1000);
  };

  return (
    <div style={{ paddingBottom: 32 }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 21, fontWeight: 800, color: "#f1f5f9", margin: "0 0 3px", letterSpacing: "-0.02em" }}>Sales Copilot ✦ AI</h1>
        <p style={{ fontSize: 12, color: "#1e293b", margin: 0 }}>Análise inteligente da sua pipeline</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 290px", gap: 12 }}>
        <div style={{ background: "rgba(255,255,255,0.018)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 13, display: "flex", flexDirection: "column", height: 490 }}>
          <div style={{ padding: "11px 14px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: 7 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 5px #22c55e" }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: "#334155" }}>Copilot Online</span>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 9 }}>
            {chat.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{ maxWidth: "82%", background: m.role === "user" ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "rgba(255,255,255,0.04)", borderRadius: m.role === "user" ? "12px 12px 3px 12px" : "12px 12px 12px 3px", padding: "9px 12px", fontSize: 12, color: "#e2e8f0", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{m.text}</div>
              </div>
            ))}
            {thinking && <div style={{ display: "flex" }}><div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "12px 12px 12px 3px", padding: "9px 13px", display: "flex", gap: 4 }}>{[0, 1, 2].map(i => <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: "#6366f1", animation: `pulse ${0.7 + i * 0.2}s ease-in-out infinite` }} />)}</div></div>}
          </div>
          <div style={{ padding: "9px 12px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 7 }}>
              {["Leads urgentes?", "Taxa de conversão?", "Chance de fechar?", "Leads em risco?"].map(q => (
                <button key={q} onClick={() => send(q)} style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", color: "#818cf8", borderRadius: 99, padding: "3px 8px", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>{q}</button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder="Pergunte sobre sua pipeline..." style={INP} />
              <button onClick={() => send()} style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", color: "#fff", borderRadius: 8, padding: "7px 12px", cursor: "pointer", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>→</button>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#1e293b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>Alertas Automáticos</div>
          {insights.length === 0 && <div style={{ background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.14)", borderRadius: 10, padding: "11px 13px", fontSize: 12, color: "#22c55e" }}>✓ Pipeline saudável!</div>}
          {insights.map((ins, i) => (
            <div key={i} style={{ background: "rgba(255,255,255,0.018)", border: `1px solid ${ins.priority === "alta" ? "rgba(239,68,68,0.16)" : "rgba(245,158,11,0.16)"}`, borderRadius: 9, padding: "10px 11px" }}>
              <div style={{ display: "flex", gap: 7 }}>
                <span style={{ fontSize: 14, flexShrink: 0 }}>{ins.type === "stalled" ? "⏰" : ins.type === "high_value" ? "💎" : "🔥"}</span>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#e2e8f0", marginBottom: 2 }}>{ins.lead.nome_lead}</div>
                  <div style={{ fontSize: 11, color: "#475569", lineHeight: 1.5 }}>{ins.msg}</div>
                  <div style={{ marginTop: 4 }}><Badge color={ins.priority === "alta" ? "#ef4444" : "#f59e0b"} bg={ins.priority === "alta" ? "rgba(239,68,68,0.13)" : "rgba(245,158,11,0.13)"}>Prioridade {ins.priority}</Badge></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
