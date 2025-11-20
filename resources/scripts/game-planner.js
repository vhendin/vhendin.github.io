// Basketball Game Planner
// Manages player rotations for 6-13 players across two 8-period games

(function () {
    'use strict';

    // Application state
    const state = {
        players: [],
        currentGame: 1,
        currentPeriod: 1,
        rotation: { game1: [], game2: [] },
        draggedIndex: null,
        showBothGames: false
    };

    // DOM elements
    const dom = {
        setupView: document.getElementById('setupView'),
        gameView: document.getElementById('gameView'),
        playerCount: document.getElementById('playerCount'),
        playerInputs: document.getElementById('playerInputs'),
        startGame: document.getElementById('startGame'),
        backToSetup: document.getElementById('backToSetup'),
        clearData: document.getElementById('clearData'),
        toggleView: document.getElementById('toggleView'),
        exportSchedule: document.getElementById('exportSchedule'),
        playerStatus: document.getElementById('playerStatus'),
        game1Table: document.getElementById('game1Table'),
        game2Table: document.getElementById('game2Table'),
        modal: {
            overlay: document.getElementById('customModal'),
            title: document.getElementById('modalTitle'),
            message: document.getElementById('modalMessage'),
            confirm: document.getElementById('modalConfirm'),
            cancel: document.getElementById('modalCancel')
        }
    };

    // Initialize
    function init() {
        loadFromLocalStorage();
        setupEventListeners();
        renderPlayerInputs();

        if (state.players.length > 0) {
            showGameView();
        }
    }

    function setupEventListeners() {
        dom.playerCount.addEventListener('change', renderPlayerInputs);
        dom.startGame.addEventListener('click', startGame);
        dom.backToSetup.addEventListener('click', backToSetup);
        dom.clearData.addEventListener('click', clearAllData);
        dom.toggleView.addEventListener('click', toggleViewMode);
        dom.exportSchedule.addEventListener('click', exportSchedule);

        // Game navigation arrows
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('game-nav-arrow')) {
                const direction = parseInt(e.target.dataset.direction);
                navigateGame(direction);
            }
        });
    }

    // Render player input fields with drag-and-drop
    function renderPlayerInputs() {
        const count = parseInt(dom.playerCount.value);
        
        // Capture existing names before clearing (scoped to player inputs container)
        const existingNameInputs = dom.playerInputs.querySelectorAll('.player-name');
        const existingNames = Array.from(existingNameInputs).map(input => input.value);
        
        dom.playerInputs.innerHTML = '';
        
        for (let i = 0; i < count; i++) {
            const row = document.createElement('div');
            row.className = 'player-input-row';
            row.draggable = true;
            row.dataset.index = i;
            
            // Priority: state.players (from New Game) > existing DOM names > default
            const playerName = (state.players[i]?.name) || existingNames[i] || `Player ${i + 1}`;
            
            row.innerHTML = `
                <input type="text" class="player-name" placeholder="Name" value="${playerName}">
                <span class="drag-handle">⋮⋮</span>
            `;
            
            // Drag and drop event listeners
            row.addEventListener('dragstart', handleDragStart);
            row.addEventListener('dragover', handleDragOver);
            row.addEventListener('drop', handleDrop);
            row.addEventListener('dragend', handleDragEnd);
            row.addEventListener('dragenter', handleDragEnter);
            row.addEventListener('dragleave', handleDragLeave);
            
            dom.playerInputs.appendChild(row);
        }
    }
    

    // Drag and drop handlers
    function handleDragStart(e) {
        state.draggedIndex = parseInt(e.currentTarget.dataset.index);
        e.currentTarget.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', e.currentTarget.innerHTML);
    }

    function handleDragOver(e) {
        if (e.preventDefault) {
            e.preventDefault();
        }
        e.dataTransfer.dropEffect = 'move';
        return false;
    }

    function handleDragEnter(e) {
        e.currentTarget.classList.add('drag-over');
    }

    function handleDragLeave(e) {
        e.currentTarget.classList.remove('drag-over');
    }

    function handleDrop(e) {
        if (e.stopPropagation) {
            e.stopPropagation();
        }
        
        e.currentTarget.classList.remove('drag-over');
        
        const dropIndex = parseInt(e.currentTarget.dataset.index);
        
        if (state.draggedIndex !== dropIndex) {
            // Get all name inputs before reordering (scoped to player inputs container)
            const nameInputs = dom.playerInputs.querySelectorAll('.player-name');
            const names = Array.from(nameInputs).map(input => input.value);
            
            // Reorder the names array
            const [draggedName] = names.splice(state.draggedIndex, 1);
            names.splice(dropIndex, 0, draggedName);
            
            // Re-render with new order
            dom.playerInputs.innerHTML = '';
            for (let i = 0; i < names.length; i++) {
                const row = document.createElement('div');
                row.className = 'player-input-row';
                row.draggable = true;
                row.dataset.index = i;
                row.innerHTML = `
                    <input type="text" class="player-name" placeholder="Name" value="${names[i]}">
                    <span class="drag-handle">⋮⋮</span>
                `;
                
                row.addEventListener('dragstart', handleDragStart);
                row.addEventListener('dragover', handleDragOver);
                row.addEventListener('drop', handleDrop);
                row.addEventListener('dragend', handleDragEnd);
                row.addEventListener('dragenter', handleDragEnter);
                row.addEventListener('dragleave', handleDragLeave);
                
                dom.playerInputs.appendChild(row);
            }
        }
        
        return false;
    }

    function handleDragEnd(e) {
        e.currentTarget.classList.remove('dragging');

        // Remove drag-over class from all rows
        document.querySelectorAll('.player-input-row').forEach(row => {
            row.classList.remove('drag-over');
        });
    }

    // Start game
    function startGame() {
        // Scope query to only player inputs container to avoid stray elements
        const nameInputs = dom.playerInputs.querySelectorAll('.player-name');
        
        state.players = [];
        nameInputs.forEach((input, i) => {
            state.players.push({
                name: input.value || `Player ${i + 1}`,
                active: true
            });
        });

        // No sorting - players are already in order from top to bottom
        state.currentGame = 1;
        state.currentPeriod = 1;

        generateRotation();
        saveToLocalStorage();
        showGameView();
    }

    // Generate rotation pattern
    function generateRotation() {
        const playerCount = state.players.length;

        // Generate both games together for balanced rotation
        const bothGames = generateTwoGameSchedule(playerCount);
        state.rotation.game1 = bothGames.game1;
        state.rotation.game2 = bothGames.game2;
    }

    // Calculate pairing score for a player based on current lineup
    // Lower score = better diversity (player has played less with current teammates)
    function calculatePairingScore(playerIndex, currentLineup, pairingMatrix) {
        let score = 0;
        for (let teammate of currentLineup) {
            score += pairingMatrix[playerIndex][teammate];
        }
        return score;
    }

    // Generate two-game schedule with balanced rotation across both games
    function generateTwoGameSchedule(playerCount) {
        const totalPeriods = 16; // 8 periods × 2 games
        const playersPerPeriod = 4;
        const game1Pattern = Array(playerCount).fill(0).map(() => Array(8).fill(0));
        const game2Pattern = Array(playerCount).fill(0).map(() => Array(8).fill(0));

        // Calculate target plays for each player across BOTH games
        const totalSlots = totalPeriods * playersPerPeriod;
        const basePlays = Math.floor(totalSlots / playerCount);
        let extraSlots = totalSlots % playerCount;

        const targetPlays = state.players.map((player, i) => {
            // Higher priority (top of list) gets extra slots
            if (i < extraSlots) {
                return basePlays + 1;
            }
            return basePlays;
        });

        // Track total plays across both games
        const totalPlayed = Array(playerCount).fill(0);

        // Track player pairings - how many times each pair has played together
        const pairingMatrix = Array(playerCount).fill(0).map(() => Array(playerCount).fill(0));

        // Generate schedule for all 16 periods
        for (let period = 0; period < totalPeriods; period++) {
            const isGame1 = period < 8;
            const periodInGame = period % 8;
            const currentPattern = isGame1 ? game1Pattern : game2Pattern;

            const available = [];

            // First pass: Find players who haven't reached target and didn't play last period
            for (let p = 0; p < playerCount; p++) {
                if (totalPlayed[p] < targetPlays[p]) {
                    // Check if player didn't play in last period (if possible)
                    let playedLast = false;
                    if (period > 0) {
                        if (period === 8) {
                            // Transition from game1 to game2 - check last period of game1
                            playedLast = game1Pattern[p][7] === 1;
                        } else if (isGame1) {
                            playedLast = game1Pattern[p][periodInGame - 1] === 1;
                        } else {
                            playedLast = game2Pattern[p][periodInGame - 1] === 1;
                        }
                    }

                    if (!playedLast) {
                        available.push({ player: p, played: totalPlayed[p], priority: p });
                    }
                }
            }

            // Second pass: Add players who haven't reached target (even if played last)
            if (available.length < playersPerPeriod) {
                for (let p = 0; p < playerCount; p++) {
                    if (totalPlayed[p] < targetPlays[p] && !available.find(a => a.player === p)) {
                        available.push({ player: p, played: totalPlayed[p], priority: p });
                    }
                }
            }

            // Third pass: Add ANY remaining players to ensure 4 per period (ignore target)
            if (available.length < playersPerPeriod) {
                for (let p = 0; p < playerCount; p++) {
                    if (!available.find(a => a.player === p)) {
                        available.push({ player: p, played: totalPlayed[p], priority: p });
                    }
                }
            }

            // Build lineup incrementally to maximize pairing diversity
            const selectedPlayers = [];

            for (let slot = 0; slot < playersPerPeriod && available.length > 0; slot++) {
                // Calculate pairing score for each candidate based on already-selected players
                available.forEach(candidate => {
                    candidate.pairingScore = calculatePairingScore(
                        candidate.player,
                        selectedPlayers,
                        pairingMatrix
                    );
                    candidate.random = Math.random();  // Add randomness for tiebreaking
                });

                // Sort by: 1) total played, 2) pairing score (diversity), 3) random (breaks rigid patterns)
                available.sort((a, b) => {
                    if (a.played !== b.played) return a.played - b.played;
                    if (a.pairingScore !== b.pairingScore) return a.pairingScore - b.pairingScore;
                    return a.random - b.random;  // Random tiebreaker instead of priority
                });

                // Select best candidate
                const selected = available.shift();
                selectedPlayers.push(selected.player);

                // Assign to pattern
                currentPattern[selected.player][periodInGame] = 1;
                totalPlayed[selected.player]++;
            }

            // Update pairing matrix for all pairs in this lineup
            for (let i = 0; i < selectedPlayers.length; i++) {
                for (let j = i + 1; j < selectedPlayers.length; j++) {
                    const p1 = selectedPlayers[i];
                    const p2 = selectedPlayers[j];
                    pairingMatrix[p1][p2]++;
                    pairingMatrix[p2][p1]++;
                }
            }
        }

        return { game1: game1Pattern, game2: game2Pattern };
    }



    // Regenerate schedule from current period for active players
    function regenerateFromCurrentPeriod() {
        const playerCount = state.players.length;
        const activeIndices = state.players.map((p, i) => p.active ? i : -1).filter(i => i >= 0);
        const activeCount = activeIndices.length;

        if (activeCount < 4) {
            alert('Need at least 4 active players!');
            return;
        }

        // Determine which game and period we're starting from
        const games = ['game1', 'game2'];
        const startGame = state.currentGame - 1;
        const startPeriod = state.currentPeriod - 1;

        // Initialize pairing matrix for active players from already-played periods
        const pairingMatrix = Array(playerCount).fill(0).map(() => Array(playerCount).fill(0));

        // Build pairing history from all periods up to current point
        for (let g = 0; g < games.length; g++) {
            const gameName = games[g];
            const maxPeriod = (g < startGame) ? 8 : ((g === startGame) ? startPeriod : 0);

            for (let period = 0; period < maxPeriod; period++) {
                const lineup = [];
                for (let pi = 0; pi < playerCount; pi++) {
                    if (state.rotation[gameName][pi][period] === 1) {
                        lineup.push(pi);
                    }
                }

                // Update pairing matrix for this lineup
                for (let i = 0; i < lineup.length; i++) {
                    for (let j = i + 1; j < lineup.length; j++) {
                        const p1 = lineup[i];
                        const p2 = lineup[j];
                        pairingMatrix[p1][p2]++;
                        pairingMatrix[p2][p1]++;
                    }
                }
            }
        }

        // For each game from current onwards
        for (let g = startGame; g < games.length; g++) {
            const gameName = games[g];
            const periods = 8;
            const startP = (g === startGame) ? startPeriod : 0;

            // Calculate how many periods each active player has already played
            const alreadyPlayed = activeIndices.map(pi => {
                let count = 0;
                // Count from both games up to current point
                for (let gg = 0; gg < games.length; gg++) {
                    const maxPer = (gg < startGame) ? 8 : ((gg === startGame) ? startPeriod : 0);
                    for (let pp = 0; pp < maxPer; pp++) {
                        if (state.rotation[games[gg]][pi][pp] === 1) count++;
                    }
                }
                return count;
            });

            // Calculate target remaining plays based on list position
            const totalRemainingSlots = (periods - startP) * 4 + (g === 0 && startGame === 0 ? 8 * 4 : 0);
            const baseRemaining = Math.floor(totalRemainingSlots / activeCount);
            let extraSlots = totalRemainingSlots % activeCount;

            const targetRemaining = activeIndices.map((pi, idx) => {
                // Priority based on position in original list (lower index = higher priority)
                if (pi < extraSlots) {
                    return baseRemaining + 1;
                }
                return baseRemaining;
            });

            // Fill periods from startP onwards
            for (let period = startP; period < periods; period++) {
                // Clear this period for all players
                for (let pi = 0; pi < playerCount; pi++) {
                    state.rotation[gameName][pi][period] = 0;
                }

                const available = [];

                // Calculate plays so far including this redistribution
                for (let idx = 0; idx < activeCount; idx++) {
                    const pi = activeIndices[idx];
                    let playedSoFar = alreadyPlayed[idx];

                    // Add plays from current redistribution
                    for (let gg = startGame; gg <= g; gg++) {
                        const maxP = (gg === g) ? period : 8;
                        const minP = (gg === startGame) ? startPeriod : 0;
                        for (let pp = minP; pp < maxP; pp++) {
                            if (state.rotation[games[gg]][pi][pp] === 1) playedSoFar++;
                        }
                    }

                    if (playedSoFar < (alreadyPlayed[idx] + targetRemaining[idx])) {
                        // Prefer players who didn't play last period
                        const playedLast = period > 0 && state.rotation[gameName][pi][period - 1] === 1;
                        available.push({
                            player: pi,
                            played: playedSoFar,
                            playedLast,
                            priority: pi  // Priority based on list position
                        });
                    }
                }

                // If not enough players to reach target, add all available active players
                if (available.length < 4) {
                    for (let idx = 0; idx < activeCount; idx++) {
                        const pi = activeIndices[idx];
                        if (!available.find(a => a.player === pi)) {
                            let playedSoFar = alreadyPlayed[idx];
                            for (let gg = startGame; gg <= g; gg++) {
                                const maxP = (gg === g) ? period : 8;
                                const minP = (gg === startGame) ? startPeriod : 0;
                                for (let pp = minP; pp < maxP; pp++) {
                                    if (state.rotation[games[gg]][pi][pp] === 1) playedSoFar++;
                                }
                            }
                            const playedLast = period > 0 && state.rotation[gameName][pi][period - 1] === 1;
                            available.push({
                                player: pi,
                                played: playedSoFar,
                                playedLast,
                                priority: pi
                            });
                        }
                    }
                }

                // Build lineup incrementally with pairing diversity
                const selectedPlayers = [];

                for (let slot = 0; slot < 4 && available.length > 0; slot++) {
                    // Calculate pairing score for each candidate
                    available.forEach(candidate => {
                        candidate.pairingScore = calculatePairingScore(
                            candidate.player,
                            selectedPlayers,
                            pairingMatrix
                        );
                        candidate.random = Math.random();  // Add randomness
                    });

                    // Sort by: 1) didn't play last, 2) total played, 3) pairing score, 4) random
                    available.sort((a, b) => {
                        if (a.playedLast !== b.playedLast) return a.playedLast ? 1 : -1;
                        if (a.played !== b.played) return a.played - b.played;
                        if (a.pairingScore !== b.pairingScore) return a.pairingScore - b.pairingScore;
                        return a.random - b.random;  // Random tiebreaker
                    });

                    // Select best candidate
                    const selected = available.shift();
                    selectedPlayers.push(selected.player);

                    // Assign to pattern
                    state.rotation[gameName][selected.player][period] = 1;
                }

                // Update pairing matrix for this lineup
                for (let i = 0; i < selectedPlayers.length; i++) {
                    for (let j = i + 1; j < selectedPlayers.length; j++) {
                        const p1 = selectedPlayers[i];
                        const p2 = selectedPlayers[j];
                        pairingMatrix[p1][p2]++;
                        pairingMatrix[p2][p1]++;
                    }
                }
            }
        }

        renderGame();
        saveToLocalStorage();
    }

    // Show game view
    function showGameView() {
        dom.setupView.classList.add('hidden');
        dom.gameView.classList.remove('hidden');
        renderGame();
    }

    // Show custom modal
    function showModal(title, message, onConfirm) {
        dom.modal.title.textContent = title;
        dom.modal.message.textContent = message;
        dom.modal.overlay.classList.remove('hidden');

        // Remove old listeners by cloning
        const newConfirm = dom.modal.confirm.cloneNode(true);
        const newCancel = dom.modal.cancel.cloneNode(true);
        dom.modal.confirm.replaceWith(newConfirm);
        dom.modal.cancel.replaceWith(newCancel);
        dom.modal.confirm = newConfirm;
        dom.modal.cancel = newCancel;

        // Add new listeners
        dom.modal.confirm.addEventListener('click', () => {
            dom.modal.overlay.classList.add('hidden');
            onConfirm();
        });

        dom.modal.cancel.addEventListener('click', () => {
            dom.modal.overlay.classList.add('hidden');
        });

        // Close on overlay click
        const overlayClickHandler = (e) => {
            if (e.target === dom.modal.overlay) {
                dom.modal.overlay.classList.add('hidden');
                dom.modal.overlay.removeEventListener('click', overlayClickHandler);
            }
        };
        dom.modal.overlay.addEventListener('click', overlayClickHandler);
    }

    // Back to setup
    function backToSetup() {
        showModal(
            'Start New Game?',
            'This will reset the schedule but keep your player list.',
            () => {
                // Keep player names but reset active status
                state.players = state.players.map(p => ({
                    name: p.name,
                    active: true  // Reset all to active
                }));

                // Clear rotation data
                state.rotation = { game1: [], game2: [] };
                state.currentGame = 1;
                state.currentPeriod = 1;

                saveToLocalStorage();
                dom.setupView.classList.remove('hidden');
                dom.gameView.classList.add('hidden');

                // Update player count dropdown to match saved players
                dom.playerCount.value = state.players.length;
                renderPlayerInputs();
            }
        );
    }

    // Clear all data
    function clearAllData() {
        showModal(
            'Clear All Data?',
            'This will delete all saved data and cannot be undone.',
            () => {
                localStorage.removeItem('basketballGamePlanner');
                location.reload();
            }
        );
    }

    // Navigate periods
    function navigatePeriod(direction) {
        let newPeriod = state.currentPeriod + direction;
        let newGame = state.currentGame;

        if (newPeriod < 1) {
            if (newGame === 2) {
                newGame = 1;
                newPeriod = 8;
            } else {
                return; // Can't go before game 1 period 1
            }
        } else if (newPeriod > 8) {
            if (newGame === 1) {
                newGame = 2;
                newPeriod = 1;
            } else {
                return; // Can't go after game 2 period 8
            }
        }

        state.currentGame = newGame;
        state.currentPeriod = newPeriod;
        saveToLocalStorage();
        renderGame();
    }

    // Navigate between games using arrows
    function navigateGame(direction) {
        let newGame = state.currentGame + direction;
        if (newGame < 1 || newGame > 2) return; // Stay within game 1-2

        state.currentGame = newGame;
        // Keep current period when switching games
        saveToLocalStorage();
        renderGame();
    }

    // Toggle view mode between single game and both games
    function toggleViewMode() {
        state.showBothGames = !state.showBothGames;
        dom.toggleView.textContent = state.showBothGames ? 'Show Single Game' : 'Show Both Games';
        saveToLocalStorage();
        renderGame();
    }

    // Export/Print schedule to A4
    function exportSchedule() {
        // Store current view state
        const wasShowingBoth = state.showBothGames;

        // Force show both games for print
        state.showBothGames = true;
        renderGame();

        // Add timestamp to header
        const timestamp = document.createElement('p');
        timestamp.className = 'print-only';
        timestamp.textContent = `Generated: ${new Date().toLocaleString()}`;
        timestamp.style.textAlign = 'center';
        timestamp.style.margin = '0.5rem 0 1rem';
        timestamp.style.fontFamily = "'Courier New', Courier, monospace";
        document.querySelector('header').appendChild(timestamp);

        // Trigger print dialog
        window.print();

        // Restore original state after print dialog closes
        setTimeout(() => {
            state.showBothGames = wasShowingBoth;
            renderGame();
            timestamp.remove();
        }, 100);
    }

    // Render game view
    function renderGame() {
        updateGameVisibility();
        renderPlayerStatus();
        renderRotationTable('game1', dom.game1Table);
        renderRotationTable('game2', dom.game2Table);
    }

    function updateGameVisibility() {
        const game1Grid = document.querySelector('.games-container .game-grid:nth-child(1)');
        const game2Grid = document.querySelector('.games-container .game-grid:nth-child(2)');

        if (state.showBothGames) {
            // Show both games
            game1Grid.classList.remove('hidden');
            game2Grid.classList.remove('hidden');
        } else {
            // Show only current game
            if (state.currentGame === 1) {
                game1Grid.classList.remove('hidden');
                game2Grid.classList.add('hidden');
            } else {
                game1Grid.classList.add('hidden');
                game2Grid.classList.remove('hidden');
            }
        }

        // Update button text
        dom.toggleView.textContent = state.showBothGames ? 'Show Single Game' : 'Show Both Games';
    }



    function renderPlayerStatus() {
        dom.playerStatus.innerHTML = '';

        // Determine which players are playing in current period
        const gameName = `game${state.currentGame}`;
        const periodIndex = state.currentPeriod - 1;

        state.players.forEach((player, index) => {
            const total1 = state.rotation.game1[index]?.reduce((a, b) => a + b, 0) || 0;
            const total2 = state.rotation.game2[index]?.reduce((a, b) => a + b, 0) || 0;
            const total = total1 + total2;

            // Check if player is playing in current period
            const isPlayingNow = state.rotation[gameName][index]?.[periodIndex] === 1;

            const item = document.createElement('div');
            const classes = ['player-status-item'];
            if (!player.active) classes.push('inactive');
            if (isPlayingNow && player.active) classes.push('active-now');

            item.className = classes.join(' ');
            item.innerHTML = `
                <div>
                    <span class="player-name">${player.name}</span>
                    <span class="player-total">(${total} periods)</span>
                </div>
                <button class="player-toggle btn-small" data-index="${index}">
                    ${player.active ? 'Out' : 'In'}
                </button>
            `;
            dom.playerStatus.appendChild(item);
        });

        // Add event listeners to toggle buttons
        document.querySelectorAll('.player-toggle').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                togglePlayer(index);
            });
        });
    }

    function togglePlayer(index) {
        state.players[index].active = !state.players[index].active;
        regenerateFromCurrentPeriod();
    }

    // Toggle player in/out of a specific period
    function togglePlayerInPeriod(playerIndex, period, game) {
        const gameName = `game${game}`;
        const currentValue = state.rotation[gameName][playerIndex][period];

        // If currently playing (1), allow removal
        if (currentValue === 1) {
            state.rotation[gameName][playerIndex][period] = 0;
            saveToLocalStorage();
            renderGame();
            return;
        }

        // If currently not playing (0), check if we can add (max 4 players)
        const playersInPeriod = state.players.reduce((count, player, i) => {
            return count + (state.rotation[gameName][i][period] === 1 ? 1 : 0);
        }, 0);

        // Silently reject if at capacity (no alert)
        if (playersInPeriod >= 4) {
            return;
        }

        // Add player to period
        state.rotation[gameName][playerIndex][period] = 1;
        saveToLocalStorage();
        renderGame();
    }

    function renderRotationTable(gameName, tableEl) {
        const periods = 8;
        const rotation = state.rotation[gameName];
        const gameNum = gameName === 'game1' ? 1 : 2;

        let html = '<thead><tr><th></th>';
        for (let p = 1; p <= periods; p++) {
            const isSelected = (gameNum === state.currentGame && p === state.currentPeriod);
            html += `<th class="period-header ${isSelected ? 'selected-period' : ''}" 
                         data-period="${p}" 
                         data-game="${gameNum}">${p}</th>`;
        }
        html += '<th>Total</th></tr></thead><tbody>';

        // Player rows
        state.players.forEach((player, i) => {
            html += `<tr><td class="player-cell">${player.name}</td>`;

            for (let p = 0; p < periods; p++) {
                const isPlaying = rotation[i] && rotation[i][p] === 1;
                const isCurrent = (gameName === `game${state.currentGame}` && p === state.currentPeriod - 1);
                const isPast = (gameName === 'game1' && state.currentGame === 1 && p < state.currentPeriod - 1) ||
                    (gameName === 'game1' && state.currentGame === 2) ||
                    (gameName === 'game2' && state.currentGame === 2 && p < state.currentPeriod - 1);

                // Count players in this period for capacity check
                const playersInPeriod = state.players.reduce((count, pl, idx) => {
                    return count + (rotation[idx][p] === 1 ? 1 : 0);
                }, 0);

                const isAtCapacity = playersInPeriod >= 4 && !isPlaying;

                let classes = [];
                if (isPlaying) classes.push('playing');
                else classes.push('resting');
                if (isCurrent) classes.push('current-period');
                if (isPast) classes.push('past');
                if (isPast || isAtCapacity) classes.push('disabled');

                html += `<td class="${classes.join(' ')} editable-cell" 
                             data-player-index="${i}" 
                             data-period="${p}" 
                             data-game="${gameNum}"></td>`;
            }

            const total = rotation[i]?.reduce((a, b) => a + b, 0) || 0;
            html += `<td class="total-cell">${total}</td>`;
            html += '</tr>';
        });

        // Players on court row
        html += '<tr class="players-on-court"><td>On Court</td>';
        for (let p = 0; p < periods; p++) {
            let count = 0;
            state.players.forEach((player, i) => {
                if (rotation[i] && rotation[i][p] === 1) count++;
            });
            html += `<td>${count}</td>`;
        }
        html += '<td></td></tr>';

        html += '</tbody>';
        tableEl.innerHTML = html;

        // Add click handlers to period headers
        tableEl.querySelectorAll('.period-header').forEach(th => {
            th.addEventListener('click', (e) => {
                const period = parseInt(e.target.dataset.period);
                const game = parseInt(e.target.dataset.game);
                state.currentGame = game;
                state.currentPeriod = period;
                saveToLocalStorage();
                renderGame();
            });
        });

        // Add click handlers to editable cells
        tableEl.querySelectorAll('.editable-cell').forEach(cell => {
            cell.addEventListener('click', (e) => {
                // Don't process clicks on disabled cells
                if (e.target.classList.contains('disabled')) {
                    return;
                }

                const playerIndex = parseInt(e.target.dataset.playerIndex);
                const period = parseInt(e.target.dataset.period);
                const game = parseInt(e.target.dataset.game);

                togglePlayerInPeriod(playerIndex, period, game);
            });
        });
    }

    // LocalStorage
    function saveToLocalStorage() {
        localStorage.setItem('basketballGamePlanner', JSON.stringify(state));
    }

    function loadFromLocalStorage() {
        const saved = localStorage.getItem('basketballGamePlanner');
        if (saved) {
            const loaded = JSON.parse(saved);
            Object.assign(state, loaded);
        }
    }

    // Start the app
    init();
})();
