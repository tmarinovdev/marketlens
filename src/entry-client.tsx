import { RouterClient } from "@tanstack/react-router/ssr/client";
import { hydrateRoot } from "react-dom/client";
import { createRouter } from "@/app/router";

const router = createRouter();

hydrateRoot(document, <RouterClient router={router} />);
