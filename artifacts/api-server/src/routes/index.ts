import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import boostRouter from "./boost.js";
import authRouter from "./auth.js";
import feedRouter from "./feed.js";
import storiesRouter from "./stories.js";
import socialRouter from "./social.js";
import notificationsRouter from "./notifications.js";
import usersRouter from "./users.js";
import petsRouter from "./pets.js";
import petManagementRouter from "./petManagement.js";
import messagesRouter from "./messages.js";
import listingsRouter from "./listings.js";
import animalsRouter from "./animals.js";
import adoptionRouter from "./adoption.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(boostRouter);
router.use(feedRouter);
router.use(storiesRouter);
router.use(socialRouter);
router.use(notificationsRouter);
router.use(usersRouter);
router.use(petsRouter);
router.use(petManagementRouter);
router.use(messagesRouter);
router.use(listingsRouter);
router.use(animalsRouter);
router.use(adoptionRouter);

export default router;
