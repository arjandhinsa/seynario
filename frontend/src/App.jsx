import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth.jsx";
import LoginScreen from "./components/LoginScreen.jsx";
import HomeScreen from "./components/HomeScreen.jsx";
import ScanScreen from "./components/ScanScreen.jsx";
import WardrobeScreen from "./components/WardrobeScreen.jsx";
import ScenarioScreen from "./components/ScenarioScreen.jsx";
import OutfitDetail from "./components/OutfitDetail.jsx";
import ProfileScreen from "./components/ProfileScreen.jsx";
import DemoScenarioPicker from "./components/DemoScenarioPicker.jsx";
import DemoOutfitDetail from "./components/DemoOutfitDetail.jsx";

function AuthedRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomeScreen />} />
      <Route path="/scan" element={<ScanScreen />} />
      <Route path="/wardrobe" element={<WardrobeScreen />} />
      <Route path="/scenario/:scenarioId" element={<ScenarioScreen />} />
      <Route path="/outfit/:outfitId" element={<OutfitDetail />} />
      <Route path="/profile" element={<ProfileScreen />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function AppRoutes() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <Routes>
      <Route path="/demo" element={<DemoScenarioPicker />} />
      <Route path="/demo/scenarios/:scenarioId" element={<DemoOutfitDetail />} />
      <Route
        path="*"
        element={user ? <AuthedRoutes /> : <LoginScreen onSuccess={() => navigate("/")} />}
      />
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
