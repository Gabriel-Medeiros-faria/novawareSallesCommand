import { Avatar, Badge } from "../ui/Atoms";
import { tempColor, tempBg, fmt, daysSince } from "../../utils/constants";

export function LeadCard({ lead, onOpen, allUsers }) {
  const sdr = allUsers.find(u => u.id === lead.sdr_id);
  const closer = allUsers.find(u => u.id === lead.closer_id);
  const days = daysSince(lead.last_interaction);

  return (
    <div 
      className="kanban-card"
      draggable 
      onDragStart={e => {
        e.dataTransfer.setData("leadId", lead.id);
        e.currentTarget.style.cursor = "grabbing";
      }} 
      onDragEnd={e => {
        e.currentTarget.style.cursor = "grab";
      }}
      onClick={() => onOpen(lead)}
      style={{ 
        background: "#030712", 
        border: "1px solid rgba(255,255,255,0.06)", 
        borderRadius: 2, 
        padding: "14px", 
        cursor: "grab", 
        position: "relative", 
        transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)", 
        overflow: "hidden" 
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "#6366f1"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 20px -10px rgba(99,102,241,0.3)" }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none" }}
    >
      {/* Urgency Stripe */}
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 2, background: days > 3 ? "#ef4444" : "transparent" }} />
      
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 900, fontSize: 13, color: "#f1f5f9", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.02em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{lead.nome_lead}</div>
          <div style={{ fontSize: 11, color: "#475569", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em" }}>{lead.empresa}</div>
        </div>
        <Badge color={tempColor(lead.temperatura)} bg={`${tempColor(lead.temperatura)}05`} border={`1px solid ${tempColor(lead.temperatura)}33`}>{lead.temperatura}</Badge>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 900, color: "#f1f5f9", letterSpacing: "-0.5px" }}>{fmt(lead.deal_value)}</div>
      </div>

      {lead.observacoes && (
        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 16, fontStyle: "italic", lineHeight: 1.6, background: "rgba(255,255,255,0.01)", padding: "8px 10px", borderLeft: "1px solid rgba(255,255,255,0.05)" }}>
            "{lead.observacoes.slice(0, 45)}{lead.observacoes.length > 45 ? "…" : ""}"
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.03)", paddingTop: 12 }}>
        <div style={{ display: "flex", gap: 6 }}>
            {sdr && <Avatar name={sdr.name} size={22} />}
            {closer && <Avatar name={closer.name} size={22} />}
        </div>
        <span style={{ fontSize: 11, fontWeight: 900, color: days > 3 ? "#ef4444" : "#475569", textTransform: "uppercase" }}>
            {days === 0 ? "INTERAÇÃO HOJE" : `${days}D SEM INTERAÇÃO`}
        </span>
      </div>
    </div>
  );
}
