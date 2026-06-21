import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import s3Router from "./routes/s3.routes";

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 5000;

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/s3", s3Router);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
