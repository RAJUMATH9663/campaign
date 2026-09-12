import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { getSettings, upsertProviderConfig } from "../controllers/settings.controller";

const router = Router();
router.use(requireAuth);
router.get("/", getSettings);
router.post("/providers", upsertProviderConfig);

export default router;
