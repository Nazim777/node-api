import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { SendMessageCommand } from "@aws-sdk/client-sqs";
import prisma from "../config/prisma";
import redis from "../config/redis";
import { sqsClient, QUEUE_URL } from "../config/sqs";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

router.post("/register", async (req: Request, res: Response) => {
  const { name, email, password } = req.body as {
    name?: string;
    email?: string;
    password?: string;
  };

  if (!name || !email || !password) {
    res.status(400).json({ error: "name, email and password are required" });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { name, email, password: hashed },
  });

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
    expiresIn: "7d",
  });

  sqsClient.send(
    new SendMessageCommand({
      QueueUrl: QUEUE_URL,
      MessageBody: JSON.stringify({ name: user.name, email: user.email }),
    })
  ).catch((err) => console.error("SQS send error:", err.message));

  res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email } });
});

router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ error: "email and password are required" });
    return;
  }

  const ip = req.ip ?? "unknown";
  const rateLimitKey = `rate_limit:login:${ip}`;
  const attempts = await redis.incr(rateLimitKey);
  if (attempts === 1) await redis.expire(rateLimitKey, 60);
  if (attempts > 10) {
    res.status(429).json({ error: "Too many login attempts. Try again in 1 minute." });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  await redis.del(rateLimitKey);

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
    expiresIn: "7d",
  });

  res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
});

// Logout — blacklist the token in Redis until it expires
router.post("/logout", requireAuth, async (req: AuthRequest, res: Response) => {
  const token = req.headers.authorization!.slice(7);
  const payload = jwt.decode(token) as { exp?: number };
  const ttl = payload.exp ? payload.exp - Math.floor(Date.now() / 1000) : 60 * 60 * 24 * 7;
  if (ttl > 0) {
    await redis.setex(`blacklist:${token}`, ttl, "1");
  }
  res.json({ message: "Logged out successfully" });
});

export default router;
