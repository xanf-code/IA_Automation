const OpenAI = require("openai");
const fs = require("fs").promises;
const path = require("path");
require("dotenv").config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function detectZone(short_description, description) {
  const zonesData = await fs.readFile(
    path.join(__dirname, "zones.json"),
    "utf-8",
  );
  const zones = JSON.parse(zonesData);

  const combinedText = `Short Description: ${short_description}\nDescription: ${description}`;

  const prompt = `You are a classroom/building name extractor. Given the following issue description, extract the classroom or building name mentioned.

Issue Text:
${combinedText}

Here is the list of valid buildings and their zones:
${JSON.stringify(zones, null, 2)}

Instructions:
- Look for classroom or building names in the text (e.g., "Dodge Hall", "ISEC", "Snell Library")
- IGNORE any zone names mentioned in the text (they may be incorrect)
- Match the extracted building to the zones data provided
- If you find a match, respond with ONLY the zone name (e.g., "Center Zone")
- If no building/classroom is found or it doesn't match any in the list, respond with exactly: zone_not_found

Response (zone name or zone_not_found):`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0,
    max_tokens: 50,
  });

  const result = response.choices[0].message.content.trim();
  return result;
}

detectZone(
  "Zone: Ryder: Looking for Recordings on classroom tablet Lab-ISEC-148 Room",
  "One of my instructors recorded a presentation using the built in tablet in the classroom (Lab-ISEC-148 Room). I was wondering how to access those files so that I can send them to the instructor. I manage the lab space for the Biotech Masters Program.Happy to chat on the phone if that's easier.Best,Jeffrey LongLab Manager - Biotechnology Teaching Laboratory805 Columbus Ave, Boston, MA 02120 | Northeastern University",
)
  .then((zone) => console.log("Detected Zone:", zone))
  .catch((error) => console.error("Error detecting zone:", error));
//module.exports = { detectZone };
