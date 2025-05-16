// Truth Seekers - WebSocket Server for Local Multiplayer
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const os = require('os');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Game state
let gameState = {
  gameCode: generateGameCode(),
  players: [],
  currentPlayerIndex: 0,
  currentQuestionId: 0,
  fakemakerUnmasked: false,
  gamePhase: "setup",
  fakemakerName: null,
  questions: [],
  connections: {} // Map of player names to their WebSocket connections
};

// Generate a random game code (5 characters)
function generateGameCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Get local IP address
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip over non-IPv4 and internal (loopback) addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1'; // Fallback to localhost
}

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('New client connected');
  
  // Assign a temporary ID until player joins with name
  ws.id = Date.now().toString();
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Received:', data.type);
      
      // Handle different message types
      switch(data.type) {
        case 'JOIN_REQUEST':
          handleJoinRequest(ws, data);
          break;
        case 'ROLE_CODE_ENTERED':
          handleRoleCodeEntered(ws, data);
          break;
        case 'GAME_START':
          handleGameStart(ws);
          break;
        case 'TURN_COMPLETE':
          handleTurnComplete(ws, data);
          break;
        case 'ANSWER_SUBMISSION':
          handleAnswerSubmission(ws, data);
          break;
        case 'ATTEMPT_UNMASK':
          handleAttemptUnmask(ws, data);
          break;
        case 'PING':
          ws.send(JSON.stringify({ type: 'PONG' }));
          break;
        default:
          console.log('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });
  
  ws.on('close', () => {
    console.log('Client disconnected');
    // Remove player if they disconnect
    for (const [name, connection] of Object.entries(gameState.connections)) {
      if (connection === ws) {
        // Remove player from game state
        gameState.players = gameState.players.filter(player => player.name !== name);
        delete gameState.connections[name];
        
        // Notify remaining players
        broadcastPlayerList();
        break;
      }
    }
  });
  
  // Send initial server info
  ws.send(JSON.stringify({
    type: 'SERVER_INFO',
    gameCode: gameState.gameCode,
    ipAddress: getLocalIpAddress(),
    port: server.address().port
  }));
});

// Handle join request
function handleJoinRequest(ws, data) {
  const { playerName, gameCode } = data;
  
  // Validate game code
  if (gameCode !== gameState.gameCode) {
    ws.send(JSON.stringify({
      type: 'JOIN_REJECTED',
      reason: 'Invalid game code'
    }));
    return;
  }
  
  // Check if name is already taken
  if (gameState.players.some(player => player.name === playerName)) {
    ws.send(JSON.stringify({
      type: 'JOIN_REJECTED',
      reason: 'Name already taken'
    }));
    return;
  }
  
  // Add player to game state
  gameState.players.push({
    name: playerName,
    role: '',
    position: 0,
    isFakemakerRevealedThisTurn: false
  });
  
  // Store connection
  gameState.connections[playerName] = ws;
  
  // Send join confirmation
  ws.send(JSON.stringify({
    type: 'JOIN_ACCEPTED',
    playerName: playerName
  }));
  
  // Broadcast updated player list to all clients
  broadcastPlayerList();
}

// Handle role code entered
function handleRoleCodeEntered(ws, data) {
  const { playerName, roleCode } = data;
  
  // Find player
  const playerIndex = gameState.players.findIndex(player => player.name === playerName);
  if (playerIndex === -1) return;
  
  // Validate role code (this is done client-side as well)
  const pincodes = [
    { pincode: "1288", role: "Fakemaker" },
    { pincode: "7523", role: "Factchecker" },
    { pincode: "7358", role: "Factchecker" },
    { pincode: "6411", role: "Factchecker" },
    { pincode: "9876", role: "Factchecker" },
    { pincode: "5432", role: "Factchecker" }
  ];
  
  const roleEntry = pincodes.find(entry => entry.pincode === roleCode);
  if (!roleEntry) {
    ws.send(JSON.stringify({
      type: 'ROLE_REJECTED',
      reason: 'Invalid role code'
    }));
    return;
  }
  
  // Assign role to player
  gameState.players[playerIndex].role = roleEntry.role;
  
  // If this is the Fakemaker, record their name
  if (roleEntry.role === "Fakemaker") {
    gameState.fakemakerName = playerName;
  }
  
  // Send role confirmation only to this player
  ws.send(JSON.stringify({
    type: 'ROLE_CONFIRMED',
    role: roleEntry.role
  }));
  
  // Check if all players have roles and notify host
  if (gameState.players.every(player => player.role !== '')) {
    broadcastMessage({
      type: 'ALL_ROLES_ASSIGNED'
    });
  }
}

// Handle game start
function handleGameStart(ws) {
  // Only the host can start the game (first player)
  if (gameState.players.length === 0 || 
      gameState.connections[gameState.players[0].name] !== ws) {
    return;
  }
  
  // Initialize game state
  gameState.currentPlayerIndex = 0;
  gameState.currentQuestionId = 0;
  gameState.gamePhase = "turnStart";
  
  // Broadcast game start
  broadcastMessage({
    type: 'GAME_STARTED',
    firstPlayer: gameState.players[0].name
  });
  
  // Start first turn
  startNextTurn();
}

// Handle turn complete
function handleTurnComplete(ws, data) {
  // Move to next player
  gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
  startNextTurn();
}

// Handle answer submission
function handleAnswerSubmission(ws, data) {
  const { playerName, answer } = data;
  
  // Validate current player
  if (gameState.players[gameState.currentPlayerIndex].name !== playerName) {
    return;
  }
  
  // Process answer (simplified for now)
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  
  if (answer === true) { // Correct answer
    currentPlayer.position += 1;
    broadcastMessage({
      type: 'ANSWER_RESULT',
      playerName: playerName,
      correct: true,
      newPosition: currentPlayer.position,
      message: `${playerName} gaat 1 stap vooruit.`
    });
  } else { // Wrong answer
    const penalty = Math.floor(Math.random() * 5) + 1;
    currentPlayer.position = Math.max(0, currentPlayer.position - penalty);
    broadcastMessage({
      type: 'ANSWER_RESULT',
      playerName: playerName,
      correct: false,
      newPosition: currentPlayer.position,
      message: `${playerName} gaat ${penalty} stap(pen) achteruit.`
    });
  }
}

// Handle attempt to unmask Fakemaker
function handleAttemptUnmask(ws, data) {
  const { accusedName } = data;
  
  if (accusedName === gameState.fakemakerName) {
    // Correct accusation
    gameState.fakemakerUnmasked = true;
    broadcastMessage({
      type: 'FAKEMAKER_UNMASKED',
      fakemakerName: gameState.fakemakerName,
      message: `De Fakemaker, ${gameState.fakemakerName}, is ontmaskerd! De Factcheckers winnen!`
    });
    endGame(`De Fakemaker, ${gameState.fakemakerName}, is ontmaskerd! De Factcheckers winnen!`);
  } else {
    // Wrong accusation
    broadcastMessage({
      type: 'ACCUSATION_FAILED',
      accusedName: accusedName,
      message: `${accusedName} is niet de Fakemaker. Het spel gaat verder.`
    });
    
    // Move to next player
    setTimeout(() => {
      gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
      startNextTurn();
    }, 2000);
  }
}

// Start next turn
function startNextTurn() {
  if (gameState.fakemakerUnmasked) {
    endGame(`De Fakemaker, ${gameState.fakemakerName}, is ontmaskerd! De Factcheckers winnen!`);
    return;
  }
  
  // Cycle through questions
  gameState.currentQuestionId = (gameState.currentQuestionId + 1) % gameState.questions.length;
  
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const currentQuestion = gameState.questions[gameState.currentQuestionId];
  
  // Broadcast turn start
  broadcastMessage({
    type: 'TURN_START',
    playerName: currentPlayer.name,
    questionId: gameState.currentQuestionId
  });
  
  // Send private role info to current player
  const playerConnection = gameState.connections[currentPlayer.name];
  if (playerConnection) {
    playerConnection.send(JSON.stringify({
      type: 'YOUR_TURN',
      role: currentPlayer.role,
      questionId: currentQuestion.id,
      questionAnswer: currentQuestion.answer ? "Waar" : "Fout"
    }));
  }
}

// End game
function endGame(reason) {
  gameState.gamePhase = "gameOver";
  
  broadcastMessage({
    type: 'GAME_OVER',
    reason: reason
  });
}

// Broadcast player list to all clients
function broadcastPlayerList() {
  const playerNames = gameState.players.map(player => player.name);
  
  broadcastMessage({
    type: 'PLAYER_LIST_UPDATE',
    players: playerNames
  });
}

// Broadcast message to all connected clients
function broadcastMessage(message) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

// Load questions from file
async function loadQuestions() {
  try {
    const fs = require('fs');
    const questionsData = fs.readFileSync(path.join(__dirname, 'public', 'questions.json'), 'utf8');
    gameState.questions = JSON.parse(questionsData);
    
    // Shuffle questions
    const now = new Date();
    const seed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
    const hour = now.getHours();
    const finalSeed = seed * 100 + hour;
    
    gameState.questions = seededShuffle(gameState.questions, finalSeed);
    
    console.log(`Loaded ${gameState.questions.length} questions`);
    return true;
  } catch (error) {
    console.error('Error loading questions:', error);
    return false;
  }
}

// Shuffle function with seed
function seededShuffle(array, seed) {
  const prng = mulberry32(seed);
  const shuffled = array.slice();

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(prng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

// Simple PRNG based on seed
function mulberry32(seed) {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

// Reset game
function resetGame() {
  gameState = {
    gameCode: generateGameCode(),
    players: [],
    currentPlayerIndex: 0,
    currentQuestionId: 0,
    fakemakerUnmasked: false,
    gamePhase: "setup",
    fakemakerName: null,
    questions: gameState.questions,
    connections: {}
  };
  
  broadcastMessage({
    type: 'GAME_RESET',
    gameCode: gameState.gameCode
  });
}

// HTTP endpoint to get server info
app.get('/server-info', (req, res) => {
  res.json({
    gameCode: gameState.gameCode,
    ipAddress: getLocalIpAddress(),
    port: server.address().port,
    playerCount: gameState.players.length
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Local IP: ${getLocalIpAddress()}`);
  console.log(`Game code: ${gameState.gameCode}`);
  
  // Load questions
  await loadQuestions();
  
  // Log Glitch URL if running on Glitch
  if (process.env.PROJECT_DOMAIN) {
    console.log(`Glitch URL: https://${process.env.PROJECT_DOMAIN}.glitch.me`);
  }
});
