// Truth Seekers - Client-side WebSocket implementation
let ws = null;
let isHost = false;
let playerName = '';
let gameCode = '';
let myRole = '';
let localGameState = {
  players: [],
  currentPlayerIndex: 0,
  currentQuestionId: 0,
  fakemakerUnmasked: false,
  gamePhase: "setup",
  questions: []
};

// Initialize WebSocket connection
function initializeWebSocket(serverAddress, port) {
  const wsUrl = `ws://${serverAddress}:${port}`;
  console.log(`Connecting to WebSocket server at ${wsUrl}`);
  
  ws = new WebSocket(wsUrl);
  
  ws.onopen = () => {
    console.log('WebSocket connection established');
    // Start ping interval to keep connection alive
    startPingInterval();
  };
  
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log('Received message:', data.type);
      
      // Handle different message types
      switch(data.type) {
        case 'SERVER_INFO':
          handleServerInfo(data);
          break;
        case 'JOIN_ACCEPTED':
          handleJoinAccepted(data);
          break;
        case 'JOIN_REJECTED':
          handleJoinRejected(data);
          break;
        case 'PLAYER_LIST_UPDATE':
          handlePlayerListUpdate(data);
          break;
        case 'ROLE_CONFIRMED':
          handleRoleConfirmed(data);
          break;
        case 'ROLE_REJECTED':
          handleRoleRejected(data);
          break;
        case 'ALL_ROLES_ASSIGNED':
          handleAllRolesAssigned();
          break;
        case 'GAME_STARTED':
          handleGameStarted(data);
          break;
        case 'TURN_START':
          handleTurnStart(data);
          break;
        case 'YOUR_TURN':
          handleYourTurn(data);
          break;
        case 'ANSWER_RESULT':
          handleAnswerResult(data);
          break;
        case 'FAKEMAKER_UNMASKED':
          handleFakemakerUnmasked(data);
          break;
        case 'ACCUSATION_FAILED':
          handleAccusationFailed(data);
          break;
        case 'GAME_OVER':
          handleGameOver(data);
          break;
        case 'GAME_RESET':
          handleGameReset(data);
          break;
        case 'PONG':
          // Ping response, do nothing
          break;
        default:
          console.log('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  };
  
  ws.onclose = () => {
    console.log('WebSocket connection closed');
    // Try to reconnect after a delay
    setTimeout(() => {
      if (playerName && gameCode) {
        initializeWebSocket(serverAddress, port);
      }
    }, 3000);
  };
  
  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
}

// Start a ping interval to keep the connection alive
function startPingInterval() {
  setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'PING' }));
    }
  }, 30000); // Send ping every 30 seconds
}

// Handle server info message
function handleServerInfo(data) {
  gameCode = data.gameCode;
  
  // If this is the first connection, this client is the host
  if (!isHost && !playerName) {
    isHost = true;
    document.getElementById('hostGameCode').textContent = gameCode;
    document.getElementById('hostIpAddress').textContent = `${data.ipAddress}:${data.port}`;
    showScreen('hostScreen');
  }
}

// Create a new game as host
function createGame() {
  const name = document.getElementById('hostName').value.trim();
  if (!name) {
    alert('Please enter your name');
    return;
  }
  
  playerName = name;
  
  // Send join request as the host
  ws.send(JSON.stringify({
    type: 'JOIN_REQUEST',
    playerName: playerName,
    gameCode: gameCode
  }));
}

// Join an existing game
function joinGame() {
  const name = document.getElementById('joinName').value.trim();
  const code = document.getElementById('joinGameCode').value.trim().toUpperCase();
  const serverAddress = document.getElementById('joinServerAddress').value.trim();
  
  if (!name || !code || !serverAddress) {
    alert('Please fill in all fields');
    return;
  }
  
  playerName = name;
  gameCode = code;
  
  // Parse server address and port
  let address = serverAddress;
  let port = 3000; // Default port
  
  if (serverAddress.includes(':')) {
    const parts = serverAddress.split(':');
    address = parts[0];
    port = parseInt(parts[1]);
  }
  
  // Initialize WebSocket connection
  initializeWebSocket(address, port);
  
  // Show loading screen
  showScreen('loadingScreen');
  
  // Set a timeout to send the join request after connection is established
  setTimeout(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'JOIN_REQUEST',
        playerName: playerName,
        gameCode: gameCode
      }));
    } else {
      alert('Could not connect to the server. Please check the address and try again.');
      showScreen('joinScreen');
    }
  }, 1000);
}

// Handle join accepted message
function handleJoinAccepted(data) {
  console.log('Join accepted:', data);
  showScreen('lobbyScreen');
  
  // If this client is the host, show the start game button
  if (isHost) {
    document.getElementById('startGameBtn').style.display = 'block';
  } else {
    document.getElementById('startGameBtn').style.display = 'none';
  }
}

// Handle join rejected message
function handleJoinRejected(data) {
  alert(`Join rejected: ${data.reason}`);
  showScreen(isHost ? 'hostScreen' : 'joinScreen');
}

// Handle player list update
function handlePlayerListUpdate(data) {
  const playerList = document.getElementById('playerList');
  playerList.innerHTML = '';
  
  data.players.forEach(name => {
    const li = document.createElement('li');
    li.textContent = name;
    if (name === playerName) {
      li.style.fontWeight = 'bold';
    }
    playerList.appendChild(li);
  });
  
  document.getElementById('playerCount').textContent = `Players: ${data.players.length}/6`;
  
  // Update local game state
  localGameState.players = data.players.map(name => ({
    name: name,
    role: name === playerName ? myRole : '',
    position: 0,
    isFakemakerRevealedThisTurn: false
  }));
}

// Start the game (host only)
function startGame() {
  if (!isHost) {
    alert('Only the host can start the game');
    return;
  }
  
  // Show role code entry screen
  showScreen('roleCodeScreen');
  
  // Send game start message
  ws.send(JSON.stringify({
    type: 'GAME_START'
  }));
}

// Submit role code
function submitRoleCode() {
  const roleCode = document.getElementById('roleCodeInput').value.trim();
  if (!roleCode) {
    alert('Please enter your role code');
    return;
  }
  
  // Send role code to server
  ws.send(JSON.stringify({
    type: 'ROLE_CODE_ENTERED',
    playerName: playerName,
    roleCode: roleCode
  }));
}

// Handle role confirmed message
function handleRoleConfirmed(data) {
  myRole = data.role;
  document.getElementById('myRoleDisplay').textContent = myRole;
  showScreen('waitingForPlayersScreen');
}

// Handle role rejected message
function handleRoleRejected(data) {
  alert(`Role code rejected: ${data.reason}`);
}

// Handle all roles assigned message
function handleAllRolesAssigned() {
  if (isHost) {
    document.getElementById('startGameAfterRolesBtn').style.display = 'block';
  }
}

// Handle game started message
function handleGameStarted(data) {
  showScreen('gameStartedScreen');
  document.getElementById('firstPlayerName').textContent = data.firstPlayer;
  
  // If this client is the first player, show the turn screen
  if (data.firstPlayer === playerName) {
    setTimeout(() => {
      showScreen('turnScreen');
    }, 3000);
  }
}

// Handle turn start message
function handleTurnStart(data) {
  // Update local game state
  localGameState.currentPlayerIndex = localGameState.players.findIndex(p => p.name === data.playerName);
  localGameState.currentQuestionId = data.questionId;
  
  // Update UI
  document.getElementById('currentPlayerTurn').textContent = data.playerName;
  
  // If it's this client's turn, show the turn screen
  if (data.playerName === playerName) {
    showScreen('turnScreen');
  } else {
    showScreen('waitingForTurnScreen');
  }
}

// Handle your turn message
function handleYourTurn(data) {
  document.getElementById('currentPlayerRoleText').textContent = data.role;
  document.getElementById('currentQuestionNumberText').textContent = data.questionId;
  document.getElementById('currentQuestionAnswerText').textContent = data.questionAnswer;
  
  // Show or hide the answer based on role
  if (data.role === "Fakemaker") {
    document.getElementById('visibleAnswer').style.display = 'block';
  } else {
    document.getElementById('visibleAnswer').style.display = 'none';
  }
}

// Show question
function showQuestion() {
  // Send request for question
  ws.send(JSON.stringify({
    type: 'SHOW_QUESTION',
    playerName: playerName
  }));
  
  // For now, we'll just simulate showing the question
  const questionIndex = localGameState.currentQuestionId % localGameState.questions.length;
  const question = localGameState.questions[questionIndex];
  
  if (question) {
    document.getElementById('questionNumberDisplay').textContent = `Question ${questionIndex}`;
    document.getElementById('questionContentDisplay').textContent = question.content;
  }
  
  showScreen('questionScreen');
}

// Submit answer
function submitAnswer(answer) {
  ws.send(JSON.stringify({
    type: 'ANSWER_SUBMISSION',
    playerName: playerName,
    answer: answer
  }));
}

// Handle answer result message
function handleAnswerResult(data) {
  document.getElementById('resultTitle').textContent = data.correct ? 'Correct!' : 'Wrong!';
  document.getElementById('resultFeedback').textContent = data.message;
  
  showScreen('resultScreen');
}

// Attempt to unmask the Fakemaker
function attemptUnmask() {
  const accusedName = prompt('Who do you think is the Fakemaker? Enter their name:');
  if (!accusedName || accusedName.trim() === '') {
    return;
  }
  
  ws.send(JSON.stringify({
    type: 'ATTEMPT_UNMASK',
    accusedName: accusedName.trim()
  }));
}

// Handle Fakemaker unmasked message
function handleFakemakerUnmasked(data) {
  document.getElementById('fakemakerStatus').textContent = data.message;
  setTimeout(() => {
    handleGameOver({
      reason: data.message
    });
  }, 3000);
}

// Handle accusation failed message
function handleAccusationFailed(data) {
  document.getElementById('fakemakerStatus').textContent = data.message;
}

// Handle game over message
function handleGameOver(data) {
  document.getElementById('gameOverReason').textContent = data.reason;
  showScreen('gameOverScreen');
}

// Handle game reset message
function handleGameReset(data) {
  gameCode = data.gameCode;
  myRole = '';
  localGameState = {
    players: [],
    currentPlayerIndex: 0,
    currentQuestionId: 0,
    fakemakerUnmasked: false,
    gamePhase: "setup",
    questions: []
  };
  
  if (isHost) {
    document.getElementById('hostGameCode').textContent = gameCode;
    showScreen('hostScreen');
  } else {
    showScreen('joinScreen');
  }
}

// Next turn
function nextTurn() {
  ws.send(JSON.stringify({
    type: 'TURN_COMPLETE',
    playerName: playerName
  }));
}

// Restart game
function restartGame() {
  if (isHost) {
    ws.send(JSON.stringify({
      type: 'RESET_GAME'
    }));
  } else {
    // Non-hosts just go back to the join screen
    showScreen('joinScreen');
  }
}

// Utility function to show a specific screen
function showScreen(screenId) {
  const screens = document.querySelectorAll('.screen');
  screens.forEach(screen => {
    screen.style.opacity = '0';
    screen.style.pointerEvents = 'none';
  });
  
  const activeScreen = document.getElementById(screenId);
  if (activeScreen) {
    activeScreen.style.opacity = '1';
    activeScreen.style.pointerEvents = 'auto';
  } else {
    console.error('Screen not found:', screenId);
  }
}

// Initialize the application
window.onload = () => {
  // Check if we're running on a mobile device
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  
  // Set up event listeners
  document.getElementById('createGameBtn').addEventListener('click', () => {
    showScreen('hostScreen');
    
    // Auto-detect server address if possible
    fetch('/server-info')
      .then(response => response.json())
      .then(data => {
        initializeWebSocket(data.ipAddress, data.port);
      })
      .catch(error => {
        console.error('Error fetching server info:', error);
        // Fallback to localhost
        initializeWebSocket('localhost', 3000);
      });
  });
  
  document.getElementById('joinGameBtn').addEventListener('click', () => {
    showScreen('joinScreen');
  });
  
  document.getElementById('hostStartBtn').addEventListener('click', createGame);
  document.getElementById('joinStartBtn').addEventListener('click', joinGame);
  document.getElementById('startGameBtn').addEventListener('click', startGame);
  document.getElementById('submitRoleCodeBtn').addEventListener('click', submitRoleCode);
  document.getElementById('startGameAfterRolesBtn').addEventListener('click', startGame);
  document.getElementById('showQuestionBtn').addEventListener('click', showQuestion);
  document.getElementById('nextTurnBtn').addEventListener('click', nextTurn);
  document.getElementById('attemptUnmaskBtn').addEventListener('click', attemptUnmask);
  document.getElementById('restartGameBtn').addEventListener('click', restartGame);
  
  // Show the start screen
  showScreen('startScreen');
};
