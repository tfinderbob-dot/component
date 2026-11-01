import { useQuery } from "@tanstack/react-query";
import type { Job, Master } from "../shared/types";
let csrf = "";
export function setCsrf(value: string) {
  csrf = value;
}
export async function api<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch("/api" + url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrf,
      ...options.headers,
    },
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Request failed");
  return result;
}
export const useMasters = () =>
  useQuery({ queryKey: ["masters"], queryFn: () => api<Master[]>("/masters") });
export const useJobs = () =>
  useQuery({ queryKey: ["jobs"], queryFn: () => api<Job[]>("/jobs") });
export function label(masters: Master[] | undefined, id: string) {
  return masters?.find((m) => m.id === id)?.name || "—";
}
export function formatDate(value: string) {
  return value
    ? new Date(
        value.length === 10 ? value + "T12:00:00" : value,
      ).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";
}
export const today = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
