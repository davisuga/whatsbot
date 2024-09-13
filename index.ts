// Import necessary modules
import pkg from "whatsapp-web.js";
const { Client, MessageMedia } = pkg;
import qrcode from "qrcode-terminal";
import { Innertube } from "youtubei.js";
import * as ytdl from "ytdl-core";
import * as fs from "fs";
import * as ffmpeg from "fluent-ffmpeg";

// Create a new WhatsApp client instance
const client = new Client();

// Display QR code for authentication
client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
});

// Log when the client is ready
client.on("ready", () => {
  console.log("Client is ready!");
});

client.initialize();

// Initialize YouTube.js
let yt: Innertube;

(async () => {
  yt = await Innertube.create();
})();

// User session management
interface UserSession {
  searchResults: any[];
  state: "awaiting_selection" | "idle";
}

const sessions = new Map<string, UserSession>();

// Handle incoming messages
client.on("message", async (message: Message) => {
  const chatId = message.from;
  console.log(message);

  if (message.body.startsWith("!yt ")) {
    const query = message.body.slice(4).trim();

    // Search YouTube for videos matching the query
    const searchResults = await yt.search(query, { type: "video" });
    const videos = searchResults.videos.slice(0, 5); // Get the top 5 results

    if (videos.length === 0) {
      message.reply("No videos found for your query.");
      return;
    }

    // Build and send the search results message
    let response = "Search results:\n";
    videos.forEach((video, index) => {
      response += `${index + 1}. ${video.title}\n`;
    });
    response += "\nReply with the number of the video you want to download.";
    message.reply(response);

    // Store the search results in the user's session
    sessions.set(chatId, {
      searchResults: videos,
      state: "awaiting_selection",
    });
  } else {
    // Check if the user is in a session waiting for a video selection
    const session = sessions.get(chatId);
    if (session && session.state === "awaiting_selection") {
      const selection = parseInt(message.body.trim());
      if (
        isNaN(selection) ||
        selection < 1 ||
        selection > session.searchResults.length
      ) {
        message.reply("Please reply with a valid number from the list.");
        return;
      }
      const video = session.searchResults[selection - 1];
      message.reply(`Downloading "${video.title}"...`);
      // Download and send the video
      await downloadAndSendVideo(video.id, message.from, video.title);
      // Clear the session
      sessions.delete(chatId);
    }
  }
});

// Function to download and send the video
async function downloadAndSendVideo(
  videoId: string,
  chatId: string,
  videoTitle: string
) {
  try {
    // Define file paths
    const outputDir = "videos";
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }
    const tempFilePath = `${outputDir}/${videoId}_temp.mp4`;
    const filePath = `${outputDir}/${videoId}.mp4`;

    // Download the video using ytdl-core
    await new Promise((resolve, reject) => {
      ytdl(videoId, { quality: "highestvideo" })
        .pipe(fs.createWriteStream(tempFilePath))
        .on("finish", () => {
          resolve(null);
        })
        .on("error", (err) => {
          reject(err);
        });
    });

    // Check the file size
    let stats = fs.statSync(tempFilePath);
    let fileSizeInBytes = stats.size;
    const maxSizeInBytes = 60 * 1024 * 1024; // 60 MB

    if (fileSizeInBytes > maxSizeInBytes) {
      // Compress or trim the video using ffmpeg
      await new Promise((resolve, reject) => {
        ffmpeg(tempFilePath)
          .outputOptions([
            "-preset veryfast",
            "-crf 28", // Adjust the quality (lower value means better quality)
            "-vf scale=640:-2", // Scale video to width 640px
          ])
          .on("end", () => {
            resolve(null);
          })
          .on("error", (err) => {
            reject(err);
          })
          .save(filePath);
      });
    } else {
      // Rename temp file to final file
      fs.renameSync(tempFilePath, filePath);
    }

    // Create MessageMedia from the video file
    const media = MessageMedia.fromFilePath(filePath);

    // Send the video to the user
    await client.sendMessage(chatId, media, { caption: videoTitle });

    // Clean up files
    fs.unlinkSync(filePath);
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  } catch (err) {
    console.error(err);
    client.sendMessage(chatId, "An error occurred while processing the video.");
  }
}
