# Truth Seekers - Glitch Deployment Guide

## Overview

This guide explains how to deploy the Truth Seekers game on Glitch for easy multiplayer gameplay. This is the simplest way for 13-year-olds to play the game without any technical setup.

## What is Glitch?

Glitch is a free web hosting platform that lets you run web applications directly in your browser. No installation or command line knowledge is required.

## Deployment Steps

### For the Host (Game Creator):

1. **Create a Glitch Account**:
   - Go to [glitch.com](https://glitch.com)
   - Sign up for a free account (or sign in if you already have one)

2. **Create a New Project**:
   - Click "New Project" 
   - Select "Import from GitHub"
   - Enter this repository URL: `https://github.com/your-username/truth-seekers-game` (Note: You'll need to create this repository first)
   - Alternatively, select "glitch-hello-node" and then replace the files with the ones from the zip file

3. **Or Upload Files Directly**:
   - Create a new project
   - Click on "Assets" in the left sidebar
   - Upload all the files from the zip package
   - Make sure to maintain the folder structure (server.js in the root, other files in the public folder)

4. **Start the Game**:
   - Once the project is created, Glitch will automatically start the server
   - Click "Show" at the top of the page and select "In a new window"
   - This opens the game in a new browser tab

5. **Share with Friends**:
   - Copy the URL from the address bar (it will look like `https://project-name.glitch.me`)
   - Share this URL with your friends

### For Players (Joining the Game):

1. **Join the Game**:
   - Open the URL shared by the host in any web browser
   - Click "Join Game"
   - Enter your name and the game code shown on the host's screen
   - Click "Join Game" to enter the lobby

2. **Play the Game**:
   - Follow the on-screen instructions
   - Enter your role code when prompted
   - Play the game as normal

## Advantages of Using Glitch

- No installation required
- Works on any device with a web browser
- No need to deal with IP addresses or network configuration
- Persistent URL that can be bookmarked
- Automatic deployment and hosting

## Troubleshooting

- If the game doesn't load, try refreshing the page
- If players can't join, make sure they're using the correct game code
- If the Glitch project goes to sleep (after inactivity), just click on it to wake it up

## Important Notes

- Glitch projects go to sleep after 5 minutes of inactivity
- Free Glitch projects have limited resources, but should be sufficient for this game
- The game data is not persistent between sessions (scores and progress will reset)
