// Basketball Game Planner
// Manages player rotations for 6-13 players across two 8-period games

(function () {
    'use strict';

    // Application state
    const state = {
        teamName: '',
        players: [],  // Now each player is { id, name, active }
        currentGame: 1,
        currentPeriod: 1,
        rotation: { game1: [], game2: [] },
        draggedIndex: null,
        showBothGames: false,
        touchDragElement: null,
        touchStartY: 0,
        placeholderElement: null,
        dragStartIndex: null,
        currentHoverIndex: null,
        nextPlayerId: 1
    };

    // DOM elements
    const dom = {
        landingView: document.getElementById('landingView'),
        setupView: document.getElementById('setupView'),
        gameView: document.getElementById('gameView'),
        getStarted: document.getElementById('getStarted'),
        backToLanding: document.getElementById('backToLanding'),
        teamName: document.getElementById('teamName'),
        playerInputs: document.getElementById('playerInputs'),
        addPlayer: document.getElementById('addPlayer'),
        validationMessage: document.getElementById('validationMessage'),
        startGame: document.getElementById('startGame'),
        backToSetup: document.getElementById('backToSetup'),
        clearData: document.getElementById('clearData'),
        toggleView: document.getElementById('toggleView'),
        reshuffleRotation: document.getElementById('reshuffleRotation'),
        exportSchedule: document.getElementById('exportSchedule'),
        playerStatus: document.getElementById('playerStatus'),
        game1Table: document.getElementById('game1Table'),
        game2Table: document.getElementById('game2Table'),
        burgerMenu: document.getElementById('burgerMenu'),
        controlButtons: document.getElementById('controlButtons'),
        playersHeader: document.getElementById('playersHeader'),
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
        
        // Determine which view to show
        if (state.players.length > 0 && state.rotation.game1.length > 0) {
            // Has saved game data - go to game view
            showGameView();
        } else if (state.players.length > 0) {
            // Has player data but no game - go to setup
            showSetupView();
        } else {
            // No data - show landing
            showLandingView();
        }
    }

    function setupEventListeners() {
        // Landing view
        dom.getStarted.addEventListener('click', () => {
            showSetupView();
        });

        // Setup view
        dom.backToLanding.addEventListener('click', () => {
            showLandingView();
        });
        dom.addPlayer.addEventListener('click', addPlayer);
        dom.startGame.addEventListener('click', startGame);

        // Game view
        dom.backToSetup.addEventListener('click', backToSetup);
        dom.clearData.addEventListener('click', clearAllData);
        dom.toggleView.addEventListener('click', toggleViewMode);
        dom.reshuffleRotation.addEventListener('click', handleReshuffleClick);
        dom.exportSchedule.addEventListener('click', exportSchedule);

        // Burger menu toggle
        dom.burgerMenu.addEventListener('click', toggleBurgerMenu);

        // Player accordion toggle
        dom.playersHeader.addEventListener('click', togglePlayerAccordion);

        // Game navigation arrows
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('game-nav-arrow')) {
                const direction = parseInt(e.target.dataset.direction);
                navigateGame(direction);
            }
        });

        // Close burger menu when clicking outside
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768) {
                if (!dom.burgerMenu.contains(e.target) && 
                    !dom.controlButtons.contains(e.target) &&
                    dom.controlButtons.classList.contains('open')) {
                    dom.controlButtons.classList.remove('open');
                }
            }
        });

        // Handle window resize - adjust accordion state
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                // Desktop: always show player status, close burger menu
                dom.playerStatus.classList.remove('collapsed');
                dom.playerStatus.classList.add('open');
                dom.controlButtons.classList.remove('open');
            } else {
                // Mobile: restore saved accordion state
                const isCollapsed = localStorage.getItem('playerAccordionCollapsed') === 'true';
                if (isCollapsed) {
                    dom.playerStatus.classList.add('collapsed');
                    dom.playerStatus.classList.remove('open');
                } else {
                    dom.playerStatus.classList.remove('collapsed');
                    dom.playerStatus.classList.add('open');
                }
            }
        });
    }

    // ===== SHOPIFY DRAGGABLE SORTABLE =====

    let sortableInstance = null;

    function initSortable() {
        // Clean up existing instance if any
        if (sortableInstance) {
            sortableInstance.destroy();
        }

        // Initialize Sortable on player inputs container
        const sortable = new Draggable.Sortable(dom.playerInputs, {
            draggable: '.player-row',
            handle: '.drag-handle',
            mirror: {
                constrainDimensions: true,
            },
            plugins: [Draggable.Plugins.SortAnimation],
            sortAnimation: {
                duration: 400,  // Increased to 400ms so animation is more visible
                easingFunction: 'ease-in-out'
            }
        });

        // Listen for sortable:stop event (when drag ends)
        sortable.on('sortable:stop', () => {
            // Update state.players order based on new DOM order
            if (state.players.length > 0) {
                const newOrder = [];
                const rows = dom.playerInputs.querySelectorAll('.player-row');
                rows.forEach((row) => {
                    const playerId = parseInt(row.dataset.playerId);
                    const player = state.players.find(p => p.id === playerId);
                    if (player) {
                        newOrder.push(player);
                    }
                });
                state.players = newOrder;
                saveToLocalStorage();
            }
        });

        sortableInstance = sortable;
    }

    // View navigation functions
    function showLandingView() {
        dom.landingView.classList.remove('hidden');
        dom.setupView.classList.add('hidden');
        dom.gameView.classList.add('hidden');
    }

    function showSetupView() {
        dom.landingView.classList.add('hidden');
        dom.setupView.classList.remove('hidden');
        dom.gameView.classList.add('hidden');
        
        // Populate team name if exists
        dom.teamName.value = state.teamName || '';
        
        // Initialize with 6 players if empty
        if (state.players.length === 0) {
            for (let i = 0; i < 6; i++) {
                state.players.push({
                    id: state.nextPlayerId++,
                    name: `Player ${i + 1}`,
                    active: true
                });
            }
        }
        
        renderPlayerInputs();
        validatePlayerCount();
    }

    // Render player input fields with drag-and-drop
    function renderPlayerInputs() {
        dom.playerInputs.innerHTML = '';
        
        state.players.forEach((player) => {
            const row = document.createElement('div');
            row.className = 'player-row';
            row.dataset.playerId = player.id;
            
            row.innerHTML = `
                <input type="text" class="player-name" data-player-id="${player.id}" placeholder="Player Name" value="${player.name}">
                <button class="delete-player" data-player-id="${player.id}">×</button>
                <span class="drag-handle">⋮⋮</span>
            `;
            
            dom.playerInputs.appendChild(row);
        });

        // Add event listeners for delete buttons
        dom.playerInputs.querySelectorAll('.delete-player').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const playerId = parseInt(e.target.dataset.playerId);
                deletePlayer(playerId);
            });
        });

        // Add event listeners for name inputs
        dom.playerInputs.querySelectorAll('.player-name').forEach(input => {
            input.addEventListener('input', (e) => {
                const playerId = parseInt(e.target.dataset.playerId);
                updatePlayerName(playerId, e.target.value);
            });
        });

        // Initialize sortable after rendering
        initSortable();
    }

    // Add a new player
    function addPlayer() {
        if (state.players.length >= 13) {
            showValidationMessage('Maximum 13 players allowed', 'error');
            return;
        }

        state.players.push({
            id: state.nextPlayerId++,
            name: `Player ${state.players.length + 1}`,
            active: true
        });

        renderPlayerInputs();
        validatePlayerCount();
        saveToLocalStorage();
    }

    // Delete a player
    function deletePlayer(playerId) {
        state.players = state.players.filter(p => p.id !== playerId);
        renderPlayerInputs();
        validatePlayerCount();
        saveToLocalStorage();
    }

    // Update player name
    function updatePlayerName(playerId, newName) {
        const player = state.players.find(p => p.id === playerId);
        if (player) {
            player.name = newName || `Player ${state.players.indexOf(player) + 1}`;
            saveToLocalStorage();
        }
    }

    // Validate player count and show message
    function validatePlayerCount() {
        const count = state.players.length;
        
        if (count < 6) {
            showValidationMessage(`Need ${6 - count} more player${6 - count > 1 ? 's' : ''} (minimum 6)`, 'error');
            dom.startGame.disabled = true;
            return false;
        } else if (count > 13) {
            showValidationMessage('Too many players (maximum 13)', 'error');
            dom.startGame.disabled = true;
            return false;
        } else {
            showValidationMessage(`${count} players ready ✓`, 'success');
            dom.startGame.disabled = false;
            return true;
        }
    }

    // Show validation message
    function showValidationMessage(message, type) {
        dom.validationMessage.textContent = message;
        dom.validationMessage.className = 'validation-message ' + type;
    }

    // Start game
    function startGame() {
        // Validate player count
        if (!validatePlayerCount()) {
            return;
        }

        // Save team name
        state.teamName = dom.teamName.value || '';

        // Ensure all players have names
        state.players.forEach((player, i) => {
            if (!player.name || player.name.trim() === '') {
                player.name = `Player ${i + 1}`;
            }
        });

        // Reset game state
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

    // Calculate consecutive periods played for a player up to (but not including) current period
    // Returns 0, 1, or 2 representing the streak length
    function calculateConsecutiveStreak(playerIndex, currentGameIndex, currentPeriod, currentGameName) {
        const games = ['game1', 'game2'];
        let streak = 0;

        // Look backwards from current period
        for (let lookback = 1; lookback <= 2; lookback++) {
            let checkPeriod = currentPeriod - lookback;
            let checkGame = currentGameIndex;

            // Handle transition from game2 back to game1
            if (checkPeriod < 0) {
                if (checkGame === 1) {
                    // We're in game2, check previous periods from game1
                    checkGame = 0;
                    checkPeriod = 8 + checkPeriod;  // e.g., -1 becomes 7
                } else {
                    // We're in game1 and before period 0, no more history
                    break;
                }
            }

            // Check if player played in that period
            const gameName = games[checkGame];
            if (state.rotation[gameName][playerIndex][checkPeriod] === 1) {
                streak++;
            } else {
                // Streak is broken, stop counting
                break;
            }
        }

        return streak;
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

        // Track consecutive periods played for each player (0, 1, or 2)
        const consecutiveStreak = Array(playerCount).fill(0);

        // Track player pairings - how many times each pair has played together
        const pairingMatrix = Array(playerCount).fill(0).map(() => Array(playerCount).fill(0));

        // Generate schedule for all 16 periods
        for (let period = 0; period < totalPeriods; period++) {
            const isGame1 = period < 8;
            const periodInGame = period % 8;
            const currentPattern = isGame1 ? game1Pattern : game2Pattern;

            const available = [];

            // First pass: Find players who haven't reached target and have streak < 2
            for (let p = 0; p < playerCount; p++) {
                if (totalPlayed[p] < targetPlays[p]) {
                    // HARD CONSTRAINT: Skip players with 2 consecutive periods already
                    if (consecutiveStreak[p] >= 2) {
                        continue;
                    }

                    available.push({ 
                        player: p, 
                        played: totalPlayed[p], 
                        streak: consecutiveStreak[p],
                        priority: p 
                    });
                }
            }

            // Second pass: Add players who haven't reached target (even with streak=1, but never streak>=2)
            if (available.length < playersPerPeriod) {
                for (let p = 0; p < playerCount; p++) {
                    if (totalPlayed[p] < targetPlays[p] && !available.find(a => a.player === p)) {
                        // Still enforce the hard limit
                        if (consecutiveStreak[p] >= 2) {
                            continue;
                        }
                        available.push({ 
                            player: p, 
                            played: totalPlayed[p], 
                            streak: consecutiveStreak[p],
                            priority: p 
                        });
                    }
                }
            }

            // Third pass: Add ANY remaining players to ensure 4 per period (ignore target but respect streak limit)
            if (available.length < playersPerPeriod) {
                for (let p = 0; p < playerCount; p++) {
                    if (!available.find(a => a.player === p)) {
                        // Still try to respect the 2-period limit if possible
                        if (consecutiveStreak[p] >= 2 && available.length >= playersPerPeriod) {
                            continue;
                        }
                        available.push({ 
                            player: p, 
                            played: totalPlayed[p], 
                            streak: consecutiveStreak[p],
                            priority: p 
                        });
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

                // Sort by: 1) total played, 2) pairing score (diversity), 3) consecutive streak, 4) random
                // Note: Priority is enforced via targetPlays, not in period-by-period selection
                available.sort((a, b) => {
                    if (a.played !== b.played) return a.played - b.played;  // Fair distribution first
                    if (a.pairingScore !== b.pairingScore) return a.pairingScore - b.pairingScore;  // Diversity second
                    if (a.streak !== b.streak) return a.streak - b.streak;  // Prefer rested (soft preference)
                    return a.random - b.random;  // Random tiebreaker for diverse lineups
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

            // Update consecutive streaks for next period
            for (let p = 0; p < playerCount; p++) {
                if (selectedPlayers.includes(p)) {
                    consecutiveStreak[p]++;  // Increment streak
                } else {
                    consecutiveStreak[p] = 0;  // Reset streak
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
                        // Calculate consecutive streak for this player
                        const streak = calculateConsecutiveStreak(pi, g, period, gameName);
                        
                        // HARD CONSTRAINT: Skip if already played 2 consecutive
                        if (streak >= 2) {
                            continue;
                        }

                        available.push({
                            player: pi,
                            played: playedSoFar,
                            streak: streak,
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
                            
                            const streak = calculateConsecutiveStreak(pi, g, period, gameName);
                            
                            // Still try to respect the 2-period limit if possible
                            if (streak >= 2 && available.length >= 4) {
                                continue;
                            }

                            available.push({
                                player: pi,
                                played: playedSoFar,
                                streak: streak,
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

                    // Sort by: 1) total played, 2) pairing score (diversity), 3) consecutive streak, 4) random
                    // Note: Priority is enforced via targetPlays, not in period-by-period selection
                    available.sort((a, b) => {
                        if (a.played !== b.played) return a.played - b.played;  // Fair distribution first
                        if (a.pairingScore !== b.pairingScore) return a.pairingScore - b.pairingScore;  // Diversity second
                        if (a.streak !== b.streak) return a.streak - b.streak;  // Prefer rested (soft preference)
                        return a.random - b.random;  // Random tiebreaker for diverse lineups
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
        initAccordionState();
        renderGame();
        // Add scroll hint after render
        setTimeout(addScrollHint, 500);
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
                // Keep player IDs and names but reset active status
                state.players = state.players.map(p => ({
                    id: p.id,
                    name: p.name,
                    active: true  // Reset all to active
                }));

                // Clear rotation data
                state.rotation = { game1: [], game2: [] };
                state.currentGame = 1;
                state.currentPeriod = 1;

                saveToLocalStorage();
                showSetupView();
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

    // Toggle burger menu
    function toggleBurgerMenu() {
        dom.controlButtons.classList.toggle('open');
    }

    // Handle reshuffle rotation click
    function handleReshuffleClick() {
        showModal(
            'Reshuffle Rotation?',
            'This will regenerate the schedule from the current period based on active players.',
            () => {
                regenerateFromCurrentPeriod();
            }
        );
    }

    // Toggle player accordion
    function togglePlayerAccordion() {
        dom.playersHeader.classList.toggle('collapsed');
        dom.playerStatus.classList.toggle('collapsed');
        dom.playerStatus.classList.toggle('open');
        
        // Save state to localStorage
        const isCollapsed = dom.playerStatus.classList.contains('collapsed');
        localStorage.setItem('playerAccordionCollapsed', isCollapsed);
    }

    // Initialize accordion state from localStorage
    function initAccordionState() {
        const isCollapsed = localStorage.getItem('playerAccordionCollapsed') === 'true';
        
        // On desktop, always show expanded
        if (window.innerWidth > 768) {
            dom.playersHeader.classList.remove('collapsed');
            dom.playerStatus.classList.remove('collapsed');
            dom.playerStatus.classList.add('open');
        } else {
            // On mobile, use saved state or default to collapsed
            if (isCollapsed) {
                dom.playersHeader.classList.add('collapsed');
                dom.playerStatus.classList.add('collapsed');
                dom.playerStatus.classList.remove('open');
            } else {
                dom.playersHeader.classList.remove('collapsed');
                dom.playerStatus.classList.remove('collapsed');
                dom.playerStatus.classList.add('open');
            }
        }
    }

    // Add scroll hint for mobile users (one-time)
    function addScrollHint() {
        if (window.innerWidth <= 768 && !localStorage.getItem('scrollHintShown')) {
            const gridWrappers = document.querySelectorAll('.grid-wrapper');
            gridWrappers.forEach(wrapper => {
                const hint = document.createElement('div');
                hint.className = 'scroll-hint';
                hint.textContent = '← Swipe to see all periods →';
                wrapper.parentElement.insertBefore(hint, wrapper);
                
                setTimeout(() => {
                    hint.style.opacity = '0';
                    setTimeout(() => hint.remove(), 300);
                }, 3000);
            });
            localStorage.setItem('scrollHintShown', 'true');
        }
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
        saveToLocalStorage();
        renderPlayerStatus();
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
            return count + (state.rotation[gameName][i] && state.rotation[gameName][i][period] === 1 ? 1 : 0);
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
            const isHalftimeEnd = (p === 4);
            const isHalftimeStart = (p === 5);
            const halfClass = p <= 4 ? 'first-half' : 'second-half';
            
            let classes = ['period-header', halfClass];
            if (isSelected) classes.push('selected-period');
            if (isHalftimeEnd) classes.push('halftime-end');
            if (isHalftimeStart) classes.push('halftime-start');
            
            html += `<th class="${classes.join(' ')}" 
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
                const isHalftimeEnd = (p === 3);  // Period 4 (index 3)
                const isHalftimeStart = (p === 4);  // Period 5 (index 4)

                // Count players in this period for capacity check
                const playersInPeriod = state.players.reduce((count, pl, idx) => {
                    return count + (rotation[idx] && rotation[idx][p] === 1 ? 1 : 0);
                }, 0);

                const isAtCapacity = playersInPeriod >= 4 && !isPlaying;

                let classes = [];
                if (isPlaying) classes.push('playing');
                else classes.push('resting');
                if (isCurrent) classes.push('current-period');
                if (isPast) classes.push('past');
                if (isHalftimeEnd) classes.push('halftime-end');
                if (isHalftimeStart) classes.push('halftime-start');
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
            
            // Migration: Add IDs to players if they don't have them
            if (loaded.players && loaded.players.length > 0) {
                let needsMigration = false;
                loaded.players.forEach((player, i) => {
                    if (!player.id) {
                        needsMigration = true;
                        player.id = i + 1;
                    }
                });
                
                if (needsMigration) {
                    loaded.nextPlayerId = loaded.players.length + 1;
                }
            }
            
            // Set defaults for new properties
            if (!loaded.teamName) loaded.teamName = '';
            if (!loaded.nextPlayerId) loaded.nextPlayerId = 1;
            
            Object.assign(state, loaded);
        }
    }

    // Start the app
    init();
})();
