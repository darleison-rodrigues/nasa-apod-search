import { Hono } from "hono";
import apod from "./apod";

const app = new Hono<{ Bindings: Env }>();

app.route("/api", apod);

export default app;
