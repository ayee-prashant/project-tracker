/** Keep API failures visible, including expired sessions returning HTML. */
export async function portalFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const failure = (error: string, status = 503) => Response.json({ error }, { status });
  try {
    const response = await fetch(url, { ...options, credentials: "same-origin", cache: "no-store", signal: options.signal ?? AbortSignal.timeout(20000) });
    if (response.status === 401 || response.status === 403 && response.redirected) {
      return failure("Your session has expired. Sign in again to continue.", 401);
    }
    if (!response.headers.get("content-type")?.includes("application/json")) {
      return failure(response.redirected ? "Your session has expired. Sign in again to continue." : "The page could not load its data. Please retry.", response.redirected ? 401 : 503);
    }
    // Validate the body here so a malformed response cannot strand a loading state.
    const data = await response.json();
    return Response.json(data, { status: response.status });
  } catch {
    return failure(options.method && options.method !== "GET"
      ? "The save could not be confirmed. Check the latest data before trying again."
      : "Unable to load data. Check your connection and retry.");
  }
}
