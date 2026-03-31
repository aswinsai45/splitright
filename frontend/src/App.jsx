import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import AuthCallback from "./pages/AuthCallback";
import Dashboard from "./pages/Dashboard";
import GroupDetail from "./pages/GroupDetail";
import AddExpense from "./pages/AddExpense";
import SettleUp from "./pages/SettleUp";
import JoinGroup from "./pages/JoinGroup";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/group/:id" element={<GroupDetail />} />
      <Route path="/group/:id/add" element={<AddExpense />} />
      <Route path="/group/:id/settle" element={<SettleUp />} />
      <Route path="/join/:token" element={<JoinGroup />} />
    </Routes>
  );
}

export default App;
