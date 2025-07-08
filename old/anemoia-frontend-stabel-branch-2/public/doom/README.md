# WebDOOM Setup Instructions

This directory contains multiple implementations for running DOOM in the browser:

1. **play-doom.html** - A working implementation using js-dos DOOM (currently active)
2. **doom-game.html** - Local WebAssembly implementation (requires WAD file configuration)
3. **simple.html** - Alternative iframe implementation
4. **index.html** - Original WebAssembly implementation template

## Required Files

You need to add the following files to this directory:
1. `doom.js` - The main JavaScript file that loads the WebAssembly module
2. `doom.wasm` - The WebAssembly binary containing the DOOM engine
3. `doom1.wad` or `doom2.wad` - The DOOM game data file (shareware or full version)

## Option 1: Use a Pre-built WebDOOM Implementation

You can use pre-built files from existing WebDOOM projects:

1. **From midzer's WebDOOM** (Recommended):
   - Visit: https://github.com/midzer/web-doom
   - Download the built files from their releases
   - Copy `doom.js`, `doom.wasm`, and the WAD file to this directory

2. **From AzazelN28's web-doom**:
   - Visit: https://github.com/AzazelN28/web-doom
   - Build the project following their instructions
   - Copy the generated files to this directory

## Option 2: Build from Source

If you want to build DOOM from source:

1. Install Emscripten: https://emscripten.org/docs/getting_started/downloads.html
2. Clone one of the WebDOOM repositories mentioned above
3. Follow their build instructions
4. Copy the built files to this directory

## Getting WAD Files

- **Shareware DOOM (doom1.wad)**: Can be legally downloaded from various sources
- **Full DOOM**: Requires purchasing the game from Steam, GOG, etc.

## File Structure

After setup, this directory should contain:
```
doom/
├── index.html      (already present)
├── README.md       (this file)
├── doom.js         (you need to add)
├── doom.wasm       (you need to add)
└── doom1.wad       (you need to add)
```

## Testing

Once all files are in place, the DOOM page should work correctly. The game will load when users click "Start Game" on the DOOM page.

## Switching Between Implementations

To switch between the two implementations, edit `/src/pages/DoomPage.tsx` and change the iframe source:

- For the simple implementation (default): `src="/doom/simple.html"`
- For the local WebAssembly implementation: `src="/doom/index.html"`

The simple implementation works out of the box but loads from an external source. The WebAssembly implementation provides a fully self-hosted solution but requires the additional files mentioned above.

## Legal Notice

DOOM is a registered trademark of ZeniMax Media Inc. Make sure you have the legal right to use any WAD files you include. 