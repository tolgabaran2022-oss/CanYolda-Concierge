import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import boostRouter from "./boost.js";
import authRouter from "./auth.js";
import feedRouter from "./feed.js";
import storiesRouter from "./stories.js";
import socialRouter from "./social.js";
import notificationsRouter from "./notifications.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(boostRouter);
router.use(feedRouter);
router.use(storiesRouter);
router.use(socialRouter);
router.use(notificationsRouter);

export default router;
