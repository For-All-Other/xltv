import fetch from "node-fetch";
import fs from "fs/promises";

// Constants
const MATCH_API_URL = "https://api.vebo.xyz/api/match/fixture/home/20231126";
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

// Fetch live matches
async function getLiveMatches(): Promise<Match[]> {
  try {
    const response = await fetch(MATCH_API_URL);

    if (!response.ok) {
      throw new HttpError(response.status);
    }

    const responseData = (await response.json()) as { data: Match[] };

    if (!Array.isArray(responseData.data)) {
      throw new UnexpectedDataError("Response data is not an array");
    }

    return responseData.data.filter((entry) => entry.is_live);
  } catch (error) {
    console.error("Error fetching live match data:", error);
    return [];
  }
}

// Fetch filtered play URLs for a given match ID
async function getFilteredPlayUrls(id: string): Promise<PlayUrl[] | null> {
  try {
    const response = await fetch(`${META_API_URL}${id}/meta`);

    if (!response.ok) {
      throw new HttpError(response.status);
    }

    const responseData = (await response.json()) as { data: MetaData };

    if (!responseData.data) {
      throw new UnexpectedDataError("No meta data found");
    }

    const filteredPlayUrls = responseData.data.play_urls.filter(
      (url) => url.name.includes("HD") || url.name.includes("FullHD")
    );

    return filteredPlayUrls;
  } catch (error) {
    console.error("Error fetching meta data:", error);
    return null;
  }
}

// Generate M3U playlist for live matches with filtered play URLs
async function generateM3UPlaylist(liveMatches: Match[]): Promise<void> {
  const playlistContent: string[] = [];

  for (const match of liveMatches) {
    const filteredPlayUrls = await getFilteredPlayUrls(match.id);
    if (filteredPlayUrls) {
      filteredPlayUrls.forEach((url) => {
        // Add each play URL to the playlist with additional information
        playlistContent.push(
          `#EXTINF:-1 tvg-id="${match.id}" tvg-name="${match.name}" tvg-logo="${match.tournament.logo}",${match.name} - ${url.name}\n${url.url}\n`
        );
      });
    }
  }

  // Write the playlist content to a file
  await fs.writeFile("live_matches_playlist.m3u", playlistContent.join("\n"));
}

// Main function
async function main() {
  const liveMatches = await getLiveMatches();
  await generateM3UPlaylist(liveMatches);
}

// Example usage
main();
