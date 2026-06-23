import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import boostRouter from "./boost.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(boostRouter);

export default router;
