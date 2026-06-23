import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import redis from "../config/redis";

export interface AuthRequest extends Request {
  userId?: string;
}

export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization header" });
    return;
  }
  const token = header.slice(7);

  // Check if token has been blacklisted (logged out)
  const blacklisted = await redis.get(`blacklist:${token}`);
  if (blacklisted) {
    res.status(401).json({ error: "Token has been revoked. Please log in again." });
    return;
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string; exp: number };
    req.userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ error: "Token expired or invalid" });
  }
}
