import { useState } from "react";
import { LeadCard } from "./LeadCard";
import { stageColor, fmt } from "../../utils/constants";

export function KanbanCol({ stage, leads, onOpen, onDrop, allUsers }) {
  const [over, setOver] = useState(false);
  const total = leads.reduce((s, l) => s + (l.deal_value || 0), 0);
  
  return (
    <div onDrop={e => { e.preventDefault(); onDrop(e.dataTransfer.getData("leadId"), stage); setOver(false); }} onDragOver={e => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
      style={{ minWidth: 320, maxWidth: 320, flexShrink: 0, background: over ? "rgba(99,102,241,0.03)" : "rgba(255,255,255,0.012)", borderTop: `2px solid ${stageColor(stage)}33`, borderLeft: "1px solid rgba(255,255,255,0.04)", borderRight: "1px solid rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.04)", borderRadius: 2, padding: 16, transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)", display: "flex", flexDirection: "column", height: "100%", maxHeight: "calc(100vh - 240px)" }}
    >
      <div style={{ marginBottom: 20, borderBottom: "1px solid rgba(255,255,255,0.03)", paddingBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 900, color: "#f1f5f9", letterSpacing: "0.05em", textTransform: "uppercase" }}>{stage}</span>
            <span style={{ fontSize: 11, background: "rgba(255,255,255,0.04)", borderRadius: 2, padding: "2px 8px", color: "#64748b", fontWeight: 800 }}>{leads.length}</span>
          </div>
        </div>
        {total > 0 && <div style={{ fontSize: 16, fontWeight: 900, color: "#6366f1", letterSpacing: "-0.5px" }}>{fmt(total)}</div>}
      </div>
      
      <div style={{ overflowY: "auto", flex: 1, paddingRight: 4 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {leads.map(l => <LeadCard key={l.id} lead={l} onOpen={onOpen} allUsers={allUsers} />)}
            {leads.length === 0 && <div style={{ textAlign: "center", padding: "40px 0", fontSize: 9, fontWeight: 800, color: over ? "#6366f1" : "#1e293b", textTransform: "uppercase", letterSpacing: "0.1em", border: "1px dashed rgba(255,255,255,0.03)", borderRadius: 2 }}>{over ? "SOLTAR LEAD" : "SEM LEADS NESTA ETAPA"}</div>}
        </div>
      </div>
    </div>
  );
}
