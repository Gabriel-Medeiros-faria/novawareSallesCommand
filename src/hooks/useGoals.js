import { useState, useEffect } from "react";
import supabase from "../lib/supabase";

export function useGoals(profile) {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    supabase.from("goals").select("*").order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setGoals(data);
        setLoading(false);
      });
  }, [profile]);

  const createGoal = async (payload) => {
    const { data, error } = await supabase.from("goals").insert([payload]).select().single();
    if (data) setGoals(prev => [data, ...prev]);
    return { data, error };
  };

  const updateGoal = async (id, payload) => {
    const { data, error } = await supabase.from("goals").update(payload).eq("id", id).select().single();
    if (data) setGoals(prev => prev.map(g => g.id === id ? data : g));
    return { data, error };
  };

  const deleteGoal = async (id) => {
    const { error } = await supabase.from("goals").delete().eq("id", id);
    if (!error) setGoals(prev => prev.filter(g => g.id !== id));
    return { error };
  };

  return { goals, loading, createGoal, updateGoal, deleteGoal };
}
