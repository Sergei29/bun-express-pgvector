import { Router } from "express";
import { db } from "../db";
import { books } from "../db/schema";

export const booksRouter = Router();

booksRouter.get("/books", async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;

    const results = await db.select().from(books).limit(limit).offset(offset);
    res.json({ data: results, page, limit });
  } catch (err) {
    next(err);
  }
});
