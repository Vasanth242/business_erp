import axios from "axios";


const API_URL =
  "http://127.0.0.1:8000/api";


interface LoginResponse {
  access: string;
  refresh: string;
}


export async function login(
  username: string,
  password: string
) {

  const response =
    await axios.post<LoginResponse>(
      `${API_URL}/auth/token/`,
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


export function logout() {

  localStorage.removeItem(
    "access_token"
  );

  localStorage.removeItem(
    "refresh_token"
  );

}


export function isAuthenticated() {

  return Boolean(
    localStorage.getItem(
      "access_token"
    )
  );

}