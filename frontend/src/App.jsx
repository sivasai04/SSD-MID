import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import DashboardParticipant from "./pages/DashboardParticipant";
import DashboardInstructor from "./pages/DashboardInstructor";
import SessionView from "./pages/SessionView";
import { useAuthContext } from "./context/AuthContext";

export default function App() {
  const { user } = useAuthContext();
  console.log("user in App.jsx", user);

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to={user.role === "instructor" ? "/instructor" : "/dashboard"} /> : <Login />} />
      <Route path="/dashboard" element={user ? <DashboardParticipant /> : <Navigate to="/" />} />
      <Route path="/instructor" element={user && user.role === "instructor" ? <DashboardInstructor /> : <Navigate to="/" />} />
      <Route path="/session/:sessionId" element={user ? <SessionView /> : <Navigate to="/" />} />
      <Route path="*" element={<div style={{padding:20}}>404 - Not Found</div>} />
    </Routes>
  );
}
