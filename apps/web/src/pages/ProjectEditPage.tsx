import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import type { Project } from "@roborean/spec";
import { ProjectEditor } from "@roborean/editor";
import { createClient } from "../api/createClient.js";
import { API_BASE_URL } from "../config.js";

export function ProjectEditPage() {
  const { id = "" } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  useEffect(() => {
    createClient()
      .getProject(id)
      .then((detail) => setProject(detail.project as Project))
      .catch(() => setProject(null));
  }, [id]);
  if (!project) {
    return (
      <Stack alignItems="center" sx={{ p: 4 }}>
        <CircularProgress />
      </Stack>
    );
  }
  return (
    <Stack sx={{ p: 2 }}>
      <ProjectEditor project={project} projectId={id} apiBaseUrl={API_BASE_URL} />
    </Stack>
  );
}
