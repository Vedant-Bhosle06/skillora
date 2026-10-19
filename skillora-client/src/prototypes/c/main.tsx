import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource-variable/outfit";
import "./c.css";
import MotionProvider from "@/components/MotionProvider";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MotionProvider>
      <App />
    </MotionProvider>
  </React.StrictMode>,
);
