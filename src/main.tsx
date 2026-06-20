import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConnectionProvider } from "@/state/connection";
import { SettingsProvider } from "@/lib/settings";
import App from "@/App";
import "./index.css";

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        <ConnectionProvider>
          <App />
        </ConnectionProvider>
      </SettingsProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
