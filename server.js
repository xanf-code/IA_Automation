const express = require("express");
const fs = require("fs").promises;
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Helper function to get zone from building name
async function getZoneForBuilding(buildingName) {
  try {
    const zonesData = await fs.readFile(
      path.join(__dirname, "zones.json"),
      "utf-8",
    );
    const zones = JSON.parse(zonesData);

    // Case-insensitive search
    const building = zones.find(
      (z) => z.building.toLowerCase() === buildingName.toLowerCase(),
    );

    if (!building) {
      return null;
    }

    return {
      building: building.building,
      code: building.code,
      zone: building.zone,
    };
  } catch (error) {
    throw new Error(`Error reading zones file: ${error.message}`);
  }
}

// Helper function to format current date and time
function getCurrentDateTime() {
  const now = new Date();

  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const dayName = days[now.getDay()];
  const monthName = months[now.getMonth()];
  const date = now.getDate();

  let hours = now.getHours();
  const minutes = now.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;

  return `${dayName} ${monthName} ${date}, ${hours}:${minutes}${ampm}`;
}

// Helper function to read shifts JSON
async function readShiftsJSON() {
  try {
    const shiftsData = await fs.readFile(
      path.join(__dirname, "shifts.json"),
      "utf-8"
    );
    return JSON.parse(shiftsData);
  } catch (error) {
    throw new Error(`Error reading shifts JSON: ${error.message}`);
  }
}

// Helper function to convert 12-hour time with AM/PM to 24-hour format
function convertTo24Hour(time12h) {
  const [time, modifier] = time12h.split(' ');
  let [hours, minutes] = time.split(':').map(Number);

  if (modifier === 'PM' && hours !== 12) {
    hours += 12;
  } else if (modifier === 'AM' && hours === 12) {
    hours = 0;
  }

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

// Helper function to find person on shift
function findPersonOnShift(zone, dateTime, shifts) {
  // Parse the current date and time (use local time, not UTC)
  const now = new Date();
  const currentDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  console.log(`Looking for shifts in ${zone} on ${currentDate} at ${currentTime}`);

  // Filter shifts for the specific zone and date
  const relevantShifts = shifts.filter(
    (shift) => shift.zone === zone && shift.date === currentDate
  );

  console.log(`Found ${relevantShifts.length} shifts for ${zone} on ${currentDate}`);

  // Find people currently on shift
  const peopleOnShift = relevantShifts.filter((shift) => {
    // Convert shift times from 12-hour to 24-hour format
    const shiftStart24 = convertTo24Hour(shift.startTime);
    const shiftEnd24 = convertTo24Hour(shift.endTime);

    // Compare times in 24-hour format
    return currentTime >= shiftStart24 && currentTime < shiftEnd24;
  });

  console.log(`People currently on shift:`, peopleOnShift.map(s => `${s.personName} (${s.startTime}-${s.endTime})`));

  if (peopleOnShift.length > 0) {
    // Randomly pick one person from the list
    const randomIndex = Math.floor(Math.random() * peopleOnShift.length);
    return { name: peopleOnShift[randomIndex].personName };
  } else {
    return { name: "NA" };
  }
}

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

    // Step 1: Get zone for the building
    const zoneInfo = await getZoneForBuilding(building);
    if (!zoneInfo) {
      return res.status(404).json({
        error: `Building "${building}" not found in zones database`,
      });
    }

    // Step 2: Get current date and time
    const dateTime = getCurrentDateTime();
    console.log(
      `Request for building: ${building} (Zone: ${zoneInfo.zone}) at ${dateTime}`,
    );

    // Step 3: Read shifts JSON
    const shifts = await readShiftsJSON();

    // Step 4: Find person on shift using logic
    const suggestion = findPersonOnShift(zoneInfo.zone, dateTime, shifts);

    // Return the result
    res.json(suggestion);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "API is running" });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`API endpoint: POST http://localhost:${PORT}/api/suggest-person`);
});
