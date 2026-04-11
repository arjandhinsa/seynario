import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth.jsx";
import LoginScreen from "./components/LoginScreen.jsx";
// import HomeScreen from "./components/HomeScreen.jsx";
// import WardrobeScreen from "./components/WardrobeScreen.jsx";
// import ScanScreen from "./components/ScanScreen.jsx";
// import ScenarioScreen from "./components/ScenarioScreen.jsx";
// import OutfitDetail from "./components/OutfitDetail.jsx";

function AppRoutes() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return <LoginScreen onSuccess={() => navigate("/")} />;
  }

  return (
    <Routes>
      {/* <Route path="/" element={<HomeScreen />} /> */}
      {/* <Route path="/wardrobe" element={<WardrobeScreen />} /> */}
      {/* <Route path="/scan" element={<ScanScreen />} /> */}
      {/* <Route path="/scenario/:scenarioId" element={<ScenarioScreen />} /> */}
      {/* <Route path="/outfit/:outfitId" element={<OutfitDetail />} /> */}
      <Route path="/" element={
        <div style={{ padding: 40, textAlign: "center" }}>
          <h1 style={{ color: "var(--accent-light)" }}>Seynario</h1>
          <p style={{ color: "var(--text-muted)", marginTop: 8 }}>Dress for the scenario. Coming soon.</p>
        </div>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
