import { Router } from "express";
import { healthRouter } from "@/routes/health";
import { booksRouter } from "@/routes/books";

export const router = Router();

router.use(healthRouter);
router.use(booksRouter);
