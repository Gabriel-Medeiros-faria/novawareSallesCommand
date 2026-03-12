import { useState } from "react";
import { Spinner, Badge, Avatar, Drawer, Field } from "../ui/Atoms";
import { useActivities } from "../../hooks/useActivities";
import { ALL_STAGES, stageColor, fmt, actIcon, INP } from "../../utils/constants";

export function LeadDrawer({ open, onClose, lead, onSave, profile, allUsers }) {
  if (!lead) return null;
  
  const { activities, loading: actLoad, addActivity } = useActivities(lead.id);
  const [form, setForm] = useState({ ...lead });
  const [newAct, setNewAct] = useState("");
  const [actType, setActType] = useState("email");
  const [saving, setSaving] = useState(false);
  
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const sdrs = allUsers.filter(u => u.role === "sdr");
  const closers = allUsers.filter(u => u.role === "closer");
  const canEdit = profile?.role === "admin" || profile?.id === lead.sdr_id || profile?.id === lead.closer_id;

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

  const SECTION_TITLE = { fontSize: 10, fontWeight: 900, color: "#1e293b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 };

  return (
    <Drawer open={open} onClose={onClose} title={lead.nome_lead || "Detalhes do Lead"}>
      <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
        
        {/* Header/Status Info */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", padding: 16, borderRadius: 2 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 10, color: "#475569", fontWeight: 800 }}>STATUS ATUAL</span>
                <Badge color={stageColor(lead.status)} bg={`${stageColor(lead.status)}05`} border={`1px solid ${stageColor(lead.status)}33`}>{lead.status}</Badge>
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#f1f5f9", letterSpacing: "-1px" }}>{fmt(lead.deal_value)}</div>
        </div>

        {/* Lead Information */}
        <div>
          <div style={SECTION_TITLE}>
            <span style={{ width: 4, height: 4, background: "#6366f1" }} />
            Informações do Lead
          </div>
          {canEdit ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Field label="Nome"><input type="text" value={form.nome_lead || ""} onChange={set("nome_lead")} style={INP} /></Field>
              <Field label="Empresa"><input type="text" value={form.empresa || ""} onChange={set("empresa")} style={INP} /></Field>
              <Field label="Telefone"><input type="text" value={form.telefone || ""} onChange={set("telefone")} style={INP} /></Field>
              <Field label="Email"><input type="email" value={form.email || ""} onChange={set("email")} style={INP} /></Field>
              <Field label="Valor Negócio"><input type="number" value={form.deal_value || ""} onChange={set("deal_value")} style={INP} /></Field>
              <Field label="Data Reunião"><input type="date" value={form.meeting_date || ""} onChange={set("meeting_date")} style={INP} /></Field>
              
              <Field label="Temperatura">
                <select value={form.temperatura || ""} onChange={set("temperatura")} style={INP}>
                  {["Quente", "Morno", "Frio"].map(o => <option key={o}>{o}</option>)}
                </select>
              </Field>
              <Field label="Qualidade">
                <select value={form.qualidade || ""} onChange={set("qualidade")} style={INP}>
                  {["Alta", "Média", "Baixa"].map(o => <option key={o}>{o}</option>)}
                </select>
              </Field>
              
              <div style={{ gridColumn: "1/-1" }}>
                <Field label="Status Etapa">
                    <select value={form.status || ""} onChange={set("status")} style={INP}>
                    {ALL_STAGES.map(o => <option key={o}>{o}</option>)}
                    </select>
                </Field>
              </div>

              {profile?.role === "admin" && (
                <>
                  <Field label="Responsável SDR">
                    <select value={form.sdr_id || ""} onChange={set("sdr_id")} style={INP}>
                      <option value="">— Nenhum —</option>
                      {sdrs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Responsável Closer">
                    <select value={form.closer_id || ""} onChange={set("closer_id")} style={INP}>
                      <option value="">— Nenhum —</option>
                      {closers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </Field>
                </>
              )}
              
              <div style={{ gridColumn: "1/-1" }}>
                <Field label="Observações Táticas">
                  <textarea value={form.observacoes || ""} onChange={set("observacoes")} rows={3} style={{ ...INP, resize: "none" }} />
                </Field>
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[["Empresa", lead.empresa], ["Telefone", lead.telefone || "—"], ["Temperatura", lead.temperatura], ["Qualidade", lead.qualidade]].map(([k, v]) => (
                <div key={k} style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)", padding: 12, borderRadius: 2 }}>
                    <div style={{ fontSize: 9, color: "#475569", fontWeight: 800, textTransform: "uppercase", marginBottom: 4 }}>{k}</div>
                    <div style={{ fontSize: 13, color: "#94a3b8", fontWeight: 700 }}>{v}</div>
                </div>
                ))}
            </div>
          )}
        </div>

        {/* Activity Feed */}
        <div>
          <div style={SECTION_TITLE}>
            <span style={{ width: 4, height: 4, background: "#2dd4bf" }} />
            Registro de Atividade
          </div>
          
          <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 2, padding: 12, marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 8 }}>
                <select value={actType} onChange={e => setActType(e.target.value)} style={{ ...INP, width: "auto", border: "none", background: "rgba(255,255,255,0.03)", fontSize: 12 }}>
                    <option value="email">Email</option><option value="call">Call</option><option value="meeting">Meeting</option><option value="note">Note</option>
                </select>
                <input value={newAct} onChange={e => setNewAct(e.target.value)} onKeyDown={e => e.key === "Enter" && newAct.trim() && addActivity(actType, newAct.trim(), profile?.id).then(() => setNewAct(""))} placeholder="Nova anotação..." style={{ ...INP, border: "none", background: "transparent" }} />
                <button onClick={() => newAct.trim() && addActivity(actType, newAct.trim(), profile?.id).then(() => setNewAct(""))} style={{ background: "#6366f1", border: "none", color: "#fff", borderRadius: 2, width: 32, height: 32, cursor: "pointer", fontWeight: 900, transition: "transform 0.1s" }} active={{transform: "scale(0.95)"}}>+</button>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {actLoad ? <Spinner /> : activities.length === 0 ? <div style={{ fontSize: 12, color: "#334155", textAlign: "center", padding: 20 }}>Nenhum histórico registrado.</div> : (
              activities.map(a => (
                <div key={a.id} style={{ display: "flex", gap: 12 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 2, background: "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0, border: "1px solid rgba(255,255,255,0.05)" }}>{actIcon(a.type)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.4 }}>{a.description}</div>
                    <div style={{ fontSize: 9, color: "#334155", marginTop: 4, fontWeight: 700, textTransform: "uppercase" }}>{a.profiles?.name} · {new Date(a.created_at).toLocaleString("pt-BR", { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer Actions */}
        {canEdit && (
          <div style={{ marginTop: "auto", paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: 12 }}>
            <button onClick={onClose} style={{ flex: 1, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8", borderRadius: 2, padding: "12px", cursor: "pointer", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em" }}>Cancelar</button>
            <button onClick={handleSave} disabled={saving} style={{ flex: 2, background: "#6366f1", border: "none", color: "#fff", borderRadius: 2, padding: "12px", cursor: "pointer", fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", display: "flex", gap: 8, alignItems: "center", justifyContent: "center" }}>
              {saving && <Spinner size={14} color="#fff" />}
              {saving ? "PROCESSANDO..." : "SALVAR ALTERAÇÕES"}
            </button>
          </div>
        )}

      </div>
    </Drawer>
  );
}
