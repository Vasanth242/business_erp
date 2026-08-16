import axios from "axios";


const API_URL =
  "http://127.0.0.1:8000/api";


const api = axios.create({
  baseURL: API_URL,

  headers: {
    "Content-Type": "application/json",
  },
});


let isRefreshing = false;


let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];


function processQueue(
  error: unknown,
  token: string | null = null
) {

  failedQueue.forEach((promise) => {

    if (error) {

      promise.reject(error);

    } else if (token) {

      promise.resolve(token);

    }

  });


  failedQueue = [];
}


/*
|--------------------------------------------------------------------------
| REQUEST INTERCEPTOR
|--------------------------------------------------------------------------
*/

api.interceptors.request.use(

  (config) => {

    const token =
      localStorage.getItem(
        "access_token"
      );


    if (token) {

      config.headers =
        config.headers ?? {};

      config.headers.Authorization =
        `Bearer ${token}`;

    }


    return config;

  },

  (error) => {

    return Promise.reject(
      error
    );

  }

);


/*
|--------------------------------------------------------------------------
| RESPONSE INTERCEPTOR
|--------------------------------------------------------------------------
*/

api.interceptors.response.use(

  (response) => {

    return response;

  },

  async (error) => {

    const originalRequest =
      error.config;


    /*
    |--------------------------------------------------------------------------
    | Only handle 401
    |--------------------------------------------------------------------------
    */

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry
    ) {

      return Promise.reject(
        error
      );

    }


    /*
    |--------------------------------------------------------------------------
    | Don't refresh authentication
    | endpoints themselves.
    |--------------------------------------------------------------------------
    */

    if (
      originalRequest.url?.includes(
        "/auth/token/"
      ) ||
      originalRequest.url?.includes(
        "/auth/token/refresh/"
      )
    ) {

      return Promise.reject(
        error
      );

    }


    /*
    |--------------------------------------------------------------------------
    | Another request is already
    | refreshing the token.
    |--------------------------------------------------------------------------
    */

    if (isRefreshing) {

      return new Promise(
        (
          resolve,
          reject
        ) => {

          failedQueue.push({

            resolve: (
              token
            ) => {

              originalRequest.headers =
                originalRequest.headers ?? {};


              originalRequest.headers.Authorization =
                `Bearer ${token}`;


              resolve(
                api(
                  originalRequest
                )
              );

            },

            reject,

          });

        }
      );

    }


    originalRequest._retry =
      true;


    isRefreshing =
      true;


    const refreshToken =
      localStorage.getItem(
        "refresh_token"
      );


    /*
    |--------------------------------------------------------------------------
    | No refresh token
    |--------------------------------------------------------------------------
    */

    if (!refreshToken) {

      localStorage.removeItem(
        "access_token"
      );

      localStorage.removeItem(
        "refresh_token"
      );


      window.location.href =
        "/login";


      return Promise.reject(
        error
      );

    }


    try {

      const response =
        await axios.post(

          `${API_URL}/auth/token/refresh/`,

          {
            refresh:
              refreshToken,
          }

        );


      const newAccessToken =
        response.data.access;


      localStorage.setItem(
        "access_token",
        newAccessToken
      );


      processQueue(
        null,
        newAccessToken
      );


      originalRequest.headers =
        originalRequest.headers ?? {};


      originalRequest.headers.Authorization =
        `Bearer ${newAccessToken}`;


      return api(
        originalRequest
      );

    } catch (
      refreshError
    ) {

      processQueue(
        refreshError,
        null
      );


      localStorage.removeItem(
        "access_token"
      );

      localStorage.removeItem(
        "refresh_token"
      );


      window.location.href =
        "/login";


      return Promise.reject(
        refreshError
      );

    } finally {

      isRefreshing =
        false;

    }

  }

);


export default api;