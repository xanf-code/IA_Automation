const OpenAI = require("openai");
const fs = require("fs").promises;
const path = require("path");
require("dotenv").config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function detectBuilding(short_description, description) {
  const zonesData = await fs.readFile(
    path.join(__dirname, "zones.json"),
    "utf-8",
  );
  const zones = JSON.parse(zonesData);

  const combinedText = `Short Description: ${short_description}\nDescription: ${description}`;

  const prompt = `You are a building name extractor. Given the issue description, identify which building is mentioned.

Issue Text:
${combinedText}

Valid buildings (you must return the exact "building" value):
${JSON.stringify(
  zones.map((z) => ({ building: z.building, code: z.code })),
  null,
  2,
)}

Instructions:
- Look for building names or codes in the text (e.g., "Dodge Hall", "ISEC", "DG", "Snell Library")
- Room numbers like "ISEC-148" or "Lab-ISEC-148" indicate the building code before the room number
- IGNORE any zone names in the text (they may be incorrect)
- Return the EXACT building name from the list above (e.g., "Interdisciplinary Science & Eng" not "ISEC")
- If no building found or it doesn't match, respond exactly: building_not_found

Response (building name or building_not_found):`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0,
    max_tokens: 50,
  });

  return response.choices[0].message.content.trim();
}

module.exports = { detectBuilding };
