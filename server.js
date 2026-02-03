import express from "express";
import dotenv from "dotenv";
import { getZoneForBuilding } from "./building_detection.js";
import {
  getCurrentDateTime,
  readShiftsJSON,
  findPersonOnShift,
} from "./utils.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// import MockDate from "mockdate";
// MockDate.set("2026-02-04 14:30:00");

const shifts = await readShiftsJSON();

// Main API endpoint
app.post("/api/suggest-person", async (req, res) => {
  try {
    const { building } = req.body;

    // Validate input
    if (!building) {
      return res.status(400).json({
        error: "Building name is required",
      });
    }

    const zoneInfo = await getZoneForBuilding(building);
    if (!zoneInfo) {
      return res.status(404).json({
        error: `Building "${building}" not found in zones database`,
      });
    }

    const dateTime = getCurrentDateTime();
    console.log(
      `Request for building: ${building} (Zone: ${zoneInfo.zone}) at ${dateTime}`,
    );

    const suggestion = await findPersonOnShift(zoneInfo.zone, shifts);

    res.json(suggestion);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "API is running" });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`API endpoint: POST http://localhost:${PORT}/api/suggest-person`);
});
