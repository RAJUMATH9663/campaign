import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import {
  listCampaigns,
  getCampaign,
  previewRecipients,
  create,
  launch,
  pause,
  resume,
  cancel,
} from "../controllers/campaigns.controller";

const router = Router();
router.use(requireAuth);

router.get("/", listCampaigns);
router.get("/:id", getCampaign);
router.post("/preview-recipients", previewRecipients);
router.post("/", create);
router.post("/:id/launch", launch);
router.post("/:id/pause", pause);
router.post("/:id/resume", resume);
router.post("/:id/cancel", cancel);

export default router;
