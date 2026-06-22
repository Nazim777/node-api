import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import s3Router from "./routes/s3.routes";
import authRouter from "./routes/auth.routes";
import { requireAuth } from "./middleware/auth";

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 5000;

app.use(cors({ origin: "*" }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRouter);
app.use("/api/s3", requireAuth, s3Router);



app.listen(5000, "0.0.0.0", () => {
  console.log("Server running on port 5000");
});
