let currentGameCode = "";
let isHost = false;

function generateGameCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function createGame() {
  const name = prompt("Wat is je naam?");
  if (!name) return;

  showScreen("loadingScreen");

  const code = generateGameCode();
  currentGameCode = code;
  isHost = true;

  db.ref("games/" + code).set({
    players: [name],
    createdAt: Date.now()
  }).then(() => {
    console.log("Game created, showing lobby...");
    setTimeout(() => {
      showLobby(code);
    }, 1000);
  }).catch((err) => {
    alert("Er ging iets mis: " + err.message);
    showScreen("mainMenu");
  });
}

function joinGame() {
  const code = document.getElementById("gameCode").value.trim().toUpperCase();
  const name = document.getElementById("joinName").value.trim();
  if (!code || !name) return alert("Vul een geldige code en naam in.");

  currentGameCode = code;

  db.ref("games/" + code + "/players").once("value").then(snapshot => {
    if (!snapshot.exists()) return alert("Ongeldige code.");

    const players = snapshot.val() || [];
    if (players.includes(name)) return alert("Naam al in gebruik.");

    players.push(name);
    db.ref("games/" + code + "/players").set(players).then(() => {
      showLobby(code);
    });
  });
}

function showLobby(code) {
  showScreen("lobbyScreen"); // Schakel over naar het lobby-scherm
  document.getElementById("lobbyCode").textContent = "Spelcode: " + code;

  const playerListEl = document.getElementById("playerList");
  const playerCountEl = document.getElementById("playerCount");

  // Realtime updates van spelers
  db.ref("games/" + code + "/players").on("value", snapshot => {
    const players = snapshot.val() || [];
    playerListEl.innerHTML = "";
    players.forEach(name => {
      const li = document.createElement("li");
      li.textContent = name;
      playerListEl.appendChild(li);
    });

    playerCountEl.textContent = `Spelers: ${players.length}/6`;
  });
}

function startGame() {
  if (!isHost) return alert("Alleen de host kan het spel starten.");
  alert("Spel gestart! (Hier komt jouw game flow)");
}