import { useState, useEffect } from "react";
import supabase from "../lib/supabase";

export function useActivities(leadId) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!leadId) return;
    setLoading(true);
    supabase.from("lead_activities").select("id,type,description,created_at,created_by,profiles(name)")
      .eq("lead_id", leadId).order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setActivities(data);
        setLoading(false);
      });
  }, [leadId]);

  const addActivity = async (type, description, profile) => {
    const { data } = await supabase.from("lead_activities")
      .insert([{ lead_id: leadId, type, description, created_by: profile?.id }])
      .select("id,type,description,created_at,created_by,profiles(name)").single();
    
    if (data) {
      setActivities(prev => [data, ...prev]);
      
      // Auto-claiming logic: If closer interacts with an unclaimed lead in specific stages, they claim it
      if (profile.role?.toLowerCase() === "closer") {
        const { data: lead } = await supabase.from("leads").select("closer_id,status").eq("id", leadId).single();
        const handoffStages = ["Follow-up", "Reunião Agendada"];
        if (lead && !lead.closer_id && handoffStages.includes(lead.status)) {
          await supabase.from("leads").update({ closer_id: profile.id }).eq("id", leadId);
        }
      }
    }
  };

  return { activities, loading, addActivity };
}
