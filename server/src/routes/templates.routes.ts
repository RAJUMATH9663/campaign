import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { list, create, update, remove } from "../controllers/templates.controller";

const router = Router();
router.use(requireAuth);
router.get("/", list);
router.post("/", create);
router.put("/:id", update);
router.delete("/:id", remove);

export default router;
