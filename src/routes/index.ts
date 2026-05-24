import { Router } from "express";
import aiRoutes from "./ai.routes";
import analyticsRoutes from "./analytics.routes";
import contextRoutes from "./contexts.routes";
import fileStoreRoutes from "./fileStore.routes";
import healthRoutes from "./health.routes";
import toonRoutes from "./toon.routes";

const router = Router();

router.use(healthRoutes);
router.use(aiRoutes);
router.use(toonRoutes);
router.use(contextRoutes);
router.use(analyticsRoutes);
router.use(fileStoreRoutes);

export default router;
