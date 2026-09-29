import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ExerciseDetailPage } from "./pages/ExerciseDetailPage";
import { ExerciseFormPage } from "./pages/ExerciseFormPage";
import { ExercisesPage } from "./pages/ExercisesPage";
import { HomePage } from "./pages/HomePage";
import { IntervalTrainerPage } from "./pages/IntervalTrainerPage";
import { MetronomePage } from "./pages/MetronomePage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { ToolsPage } from "./pages/ToolsPage";

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="tools" element={<ToolsPage />} />
        <Route path="tools/metronome" element={<MetronomePage />} />
        <Route path="tools/interval-trainer" element={<IntervalTrainerPage />} />
        <Route path="exercises" element={<ExercisesPage />} />
        <Route path="exercises/new" element={<ExerciseFormPage />} />
        <Route path="exercises/:exerciseId" element={<ExerciseDetailPage />} />
        <Route path="exercises/:exerciseId/edit" element={<ExerciseFormPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
