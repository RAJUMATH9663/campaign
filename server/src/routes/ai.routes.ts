import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { generate } from "../controllers/ai.controller";

const router = Router();
router.use(requireAuth);
router.post("/generate", generate);

export default router;
