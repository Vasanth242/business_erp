import api from "./api";


export interface LoginResponse {
  access: string;
  refresh: string;
}


export interface AuthUser {
  id: number;

  username: string;

  email?: string;

  first_name?: string;

  last_name?: string;

  name?: string;

  is_active?: boolean;

  is_staff?: boolean;

  is_superuser?: boolean;

  is_admin?: boolean;

  is_locked?: boolean;

  role?:
    | {
        id: number;
        name: string;
      }
    | string
    | null;

  permissions?: string[];

  password_policy?:
    | {
        id: number;
        name: string;
      }
    | null;
}


/*
|--------------------------------------------------------------------------
| LOGIN
|--------------------------------------------------------------------------
*/

export async function login(
  username: string,
  password: string
): Promise<LoginResponse> {

  const response =
    await api.post<LoginResponse>(
      "/auth/token/",
      {
        username,
        password,
      }
    );


  localStorage.setItem(
    "access_token",
    response.data.access
  );


  localStorage.setItem(
    "refresh_token",
    response.data.refresh
  );


  return response.data;
}


/*
|--------------------------------------------------------------------------
| LOGOUT
|--------------------------------------------------------------------------
*/

export function logout(): void {

  localStorage.removeItem(
    "access_token"
  );

  localStorage.removeItem(
    "refresh_token"
  );
}


/*
|--------------------------------------------------------------------------
| ACCESS TOKEN
|--------------------------------------------------------------------------
*/

export function getAccessToken(): string | null {

  return localStorage.getItem(
    "access_token"
  );
}


/*
|--------------------------------------------------------------------------
| REFRESH TOKEN
|--------------------------------------------------------------------------
*/

export function getRefreshToken(): string | null {

  return localStorage.getItem(
    "refresh_token"
  );
}


/*
|--------------------------------------------------------------------------
| AUTHENTICATION STATUS
|--------------------------------------------------------------------------
*/

export function isAuthenticated(): boolean {

  return Boolean(
    getAccessToken()
  );
}