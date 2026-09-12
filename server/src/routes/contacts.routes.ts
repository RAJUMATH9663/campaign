import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../middleware/auth.middleware";
import {
  listContacts,
  createContact,
  updateContact,
  deleteContact,
  deleteAllContacts,
  previewImport,
  commitImport,
} from "../controllers/contacts.controller";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const router = Router();

router.use(requireAuth);
router.get("/", listContacts);
router.post("/", createContact);
router.put("/:id", updateContact);
router.delete("/all", deleteAllContacts);
router.delete("/:id", deleteContact);
router.post("/import/preview", upload.single("file"), previewImport);
router.post("/import/commit", commitImport);

export default router;
