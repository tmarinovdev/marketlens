import { StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { App } from "@/app/App";

const root = document.getElementById("root");

if (!root) {
  throw new Error("The root element is missing from the HTML template.");
}

hydrateRoot(
  root,
  <StrictMode>
    <App />
  </StrictMode>,
);
