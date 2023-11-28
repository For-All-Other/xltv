import fetch from "node-fetch";
import { writeFile, mkdir } from "fs/promises";
import { dirname } from "path";

// Constants
const META_API_URL = "https://api.vebo.xyz/api/match/";

// Custom Error Classes
class HttpError extends Error {
  constructor(status: number) {
    super(`HTTP error! Status: ${status}`);
    this.name = "HttpError";
  }
}

class UnexpectedDataError extends Error {
  constructor(message: string) {
    super(`Unexpected data format: ${message}`);
    this.name = "UnexpectedDataError";
  }
}

// Interface definitions
interface Match {
  is_live: boolean;
  id: string;
  name: string;
  tournament: {
    logo: string;
  };
}

interface PlayUrl {
  name: string;
  url: string;
}

interface MetaData {
  play_urls: PlayUrl[];
  id: string;
}

// Fetch data from API
async function fetchData(url: string): Promise<any> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new HttpError(response.status);
  }

  return response.json();
}

// Fetch live matches
async function getLiveMatches(date: string): Promise<Match[]> {
  const MATCH_API_URL = `https://api.vebo.xyz/api/match/fixture/home/${date}`;

  try {
    const { data } = await fetchData(MATCH_API_URL);

    if (!Array.isArray(data)) {
      throw new UnexpectedDataError("Response data is not an array");
    }

    return data.filter((entry: Match) => entry.is_live);
  } catch (error) {
    console.error("Error fetching live match data:", error);
    return [];
  }
}

// Fetch filtered play URLs for a given match ID
async function getFilteredPlayUrls(id: string): Promise<PlayUrl[] | null> {
  try {
    const { data } = await fetchData(`${META_API_URL}${id}/meta`);

    if (!data) {
      throw new UnexpectedDataError("No meta data found");
    }

    return data.play_urls.filter(
      (url: PlayUrl) => url.name.includes("HD") || url.name.includes("FullHD")
    );
  } catch (error) {
    console.error("Error fetching meta data:", error);
    return null;
  }
}

// Generate M3U playlist for live matches with filtered play URLs
function generateM3UEntry(match: Match, url: PlayUrl): string {
  return `#EXTINF:-1 tvg-id="${match.id}" tvg-name="${match.name}" tvg-logo="${match.tournament.logo}",${match.name} - ${url.name}\n${url.url}\n`;
}

async function generateM3UPlaylist(liveMatches: Match[]): Promise<void> {
  const playlistContent: string[] = [];

  for (const match of liveMatches) {
    const filteredPlayUrls = await getFilteredPlayUrls(match.id);
    if (filteredPlayUrls) {
      filteredPlayUrls.forEach((url) => {
        playlistContent.push(generateM3UEntry(match, url));
      });
    }
  }

  const folderPath = "stream";
  const filePath = `${folderPath}/playlist.m3u`;

  try {
    // Create the folder if it doesn't exist
    await mkdir(folderPath, { recursive: true });

    // Write the playlist content to a file in the specified folder
    await writeFile(filePath, playlistContent.join("\n"));

    console.log(`Playlist file written to: ${filePath}`);
  } catch (error) {
    console.error("Error writing the playlist file:", error);
  }
}

// Main function
async function main() {
  try {
    const today = new Date();
    const formattedDate = today.toISOString().split("T")[0].replace(/-/g, "");
    console.log(formattedDate);
    const liveMatches = await getLiveMatches(formattedDate);
    await generateM3UPlaylist(liveMatches);
  } catch (error) {
    console.error("An unexpected error occurred:", error);
  }
}

// Example usage
main();
