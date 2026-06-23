import { Router, Request, Response } from "express";
import multer from "multer";
import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client, BUCKET_NAME } from "../config/s3";
import redis from "../config/redis";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const FILES_CACHE_KEY = "s3:files";
const FILES_TTL_SECONDS = 30;

// List all objects in the bucket (cached)
router.get("/files", async (_req: Request, res: Response) => {
  try {
    const cached = await redis.get(FILES_CACHE_KEY);
    if (cached) {
      res.json({ files: JSON.parse(cached), fromCache: true });
      return;
    }

    const command = new ListObjectsV2Command({ Bucket: BUCKET_NAME });
    const data = await s3Client.send(command);
    const files = (data.Contents ?? []).map((item) => ({
      key: item.Key,
      size: item.Size,
      lastModified: item.LastModified,
    }));

    await redis.setex(FILES_CACHE_KEY, FILES_TTL_SECONDS, JSON.stringify(files));
    res.json({ files, fromCache: false });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Upload a file (invalidates cache)
router.post(
  "/upload",
  upload.single("file"),
  async (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400).json({ error: "No file provided" });
      return;
    }
    try {
      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: req.file.originalname,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      });
      await s3Client.send(command);
      await redis.del(FILES_CACHE_KEY);
      res.json({ message: "File uploaded successfully", key: req.file.originalname });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  }
);

// Get a presigned download URL
router.get("/download/:key", async (req: Request, res: Response) => {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: req.params.key,
    });
    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    res.json({ url });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Delete a file (invalidates cache)
router.delete("/delete/:key", async (req: Request, res: Response) => {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: req.params.key,
    });
    await s3Client.send(command);
    await redis.del(FILES_CACHE_KEY);
    res.json({ message: "File deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
