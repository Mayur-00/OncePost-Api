import express from "express";
import { ConnectLinkedin } from "../controllers/socialAccounts.controller";
const router = express.Router();

router.get('/linkedin/callback', ConnectLinkedin);

export default router;