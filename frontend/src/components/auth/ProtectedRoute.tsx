import {
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";

import { useAuth } from "../../context/AuthContext";

interface ProtectedRouteProps {
  permission?: string;
}

export default function ProtectedRoute({
  permission,
}: ProtectedRouteProps) {

  const {
    user,
    isAuthenticated,
    loading,
  } = useAuth();

  const location = useLocation();

  /*
   * Wait for authentication
   */
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">

        <div className="text-center">

          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />

          <p className="mt-4 text-sm text-slate-500">
            Loading...
          </p>

        </div>

      </div>
    );
  }

  /*
   * Not authenticated
   */
  if (!isAuthenticated) {

    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location,
        }}
      />
    );
  }

  /*
   * Administrator has access to everything
   */
  if (
    user?.is_admin === true ||
    user?.is_superuser === true
  ) {
    return <Outlet />;
  }

  /*
   * No module permission required
   */
  if (!permission) {
    return <Outlet />;
  }

  /*
   * Check module permission
   */
  const permissions =
    Array.isArray(user?.permissions)
      ? user.permissions
      : [];

  const hasPermission =
    permissions.includes(permission);

  /*
   * Permission denied
   */
  if (!hasPermission) {

    return (
      <div className="flex min-h-[70vh] items-center justify-center">

        <div className="text-center">

          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100">

            <span className="text-3xl text-red-600">
              !
            </span>

          </div>

          <h1 className="mt-6 text-2xl font-bold text-slate-900">
            Access Denied
          </h1>

          <p className="mt-2 text-slate-500">
            You do not have permission to access this module.
          </p>

          <button
            type="button"
            onClick={() => {
              window.location.href = "/";
            }}
            className="mt-6 rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Go to Dashboard
          </button>

        </div>

      </div>
    );
  }

  return <Outlet />;
}