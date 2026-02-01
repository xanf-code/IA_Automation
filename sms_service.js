const { detectBuilding } = require("./building_detection");

detectBuilding(
  "Zone: Ryder: Looking for Recordings on classroom tablet Lab-ISEC-148 Room",
  "One of my instructors recorded a presentation using the built in tablet in the classroom (Lab-ISEC-148 Room). I was wondering how to access those files so that I can send them to the instructor. I manage the lab space for the Biotech Masters Program.Happy to chat on the phone if that's easier.Best,Jeffrey LongLab Manager - Biotechnology Teaching Laboratory805 Columbus Ave, Boston, MA 02120 | Northeastern University",
)
  .then((building) => console.log("Detected Building:", building))
  .catch((error) => console.error("Error detecting building:", error));
