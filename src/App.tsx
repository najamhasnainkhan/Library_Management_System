import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth, type Role } from "./auth";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Staff from "./pages/Staff";
import Books from "./pages/Books";
import Members from "./pages/Members";
import MemberProfile from "./pages/MemberProfile";
import Loans from "./pages/Loans";
import Reservations from "./pages/Reservations";
import Fines from "./pages/Fines";
import Forbidden from "./pages/Forbidden";
import type { ReactElement } from "react";

function Protected({ roles, children }: { roles?: Role[]; children: ReactElement }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8 text-slate-500">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Forbidden />;
  return children;
}

export default function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="books" element={<Books />} />
        <Route path="loans" element={<Loans />} />
        <Route path="reservations" element={<Reservations />} />
        <Route path="fines" element={<Fines />} />
        <Route path="members" element={<Members />} />
        <Route path="members/:id" element={<MemberProfile />} />
        <Route
          path="staff"
          element={
            <Protected roles={["admin"]}>
              <Staff />
            </Protected>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
