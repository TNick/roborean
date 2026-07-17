import { useEffect, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import Button from "@mui/material/Button";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { Project } from "@roborean/spec";
import type { ProjectSummary } from "@roborean/api-types";
import { createClient } from "../api/createClient.js";

export function ProjectListPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [openingExample, setOpeningExample] = useState(false);
  useEffect(() => {
    createClient()
      .listProjects()
      .then(setProjects)
      .catch(() => setProjects([]));
  }, []);

  async function openSetAndCopyExample() {
    setOpeningExample(true);
    try {
      const response = await fetch("/examples/02_set_and_copy.json");
      const project = (await response.json()) as Project;
      const created = await createClient().createProject({ project });
      const id = (created.project as Project).id;
      navigate(`/projects/${id}`);
    } finally {
      setOpeningExample(false);
    }
  }

  return (
    <Stack sx={{ p: 3 }} spacing={2}>
      <Typography variant="h5">Projects</Typography>
      <Button
        variant="outlined"
        disabled={openingExample}
        onClick={() => void openSetAndCopyExample()}
      >
        Open set-and-copy example
      </Button>
      <List>
        {projects.map((project) => (
          <ListItem key={project.id} disablePadding>
            <ListItemButton
              component={RouterLink}
              to={`/projects/${project.id}`}
            >
              <ListItemText primary={project.name} secondary={project.id} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Stack>
  );
}
