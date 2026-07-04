import express from "express";
import { router } from "./routes/index";
import { errorHandler } from "./middleware/errorHandler";

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(router);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
