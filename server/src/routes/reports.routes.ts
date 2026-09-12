import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { listMessages, exportMessages, dashboardStats } from "../controllers/reports.controller";

const router = Router();
router.use(requireAuth);
router.get("/messages", listMessages);
router.get("/messages/export", exportMessages);
router.get("/dashboard-stats", dashboardStats);

export default router;
