import express from "express";
import { router } from "@/routes/index";
import { errorHandler } from "@/middleware/errorHandler";

export const app = express();

app.use(express.json());
app.use(router);
app.use(errorHandler);
