# XLTV Stream Playlist

[![Update Playlist](https://github.com/For-All-Other/xltv/actions/workflows/update-playlist.yml/badge.svg)](https://github.com/For-All-Other/xltv/actions/workflows/update-playlist.yml)

This Node.js script fetches live match data from the Vebo API and generates an M3U playlist with filtered play URLs for live matches. It utilizes the [dayjs](https://github.com/iamkun/dayjs), [chalk](https://github.com/chalk/chalk), and [node-fetch](https://github.com/node-fetch/node-fetch) libraries.

## Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/For-All-Other/xltv.git
cd xltv
bun install
```

## Usage

Run the script:

```bash
bun index.ts
```

The generated M3U playlist will be saved in the `stream` folder with the filename `playlist.m3u`.

## License

This script is licensed under the MIT License - see the LICENSE file for details.
