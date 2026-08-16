import {
  useState,
} from "react";

import {
  Outlet,
} from "react-router-dom";

import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

import {
  useAuth,
} from "../../context/AuthContext";

export default function AppLayout() {

  const [
    sidebarOpen,
    setSidebarOpen,
  ] = useState(false);

  const {
    user,
    logout,
  } = useAuth();

  function handleLogout() {

    logout();

  }

  return (
    <div className="flex min-h-screen bg-slate-50">

      <Sidebar
        open={sidebarOpen}
        onClose={() =>
          setSidebarOpen(false)
        }
      />

      <div className="flex min-w-0 flex-1 flex-col">

        <Topbar
          onMenuClick={() =>
            setSidebarOpen(true)
          }
          onLogout={handleLogout}
          user={user}
        />

        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">

          <Outlet />

        </main>

      </div>

    </div>
  );
}