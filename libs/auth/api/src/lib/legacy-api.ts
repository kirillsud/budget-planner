import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { API_URL, HttpError, HttpAuthorizationError } from '@planner/common-api';
import { AuthToken } from './guard';

export class LegacyApi {
  constructor(private readonly url: string) { }

  async login(
    email: string,
    password: string,
    remember: boolean
  ): Promise<AuthToken> {
    const { data } = await axios.postForm<AuthToken | number>(
      `${this.url}/auth.php`,
      {
        email,
        password,
        remember: remember ? 'on' : 'off',
      }
    );

    return processLoginResponse(data);
  }

  async refresh(auth: AuthToken): Promise<AuthToken> {
    const { data } = await this.request<AuthToken | number>(auth, '/auth.php', {
      method: 'post',
      headers: {
        Cookie: `auth_token=${auth.token}; auth_series=${auth.series}`,
      },
    });

    return processLoginResponse(data);
  }

  async logout(auth: AuthToken): Promise<void> {
    try {
      await this.request<number>(auth, '/logout.php', { method: 'get' });
    } catch (error: unknown | AxiosError) {
      if (error instanceof AxiosError && error.response?.status === 401) {
        return;
      }
    }

    throw new HttpAuthorizationError();
  }

  protected async request<T>(
    auth: AuthToken,
    path: string,
    config: AxiosRequestConfig,
    form = false
  ): Promise<AxiosResponse<T>> {
    const url = `${this.url}${path}`;
    const cookies = `PHPSESSID=${auth.session}; auth_series=${auth.series}; auth_token=${auth.token}`;
    const options = {
      ...config,
      url,
      headers: {
        Cookie: cookies,
        ...config?.headers,
      },
    };

    if (form) {
      return axios.postForm<T>(url, options.data, options);
    }

    return axios.request<T>(options);
  }
}

function processLoginResponse<T>(response: number | T): T {
  if (typeof response === 'number') {
    switch (response) {
      case 0:
        throw new HttpError(403, 'Already logged in', 'user.logged-in');
      case -1:
      case -2:
      case -3:
        throw new HttpError(
          400,
          'Invalid email or password',
          'auth.wrong-credentials'
        );
      case -5:
        throw new HttpError(403, 'User is not activated', 'user.not-activated');
      case -6:
        throw new HttpError(403, 'User is blocked', 'user.blocked');
      default:
        throw new HttpAuthorizationError();
    }
  }

  return response;
}

export const legacyApi = new LegacyApi(API_URL);
