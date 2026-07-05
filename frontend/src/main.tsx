import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import ThemeProvider from "@/components/providers/ThemeProvider";
import "./index.css";
import App from "./App.tsx";
import QueryClientProvider from "./components/providers/QueryClientProvider/index.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <QueryClientProvider>
        <App />
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
);
