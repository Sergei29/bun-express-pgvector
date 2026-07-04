import { Router } from "express";
import { healthRouter } from "./health";
import { booksRouter } from "./books";

export const router = Router();

router.use(healthRouter);
router.use(booksRouter);
