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

  const addActivity = async (type, description, createdBy) => {
    const { data } = await supabase.from("lead_activities")
      .insert([{ lead_id: leadId, type, description, created_by: createdBy }])
      .select("id,type,description,created_at,created_by,profiles(name)").single();
    if (data) setActivities(prev => [data, ...prev]);
  };

  return { activities, loading, addActivity };
}
