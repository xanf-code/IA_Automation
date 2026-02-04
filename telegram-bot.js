import { Bot } from "grammy";
import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API_BASE_URL =
  process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;

// Validate token
if (!BOT_TOKEN) {
  console.error(
    "Error: TELEGRAM_BOT_TOKEN not found in environment variables"
  );
  console.error("Please add your bot token to .env file");
  process.exit(1);
}

// Create bot instance
const bot = new Bot(BOT_TOKEN);

// Load zones data for /buildings command
async function loadZones() {
  const zonesData = await fs.readFile(
    path.join(__dirname, "zones.json"),
    "utf-8"
  );
  return JSON.parse(zonesData);
}

// Call the existing API endpoint
async function suggestPerson(building) {
  const response = await fetch(`${API_BASE_URL}/api/suggest-person`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ building }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `API error: ${response.status}`);
  }

  return response.json();
}

// Format the API response for Telegram
function formatResponse(result, buildingName) {
  let message = `🏢 Building: ${buildingName}\n\n`;

  if (result.on_shift.length === 0) {
    message += "No one is currently on shift.";
  } else {
    message += `👥 People on shift: ${result.on_shift.join(", ")}\n\n`;
    message += `✅ Suggested: ${result.suggested}`;
  }

  return message;
}

// /start command
bot.command("start", async (ctx) => {
  await ctx.reply(
    "Welcome to the Building Shift Assistant!\n\n" +
      "Send me a building name or code, and I'll tell you who's on shift.\n\n" +
      "Commands:\n" +
      "/help - Show help message\n" +
      "/buildings - List all buildings\n" +
      "/zones - List buildings by zone"
  );
});

// /help command
bot.command("help", async (ctx) => {
  await ctx.reply(
    "How to use this bot:\n\n" +
      "1. Send a building name (e.g., 'Dodge Hall')\n" +
      "2. Or send a building code (e.g., 'DG')\n\n" +
      "I'll find who's currently on shift and suggest someone.\n\n" +
      "Commands:\n" +
      "/buildings - List all buildings with codes\n" +
      "/zones - List buildings grouped by zone"
  );
});

// /buildings command
bot.command("buildings", async (ctx) => {
  try {
    const zones = await loadZones();
    const buildingList = zones.map((z) => `${z.code} - ${z.building}`).join("\n");

    await ctx.reply(`Available Buildings (${zones.length}):\n\n${buildingList}`);
  } catch (error) {
    console.error("Error loading buildings:", error);
    await ctx.reply("Error loading buildings list. Please try again.");
  }
});

// /zones command
bot.command("zones", async (ctx) => {
  try {
    const zones = await loadZones();

    // Group by zone
    const grouped = zones.reduce((acc, z) => {
      if (!acc[z.zone]) acc[z.zone] = [];
      acc[z.zone].push(`  ${z.code} - ${z.building}`);
      return acc;
    }, {});

    let message = "Buildings by Zone:\n\n";
    for (const [zone, buildings] of Object.entries(grouped)) {
      message += `📍 ${zone}\n`;
      message += buildings.join("\n") + "\n\n";
    }

    await ctx.reply(message);
  } catch (error) {
    console.error("Error loading zones:", error);
    await ctx.reply("Error loading zones list. Please try again.");
  }
});

// Handle text messages (building queries)
bot.on("message:text", async (ctx) => {
  const userInput = ctx.message.text.trim();

  // Skip if it's a command
  if (userInput.startsWith("/")) return;

  try {
    // Show typing indicator
    await ctx.replyWithChatAction("typing");

    // Call the API
    const result = await suggestPerson(userInput);

    // Format and send response
    const response = formatResponse(result, userInput);
    await ctx.reply(response);
  } catch (error) {
    console.error("Error processing request:", error.message);

    if (error.message.includes("not found")) {
      await ctx.reply(
        `Building "${userInput}" not found.\n\n` +
          "Use /buildings to see the list of valid buildings."
      );
    } else if (error.message.includes("fetch")) {
      await ctx.reply(
        "Could not connect to the API server.\n" +
          "Make sure the server is running (npm start)."
      );
    } else {
      await ctx.reply(
        "Sorry, an error occurred while processing your request.\n" +
          "Please try again later."
      );
    }
  }
});

// Error handling
bot.catch((err) => {
  console.error("Bot error:", err);
});

// Start the bot
console.log("Starting Telegram bot...");
console.log(`API endpoint: ${API_BASE_URL}/api/suggest-person`);
bot.start();
console.log("Telegram bot is running! Send /start to your bot to begin.");
