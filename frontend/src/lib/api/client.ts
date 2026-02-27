const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface ApiResponse<T = unknown> {
  ok: boolean;
  error?: string;
  retryAfterSeconds?: number;
  [key: string]: unknown;
  data?: T;
}

async function request<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  const res = await fetch(url, { ...options, headers });
  const json = await res.json();
  return json as ApiResponse<T>;
}

export const api = {
  requestSignupCode(email: string, password: string, username?: string) {
    return request("/api/auth/signup/request-code", {
      method: "POST",
      body: JSON.stringify({ email, password, username }),
    });
  },

  verifySignupCode(email: string, code: string) {
    return request("/api/auth/signup/verify-code", {
      method: "POST",
      body: JSON.stringify({ email, code }),
    });
  },

  aiChat(message: string, userId?: string) {
    return request("/api/ai/chat", {
      method: "POST",
      body: JSON.stringify({ message }),
      headers: userId ? { "X-User-Id": userId } : {},
    });
  },

  getReminders(userId: string, type?: "casual" | "dated") {
    const params = new URLSearchParams({ userId });
    if (type) params.set("type", type);
    return request(`/api/reminders?${params}`);
  },

  createReminder(
    userId: string,
    text: string,
    reminderType: "casual" | "dated",
    date?: string
  ) {
    return request("/api/reminders", {
      method: "POST",
      body: JSON.stringify({ userId, text, reminderType, date }),
    });
  },

  updateReminder(
    reminderId: string,
    userId: string,
    updates: { text?: string; date?: string; completed?: boolean }
  ) {
    return request(`/api/reminders/${reminderId}`, {
      method: "PATCH",
      body: JSON.stringify({ userId, ...updates }),
    });
  },

  deleteReminder(reminderId: string, userId: string) {
    return request(`/api/reminders/${reminderId}?userId=${userId}`, {
      method: "DELETE",
    });
  },
};
