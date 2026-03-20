import { useState, useEffect, useCallback, useMemo } from "react";
import supabase from "../lib/supabase";

export function useStages() {
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchStages = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("pipeline_stages")
      .select("*")
      .order("order_index", { ascending: true });

    if (error) {
      console.error("Error fetching stages:", error);
    } else if (data) {
      setStages(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStages();
  }, [fetchStages]);

  const sdrStages = useMemo(() => stages.filter(s => s.pipeline_type === "sdr"), [stages]);
  const closerStages = useMemo(() => stages.filter(s => s.pipeline_type === "closer"), [stages]);
  const allStages = useMemo(() => [...new Set(stages.map(s => s.name))], [stages]);
  const handoffStages = useMemo(() => stages.filter(s => s.is_handoff).map(s => s.name), [stages]);

  const getStageColor = useCallback((name) => {
    const stage = stages.find(s => s.name === name);
    return stage?.color || "#6b7280";
  }, [stages]);

  return { 
    stages, 
    sdrStages, 
    closerStages, 
    allStages, 
    handoffStages,
    getStageColor,
    loading, 
    refreshStages: fetchStages 
  };
}
