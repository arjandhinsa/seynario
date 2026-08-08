const BASE_URL = import.meta.env.PROD ? "https://api-seynario.seyn.co.uk" : "";

/** Prefix a backend-relative path (e.g. "/api/r/p/123") with the API
 *  origin. Absolute URLs pass through untouched. Needed for plain <a>
 *  links — in production the frontend and API are different domains, and
 *  the Vercel SPA rewrite would otherwise swallow /api/* clicks. */
export function apiHref(path) {
  if (!path) return path;
  return path.startsWith("/") ? `${BASE_URL}${path}` : path;
}

async function request(endpoint, options = {}, token = null) {
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${response.status}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

// Separate upload function for multipart/form-data (wardrobe scan)
async function upload(endpoint, formData, token = null) {
  const headers = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: "POST",
    headers,
    body: formData,  // Don't set Content-Type — browser sets it with boundary
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

export const api = {
  get:    (url, token) => request(url, { method: "GET" }, token),
  post:   (url, body, token) => request(url, { method: "POST", body: JSON.stringify(body) }, token),
  put:    (url, body, token) => request(url, { method: "PUT", body: JSON.stringify(body) }, token),
  delete: (url, token) => request(url, { method: "DELETE" }, token),
  upload: (url, formData, token) => upload(url, formData, token),
};
