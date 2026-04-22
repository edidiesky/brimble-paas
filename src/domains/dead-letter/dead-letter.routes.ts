import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import {
  listDeadLettersHandler,
  getDeadLetterHandler,
  resolveDeadLetterHandler,
} from "./dead-letter.controller";

const router = Router();

// GET /api/dead-letters
router.get(
  "/",
  (req: Request, res: Response, next: NextFunction) =>
    void listDeadLettersHandler(req, res, next),
);

// GET /api/dead-letters/:jobId
router.get(
  "/:jobId",
  (req: Request, res: Response, next: NextFunction) =>
    void getDeadLetterHandler(req, res, next),
);

// PATCH /api/dead-letters/:jobId/resolve
router.patch(
  "/:jobId/resolve",
  (req: Request, res: Response, next: NextFunction) =>
    void resolveDeadLetterHandler(req, res, next),
);

export default router;
