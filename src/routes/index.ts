import { Router, Request, Response } from "express";

const router = Router();

router.get("/", (_req: Request, res: Response) => {
  res.json({
    message: "Welcome to the API",
    endpoints: {
      health: "/health",
      users: "/api/users",
    },
  });
});

export default router;
