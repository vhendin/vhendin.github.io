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
        nextPlayerId: 1,
        // Undo/Redo system
        history: [],
        historyIndex: -1,
        maxHistorySize: 30
    };

    // DOM elements
    const dom = {
        landingView: document.getElementById('landingView'),
        setupView: document.getElementById('setupView'),
        teamManagementView: document.getElementById('teamManagementView'),
        gameView: document.getElementById('gameView'),
        resumeGame: document.getElementById('resumeGame'),
        newGameFromLanding: document.getElementById('newGameFromLanding'),
        manageTeamFromLanding: document.getElementById('manageTeamFromLanding'),
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
        goToTeamManagement: document.getElementById('goToTeamManagement'),
        teamRoster: document.getElementById('teamRoster'),
        addPlayerToRoster: document.getElementById('addPlayerToRoster'),
        rosterValidationMessage: document.getElementById('rosterValidationMessage'),
        rosterCount: document.getElementById('rosterCount'),
        activeCount: document.getElementById('activeCount'),
        backFromTeamManagement: document.getElementById('backFromTeamManagement'),
        modal: {
            overlay: document.getElementById('customModal'),
            title: document.getElementById('modalTitle'),
            message: document.getElementById('modalMessage'),
            confirm: document.getElementById('modalConfirm'),
            cancel: document.getElementById('modalCancel')
        },
        themeToggle: document.getElementById('themeToggle')
    };

    // Theme Management
    function initTheme() {
        const savedTheme = localStorage.getItem('basketballPlannerTheme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
    }

    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('basketballPlannerTheme', newTheme);
    }

    // Initialize
    function init() {
        loadFromLocalStorage();
        initTheme();
        setupEventListeners();
        
        // Initialize undo/redo button states
        updateUndoRedoButtons();
        updateFabVisibility();
        
        // Determine which view to show
        if (state.players.length > 0 && state.rotation.game1.length > 0) {
            // Has saved game data - go to game view
            // Ensure rotation arrays match player count
            ensureRotationIntegrity();
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
        dom.resumeGame.addEventListener('click', () => {
            showGameView();
        });
        
        dom.newGameFromLanding.addEventListener('click', () => {
            handleNewGameClick();
        });
        
        dom.manageTeamFromLanding.addEventListener('click', () => {
            showTeamManagementView();
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
        
        // Undo/Redo buttons
        const undoBtn = document.getElementById('undoButton');
        const redoBtn = document.getElementById('redoButton');
        const undoFab = document.getElementById('undoFab');
        const redoFab = document.getElementById('redoFab');
        
        if (undoBtn) undoBtn.addEventListener('click', undo);
        if (redoBtn) redoBtn.addEventListener('click', redo);
        if (undoFab) undoFab.addEventListener('click', undo);
        if (redoFab) redoFab.addEventListener('click', redo);

        // Burger menu toggle
        dom.burgerMenu.addEventListener('click', toggleBurgerMenu);

        // Player accordion toggle
        dom.playersHeader.addEventListener('click', togglePlayerAccordion);

        // Analytics accordion toggle
        const analyticsAccordion = document.getElementById('analyticsAccordion');
        if (analyticsAccordion) {
            analyticsAccordion.addEventListener('click', toggleAnalyticsAccordion);
        }

        // Theme toggle
        if (dom.themeToggle) {
            dom.themeToggle.addEventListener('click', toggleTheme);
        }

        // Team Management
        dom.goToTeamManagement.addEventListener('click', showTeamManagementView);
        dom.addPlayerToRoster.addEventListener('click', addPlayerToRoster);
        dom.backFromTeamManagement.addEventListener('click', backFromTeamManagement);

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
            
            // Update FAB visibility on resize
            updateFabVisibility();
        });

        // Swipe gesture support for period navigation on mobile
        setupSwipeGestures();
    }

    // Setup swipe gestures for navigating periods
    function setupSwipeGestures() {
        const gamesContainer = document.querySelector('.games-container');
        if (!gamesContainer) return;

        let touchStartX = 0;
        let touchStartY = 0;
        let touchEndX = 0;
        let touchEndY = 0;

        gamesContainer.addEventListener('touchstart', (e) => {
            // Only activate on mobile
            if (window.innerWidth > 768) return;
            
            // Ignore if touch starts on a button or editable cell
            if (e.target.tagName === 'BUTTON' || 
                e.target.classList.contains('editable-cell') ||
                e.target.closest('button')) {
                return;
            }
            
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;
        }, { passive: true });

        gamesContainer.addEventListener('touchend', (e) => {
            // Only activate on mobile
            if (window.innerWidth > 768) return;
            
            // Ignore if touch starts on a button or editable cell
            if (e.target.tagName === 'BUTTON' || 
                e.target.classList.contains('editable-cell') ||
                e.target.closest('button')) {
                return;
            }
            
            touchEndX = e.changedTouches[0].screenX;
            touchEndY = e.changedTouches[0].screenY;
            
            handleSwipe();
        }, { passive: true });

        function handleSwipe() {
            const deltaX = touchEndX - touchStartX;
            const deltaY = touchEndY - touchStartY;
            const minSwipeDistance = 50;
            
            // Check if horizontal swipe is stronger than vertical
            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
                if (deltaX > 0) {
                    // Swipe right - go to previous period
                    navigatePeriod(-1);
                } else {
                    // Swipe left - go to next period
                    navigatePeriod(1);
                }
            }
        }
    }

    // Ensure rotation arrays match player count
    function ensureRotationIntegrity() {
        const playerCount = state.players.length;
        
        // Ensure game1 and game2 arrays exist
        if (!state.rotation.game1) state.rotation.game1 = [];
        if (!state.rotation.game2) state.rotation.game2 = [];
        
        // If we have fewer rotation arrays than players, add empty ones at the end
        while (state.rotation.game1.length < playerCount) {
            state.rotation.game1.push(Array(8).fill(0));
            state.rotation.game2.push(Array(8).fill(0));
        }
        
        // If we have more rotation arrays than players, trim them
        if (state.rotation.game1.length > playerCount) {
            state.rotation.game1 = state.rotation.game1.slice(0, playerCount);
            state.rotation.game2 = state.rotation.game2.slice(0, playerCount);
        }
    }

    // ===== SHOPIFY DRAGGABLE SORTABLE =====

    let rotationSortableInstances = { game1: null, game2: null };

    function initRotationTableSortable(tableName) {
        const tableEl = tableName === 'game1' ? dom.game1Table : dom.game2Table;
        const tbody = tableEl.querySelector('tbody');
        
        if (!tbody) return;

        // Clean up existing instance
        if (rotationSortableInstances[tableName]) {
            rotationSortableInstances[tableName].destroy();
        }

        // Get all player rows (exclude the last "players-on-court" row)
        const rows = Array.from(tbody.querySelectorAll('tr'));
        const playerRows = rows.slice(0, -1); // All except last row

        // Mark player rows as draggable
        playerRows.forEach(row => {
            row.classList.add('rotation-player-row');
        });

        // Initialize Sortable on tbody
        const sortable = new Draggable.Sortable(tbody, {
            draggable: '.rotation-player-row',
            handle: '.rotation-drag-handle',
            mirror: {
                constrainDimensions: true,
            },
            plugins: [Draggable.Plugins.SortAnimation],
            sortAnimation: {
                duration: 400,
                easingFunction: 'ease-in-out'
            }
        });

        // Listen for sortable:stop event
        sortable.on('sortable:stop', () => {
            // Get new order of player indices from DOM
            const newOrder = [];
            const reorderedRows = tbody.querySelectorAll('.rotation-player-row');
            
            reorderedRows.forEach((row) => {
                const playerIndex = parseInt(row.dataset.playerIndex);
                if (!isNaN(playerIndex)) {
                    newOrder.push(playerIndex);
                }
            });

            // Reorder state.players, state.rotation.game1, and state.rotation.game2 based on newOrder
            if (newOrder.length === state.players.length) {
                const newPlayers = [];
                const newGame1 = [];
                const newGame2 = [];

                newOrder.forEach(oldIndex => {
                    newPlayers.push(state.players[oldIndex]);
                    newGame1.push(state.rotation.game1[oldIndex]);
                    newGame2.push(state.rotation.game2[oldIndex]);
                });

                state.players = newPlayers;
                state.rotation.game1 = newGame1;
                state.rotation.game2 = newGame2;

                // Save snapshot for undo
                saveSnapshot("Reordered players");
                
                saveToLocalStorage();
                renderGame();
            }
        });

        rotationSortableInstances[tableName] = sortable;
    }

    // View navigation functions
    function showLandingView() {
        dom.landingView.classList.remove('hidden');
        dom.setupView.classList.add('hidden');
        dom.teamManagementView.classList.add('hidden');
        dom.gameView.classList.add('hidden');
        updateTeamNameDisplay();
        renderLandingButtons();
    }

    // Render landing page buttons based on state
    function renderLandingButtons() {
        const hasGame = state.rotation.game1.length > 0;
        
        if (hasGame) {
            // Show Resume Game as primary
            dom.resumeGame.classList.remove('hidden');
            dom.newGameFromLanding.classList.remove('btn-large');
            dom.newGameFromLanding.classList.add('btn-secondary');
        } else {
            // Show New Game as primary
            dom.resumeGame.classList.add('hidden');
            dom.newGameFromLanding.classList.add('btn-large');
            dom.newGameFromLanding.classList.remove('btn-secondary');
        }
    }

    function showSetupView() {
        dom.landingView.classList.add('hidden');
        dom.setupView.classList.remove('hidden');
        dom.teamManagementView.classList.add('hidden');
        dom.gameView.classList.add('hidden');
        
        // Populate team name if exists
        dom.teamName.value = state.teamName || '';
        
        // Initialize with 4 players if empty
        if (state.players.length === 0) {
            for (let i = 0; i < 4; i++) {
                state.players.push({
                    id: state.nextPlayerId++,
                    name: `Player ${i + 1}`,
                    active: true,
                    inGame: true
                });
            }
        }
        
        renderPlayerInputs();
        validatePlayerCount();
    }

    // Render team roster in Team Management view
    function renderTeamRoster() {
        dom.teamRoster.innerHTML = '';
        
        state.players.forEach((player) => {
            const row = document.createElement('div');
            row.className = player.active ? 'roster-row' : 'roster-row inactive-player';
            row.dataset.playerId = player.id;
            
            row.innerHTML = `
                <input type="text" class="roster-player-name" data-player-id="${player.id}" placeholder="Player Name" value="${player.name}">
                <button class="btn-active-toggle ${player.active ? 'active' : 'inactive'}" data-player-id="${player.id}">
                    ${player.active ? '✓ Active' : 'Deactivate'}
                </button>
                <button class="delete-player" data-player-id="${player.id}">×</button>
            `;
            
            dom.teamRoster.appendChild(row);
        });

        // Update counts
        const activePlayersCount = state.players.filter(p => p.active).length;
        dom.rosterCount.textContent = `${state.players.length}/25`;
        dom.activeCount.textContent = activePlayersCount;

        // Add event listeners for roster controls
        dom.teamRoster.querySelectorAll('.delete-player').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const playerId = parseInt(e.target.dataset.playerId);
                deletePlayerFromRoster(playerId);
            });
        });

        dom.teamRoster.querySelectorAll('.roster-player-name').forEach(input => {
            input.addEventListener('input', (e) => {
                const playerId = parseInt(e.target.dataset.playerId);
                updatePlayerName(playerId, e.target.value);
            });
        });

        dom.teamRoster.querySelectorAll('.btn-active-toggle').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const playerId = parseInt(e.target.dataset.playerId);
                togglePlayerActive(playerId);
            });
        });

        validateRosterCount();
    }

    // Add player to roster
    function addPlayerToRoster() {
        if (state.players.length >= 25) {
            showRosterValidationMessage('Maximum 25 players allowed', 'error');
            return;
        }

        state.players.push({
            id: state.nextPlayerId++,
            name: `Player ${state.players.length + 1}`,
            active: true,
            inGame: true
        });

        renderTeamRoster();
        saveToLocalStorage();
    }

    // Delete player from roster
    function deletePlayerFromRoster(playerId) {
        const player = state.players.find(p => p.id === playerId);
        if (!player) return;

        // Check if player is in an active game
        const hasActiveGame = state.rotation.game1.length > 0;
        
        if (hasActiveGame) {
            showModal(
                'Delete Player?',
                `"${player.name}" will be removed from the roster and the rotation schedule.`,
                () => {
                    removePlayerFromState(playerId);
                }
            );
        } else {
            removePlayerFromState(playerId);
        }
    }

    // Remove player from state and update rotation
    function removePlayerFromState(playerId) {
        const playerIndex = state.players.findIndex(p => p.id === playerId);
        if (playerIndex === -1) return;

        // Remove player from array
        state.players.splice(playerIndex, 1);

        // Remove from rotation if exists
        if (state.rotation.game1.length > playerIndex) {
            state.rotation.game1.splice(playerIndex, 1);
            state.rotation.game2.splice(playerIndex, 1);
        }

        saveToLocalStorage();
        renderTeamRoster();
        
        // If we're in game view, re-render
        if (!dom.gameView.classList.contains('hidden')) {
            renderGame();
        }
    }

    // Toggle player active/inactive status
    function togglePlayerActive(playerId) {
        const player = state.players.find(p => p.id === playerId);
        if (!player) return;

        player.active = !player.active;
        
        // If setting to inactive, also set to out of game
        if (!player.active) {
            player.inGame = false;
        }

        saveToLocalStorage();
        renderTeamRoster();
        
        // If we're in game view, re-render player status
        if (!dom.gameView.classList.contains('hidden')) {
            renderPlayerStatus();
        }
    }

    // Validate roster count
    function validateRosterCount() {
        const count = state.players.length;
        const activeCount = state.players.filter(p => p.active).length;
        
        if (count >= 25) {
            showRosterValidationMessage('Roster full (25/25 players)', 'error');
            dom.addPlayerToRoster.disabled = true;
        } else {
            showRosterValidationMessage(`${count} players on roster, ${activeCount} active`, 'success');
            dom.addPlayerToRoster.disabled = false;
        }
    }

    // Show roster validation message
    function showRosterValidationMessage(message, type) {
        dom.rosterValidationMessage.textContent = message;
        dom.rosterValidationMessage.className = 'validation-message ' + type;
    }

    // Render player input fields
    function renderPlayerInputs() {
        dom.playerInputs.innerHTML = '';
        
        state.players.forEach((player) => {
            const row = document.createElement('div');
            row.className = 'player-row';
            row.dataset.playerId = player.id;
            
            row.innerHTML = `
                <input type="text" class="player-name" data-player-id="${player.id}" placeholder="Player Name" value="${player.name}">
                <button class="delete-player" data-player-id="${player.id}">×</button>
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
            active: true,
            inGame: true
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
        const activeCount = state.players.filter(p => p.active).length;
        
        if (activeCount < 4) {
            showValidationMessage(`Need ${4 - activeCount} more active player${4 - activeCount > 1 ? 's' : ''} (minimum 4)`, 'error');
            dom.startGame.disabled = true;
            return false;
        } else if (activeCount > 13) {
            showValidationMessage('Too many active players (maximum 13)', 'error');
            dom.startGame.disabled = true;
            return false;
        } else {
            showValidationMessage(`${activeCount} active players ready ✓`, 'success');
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
        // Validate player count (active players only)
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

        // Filter to only include active players for the game
        // Keep all players in state but only active ones get rotation
        const activePlayers = state.players.filter(p => p.active);
        
        // Reset game state
        state.currentGame = 1;
        state.currentPeriod = 1;

        // Initialize empty rotation arrays for each player (including inactive ones)
        state.rotation.game1 = state.players.map(() => Array(8).fill(0));
        state.rotation.game2 = state.players.map(() => Array(8).fill(0));

        // Save initial snapshot of empty game state
        saveSnapshot("Started new game");

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
        // Priority is based on player order: top of list = higher priority
        const totalSlots = totalPeriods * playersPerPeriod;
        const basePlays = Math.floor(totalSlots / playerCount);
        let extraSlots = totalSlots % playerCount;

        const targetPlays = state.players.map((player, i) => {
            // Higher priority (top of list, lower index) gets extra slots
            // This ensures players at the top get slightly more playing time when distribution is uneven
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

                // Sort by: 1) total played, 2) pairing score (diversity), 3) consecutive streak, 4) priority (player order), 5) random
                available.sort((a, b) => {
                    if (a.played !== b.played) return a.played - b.played;  // Fair distribution first
                    if (a.pairingScore !== b.pairingScore) return a.pairingScore - b.pairingScore;  // Diversity second
                    if (a.streak !== b.streak) return a.streak - b.streak;  // Prefer rested (soft preference)
                    if (a.priority !== b.priority) return a.priority - b.priority;  // Respect player order priority
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



    // Regenerate schedule from current period for players in game
    function regenerateFromCurrentPeriod() {
        const playerCount = state.players.length;
        const activeIndices = state.players.map((p, i) => (p.active && p.inGame) ? i : -1).filter(i => i >= 0);
        const activeCount = activeIndices.length;
        
        const totalActive = state.players.filter(p => p.active).length;
        const totalIn = state.players.filter(p => p.inGame).length;

        if (activeCount < 4) {
            alert(`Need at least 4 active players marked as "In" to reshuffle.\n\nCurrent status:\n- ${totalActive} active players\n- ${totalIn} players marked "In"\n- ${activeCount} players both active AND in`);
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
            // Priority is based on player order in the roster (drag to reorder)
            const totalRemainingSlots = (periods - startP) * 4 + (g === 0 && startGame === 0 ? 8 * 4 : 0);
            const baseRemaining = Math.floor(totalRemainingSlots / activeCount);
            let extraSlots = totalRemainingSlots % activeCount;

            const targetRemaining = activeIndices.map((pi, idx) => {
                // Priority based on position in original list (lower index = higher priority)
                // Players at the top of the roster get slightly more playing time when uneven
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

        // Save snapshot for undo
        saveSnapshot(`Reshuffled from period ${state.currentPeriod}`);
        
        renderGame();
        saveToLocalStorage();
    }

    // Show game view
    function showGameView() {
        dom.landingView.classList.add('hidden');
        dom.setupView.classList.add('hidden');
        dom.teamManagementView.classList.add('hidden');
        dom.gameView.classList.remove('hidden');
        initAccordionState();
        updateTeamNameDisplay();
        renderGame();
        // Add scroll hint after render
        setTimeout(addScrollHint, 500);
    }
    
    // Update team name display
    function updateTeamNameDisplay() {
        const teamNameDisplay = document.getElementById('teamNameDisplay');
        if (teamNameDisplay) {
            if (state.teamName && state.teamName.trim() !== '') {
                teamNameDisplay.textContent = state.teamName;
                teamNameDisplay.classList.remove('hidden');
            } else {
                teamNameDisplay.classList.add('hidden');
            }
        }
    }

    // Show team management view
    function showTeamManagementView() {
        dom.landingView.classList.add('hidden');
        dom.setupView.classList.add('hidden');
        dom.gameView.classList.add('hidden');
        dom.teamManagementView.classList.remove('hidden');
        
        // Close burger menu if open
        dom.controlButtons.classList.remove('open');
        
        renderTeamRoster();
    }

    // Back from team management
    function backFromTeamManagement() {
        // If there's an active game, go back to game view
        if (state.rotation.game1.length > 0) {
            showGameView();
        } else if (state.players.length > 0) {
            // Has players but no game, go to setup
            showSetupView();
        } else {
            // No data, go to landing
            showLandingView();
        }
    }

    // Handle New Game click from landing
    function handleNewGameClick() {
        const hasGame = state.rotation.game1.length > 0;
        
        if (hasGame) {
            // Show confirmation modal
            showModal(
                'Start New Game?',
                'This will remove the current game and rotation schedule. Your team roster will be kept.',
                () => {
                    // Clear rotation data
                    state.rotation = { game1: [], game2: [] };
                    state.currentGame = 1;
                    state.currentPeriod = 1;
                    saveToLocalStorage();
                    showSetupView();
                }
            );
        } else {
            // No game exists, go directly to setup
            showSetupView();
        }
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
                // Keep player IDs and names but reset active and inGame status
                state.players = state.players.map(p => ({
                    id: p.id,
                    name: p.name,
                    active: true,  // Reset all to active
                    inGame: true   // Reset all to in game
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

    // Toggle analytics accordion
    function toggleAnalyticsAccordion() {
        const analyticsHeader = document.getElementById('analyticsAccordion');
        const analyticsContent = document.getElementById('analyticsContent');
        
        if (analyticsHeader && analyticsContent) {
            analyticsHeader.classList.toggle('collapsed');
            analyticsContent.classList.toggle('collapsed');
            
            // Save state to localStorage
            const isCollapsed = analyticsContent.classList.contains('collapsed');
            localStorage.setItem('analyticsAccordionCollapsed', isCollapsed);
        }
    }

    // Initialize accordion state from localStorage
    function initAccordionState() {
        const isCollapsed = localStorage.getItem('playerAccordionCollapsed') === 'true';
        const analyticsIsCollapsed = localStorage.getItem('analyticsAccordionCollapsed') !== 'false'; // Default to collapsed
        
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
        
        // Initialize analytics accordion state (default to collapsed)
        const analyticsHeader = document.getElementById('analyticsAccordion');
        const analyticsContent = document.getElementById('analyticsContent');
        
        if (analyticsHeader && analyticsContent) {
            if (analyticsIsCollapsed) {
                analyticsHeader.classList.add('collapsed');
                analyticsContent.classList.add('collapsed');
            } else {
                analyticsHeader.classList.remove('collapsed');
                analyticsContent.classList.remove('collapsed');
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
        renderPairingAnalytics(); // Render analytics and fairness
        updateReshuffleButton();
        
        // Initialize drag-and-drop for rotation tables
        initRotationTableSortable('game1');
        initRotationTableSortable('game2');
    }
    
    // Render pairing analytics and fairness scoring
    function renderPairingAnalytics() {
        const analyticsEl = document.getElementById('pairingAnalytics');
        if (!analyticsEl) return;
        
        const activePlayers = state.players.filter(p => p.active);
        const playerCount = activePlayers.length;
        
        if (playerCount < 2) {
            analyticsEl.innerHTML = '<p style="text-align: center; color: #666;">Add more players to see analytics</p>';
            return;
        }
        
        // Build pairing matrix from both games
        const pairingMatrix = Array(playerCount).fill(0).map(() => Array(playerCount).fill(0));
        
        ['game1', 'game2'].forEach(gameName => {
            const rotation = state.rotation[gameName];
            for (let p = 0; p < 8; p++) {
                const lineup = [];
                activePlayers.forEach((player, i) => {
                    const originalIndex = state.players.indexOf(player);
                    if (rotation[originalIndex] && rotation[originalIndex][p] === 1) {
                        lineup.push(i);
                    }
                });
                
                // Update pairing counts for all pairs in this lineup
                for (let i = 0; i < lineup.length; i++) {
                    for (let j = i + 1; j < lineup.length; j++) {
                        pairingMatrix[lineup[i]][lineup[j]]++;
                        pairingMatrix[lineup[j]][lineup[i]]++;
                    }
                }
            }
        });
        
        // Build pairing list
        const pairings = [];
        for (let i = 0; i < playerCount; i++) {
            for (let j = i + 1; j < playerCount; j++) {
                pairings.push({
                    player1: activePlayers[i].name,
                    player2: activePlayers[j].name,
                    count: pairingMatrix[i][j]
                });
            }
        }
        
        // Sort by count
        pairings.sort((a, b) => b.count - a.count);
        
        let html = '<div class="analytics-row">';
        
        // Pairing diversity section
        html += '<div class="analytics-section">';
        html += '<h4>Most Paired</h4>';
        html += '<ul class="pairing-list">';
        const topPairs = pairings.slice(0, Math.min(5, pairings.length));
        if (topPairs.length > 0 && topPairs[0].count > 0) {
            topPairs.forEach(p => {
                html += `<li><strong>${p.player1}</strong> & <strong>${p.player2}</strong>: ${p.count} periods</li>`;
            });
        } else {
            html += '<li style="color: #666;">No pairings yet</li>';
        }
        html += '</ul></div>';
        
        html += '<div class="analytics-section">';
        html += '<h4>Least Paired</h4>';
        html += '<ul class="pairing-list">';
        const bottomPairs = pairings.slice(-Math.min(5, pairings.length)).reverse();
        if (bottomPairs.length > 0 && bottomPairs[bottomPairs.length - 1].count >= 0) {
            bottomPairs.forEach(p => {
                html += `<li><strong>${p.player1}</strong> & <strong>${p.player2}</strong>: ${p.count} periods</li>`;
            });
        } else {
            html += '<li style="color: #666;">No pairings yet</li>';
        }
        html += '</ul></div>';
        
        // Fairness scoring section
        html += '<div class="analytics-section fairness-section">';
        html += '<h4>Playing Time Fairness</h4>';
        
        // Calculate playing time for each active player
        const playingTimes = activePlayers.map(player => {
            const originalIndex = state.players.indexOf(player);
            let periods = 0;
            ['game1', 'game2'].forEach(gameName => {
                const rotation = state.rotation[gameName];
                if (rotation[originalIndex]) {
                    periods += rotation[originalIndex].reduce((sum, val) => sum + val, 0);
                }
            });
            return { name: player.name, periods };
        });
        
        const times = playingTimes.map(p => p.periods);
        const min = Math.min(...times);
        const max = Math.max(...times);
        const avg = times.reduce((a, b) => a + b, 0) / times.length;
        const variance = max - min;
        
        // Fairness indicator
        const isFair = variance <= 2;
        const fairnessClass = isFair ? 'fair' : 'unfair';
        const fairnessIcon = isFair ? '✓' : '⚠';
        
        html += `<div class="fairness-summary ${fairnessClass}">`;
        html += `<p><strong>${fairnessIcon} Fairness Score: ${variance} period variance</strong></p>`;
        html += `<p style="font-size: 0.85rem;">Min: ${min} | Avg: ${avg.toFixed(1)} | Max: ${max}</p>`;
        html += `</div>`;
        
        // Playing time bars
        html += '<div class="fairness-bars">';
        playingTimes.forEach(pt => {
            const percentage = Math.min(100, (pt.periods / 16) * 100);
            html += `<div class="fairness-bar-item">`;
            html += `<span class="fairness-bar-label">${pt.name}: ${pt.periods}</span>`;
            html += `<div class="fairness-bar-track">`;
            html += `<div class="fairness-bar-fill" style="width: ${percentage}%"></div>`;
            html += `</div></div>`;
        });
        html += '</div></div>';
        
        html += '</div>'; // Close analytics-row
        
        analyticsEl.innerHTML = html;
    }
    
    // Update reshuffle button state based on available players
    function updateReshuffleButton() {
        const eligibleCount = state.players.filter(p => p.active && p.inGame).length;
        
        if (eligibleCount < 4) {
            dom.reshuffleRotation.disabled = true;
            dom.reshuffleRotation.title = `Need at least 4 active players marked "In" (currently ${eligibleCount})`;
        } else {
            dom.reshuffleRotation.disabled = false;
            dom.reshuffleRotation.title = 'Reshuffle rotation from current period';
        }
    }



    // ===== UNDO/REDO SYSTEM =====
    
    // Create a snapshot of current state
    function createSnapshot(description) {
        return {
            timestamp: Date.now(),
            description: description,
            rotation: JSON.parse(JSON.stringify(state.rotation)),
            players: JSON.parse(JSON.stringify(state.players.map(p => ({
                id: p.id,
                name: p.name,
                active: p.active,
                inGame: p.inGame
            }))))
        };
    }

    // Save a snapshot to history
    function saveSnapshot(description) {
        // Remove any history after current index (for redo branching)
        state.history = state.history.slice(0, state.historyIndex + 1);
        
        // Add new snapshot
        state.history.push(createSnapshot(description));
        
        // Trim if exceeds max size
        if (state.history.length > state.maxHistorySize) {
            state.history.shift();
        } else {
            state.historyIndex++;
        }
        
        updateUndoRedoButtons();
        updateFabVisibility();
        saveToLocalStorage();
    }

    // Check if undo is available
    function canUndo() {
        return state.historyIndex >= 0;
    }

    // Check if redo is available
    function canRedo() {
        return state.historyIndex < state.history.length - 1;
    }

    // Undo last action
    function undo() {
        if (!canUndo()) return;
        
        // Move back in history
        state.historyIndex--;
        
        // Restore state (or go to initial if at index -1)
        if (state.historyIndex >= 0) {
            const snapshot = state.history[state.historyIndex];
            state.rotation = JSON.parse(JSON.stringify(snapshot.rotation));
            state.players = JSON.parse(JSON.stringify(snapshot.players));
        }
        
        saveToLocalStorage();
        renderGame();
        updateUndoRedoButtons();
        updateFabVisibility();
        showUndoToast("Undo: " + (state.history[state.historyIndex + 1]?.description || ""));
    }

    // Redo next action
    function redo() {
        if (!canRedo()) return;
        
        state.historyIndex++;
        
        const snapshot = state.history[state.historyIndex];
        state.rotation = JSON.parse(JSON.stringify(snapshot.rotation));
        state.players = JSON.parse(JSON.stringify(snapshot.players));
        
        saveToLocalStorage();
        renderGame();
        updateUndoRedoButtons();
        updateFabVisibility();
        showUndoToast("Redo: " + snapshot.description);
    }

    // Update undo/redo button states
    function updateUndoRedoButtons() {
        const undoBtn = document.getElementById('undoButton');
        const redoBtn = document.getElementById('redoButton');
        const undoFab = document.getElementById('undoFab');
        const redoFab = document.getElementById('redoFab');
        
        if (undoBtn) undoBtn.disabled = !canUndo();
        if (redoBtn) redoBtn.disabled = !canRedo();
        if (undoFab) undoFab.disabled = !canUndo();
        if (redoFab) redoFab.disabled = !canRedo();
        
        // Update badge count on mobile
        const badge = document.querySelector('.fab-badge');
        if (badge && state.historyIndex >= 0) {
            badge.textContent = state.historyIndex + 1;
        }
    }

    // Show/hide FAB on mobile based on history
    function updateFabVisibility() {
        const fab = document.getElementById('undoRedoFab');
        if (!fab) return;
        
        if (window.innerWidth <= 768) {
            // Mobile: show FAB if there's history
            if (state.history.length > 0) {
                fab.classList.remove('hidden');
            } else {
                fab.classList.add('hidden');
            }
        } else {
            // Desktop: always hide FAB (use buttons in control bar instead)
            fab.classList.add('hidden');
        }
    }

    // Show toast notification
    function showUndoToast(message) {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = 'undo-toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        // Animate in
        setTimeout(() => toast.classList.add('show'), 10);
        
        // Remove after 2 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }

    function updateGameVisibility() {
        const game1Grid = document.querySelector('.games-container .game-grid:nth-child(1)');
        const game2Grid = document.querySelector('.games-container .game-grid:nth-child(2)');
        const allArrows = document.querySelectorAll('.game-nav-arrow');

        if (state.showBothGames) {
            // Show both games
            game1Grid.classList.remove('hidden');
            game2Grid.classList.remove('hidden');
            // Hide navigation arrows when showing both games
            allArrows.forEach(arrow => arrow.style.display = 'none');
        } else {
            // Show only current game
            if (state.currentGame === 1) {
                game1Grid.classList.remove('hidden');
                game2Grid.classList.add('hidden');
            } else {
                game1Grid.classList.add('hidden');
                game2Grid.classList.remove('hidden');
            }
            // Show navigation arrows in single game view
            allArrows.forEach(arrow => arrow.style.display = '');
        }

        // Update button text
        dom.toggleView.textContent = state.showBothGames ? 'Show Single Game' : 'Show Both Games';
    }



    function renderPlayerStatus() {
        dom.playerStatus.innerHTML = '';

        // Ensure rotation integrity before rendering
        ensureRotationIntegrity();

        // Determine which players are playing in current period
        const gameName = `game${state.currentGame}`;
        const periodIndex = state.currentPeriod - 1;

        // Only show active players
        state.players.forEach((player, index) => {
            // Skip inactive players
            if (!player.active) return;
            const total1 = state.rotation.game1[index]?.reduce((a, b) => a + b, 0) || 0;
            const total2 = state.rotation.game2[index]?.reduce((a, b) => a + b, 0) || 0;
            const total = total1 + total2;

            // Check if player is playing in current period
            const isPlayingNow = state.rotation[gameName][index]?.[periodIndex] === 1;

            const item = document.createElement('div');
            const classes = ['player-status-item'];
            if (!player.inGame) classes.push('out-of-game');
            if (isPlayingNow && player.inGame) classes.push('active-now');

            item.className = classes.join(' ');
            item.innerHTML = `
                <div>
                    <span class="player-name">${player.name}</span>
                    <span class="player-total">(${total} periods)</span>
                </div>
                <button class="player-toggle btn-small ${player.inGame ? 'btn-in' : 'btn-out'}" data-index="${index}">
                    ${player.inGame ? '✓ In' : '✗ Out'}
                </button>
            `;
            dom.playerStatus.appendChild(item);
        });

        // Add event listeners to In/Out toggle buttons
        document.querySelectorAll('.player-toggle').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                togglePlayer(index);
            });
        });
    }

    function togglePlayer(index) {
        const player = state.players[index];
        const wasOut = !player.inGame;
        
        player.inGame = !player.inGame;
        
        // If setting player back to "In", check all their scheduled periods
        // and remove slots that would exceed the 4-player limit
        if (wasOut && player.inGame) {
            // Check both games
            ['game1', 'game2'].forEach(gameName => {
                for (let period = 0; period < 8; period++) {
                    // If this player has a slot in this period
                    if (state.rotation[gameName][index][period] === 1) {
                        // Count how many "In" players are in this period (excluding this player)
                        let inPlayersCount = 0;
                        state.players.forEach((pl, i) => {
                            if (i === index) return; // Skip the player we're toggling
                            if (pl.inGame && state.rotation[gameName][i][period] === 1) {
                                inPlayersCount++;
                            }
                        });
                        
                        // If adding this player would exceed 4, remove their slot
                        if (inPlayersCount >= 4) {
                            state.rotation[gameName][index][period] = 0;
                        }
                    }
                }
            });
        }
        
        // Save snapshot for undo
        const action = player.inGame ? "In" : "Out";
        saveSnapshot(`Changed ${player.name} to ${action}`);
        
        saveToLocalStorage();
        renderPlayerStatus();
        renderGame();  // Re-render rotation tables and update button states
    }

    // Debounce timer for manual edits
    let manualEditTimeout;

    // Toggle player in/out of a specific period
    function togglePlayerInPeriod(playerIndex, period, game) {
        const gameName = `game${game}`;
        const currentValue = state.rotation[gameName][playerIndex][period];
        const player = state.players[playerIndex];

        // Don't allow toggling for "Out" players
        if (!player.inGame) {
            return;
        }

        // If currently playing (1), allow removal
        if (currentValue === 1) {
            state.rotation[gameName][playerIndex][period] = 0;
            saveToLocalStorage();
            renderGame();
            
            // Debounce snapshot for manual edits
            clearTimeout(manualEditTimeout);
            manualEditTimeout = setTimeout(() => {
                saveSnapshot("Edited rotation manually");
            }, 1000);
            
            return;
        }

        // If currently not playing (0), we want to add this player
        // First, check if there are any "Out" players in this period and clear them
        for (let i = 0; i < state.players.length; i++) {
            if (!state.players[i].inGame && state.rotation[gameName][i] && state.rotation[gameName][i][period] === 1) {
                // Remove the "Out" player's slot
                state.rotation[gameName][i][period] = 0;
            }
        }

        // Now count how many "In" players are in this period
        const playersInPeriod = state.players.reduce((count, pl, i) => {
            if (!pl.inGame) return count; // Don't count "Out" players
            return count + (state.rotation[gameName][i] && state.rotation[gameName][i][period] === 1 ? 1 : 0);
        }, 0);

        // If still at capacity (4 "In" players), reject
        if (playersInPeriod >= 4) {
            return;
        }

        // Add player to period
        state.rotation[gameName][playerIndex][period] = 1;
        saveToLocalStorage();
        renderGame();
        
        // Debounce snapshot for manual edits
        clearTimeout(manualEditTimeout);
        manualEditTimeout = setTimeout(() => {
            saveSnapshot("Edited rotation manually");
        }, 1000);
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
            
            // Count players in this period for tooltip
            let playersInThisPeriod = 0;
            state.players.forEach((player, i) => {
                if (player.active && player.inGame && rotation[i] && rotation[i][p - 1] === 1) {
                    playersInThisPeriod++;
                }
            });
            
            const hasWarning = playersInThisPeriod < 4;
            const missingPlayers = 4 - playersInThisPeriod;
            const tooltip = hasWarning 
                ? `⚠️ Period ${p}: Only ${playersInThisPeriod}/4 players - needs ${missingPlayers} more!`
                : `Period ${p}: ${playersInThisPeriod}/4 players`;
            
            let classes = ['period-header', halfClass];
            if (isSelected) classes.push('selected-period');
            if (hasWarning) classes.push('period-warning');
            if (isHalftimeEnd) classes.push('halftime-end');
            if (isHalftimeStart) classes.push('halftime-start');
            
            html += `<th class="${classes.join(' ')}" 
                         data-period="${p}" 
                         data-game="${gameNum}"
                         title="${tooltip}">${p}</th>`;
        }
        html += '<th>Total</th></tr></thead><tbody>';

        // Player rows - only show active players
        state.players.forEach((player, i) => {
            // Skip inactive players
            if (!player.active) return;
            
            const playerRowClass = !player.inGame ? 'player-out-of-game' : '';
            html += `<tr data-player-index="${i}" class="${playerRowClass}"><td class="player-cell">
                <span class="rotation-drag-handle" title="Drag to reorder (higher = more priority)">⋮⋮</span>
                <span class="player-name-text ${!player.inGame ? 'crossed-out' : ''}">${player.name}</span>
            </td>`;

            for (let p = 0; p < periods; p++) {
                const isPlaying = rotation[i] && rotation[i][p] === 1;
                const isCurrent = (gameName === `game${state.currentGame}` && p === state.currentPeriod - 1);
                const isPast = (gameName === 'game1' && state.currentGame === 1 && p < state.currentPeriod - 1) ||
                    (gameName === 'game1' && state.currentGame === 2) ||
                    (gameName === 'game2' && state.currentGame === 2 && p < state.currentPeriod - 1);
                const isHalftimeEnd = (p === 3);  // Period 4 (index 3)
                const isHalftimeStart = (p === 4);  // Period 5 (index 4)

                // Count only "In" players in this period for capacity check
                const playersInPeriod = state.players.reduce((count, pl, idx) => {
                    if (!pl.inGame) return count; // Skip "Out" players
                    return count + (rotation[idx] && rotation[idx][p] === 1 ? 1 : 0);
                }, 0);

                const isAtCapacity = playersInPeriod >= 4 && !isPlaying;
                const isPlayerOut = !player.inGame;

                let classes = [];
                if (isPlaying) {
                    if (isPlayerOut) {
                        classes.push('out-player-slot'); // Greyed slot for Out player
                    } else {
                        classes.push('playing');
                    }
                } else {
                    classes.push('resting');
                }
                if (isCurrent) classes.push('current-period');
                if (isPast) classes.push('past');
                if (isHalftimeEnd) classes.push('halftime-end');
                if (isHalftimeStart) classes.push('halftime-start');
                if (isPast || isAtCapacity || isPlayerOut) classes.push('disabled');

                const indicator = isPlaying ? '✓' : '';  // Checkmark for B&W printing
                html += `<td class="${classes.join(' ')} editable-cell" 
                             data-player-index="${i}" 
                             data-period="${p}" 
                             data-game="${gameNum}">
                            <span class="cell-indicator">${indicator}</span>
                         </td>`;
            }

            const total = rotation[i]?.reduce((a, b) => a + b, 0) || 0;
            html += `<td class="total-cell">${total}</td>`;
            html += '</tr>';
        });

        // Players on court row - only count "In" players
        html += '<tr class="players-on-court"><td>On Court</td>';
        for (let p = 0; p < periods; p++) {
            let count = 0;
            state.players.forEach((player, i) => {
                // Only count active players who are "In"
                if (player.inGame && rotation[i] && rotation[i][p] === 1) count++;
            });
            const cellClass = count < 4 ? 'under-capacity' : '';
            html += `<td class="${cellClass}">${count}</td>`;
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
