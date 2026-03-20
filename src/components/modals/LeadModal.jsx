import { useState } from "react";
import { Spinner, Badge, Avatar } from "../ui/Atoms";
import { useActivities } from "../../hooks/useActivities";
import { fmt, actIcon, INP } from "../../utils/constants";

export function LeadModal({ lead, onClose, onSave, profile, allUsers, stagesData }) {
  const { activities, loading: actLoad, addActivity } = useActivities(lead.id);
  const { allStages = [], getStageColor = () => "#64748b", loading: stageLoad = false } = stagesData || {};
  const [form, setForm] = useState({ ...lead });
  const [newAct, setNewAct] = useState("");
  const [actType, setActType] = useState("email");
  const [saving, setSaving] = useState(false);
  
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const sdrs = allUsers.filter(u => u.role?.toLowerCase() === "sdr" || u.role?.toLowerCase() === "vendedor");
  const closers = allUsers.filter(u => u.role?.toLowerCase() === "closer" || u.role?.toLowerCase() === "vendedor");
  const userRole = profile?.role?.toLowerCase();
  const canEdit = userRole === "admin" || profile?.id === lead.sdr_id || profile?.id === lead.closer_id;

  const handleSave = async () => {
    setSaving(true);
    await onSave(lead.id, { 
        nome_lead: form.nome_lead, empresa: form.empresa, telefone: form.telefone, 
        email: form.email, temperatura: form.temperatura, qualidade: form.qualidade, 
        observacoes: form.observacoes, status: form.status, deal_value: Number(form.deal_value) || 0, 
        meeting_date: form.meeting_date || null, sdr_id: form.sdr_id || null, closer_id: form.closer_id || null 
    });
    setSaving(false); 
    onClose();
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(10px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#080e1d", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 18, width: "100%", maxWidth: 640, maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "18px 22px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: "#f1f5f9", margin: 0 }}>{lead.nome_lead}</h2>
              {stageLoad ? <Spinner size={14} /> : (
                <Badge color={getStageColor(lead.status)} bg={`${getStageColor(lead.status)}18`}>{lead.status}</Badge>
              )}
            </div>
            <p style={{ fontSize: 12, color: "#334155", margin: "3px 0 0" }}>{lead.empresa}</p>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.06)", border: "none", color: "#475569", cursor: "pointer", borderRadius: 8, width: 30, height: 30, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: "16px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
          {canEdit ? (
            <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 12, padding: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[["Nome", "nome_lead", "text"], ["Empresa", "empresa", "text"], ["Telefone", "telefone", "text"], ["Email", "email", "email"], ["Valor", "deal_value", "number"], ["Reunião", "meeting_date", "date"]].map(([l, k, t]) => (
                <div key={k}><label style={{ display: "block", fontSize: 11, color: "#334155", marginBottom: 3 }}>{l}</label><input type={t} value={form[k] || ""} onChange={set(k)} style={INP} /></div>
              ))}
              {[["Temperatura", "temperatura", ["Quente", "Morno", "Frio"]], ["Qualidade", "qualidade", ["Alta", "Média", "Baixa"]], ["Status", "status", allStages]].map(([l, k, opts]) => (
                <div key={k}><label style={{ display: "block", fontSize: 11, color: "#334155", marginBottom: 3 }}>{l}</label><select value={form[k] || ""} onChange={set(k)} style={INP}>{opts.map(o => <option key={o}>{o}</option>)}</select></div>
              ))}
              {userRole === "admin" && (
                <>
                  <div><label style={{ display: "block", fontSize: 11, color: "#334155", marginBottom: 3 }}>SDR</label><select value={form.sdr_id || ""} onChange={set("sdr_id")} style={INP}><option value="">— Nenhum —</option>{sdrs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                  <div><label style={{ display: "block", fontSize: 11, color: "#334155", marginBottom: 3 }}>Closer</label><select value={form.closer_id || ""} onChange={set("closer_id")} style={INP}><option value="">— Nenhum —</option>{closers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                </>
              )}
              <div style={{ gridColumn: "1/-1" }}><label style={{ display: "block", fontSize: 11, color: "#334155", marginBottom: 3 }}>Observações</label><textarea value={form.observacoes || ""} onChange={set("observacoes")} rows={2} style={{ ...INP, resize: "vertical" }} /></div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[["Empresa", lead.empresa], ["Telefone", lead.telefone || "—"], ["Temperatura", lead.temperatura], ["Valor", fmt(lead.deal_value)], ["Última interação", lead.last_interaction || "—"], ["Status", lead.status]].map(([k, v]) => (
                <div key={k} style={{ background: "rgba(255,255,255,0.02)", borderRadius: 9, padding: "9px 11px" }}>
                  <div style={{ fontSize: 10, color: "#1e293b", marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.04em" }}>{k}</div>
                  <div style={{ fontSize: 13, color: "#94a3b8", fontWeight: 600 }}>{v}</div>
                </div>
              ))}
            </div>
          )}

          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#1e293b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 9 }}>Histórico de Atividades</div>
            {actLoad ? <Spinner /> : activities.length === 0 ? <div style={{ fontSize: 12, color: "#1e293b" }}>Nenhuma atividade ainda.</div> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {activities.map(a => (
                  <div key={a.id} style={{ display: "flex", gap: 9 }}>
                    <div style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0 }}>{actIcon(a.type)}</div>
                    <div>
                      <div style={{ fontSize: 12, color: "#94a3b8" }}>{a.description}</div>
                      <div style={{ fontSize: 10, color: "#1e293b" }}>{a.profiles?.name || "—"} · {new Date(a.created_at).toLocaleString("pt-BR")}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ marginTop: 11, display: "flex", gap: 7 }}>
              <select value={actType} onChange={e => setActType(e.target.value)} style={{ ...INP, width: "auto", flexShrink: 0 }}>
                <option value="email">✉ Email</option><option value="call">📞 Ligação</option><option value="meeting">📅 Reunião</option><option value="note">📝 Nota</option>
              </select>
              <input value={newAct} onChange={e => setNewAct(e.target.value)} onKeyDown={e => e.key === "Enter" && newAct.trim() && addActivity(actType, newAct.trim(), profile?.id).then(() => setNewAct(""))} placeholder="Descrever atividade..." style={INP} />
              <button onClick={() => newAct.trim() && addActivity(actType, newAct.trim(), profile?.id).then(() => setNewAct(""))} style={{ background: "#6366f1", border: "none", color: "#fff", borderRadius: 8, padding: "7px 12px", cursor: "pointer", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>+</button>
            </div>
          </div>
        </div>

        {canEdit && (
          <div style={{ padding: "13px 22px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "flex-end", gap: 8, flexShrink: 0 }}>
            <button onClick={onClose} style={{ background: "rgba(255,255,255,0.05)", border: "none", color: "#475569", borderRadius: 9, padding: "7px 15px", cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>Cancelar</button>
            <button onClick={handleSave} disabled={saving} style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", color: "#fff", borderRadius: 9, padding: "7px 17px", cursor: "pointer", fontSize: 12, fontWeight: 700, display: "flex", gap: 6, alignItems: "center", fontFamily: "inherit" }}>
              {saving && <Spinner size={13} color="#fff" />}{saving ? "Salvando..." : "Salvar alterações"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
