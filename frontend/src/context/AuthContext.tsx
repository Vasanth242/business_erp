import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import api from "../services/api";

import {
  getAccessToken,
  login as loginService,
  logout as logoutService,
} from "../services/auth";


/*
|--------------------------------------------------------------------------
| AUTH USER
|--------------------------------------------------------------------------
*/

export interface AuthUser {

  id: number;

  username: string;

  name?: string;

  email?: string;

  first_name?: string;

  last_name?: string;

  is_active?: boolean;

  is_admin?: boolean;

  is_staff?: boolean;

  is_superuser?: boolean;

  is_locked?: boolean;

  role?:
    | string
    | {
        id: number;
        name: string;
      }
    | null;

  permissions?: string[];

  password_policy?:
    | null
    | {
        id: number;
        name: string;
      };

}


/*
|--------------------------------------------------------------------------
| AUTH CONTEXT TYPE
|--------------------------------------------------------------------------
*/

interface AuthContextType {

  user: AuthUser | null;

  loading: boolean;

  isAuthenticated: boolean;

  login: (
    username: string,
    password: string
  ) => Promise<void>;

  logout: () => void;

  hasPermission: (
    permission: string
  ) => boolean;

  hasAnyPermission: (
    permissions: string[]
  ) => boolean;

  hasAllPermissions: (
    permissions: string[]
  ) => boolean;

}


/*
|--------------------------------------------------------------------------
| CONTEXT
|--------------------------------------------------------------------------
*/

const AuthContext =
  createContext<
    AuthContextType | undefined
  >(undefined);


/*
|--------------------------------------------------------------------------
| PROVIDER PROPS
|--------------------------------------------------------------------------
*/

interface AuthProviderProps {

  children: ReactNode;

}


/*
|--------------------------------------------------------------------------
| AUTH PROVIDER
|--------------------------------------------------------------------------
*/

export function AuthProvider({
  children,
}: AuthProviderProps) {

  const [user, setUser] =
    useState<AuthUser | null>(
      null
    );


  const [loading, setLoading] =
    useState<boolean>(
      true
    );


  /*
  |--------------------------------------------------------------------------
  | LOAD CURRENT USER
  |--------------------------------------------------------------------------
  */

  useEffect(() => {

    loadCurrentUser();

  }, []);


  async function loadCurrentUser() {

    const token =
      getAccessToken();


    /*
    |--------------------------------------------------------------------------
    | No access token
    |--------------------------------------------------------------------------
    */

    if (!token) {

      setUser(null);

      setLoading(false);

      return;

    }


    /*
    |--------------------------------------------------------------------------
    | Get current user from backend
    |--------------------------------------------------------------------------
    */

    try {

      const response =
        await api.get<AuthUser>(
          "/auth/me/"
        );


      setUser(
        response.data
      );

    } catch {

      /*
       * Token is invalid/expired
       * and could not be refreshed.
       */

      logoutService();

      setUser(null);

    } finally {

      setLoading(false);

    }

  }


  /*
  |--------------------------------------------------------------------------
  | LOGIN
  |--------------------------------------------------------------------------
  */

  async function login(
    username: string,
    password: string
  ): Promise<void> {

    /*
     * Login service obtains:
     *
     * access_token
     * refresh_token
     */

    await loginService(
      username,
      password
    );


    /*
     * Retrieve complete user
     * information from backend.
     *
     * User information is NOT
     * saved in localStorage.
     */

    const response =
      await api.get<AuthUser>(
        "/auth/me/"
      );


    setUser(
      response.data
    );

  }


  /*
  |--------------------------------------------------------------------------
  | LOGOUT
  |--------------------------------------------------------------------------
  */

  function logout(): void {

    logoutService();

    setUser(null);

    window.location.href =
      "/login";

  }


  /*
  |--------------------------------------------------------------------------
  | HAS PERMISSION
  |--------------------------------------------------------------------------
  */

  function hasPermission(
    permission: string
  ): boolean {

    /*
     * No logged-in user.
     */

    if (!user) {

      return false;

    }


    /*
     * Administrator/superuser
     * receives complete access.
     */

    if (
      user.is_superuser === true ||
      user.is_admin === true
    ) {

      return true;

    }


    /*
     * Normal users receive
     * permissions from their role.
     */

    return (
      user.permissions?.includes(
        permission
      ) ?? false
    );

  }


  /*
  |--------------------------------------------------------------------------
  | HAS ANY PERMISSION
  |--------------------------------------------------------------------------
  */

  function hasAnyPermission(
    permissions: string[]
  ): boolean {

    return permissions.some(
      (
        permission
      ) =>
        hasPermission(
          permission
        )
    );

  }


  /*
  |--------------------------------------------------------------------------
  | HAS ALL PERMISSIONS
  |--------------------------------------------------------------------------
  */

  function hasAllPermissions(
    permissions: string[]
  ): boolean {

    return permissions.every(
      (
        permission
      ) =>
        hasPermission(
          permission
        )
    );

  }


  /*
  |--------------------------------------------------------------------------
  | CONTEXT VALUE
  |--------------------------------------------------------------------------
  */

  const contextValue:
    AuthContextType = {

    user,

    loading,

    isAuthenticated:
      Boolean(user),

    login,

    logout,

    hasPermission,

    hasAnyPermission,

    hasAllPermissions,

  };


  /*
  |--------------------------------------------------------------------------
  | PROVIDER
  |--------------------------------------------------------------------------
  */

  return (

    <AuthContext.Provider
      value={contextValue}
    >

      {children}

    </AuthContext.Provider>

  );

}


/*
|--------------------------------------------------------------------------
| USE AUTH
|--------------------------------------------------------------------------
*/

export function useAuth() {

  const context =
    useContext(
      AuthContext
    );


  if (!context) {

    throw new Error(
      "useAuth must be used inside AuthProvider"
    );

  }


  return context;

}