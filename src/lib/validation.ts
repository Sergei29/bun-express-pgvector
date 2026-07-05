import { z } from "zod";

export const createBookInputSchema = z.object({
  isbn13: z
    .string()
    .length(13, { message: "ISBN-13 must be exactly 13 characters long" })
    .nullable()
    .optional(),
  isbn10: z
    .string()
    .length(10, { message: "ISBN-10 must be exactly 10 characters long" })
    .nullable()
    .optional(),
  title: z.string(),
  subtitle: z.string().nullable().optional(),
  authors: z.string().nullable().optional(),
  categories: z.string().nullable().optional(),
  thumbnail: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  published_year: z.number().nullable().optional(),
  average_rating: z.number().nullable().optional(),
  num_pages: z.number().nullable().optional(),
  ratings_count: z.number().nullable().optional(),
});

export const updateBookInputSchema = z.object({
  title: z.string().optional(),
  subtitle: z.string().nullable().optional(),
  authors: z.string().nullable().optional(),
  categories: z.string().nullable().optional(),
  thumbnail: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  published_year: z.number().nullable().optional(),
  average_rating: z.number().nullable().optional(),
  num_pages: z.number().nullable().optional(),
  ratings_count: z.number().nullable().optional(),
});
