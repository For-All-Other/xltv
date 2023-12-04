import dayjs from 'dayjs'
import chalk from 'chalk'
import fetch from 'node-fetch'
import { writeFile, mkdir } from 'fs/promises'

// Constants
const API_URL = 'https://api.vebo.xyz/api'
const MATCH_API_URL = `${API_URL}/match`

// Custom Error Classes
class HttpError extends Error {
  constructor(status: number) {
    super(`HTTP error! Status: ${status}`)
    this.name = 'HttpError'
  }
}

class UnexpectedDataError extends Error {
  constructor(message: string) {
    super(`Unexpected data format: ${message}`)
    this.name = 'UnexpectedDataError'
  }
}

// Interfaces
interface Match {
  is_live: boolean
  id: string
  name: string
  tournament: {
    name: string
    logo: string
  }
  commentators: Array<{ name: string }>
}

interface PlayUrl {
  name: string
  url: string
}

// Fetch data from API
async function fetchData(url: string): Promise<any> {
  const response = await fetch(url)

  if (!response.ok) {
    throw new HttpError(response.status)
  }

  return response.json()
}

// Fetch live matches
async function getLiveMatches(date: string): Promise<Match[]> {
  const apiURL = `${MATCH_API_URL}/fixture/home/${date}`

  try {
    const { data } = await fetchData(apiURL)

    if (!Array.isArray(data)) {
      throw new UnexpectedDataError(
        `Response data is not an array: ${JSON.stringify(data)}`
      )
    }

    return data.filter((entry: Match) => entry.is_live)
  } catch (error) {
    console.error(
      chalk.red(`Error fetching live match data for date ${date}:`),
      error
    )
    return []
  }
}

// Fetch filtered play URLs for a given match ID
async function getFilteredPlayUrls(id: string): Promise<PlayUrl[] | null> {
  try {
    const { data } = await fetchData(`${MATCH_API_URL}/${id}/meta`)

    if (!data) {
      throw new UnexpectedDataError(`No meta data found for match ID ${id}`)
    }

    return data.play_urls.filter(
      (url: PlayUrl) => url.name.includes('HD') || url.name.includes('FullHD')
    )
  } catch (error) {
    console.error(
      chalk.red(`Error fetching meta data for match ID ${id}:`),
      error
    )
    return null
  }
}

// Generate M3U playlist entry for live matches with filtered play URLs
function generateM3UEntry(
  match: Match,
  url: PlayUrl,
  commentators: string[]
): string {
  const { id, name, tournament } = match
  const { logo } = tournament
  const { name: tournamentName } = tournament
  const { name: urlName, url: playUrl } = url

  const commentatorNames =
    commentators.length > 0 ? commentators.join(' & ') : 'Unknown'

  return `#EXTINF:-1 tvg-id="${id}" tvg-name="${name} - ${urlName}" tvg-logo="${logo}" group-title="${tournamentName}",${name} - ${urlName} - ${commentatorNames}\n${playUrl}`
}

// Generate M3U playlist for live matches with filtered play URLs
async function generateM3UPlaylist(liveMatches: Match[]): Promise<void> {
  const playlistContent: string[] = ['#EXTM3U']

  for (const match of liveMatches) {
    const filteredPlayUrls = await getFilteredPlayUrls(match.id)
    if (filteredPlayUrls) {
      const commentatorNames = match.commentators.map(
        (commentator) => commentator.name
      )
      filteredPlayUrls.forEach((url) => {
        playlistContent.push(generateM3UEntry(match, url, commentatorNames))
      })
    }
  }

  const folderPath = 'stream'
  const filePath = `${folderPath}/playlist.m3u`

  try {
    // Create the folder if it doesn't exist
    await mkdir(folderPath, { recursive: true })

    // Write the playlist content to a file in the specified folder
    await writeFile(filePath, playlistContent.join('\n'))

    console.log(chalk.green('Playlist file written to:'), filePath)
  } catch (error) {
    console.error(chalk.red('Error writing the playlist file:'), error)
  }
}

// Main function
async function main() {
  try {
    const today = dayjs()

    // GMT+7
    const gmtPlus7Date = today.add(7, 'hour')

    const formattedDate = gmtPlus7Date.format('YYYYMMDD')

    const liveMatches = await getLiveMatches(formattedDate)
    await generateM3UPlaylist(liveMatches)
  } catch (error) {
    console.error(chalk.red('An unexpected error occurred:'), error)
  }
}

// Example usage
main()
