import { app } from "@/app";
// Import queue to initialize processors on startup
import "@/queues/embedding";

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
