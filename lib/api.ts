import type { Stats, Trade } from "@/lib/types";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export function apiUrl(path: string) {
  return `${API_BASE_URL}${path}`;
}

export function imageUrl(path?: string | null) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${API_BASE_URL}${path}`;
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(path), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || `Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function getStats(): Promise<Stats> {
  return fetchJson<Stats>("/stats");
}

export async function getTrades(query = ""): Promise<Trade[]> {
  return fetchJson<Trade[]>(`/trades${query}`);
}

export async function getTrade(id: string | number): Promise<Trade> {
  return fetchJson<Trade>(`/trade/${id}`);
}

export async function createTrade(payload: Record<string, unknown>): Promise<Trade> {
  return fetchJson<Trade>("/trade", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function analyzeTrade(payload: Record<string, unknown>) {
  return fetchJson("/analyze", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function uploadImages(
  mt5Image: File,
  atasImage?: File | null,
): Promise<{ mt5_path: string; atas_path: string | null }> {
  const formData = new FormData();
  formData.append("mt5_image", mt5Image);
  if (atasImage) {
    formData.append("atas_image", atasImage);
  }
  const response = await fetch(apiUrl("/upload"), {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
}

export async function uploadImage(file: File): Promise<{ filename: string; image_path: string; content_type: string }> {
  const uploaded = await uploadImages(file);
  return {
    filename: uploaded.mt5_path.split("/").pop() || "",
    image_path: uploaded.mt5_path,
    content_type: file.type,
  };
}
