import { useState, useEffect } from "react";

export function useCurrentProjectId() {
  const [projectId, setProjectId] = useState<number | null>(() => {
    const stored = localStorage.getItem("currentProjectId");
    return stored ? parseInt(stored, 10) : null;
  });

  const setProject = (id: number) => {
    localStorage.setItem("currentProjectId", String(id));
    setProjectId(id);
  };

  const clearProject = () => {
    localStorage.removeItem("currentProjectId");
    setProjectId(null);
  };

  return { projectId, setProject, clearProject };
}
