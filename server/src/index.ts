import "dotenv/config";
import "express-async-errors"; // patches Express 4 to forward async errors to errorMiddleware
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import authRoutes from "./routes/auth.routes";
import contactsRoutes from "./routes/contacts.routes";
import campaignsRoutes from "./routes/campaigns.routes";
import aiRoutes from "./routes/ai.routes";
import templatesRoutes from "./routes/templates.routes";
import reportsRoutes from "./routes/reports.routes";
import settingsRoutes from "./routes/settings.routes";
import { errorMiddleware, notFoundMiddleware } from "./middleware/error.middleware";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin (like mobile apps, curl, postman) or localhost origins in dev
      if (!origin || /^http:\/\/localhost:\d+$/.test(origin) || origin === process.env.CLIENT_ORIGIN) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "5mb" }));

// Global rate limit; per-route limits can be layered on top for sensitive
// endpoints like auth or AI generation.
const globalLimiter = rateLimit({ windowMs: 60 * 1000, max: 300 });
app.use(globalLimiter);

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/contacts", contactsRoutes);
app.use("/api/campaigns", campaignsRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/templates", templatesRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/settings", settingsRoutes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, () => {
  console.log(`Campaign Manager API listening on http://localhost:${PORT}`);
});
