import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import bookingsRouter from "./bookings";
import calendarRouter from "./calendar";
import exportRouter from "./exportRoutes";
import usersRouter from "./users";
import timeTrackingRouter from "./timeTracking";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(bookingsRouter);
router.use(calendarRouter);
router.use(exportRouter);
router.use(usersRouter);
router.use(timeTrackingRouter);

export default router;
