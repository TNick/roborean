import { HashRouter, Route, Routes } from "react-router-dom";
import { HomePage } from "./pages/HomePage.js";
import { ProjectEditPage } from "./pages/ProjectEditPage.js";
import { ProjectListPage } from "./pages/ProjectListPage.js";
import { RunDetailPage } from "./pages/RunDetailPage.js";
import { TemplatesLibraryPage } from "./pages/TemplatesLibraryPage.js";

/**
 * Application routes using a hash router for static hosting.
 *
 * @returns Router element.
 */
export function AppRoutes() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/projects" element={<ProjectListPage />} />
        <Route path="/projects/:source/:id" element={<ProjectEditPage />} />
        <Route path="/runs/:source/:runId" element={<RunDetailPage />} />
        <Route path="/templates" element={<TemplatesLibraryPage />} />
      </Routes>
    </HashRouter>
  );
}
