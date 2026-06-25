import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import boostRouter from "./boost.js";
import authRouter from "./auth.js";
import feedRouter from "./feed.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(boostRouter);
router.use(feedRouter);

export default router;
