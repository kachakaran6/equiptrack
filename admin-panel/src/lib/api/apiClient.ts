const TOKEN_KEY = "equiptrack_admin_token"
const USER_KEY = "equiptrack_admin_user"

export class ApiError extends Error {
  statusCode: number
  code?: string
  details?: unknown

  constructor(message: string, statusCode: number, code?: string, details?: unknown) {
    super(message)
    this.name = "ApiError"
    this.statusCode = statusCode
    this.code = code
    this.details = details
  }
}

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setAuthToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function removeAuthToken(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function getStoredUser<T>(): T | null {
  const data = localStorage.getItem(USER_KEY)
  if (!data) return null
  try {
    return JSON.parse(data) as T
  } catch {
    return null
  }
}

export function setStoredUser<T>(user: T): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL || ""
const BASE_PATH = (import.meta.env.BASE_URL || "/").replace(/\/$/, "")

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken()
  const headers = new Headers(options.headers || {})

  // Only attach Content-Type: application/json if there is an actual request body
  if (options.body && !headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json")
  }

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`)
  }

  const url = `${BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (response.status === 401) {
      removeAuthToken()
      // Only redirect if not already on the login page
      if (!window.location.pathname.endsWith("/login")) {
        window.location.href = `${BASE_PATH}/login?session=expired`
      }
      throw new ApiError("Session expired. Please log in again.", 401)
    }

    if (response.status === 403) {
      throw new ApiError("Administrator access required or action forbidden.", 403)
    }

    if (response.status === 429) {
      throw new ApiError("Too many requests. Please slow down and try again.", 429)
    }

    const contentType = response.headers.get("content-type")
    const isJson = contentType && contentType.includes("application/json")
    const data = isJson ? await response.json() : await response.text()

    if (!response.ok) {
      let message = response.statusText || "An unexpected error occurred"
      let code: string | undefined = undefined

      if (typeof data === "object" && data !== null) {
        if ("error" in data && typeof (data as any).error === "object" && (data as any).error !== null) {
          message = (data as any).error.message || message
          code = (data as any).error.code || code
        } else if ("message" in data) {
          message = String((data as any).message)
        }
        if ("code" in data && typeof (data as any).code === "string") {
          code = (data as any).code
        }
      }

      throw new ApiError(message, response.status, code, data)
    }

    return data as T
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError(
      error instanceof Error ? error.message : "Network error. Please check your connection.",
      0
    )
  }
}
