import express from "express";
import cors from "cors";
import { authHandler } from "@/auth";
import { router } from "@/routes/index";
import { errorHandler } from "@/middleware/errorHandler";

export const app = express();

app.set("trust proxy", true);

app.use(cors({ origin: "http://localhost:5173" }));
// Mounted before express.json(): ExpressAuth() parses the request body
// itself (via its own internal express.json()/urlencoded() calls) and
// needs to see the raw, unconsumed request stream.
app.use("/auth/*", authHandler);
app.use(express.json());
app.use(router);
app.use(errorHandler);
