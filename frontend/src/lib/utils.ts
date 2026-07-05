import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Book } from "backend/db/schema";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const fetchBooksByQuery = async (query: string) => {
  const res = await fetch(
    `${API_BASE_URL}/books/search?q=${encodeURIComponent(query)}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    },
  );

  if (!res.ok) {
    throw new Error("failed fetch recommendations, try again");
  }

  const data: Book[] = await res.json();
  return data;
};

/**
 * Truncates a string to a specified maximum length.
 * * @param text - The string to truncate
 * @param maxChars - The maximum allowed length (including or excluding ellipsis depending on preference)
 * @param append - The string to append at the end (defaults to '...')
 */
export function truncateText(
  text: string,
  maxChars: number,
  append: string = "...",
): string {
  if (!text || text.length <= maxChars) return text;

  // Truncate and add the ellipsis
  return text.slice(0, maxChars).trim() + append;
}
