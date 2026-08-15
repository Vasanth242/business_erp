import axios from "axios";


const api = axios.create({
  baseURL: "http://127.0.0.1:8000/api",

  headers: {
    "Content-Type": "application/json",
  },
});


api.interceptors.request.use(
  (config) => {

    const token =
      localStorage.getItem("access_token");

    if (token) {

      config.headers =
        config.headers ?? {};

      config.headers.Authorization =
        `Bearer ${token}`;
    }

    return config;
  },

  (error) => {
    return Promise.reject(error);
  }
);


api.interceptors.response.use(
  (response) => response,

  async (error) => {

    if (
      error.response?.status === 401
    ) {

      console.warn(
        "API authentication failed."
      );

      localStorage.removeItem(
        "access_token"
      );

      localStorage.removeItem(
        "refresh_token"
      );
    }

    return Promise.reject(error);
  }
);


export default api;