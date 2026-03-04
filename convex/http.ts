import { httpRouter } from "convex/server";
import { authComponent, createAuth } from "./auth";

const http = httpRouter();

// Register all Better Auth routes (sign-in, sign-up, session, etc.)
authComponent.registerRoutes(http, createAuth);

export default http;
