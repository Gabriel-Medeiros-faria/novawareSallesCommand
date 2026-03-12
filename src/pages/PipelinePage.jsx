import { useState, useEffect } from "react";
import { SDR_STAGES, CLOSER_STAGES } from "../utils/constants";
import { KanbanCol } from "../components/kanban/KanbanCol";

export function PipelinePage({ leads, updateLead, pipelineType, onOpen, allUsers }) {
  const stages = pipelineType === "sdr" ? SDR_STAGES : CLOSER_STAGES;
  const visibleLeads = s => leads.filter(l => l.status === s);
  const handleDrop = async (id, stage) => { if (id) await updateLead(id, { status: stage }); };

  // Drag-to-scroll logic
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const scrollContainerRef = useState({ current: null })[0];

  useEffect(() => {
    const handleGlobalMouseMove = (e) => {
        if (!isDragging || !scrollContainerRef.current) return;
        e.preventDefault();
        const x = e.pageX - scrollContainerRef.current.offsetLeft;
        const walk = (x - startX) * 1.5;
        scrollContainerRef.current.scrollLeft = scrollLeft - walk;
    };

    const handleGlobalMouseUp = () => {
        setIsDragging(false);
    };

    if (isDragging) {
        window.addEventListener("mousemove", handleGlobalMouseMove);
        window.addEventListener("mouseup", handleGlobalMouseUp);
    }

    return () => {
        window.removeEventListener("mousemove", handleGlobalMouseMove);
        window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [isDragging, startX, scrollLeft]);

  const onMouseDown = (e) => {
    if (e.target.closest('.kanban-card') || e.target.closest('button')) return;
    setIsDragging(true);
    setStartX(e.pageX - e.currentTarget.offsetLeft);
    setScrollLeft(e.currentTarget.scrollLeft);
  };

  // Auto-scroll on drag logic
  const autoScroll = (e) => {
    const container = e.currentTarget;
    const { left, width } = container.getBoundingClientRect();
    const x = e.clientX - left;
    const edgeSize = 100;
    const speed = 15;

    if (x < edgeSize) {
      container.scrollLeft -= speed;
    } else if (x > width - edgeSize) {
      container.scrollLeft += speed;
    }
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ marginBottom: 32, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: "#f1f5f9", margin: "0 0 8px", letterSpacing: "-1px", textTransform: "uppercase" }}>PIPELINE {pipelineType}</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ fontSize: 13, color: "#475569", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {pipelineType === "sdr" ? "QUALIFICAÇÃO TÁTICA" : "FECHAMENTO ESTRATÉGICO"}
            </div>
            <div style={{ width: 1, height: 12, background: "rgba(255,255,255,0.1)" }} />
            <div style={{ fontSize: 13, color: "#6366f1", fontWeight: 900 }}>{leads.length} LEADS ATIVOS</div>
          </div>
        </div>
      </div>
      
      <style>{`
        .pipeline-scroll::-webkit-scrollbar { height: 6px; }
        .pipeline-scroll::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); }
        .pipeline-scroll::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.2); border-radius: 3px; }
        .pipeline-scroll::-webkit-scrollbar-thumb:hover { background: rgba(99,102,241,0.4); }
        .pipeline-scroll:active { cursor: grabbing; }
      `}</style>
      
      <div 
        ref={scrollContainerRef}
        className="pipeline-scroll" 
        onMouseDown={onMouseDown}
        onDragOver={(e) => { e.preventDefault(); autoScroll(e); }}
        style={{ 
            flex: 1, 
            display: "flex", 
            gap: 20, 
            overflowX: "auto", 
            overflowY: "hidden", 
            paddingBottom: 20, 
            minHeight: 0, 
            cursor: isDragging ? "grabbing" : "grab",
            userSelect: isDragging ? "none" : "auto" 
        }}
      >
        {stages.map(stage => (
            <KanbanCol 
                key={stage} 
                stage={stage} 
                leads={visibleLeads(stage)} 
                onOpen={onOpen} 
                onDrop={handleDrop} 
                allUsers={allUsers} 
            />
        ))}
      </div>
    </div>
  );
}
