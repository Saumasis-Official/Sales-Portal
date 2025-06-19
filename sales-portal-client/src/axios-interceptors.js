import axios from 'axios';
import jwt from 'jsonwebtoken';
import Auth from './util/middleware/auth';
import * as API from './api/index';
const refresh = axios.create();
let refreshApiUnderProcess = false;
const policy = `default-src 'self' https://www.google-analytics.com/ 'unsafe-inline' https://www.googletagmanager.com/;
connect-src 'self' https://devapi-pegasus.tataconsumer.com/
 https://cognito-idp.ap-south-1.amazonaws.com/ https://www.google-analytics.com/ https://www.googletagmanager.com/; img-src *; style-src * 'unsafe-inline'`;

const policy2 = `default-src 'self' https://www.google-analytics.com/ 'unsafe-inline' https://www.googletagmanager.com/ https://devapi-pegasus.tataconsumer.com/ https://cognito-idp.ap-south-1.amazonaws.com/ https://cdnjs.cloudflare.com/; connect-src 'self' https://devapi-pegasus.tataconsumer.com/ https://cognito-idp.ap-south-1.amazonaws.com/ https://www.google-analytics.com/ https://www.googletagmanager.com/`;
 
const allocationApis = [
  '/forecast/ars-sync',
  '/forecast/uniform-forecast-phasing',
  '/forecast/forecast-dump-post-program-apis',
];

export default {
  setupInterceptors: (history) => {
    axios.interceptors.request.use(
      async (config) => {
        if (Auth.loggedIn()) {
          let token = Auth.getAccessToken();
          config.headers.Authorization = token;
          config.headers['x-correlation-id'] =
            window.localStorage.getItem('TCPL_correlation_id');
          return config;
        } else if (Auth.adminLoggedIn) {
          if (allocationApis.some(api => config.url.includes(api))) {
            const username = 'data_lake_user';
            const password = 'WUV6oOYgWuWqxqg'
            const basicAuth = 'Basic ' + btoa(`${username}:${password}`);
            config.headers.Authorization = basicAuth;
          }
          else {
            let token = Auth.getAdminAccessToken();
            config.headers.Authorization = token; 
          }
          config.headers['x-correlation-id'] =
            window.localStorage.getItem('TCPL_correlation_id');
        }
        // config.headers['Content-Security-Policy'] = policy2;
        return config;
      },
      (err) => {
        return Promise.reject(err);
      },
    );

    axios.interceptors.response.use(
      (response) => {
        if (Auth.loggedIn() && !Auth.checkAdminLogin()) {
          const token = Auth.getAccessToken();
          const expiryTime = jwt.decode(token) ? jwt.decode(token).exp * 1000 : 0;
          const diffMs = new Date(expiryTime) - new Date();
          const diffMins = Math.round(((diffMs % 86400000) % 3600000) / 60000);

          if (!refreshApiUnderProcess && (diffMs < 0 || diffMins < 30)) {
            refreshApiUnderProcess = true;
            refresh
              .get(`${API.url('refresh_token', 'auth')}`, {
                headers: {
                  Authorization: token,
                  'x-correlation-id': window.localStorage.getItem(
                    'TCPL_correlation_id',
                  ),
                },
              })
              .then((res) => {
                Auth.setAccessToken(res.data.token);
                refreshApiUnderProcess = false;
              })
              .catch((error) => {
                refreshApiUnderProcess = false;
                localStorage.clear();
                sessionStorage.clear();
                window.location.href = '/';
              });
          }
          return response;
        } else if (Auth.adminLoggedIn()) {
          const ssoAuthTime = window.localStorage.getItem("TCPL_SSO_at");
          const anHourAgo = Date.now() - (1000 * 60 * 60);
          if (new Date(Number(ssoAuthTime)) < new Date(anHourAgo)) {
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = '/';
          } else {
            window.localStorage.setItem(
              'TCPL_SSO_at',
              Date.now(),
            );
          }
        }
        return response;
      },
      (error) => {
        const originalRequest = error.config;

        if (error.response && error.response.status === 403) {
          if (Auth.checkAdminLogin()) {
            window.localStorage.clear();
            sessionStorage.clear();
            window.location.href = '/no-access';
          } else {
            window.localStorage.clear();
            sessionStorage.clear();
            window.location.href = '/';
          }
        }
        if (
          error.response &&
          error.response.status === 401 &&
          !originalRequest._retry
        ) {
        }
        if (
          error.response &&
          error.response.status >= 400 &&
          error.response.status < 500
        ) {
          // history.push(PATHS.SOMETHING_WENT_WRONG);
        }
        if (error.response && error.response.status >= 500) {
          if (
            error &&
            error.message !== 'Request aborted' &&
            error.message !== 'Operation canceled'
          ) {
            // history.push(PATHS.SERVER_ERROR);
          }
        }
        return Promise.reject(error);
      },
    );
  },
};
