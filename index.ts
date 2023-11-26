import fetch from "node-fetch";
import fs from "fs/promises";

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

async function getLiveMatches(): Promise<Match[]> {
  try {
    const url = "https://api.vebo.xyz/api/match/fixture/home/20231126";

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const responseData = (await response.json()) as { data: Match[] };

    if (!Array.isArray(responseData.data)) {
      throw new Error("Unexpected data format");
    }

    return responseData.data.filter((entry) => entry.is_live);
  } catch (error) {
    console.error(
      "Error fetching live match data:",
      error instanceof Error ? error.message : error
    );
    return [];
  }
}

async function getFilteredPlayUrls(id: string): Promise<PlayUrl[] | null> {
  try {
    const metaUrl = `https://api.vebo.xyz/api/match/${id}/meta`;

    const response = await fetch(metaUrl);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const responseData = (await response.json()) as { data: MetaData };

    if (!responseData.data) {
      throw new Error("Unexpected meta data format");
    }

    const filteredPlayUrls = responseData.data.play_urls.filter(
      (url) => url.name.includes("HD") || url.name.includes("FullHD")
    );

    return filteredPlayUrls;
  } catch (error) {
    console.error(
      "Error fetching meta data:",
      error instanceof Error ? error.message : error
    );
    return null;
  }
}

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

async function main() {
  const liveMatches = await getLiveMatches();
  await generateM3UPlaylist(liveMatches);
}

// Example usage
main();
