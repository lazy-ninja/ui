import { handleError } from './handle-error';
import { toURL } from './to-url';

type toURLParams = Parameters<typeof toURL>;
type RequestFromAPIOptions = {
  params?: toURLParams[1];
  request?: typeof fetch;
  options?: Parameters<typeof fetch>[1];
  token?: string;
  shouldRetry?: boolean;
  retryInterval?: number;
};

const base = import.meta.env.VITE_API;

const encode = (component: string): string => {
  return component
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
};

/**
 *  A utility method for making requests to the Temporal API.
 *
 * @param endpoint The path of the API endpoint you want to request data from.
 *
 * @param options Additional options to be used when making the API request.
 * @param options.params Query (or search) parameters to be suffixed to the
 * path.
 * @param options.token Shorthand for a `nextPageToken` query parameter.
 * @param options.request A replacement for the native `fetch` function.
 *
 * @returns Promise with the response from the API parsed into an object.
 */
export const requestFromAPI = async <T>(
  endpoint: toURLParams[0],
  init: RequestFromAPIOptions = {},
  retryCount = 10,
): Promise<T> => {
  const {
    params = {},
    request = fetch,
    token,
    shouldRetry = true,
    retryInterval = 5000,
  } = init;
  let { options } = init;

  if (!endpoint.startsWith('/')) endpoint = '/' + endpoint;
  const nextPageToken = token ? { next_page_token: token } : {};
  const query = new URLSearchParams({
    ...params,
    ...nextPageToken,
  });

  const url = toURL(base + '/api/v1' + encode(endpoint), query);
  try {
    options = withSecurityOptions(options);

    const response = await request(url, options);

    if (!response.ok) {
      throw new Error(`${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error: unknown) {
    handleError(error);

    if (shouldRetry && retryCount > 0) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(requestFromAPI(endpoint, init, retryCount - 1));
        }, retryInterval);
      });
    }
  }
};

const withSecurityOptions = (options: RequestInit): RequestInit => {
  const opts: RequestInit = { credentials: 'include', ...options };
  opts.headers = withCsrf(options?.headers);
  return opts;
};

const withCsrf = (headers: HeadersInit): HeadersInit => {
  if (!headers) headers = new Headers();

  const csrfCookie = '_csrf=';
  const csrfHeader = 'X-CSRF-TOKEN';
  try {
    const cookies = document.cookie.split(';');
    let csrf = cookies.find((c) => c.includes(csrfCookie));
    if (csrf && !headers[csrfHeader]) {
      csrf = csrf.trim().slice(csrfCookie.length);
      headers[csrfHeader] = csrf;
    }
  } catch (error) {
    // in SSR mode document is not available
    console.log(error);
  }

  return headers;
};
