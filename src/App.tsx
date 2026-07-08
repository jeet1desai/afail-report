import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import DashboardLayout from "./layouts/DashboardLayout";
import Report82Page from "./pages/Report82Page";
import PlantsPage from "./pages/PlantsPage";
import MainSheetPage from "./pages/MainSheetPage";
import FailureReportStatePage from "./pages/FailureReportStatePage";
import PivotReportPage from "./pages/PivotReportPage";
import SummaryPage from "./pages/SummaryPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<Navigate to="/summary" replace />} />
          <Route path="summary" element={<SummaryPage />} />
          <Route path="82-report" element={<Report82Page />} />
          <Route path="plants" element={<PlantsPage />} />
          <Route path="main-sheet" element={<MainSheetPage />} />
          <Route path="failure-report-state" element={<FailureReportStatePage />} />
          <Route path="pivot-reports" element={<PivotReportPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
