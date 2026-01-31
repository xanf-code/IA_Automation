# IA Automation API

A lightweight backend API that suggests personnel assignments based on building zones and shift schedules.

## Features

- Maps building names to zones using zones.json
- Reads and analyzes shift schedules from PDF
- Uses OpenAI GPT-4 to suggest the best person for a given building, date, and time
- Returns simple JSON response with the suggested person's name

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- OpenAI API key

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory:
```bash
cp .env.example .env
```

3. Add your OpenAI API key to the `.env` file:
```
OPENAI_API_KEY=your_actual_api_key_here
```

Get your API key from: https://platform.openai.com/api-keys

## Running the Server

Start the server:
```bash
npm start
```

For development with auto-restart:
```bash
npm run dev
```

The server will run on `http://localhost:3000` by default.

## API Endpoints

### POST /api/suggest-person

Suggests a person for a given building based on zone and current date/time.

**Request Body:**
```json
{
  "building": "Richards Hall"
}
```

**Success Response (200 OK):**
```json
{
  "name": "Aswathappa"
}
```

**Error Responses:**

400 Bad Request - Missing building name:
```json
{
  "error": "Building name is required"
}
```

404 Not Found - Building not in database:
```json
{
  "error": "Building \"Unknown Building\" not found in zones database"
}
```

500 Internal Server Error:
```json
{
  "error": "Internal server error",
  "message": "Detailed error message"
}
```

### GET /health

Health check endpoint to verify the API is running.

**Response:**
```json
{
  "status": "ok",
  "message": "API is running"
}
```

## Example Usage

Using curl:
```bash
curl -X POST http://localhost:3000/api/suggest-person \
  -H "Content-Type: application/json" \
  -d '{"building": "Richards Hall"}'
```

Using JavaScript fetch:
```javascript
fetch('http://localhost:3000/api/suggest-person', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    building: 'Richards Hall'
  })
})
.then(response => response.json())
.then(data => console.log(data));
```

## How It Works

1. API receives a building name
2. Looks up the zone for that building in zones.json
3. Gets the current date and time (e.g., "Friday Jan 30, 4:51PM")
4. Reads the shifts schedule from shifts.pdf
5. Sends all information to OpenAI GPT-4 to analyze and suggest the best person
6. Returns the suggested person's name in JSON format

## Project Structure

```
IA_Automation/
├── server.js           # Main API server
├── package.json        # Node.js dependencies
├── zones.json          # Building to zone mappings
├── shifts.pdf          # Shift schedules
├── .env                # Environment variables (not in git)
├── .env.example        # Example environment file
├── .gitignore          # Git ignore rules
└── README.md           # This file
```

## Notes

- The API automatically formats the current date and time in a human-readable format
- Building name matching is case-insensitive
- The OpenAI GPT-4 model is used for intelligent person suggestions based on shift schedules
- All errors are handled and returned with appropriate HTTP status codes
