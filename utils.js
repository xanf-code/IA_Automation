import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { getZoneForBuilding } from "./building_detection.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

async function readShiftsJSON() {
  try {
    const shiftsData = await fs.readFile(
      path.join(__dirname, "shifts.json"),
      "utf-8",
    );
    return JSON.parse(shiftsData);
  } catch (error) {
    throw new Error(`Error reading shifts JSON: ${error.message}`);
  }
}

function convertTo24Hour(time12h) {
  const [time, modifier] = time12h.split(" ");
  let [hours, minutes] = time.split(":").map(Number);

  if (modifier === "PM" && hours !== 12) {
    hours += 12;
  } else if (modifier === "AM" && hours === 12) {
    hours = 0;
  }

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

async function findPersonOnShift(zone, shifts) {
  // Parse the current date and time (use local time, not UTC)
  const now = new Date();
  const currentDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  console.log(
    `Looking for shifts in ${zone} on ${currentDate} at ${currentTime}`,
  );

  // Filter shifts for the specific zone and date
  const relevantShifts = shifts.filter(
    (shift) => shift.zone === zone && shift.date === currentDate,
  );

  console.log(
    `Found ${relevantShifts.length} shifts for ${zone} on ${currentDate}`,
  );

  // Find people currently on shift
  const peopleOnShift = relevantShifts.filter((shift) => {
    // Convert shift times from 12-hour to 24-hour format
    const shiftStart24 = convertTo24Hour(shift.startTime);
    const shiftEnd24 = convertTo24Hour(shift.endTime);

    // Compare times in 24-hour format
    return currentTime >= shiftStart24 && currentTime < shiftEnd24;
  });

  console.log(
    `People currently on shift:`,
    peopleOnShift.map((s) => `${s.personName} (${s.startTime}-${s.endTime})`),
  );

  // Build list of all people on shift
  const onShiftList = peopleOnShift.map((shift) => shift.personName);

  if (peopleOnShift.length > 0) {
    // Load selection history
    const history = await loadSelectionHistory();

    // Priority-based selection: sort by selection count (ascending)
    const peopleWithPriority = peopleOnShift.map((shift) => ({
      personName: shift.personName,
      selectionCount: getSelectionCount(history, shift.personName, currentDate),
    }));

    // Sort by selection count (lowest first)
    peopleWithPriority.sort((a, b) => a.selectionCount - b.selectionCount);

    // Get the lowest selection count
    const lowestCount = peopleWithPriority[0].selectionCount;

    // Get all people with the lowest count (for tie-breaking)
    const leastSelectedPeople = peopleWithPriority.filter(
      (p) => p.selectionCount === lowestCount,
    );

    // If there's a tie, randomly pick from the least selected
    const randomIndex = Math.floor(Math.random() * leastSelectedPeople.length);
    const selectedPerson = leastSelectedPeople[randomIndex].personName;

    console.log(
      `Priority selection: ${selectedPerson} (selected ${lowestCount} times today)`,
    );

    // Update selection history
    const updatedHistory = updateSelectionCount(
      history,
      selectedPerson,
      currentDate,
    );
    await saveSelectionHistory(updatedHistory);

    return {
      on_shift: onShiftList,
      suggested: selectedPerson,
      textual: `There are ${onShiftList.length} people on shift now ${onShiftList.join(", ")} and I suggest ${selectedPerson}.`,
    };
  } else {
    return {
      on_shift: [],
      suggested: "NA",
      textual: "No one is currently on shift.",
    };
  }
}

async function loadSelectionHistory() {
  try {
    const historyPath = path.join(__dirname, "selection_history.json");
    const historyData = await fs.readFile(historyPath, "utf-8");
    return JSON.parse(historyData);
  } catch (error) {
    // If file doesn't exist, return empty history
    if (error.code === "ENOENT") {
      return {};
    }
    throw error;
  }
}

async function saveSelectionHistory(history) {
  const historyPath = path.join(__dirname, "selection_history.json");
  await fs.writeFile(historyPath, JSON.stringify(history, null, 2), "utf-8");
}

function getSelectionCount(history, personName, date) {
  const key = `${date}_${personName}`;
  return history[key] || 0;
}

function updateSelectionCount(history, personName, date) {
  const key = `${date}_${personName}`;
  history[key] = (history[key] || 0) + 1;
  return history;
}

export {
  getCurrentDateTime,
  readShiftsJSON,
  convertTo24Hour,
  findPersonOnShift,
  loadSelectionHistory,
  saveSelectionHistory,
  getSelectionCount,
  updateSelectionCount,
};
