import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { RunDetail } from "@roborean/api-types";
import { createClient } from "../api/createClient.js";

export function RunDetailPage() {
  const { runId = "" } = useParams();
  const [run, setRun] = useState<RunDetail | null>(null);
  useEffect(() => {
    createClient()
      .getRun(runId)
      .then(setRun)
      .catch(() => setRun(null));
  }, [runId]);
  return (
    <Stack sx={{ p: 3 }} spacing={1}>
      <Typography variant="h5">Run {runId}</Typography>
      <Typography variant="body2">
        Status: {run?.status ?? "loading"}
      </Typography>
    </Stack>
  );
}
