# Truth Seekers - Local Multiplayer Implementation Guide

## Overview

This guide explains how to use the new local multiplayer functionality for the Truth Seekers game. The implementation allows players to join a game using a game code on the same WiFi network without requiring external servers like Firebase.

## How It Works

1. **Host Player**: One player acts as the host and starts the game
2. **Game Code**: The host shares a 5-character game code (e.g., "NW8WU") with other players
3. **Server Address**: The host also shares their local IP address and port (e.g., "192.168.1.5:3000")
4. **Joining**: Other players enter this information to join the game
5. **Role Codes**: Each player enters their role code (e.g., "1288" for "fakemaker") on their own device
6. **Gameplay**: The game state is synchronized across all devices

## Setup Instructions

### For the Host:

1. Start the server by running: `node server.js`
2. Open a web browser and navigate to: `http://localhost:3000`
3. Click "Host Game" and enter your name
4. Note the Game Code and Server Address displayed on screen
5. Share this information with other players
6. Click "Start Lobby" to enter the waiting room
7. Once all players have joined, click "Start Game"

### For Other Players:

1. Open a web browser on their device
2. Navigate to the host's server address (e.g., `http://192.168.1.5:3000`)
3. Click "Join Game"
4. Enter your name, the game code, and server address
5. Click "Join Game" to enter the lobby
6. Wait for the host to start the game

## Role Codes

The following role codes are preserved from the original implementation:

- "1288": Fakemaker
- "7523": Factchecker
- "7358": Factchecker
- "6411": Factchecker
- "9876": Factchecker
- "5432": Factchecker

## Technical Details

- The implementation uses WebSockets for real-time communication
- All game state is managed on the host's device
- No external servers or databases are required
- All devices must be on the same WiFi network
- The host's device must remain active throughout the game

## Troubleshooting

- If players cannot connect, ensure they are on the same WiFi network
- Check that the correct server address and game code are being used
- If the server fails to start, ensure port 3000 is not in use by another application
- If questions don't load, verify that questions.json is in the public folder

## Files Included

- `server.js`: The WebSocket server that runs on the host's device
- `public/index.html`: The main game interface
- `public/client.js`: Client-side WebSocket and game logic
- `public/Truth_seekers_logo.png`: Game logo
- `public/questions.json`: Game questions

## Future Improvements

- Add support for reconnecting if a player disconnects
- Implement a more user-friendly network discovery mechanism
- Add support for custom questions
- Improve mobile device compatibility
