import { BrowserRouter, Route, Routes } from "react-router-dom";
import { HomePage } from "./pages/HomePage.js";
import { ProjectEditPage } from "./pages/ProjectEditPage.js";
import { ProjectListPage } from "./pages/ProjectListPage.js";
import { RunDetailPage } from "./pages/RunDetailPage.js";

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/projects" element={<ProjectListPage />} />
        <Route path="/projects/:id" element={<ProjectEditPage />} />
        <Route path="/runs/:runId" element={<RunDetailPage />} />
      </Routes>
    </BrowserRouter>
  );
}
