// Basketball Game Planner
// Manages player rotations for 6-13 players across two 8-period games

(function () {
    'use strict';

    // Application state
    const state = {
        teamName: '',
        players: [],  // Each player is { id, name, active, inGame }
        games: [],  // Array of game objects: { id, name, date, opponent, rotation: [], currentPeriod, timerState, playerIds }
        currentGameId: null,  // Currently viewed game ID
        nextGameId: 1,
        nextPlayerId: 1,
        settings: {
            periodLength: 5,  // minutes
            timerSound: false
        },
        // Undo/Redo system
        history: [],
        historyIndex: -1,
        maxHistorySize: 30
    };

    // Timer interval (not saved to state)
    let timerInterval = null;

    // DOM elements
    const dom = {
        landingView: document.getElementById('landingView'),
        setupView: document.getElementById('setupView'),
        settingsView: document.getElementById('settingsView'),
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
        reshuffleRotation: document.getElementById('reshuffleRotation'),
        exportSchedule: document.getElementById('exportSchedule'),
        playerStatus: document.getElementById('playerStatus'),
        gameTable: document.getElementById('gameTable'),
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
        themeToggle: document.getElementById('themeToggle'),
        // Settings
        goToSettings: document.getElementById('goToSettings'),
        goToSettingsFromLanding: document.getElementById('goToSettingsFromLanding'),
        settingsPeriodLength: document.getElementById('periodLength'),
        settingsTimerSound: document.getElementById('timerSound'),
        backFromSettings: document.getElementById('backFromSettings'),
        // Games list
        gamesListSection: document.getElementById('gamesListSection'),
        gamesList: document.getElementById('gamesList'),
        // Game creation
        gameCreationView: document.getElementById('gameCreationView'),
        gameOpponent: document.getElementById('gameOpponent'),
        gameDate: document.getElementById('gameDate'),
        gameTime: document.getElementById('gameTime'),
        gameNotes: document.getElementById('gameNotes'),
        gamePlayerSelection: document.getElementById('gamePlayerSelection'),
        gameCreationValidation: document.getElementById('gameCreationValidation'),
        backFromGameCreation: document.getElementById('backFromGameCreation'),
        createGameButton: document.getElementById('createGameButton'),
        // Game view header
        gameHeader: document.getElementById('gameHeader'),
        currentGameTitle: document.getElementById('currentGameTitle'),
        gameMetadata: document.getElementById('gameMetadata'),
        gameSelector: document.getElementById('gameSelector'),
        // Timer
        periodTimerPanel: document.getElementById('periodTimerPanel'),
        timerDisplay: document.getElementById('timerDisplay'),
        timerStartPause: document.getElementById('timerStartPause'),
        timerReset: document.getElementById('timerReset'),
        // Scoreboards
        homeScoreLabel: document.getElementById('homeScoreLabel'),
        homeScoreDisplay: document.getElementById('homeScoreDisplay'),
        homeScoreMinus: document.getElementById('homeScoreMinus'),
        homeScorePlus: document.getElementById('homeScorePlus'),
        awayScoreLabel: document.getElementById('awayScoreLabel'),
        awayScoreDisplay: document.getElementById('awayScoreDisplay'),
        awayScoreMinus: document.getElementById('awayScoreMinus'),
        awayScorePlus: document.getElementById('awayScorePlus')
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
        // Check for games in new format
        if (state.games && state.games.length > 0 && state.currentGameId) {
            // Has games - go to game view
            showGameView();
        } else if (state.players.length > 0) {
            // Has player data but no game - go to landing
            showLandingView();
        } else {
            // No data - show landing
            showLandingView();
        }
    }

    function setupEventListeners() {
        // Landing view
        dom.resumeGame?.addEventListener('click', () => {
            showGameView();
        });
        
        dom.newGameFromLanding.addEventListener('click', () => {
            handleNewGameClick();
        });
        
        dom.manageTeamFromLanding.addEventListener('click', () => {
            showTeamManagementView();
        });
        
        dom.goToSettingsFromLanding?.addEventListener('click', () => {
            showSettingsView();
        });

        // Setup view
        dom.backToLanding.addEventListener('click', () => {
            showLandingView();
        });
        dom.addPlayer.addEventListener('click', addPlayer);
        dom.startGame.addEventListener('click', startGame);

        // Game Creation view
        dom.backFromGameCreation.addEventListener('click', backFromGameCreation);
        dom.createGameButton.addEventListener('click', createNewGame);

        // Game view
        dom.backToSetup.addEventListener('click', backToSetup);
        dom.clearData.addEventListener('click', clearAllData);
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

        // Settings
        dom.goToSettings.addEventListener('click', showSettingsView);
        dom.backFromSettings.addEventListener('click', backFromSettings);

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

        // Timer controls
        if (dom.timerStartPause) {
            dom.timerStartPause.addEventListener('click', toggleTimer);
        }
        if (dom.timerReset) {
            dom.timerReset.addEventListener('click', resetTimer);
        }

        // Scoreboard controls
        if (dom.homeScorePlus) {
            dom.homeScorePlus.addEventListener('click', incrementHomeScore);
        }
        if (dom.homeScoreMinus) {
            dom.homeScoreMinus.addEventListener('click', decrementHomeScore);
        }
        if (dom.awayScorePlus) {
            dom.awayScorePlus.addEventListener('click', incrementAwayScore);
        }
        if (dom.awayScoreMinus) {
            dom.awayScoreMinus.addEventListener('click', decrementAwayScore);
        }

        // Game selector (switch between games)
        if (dom.gameSelector) {
            dom.gameSelector.addEventListener('change', (e) => {
                const selectedGameId = parseInt(e.target.value);
                if (selectedGameId && selectedGameId !== state.currentGameId) {
                    stopTimer(); // Stop current game's timer
                    state.currentGameId = selectedGameId;
                    saveToLocalStorage();
                    renderGame(); // Re-render everything for the new game
                }
            });
        }

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
    // ===== DRAG AND DROP FOR PLAYER REORDERING =====

    let rotationSortableInstance = null;

    function initRotationTableSortable() {
        const tableEl = dom.gameTable;
        const tbody = tableEl?.querySelector('tbody');
        
        if (!tbody) return;

        // Clean up existing instance
        if (rotationSortableInstance) {
            rotationSortableInstance.destroy();
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

            const currentGame = getCurrentGame();
            if (!currentGame) return;

            // Reorder rotation for current game based on new player order
            if (newOrder.length > 0) {
                const newRotation = [];

                newOrder.forEach(oldIndex => {
                    newRotation.push(currentGame.rotation[oldIndex]);
                });

                currentGame.rotation = newRotation;

                // Also need to reorder playerIds
                const newPlayerIds = [];
                newOrder.forEach(oldIndex => {
                    const playerId = currentGame.playerIds[oldIndex];
                    newPlayerIds.push(playerId);
                });
                currentGame.playerIds = newPlayerIds;

                // Save snapshot for undo
                saveSnapshot("Reordered players");
                
                saveToLocalStorage();
                renderGame();
            }
        });

        rotationSortableInstance = sortable;
    }

    // View navigation functions
    function showLandingView() {
        dom.landingView.classList.remove('hidden');
        dom.setupView.classList.add('hidden');
        dom.teamManagementView.classList.add('hidden');
        dom.settingsView.classList.add('hidden');
        dom.gameCreationView.classList.add('hidden');
        dom.gameView.classList.add('hidden');
        hideTimerPanel();
        updateTeamNameDisplay();
        renderLandingButtons();
    }

    // Render landing page with games list
    function renderLandingButtons() {
        // Show games list if any games exist
        if (state.games && state.games.length > 0) {
            dom.gamesListSection?.classList.remove('hidden');
            renderGamesList();
        } else {
            dom.gamesListSection?.classList.add('hidden');
        }
    }

    // Render the list of games
    function renderGamesList() {
        if (!dom.gamesList) return;
        
        dom.gamesList.innerHTML = '';
        
        state.games.forEach(game => {
            const card = document.createElement('div');
            card.className = 'game-card';
            card.dataset.gameId = game.id;
            
            // Build date/time string
            const dateTimeInfo = [];
            if (game.date) dateTimeInfo.push(game.date);
            if (game.time) dateTimeInfo.push(game.time);
            const dateTimeStr = dateTimeInfo.length > 0 ? dateTimeInfo.join(' ') : 'No date set';
            
            // Determine status
            const statusText = game.currentPeriod > 8 ? 'Finished' : `Period ${game.currentPeriod}/8`;
            
            card.innerHTML = `
                <div class="game-card-header">
                    <div class="game-card-title">${game.opponent || 'Untitled Game'}</div>
                    <div class="game-card-status">${statusText}</div>
                </div>
                <div class="game-card-info">
                    <div>${dateTimeStr}</div>
                </div>
                <div class="game-card-actions">
                    <button class="btn-primary resume-game-btn" data-game-id="${game.id}">Resume</button>
                    <button class="btn-danger delete-game-btn" data-game-id="${game.id}">Delete</button>
                </div>
            `;
            
            dom.gamesList.appendChild(card);
        });
        
        // Add event listeners for game cards
        dom.gamesList.querySelectorAll('.resume-game-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const gameId = parseInt(e.target.dataset.gameId);
                resumeGame(gameId);
            });
        });
        
        dom.gamesList.querySelectorAll('.delete-game-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const gameId = parseInt(e.target.dataset.gameId);
                deleteGame(gameId);
            });
        });
    }

    // Resume a specific game
    function resumeGame(gameId) {
        state.currentGameId = gameId;
        saveToLocalStorage();
        showGameView();
    }

    // Delete a game
    function deleteGame(gameId) {
        const game = state.games.find(g => g.id === gameId);
        const gameName = game?.name || 'this game';
        
        showModal(
            'Delete Game?',
            `Are you sure you want to delete "${gameName}"? This cannot be undone.`,
            () => {
                state.games = state.games.filter(g => g.id !== gameId);
                if (state.currentGameId === gameId) {
                    state.currentGameId = null;
                }
                saveToLocalStorage();
                renderLandingButtons();
            }
        );
    }

    function showSetupView() {
        dom.landingView.classList.add('hidden');
        dom.setupView.classList.remove('hidden');
        dom.teamManagementView.classList.add('hidden');
        dom.settingsView.classList.add('hidden');
        dom.gameCreationView.classList.add('hidden');
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

        // Check if player is in any active game
        const hasActiveGame = state.games.length > 0;
        
        if (hasActiveGame) {
            showModal(
                'Delete Player?',
                `"${player.name}" will be removed from the roster. Any games using this player will be affected.`,
                () => {
                    removePlayerFromState(playerId);
                }
            );
        } else {
            removePlayerFromState(playerId);
        }
    }

    // Remove player from state
    function removePlayerFromState(playerId) {
        const playerIndex = state.players.findIndex(p => p.id === playerId);
        if (playerIndex === -1) return;

        // Remove player from array
        state.players.splice(playerIndex, 1);

        // Note: Games store their own playerIds array, so removing from global
        // players list doesn't automatically remove from games. This is intentional
        // to preserve game history. Users can recreate games if needed.

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



    // Regenerate schedule from current period for current game
    function regenerateFromCurrentPeriod() {
        const currentGame = getCurrentGame();
        if (!currentGame) {
            alert('No game selected');
            return;
        }

        const gamePlayers = getGamePlayers(currentGame);
        const activeIndices = gamePlayers
            .map((p, localIdx) => p.active ? localIdx : -1)
            .filter(i => i >= 0);
        const activeCount = activeIndices.length;

        if (activeCount < 4) {
            const totalActive = gamePlayers.filter(p => p.active).length;
            alert(`Need at least 4 active players to reshuffle.\n\nCurrent status:\n- ${totalActive} active players in this game\n- Need at least 4 active to reshuffle`);
            return;
        }

        const startPeriod = currentGame.currentPeriod - 1;
        const periods = 8;
        const playerCount = gamePlayers.length;

        // Initialize pairing matrix from already-played periods
        const pairingMatrix = Array(playerCount).fill(0).map(() => Array(playerCount).fill(0));

        // Build pairing history from periods 0 to startPeriod-1
        for (let period = 0; period < startPeriod; period++) {
            const lineup = [];
            for (let pi = 0; pi < playerCount; pi++) {
                if (currentGame.rotation[pi][period] === 1) {
                    lineup.push(pi);
                }
            }

            // Update pairing matrix
            for (let i = 0; i < lineup.length; i++) {
                for (let j = i + 1; j < lineup.length; j++) {
                    const p1 = lineup[i];
                    const p2 = lineup[j];
                    pairingMatrix[p1][p2]++;
                    pairingMatrix[p2][p1]++;
                }
            }
        }

        // Calculate how many periods each active player has already played
        const alreadyPlayed = activeIndices.map(pi => {
            let count = 0;
            for (let pp = 0; pp < startPeriod; pp++) {
                if (currentGame.rotation[pi][pp] === 1) count++;
            }
            return count;
        });

        // Calculate target remaining plays based on roster position
        const totalRemainingSlots = (periods - startPeriod) * 4;
        const baseRemaining = Math.floor(totalRemainingSlots / activeCount);
        let extraSlots = totalRemainingSlots % activeCount;

        const targetRemaining = activeIndices.map((pi, idx) => {
            // Priority based on position in roster (lower index = higher priority)
            if (idx < extraSlots) {
                return baseRemaining + 1;
            }
            return baseRemaining;
        });

        // Helper: Calculate consecutive streak for a player
        const calculateStreak = (playerIdx, upToPeriod) => {
            let streak = 0;
            for (let p = upToPeriod - 1; p >= 0; p--) {
                if (currentGame.rotation[playerIdx][p] === 1) {
                    streak++;
                } else {
                    break;
                }
            }
            return streak;
        };

        // Fill periods from startPeriod onwards
        for (let period = startPeriod; period < periods; period++) {
            // Clear this period
            for (let pi = 0; pi < playerCount; pi++) {
                currentGame.rotation[pi][period] = 0;
            }

            const available = [];

            // Build available pool
            for (let idx = 0; idx < activeCount; idx++) {
                const pi = activeIndices[idx];
                let playedSoFar = alreadyPlayed[idx];

                // Count plays from redistribution (startPeriod to period-1)
                for (let pp = startPeriod; pp < period; pp++) {
                    if (currentGame.rotation[pi][pp] === 1) playedSoFar++;
                }

                if (playedSoFar < (alreadyPlayed[idx] + targetRemaining[idx])) {
                    const streak = calculateStreak(pi, period);
                    
                    // HARD CONSTRAINT: Skip if already played 2 consecutive
                    if (streak >= 2) {
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

            // If not enough players, add all available (relaxing streak constraint)
            if (available.length < 4) {
                for (let idx = 0; idx < activeCount; idx++) {
                    const pi = activeIndices[idx];
                    if (!available.find(a => a.player === pi)) {
                        let playedSoFar = alreadyPlayed[idx];
                        for (let pp = startPeriod; pp < period; pp++) {
                            if (currentGame.rotation[pi][pp] === 1) playedSoFar++;
                        }
                        
                        const streak = calculateStreak(pi, period);
                        
                        // Still try to respect limit if we have enough
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
                    let score = 0;
                    selectedPlayers.forEach(sp => {
                        score += pairingMatrix[candidate.player][sp];
                    });
                    candidate.pairingScore = score;
                    candidate.random = Math.random();
                });

                // Sort by: played, pairing score, streak, random
                available.sort((a, b) => {
                    if (a.played !== b.played) return a.played - b.played;
                    if (a.pairingScore !== b.pairingScore) return a.pairingScore - b.pairingScore;
                    if (a.streak !== b.streak) return a.streak - b.streak;
                    return a.random - b.random;
                });

                // Select best candidate
                const selected = available.shift();
                selectedPlayers.push(selected.player);
                currentGame.rotation[selected.player][period] = 1;
            }

            // Update pairing matrix
            for (let i = 0; i < selectedPlayers.length; i++) {
                for (let j = i + 1; j < selectedPlayers.length; j++) {
                    const p1 = selectedPlayers[i];
                    const p2 = selectedPlayers[j];
                    pairingMatrix[p1][p2]++;
                    pairingMatrix[p2][p1]++;
                }
            }
        }

        // Save snapshot for undo
        saveSnapshot(`Reshuffled from period ${currentGame.currentPeriod}`);
        
        renderGame();
        saveToLocalStorage();
    }

    // Show game view
    function showGameView() {
        dom.landingView.classList.add('hidden');
        dom.setupView.classList.add('hidden');
        dom.teamManagementView.classList.add('hidden');
        dom.settingsView.classList.add('hidden');
        dom.gameCreationView.classList.add('hidden');
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
        dom.settingsView.classList.add('hidden');
        dom.gameCreationView.classList.add('hidden');
        dom.gameView.classList.add('hidden');
        dom.teamManagementView.classList.remove('hidden');
        hideTimerPanel();
        
        // Close burger menu if open
        dom.controlButtons.classList.remove('open');
        
        renderTeamRoster();
    }

    // Back from team management
    function backFromTeamManagement() {
        // If there's an active game, go back to game view
        if (state.games.length > 0 && state.currentGameId) {
            showGameView();
        } else if (state.players.length > 0) {
            // Has players but no game, go to landing
            showLandingView();
        } else {
            // No data, go to landing
            showLandingView();
        }
    }

    // Show settings view
    function showSettingsView() {
        dom.landingView.classList.add('hidden');
        dom.setupView.classList.add('hidden');
        dom.gameView.classList.add('hidden');
        dom.teamManagementView.classList.add('hidden');
        dom.gameCreationView.classList.add('hidden');
        dom.settingsView.classList.remove('hidden');
        hideTimerPanel();
        
        // Close burger menu if open
        dom.controlButtons.classList.remove('open');
        
        // Populate settings from state
        dom.settingsPeriodLength.value = state.settings.periodLength;
        dom.settingsTimerSound.checked = state.settings.timerSound;
    }

    // Back from settings
    function backFromSettings() {
        // If there's an active game, go back to game view
        if (state.games.length > 0 && state.currentGameId) {
            showGameView();
        } else {
            // No active game, go to landing
            showLandingView();
        }
    }

    // Show game creation view
    function showGameCreationView() {
        dom.landingView.classList.add('hidden');
        dom.setupView.classList.add('hidden');
        dom.gameView.classList.add('hidden');
        dom.teamManagementView.classList.add('hidden');
        dom.settingsView.classList.add('hidden');
        dom.gameCreationView.classList.remove('hidden');
        hideTimerPanel();
        
        // Clear form
        dom.gameOpponent.value = '';
        dom.gameDate.value = '';
        dom.gameTime.value = '';
        dom.gameNotes.value = '';
        
        // Render player selection
        renderGamePlayerSelection();
        validateGameCreation();
    }

    // Render player selection checkboxes
    function renderGamePlayerSelection() {
        dom.gamePlayerSelection.innerHTML = '';
        
        if (state.players.length === 0) {
            dom.gamePlayerSelection.innerHTML = '<p class="help-text">No players in roster. Go to Team Management to add players.</p>';
            return;
        }
        
        state.players.forEach(player => {
            const item = document.createElement('div');
            item.className = `player-selection-item ${!player.active ? 'inactive' : ''}`;
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `game-player-${player.id}`;
            checkbox.dataset.playerId = player.id;
            checkbox.checked = player.active; // Default to active players
            checkbox.disabled = !player.active;
            
            const label = document.createElement('label');
            label.htmlFor = `game-player-${player.id}`;
            label.textContent = player.name + (!player.active ? ' (Inactive)' : '');
            
            checkbox.addEventListener('change', validateGameCreation);
            
            item.appendChild(checkbox);
            item.appendChild(label);
            dom.gamePlayerSelection.appendChild(item);
        });
    }

    // Validate game creation form
    function validateGameCreation() {
        const selectedPlayers = Array.from(
            dom.gamePlayerSelection.querySelectorAll('input[type="checkbox"]:checked')
        ).length;
        
        const isValid = selectedPlayers >= 4 && selectedPlayers <= 13;
        
        if (selectedPlayers < 4) {
            dom.gameCreationValidation.textContent = 'Please select at least 4 players';
            dom.gameCreationValidation.classList.remove('hidden');
            dom.createGameButton.disabled = true;
        } else if (selectedPlayers > 13) {
            dom.gameCreationValidation.textContent = 'Maximum 13 players allowed';
            dom.gameCreationValidation.classList.remove('hidden');
            dom.createGameButton.disabled = true;
        } else {
            dom.gameCreationValidation.classList.add('hidden');
            dom.createGameButton.disabled = false;
        }
        
        return isValid;
    }

    // Back from game creation
    function backFromGameCreation() {
        showLandingView();
    }

    // Create new game
    function createNewGame() {
        if (!validateGameCreation()) {
            return;
        }
        
        const opponent = dom.gameOpponent.value.trim();
        if (!opponent) {
            alert('Please enter an opponent name');
            dom.gameOpponent.focus();
            return;
        }
        
        // Get selected players
        const selectedPlayerIds = Array.from(
            dom.gamePlayerSelection.querySelectorAll('input[type="checkbox"]:checked')
        ).map(cb => parseInt(cb.dataset.playerId));
        
        const selectedPlayers = state.players.filter(p => selectedPlayerIds.includes(p.id));
        
        // Generate rotation for single game
        const rotation = generateSingleGameRotation(selectedPlayers);
        
        // Create new game object
        const newGame = {
            id: state.nextGameId++,
            opponent: opponent,
            date: dom.gameDate.value,
            time: dom.gameTime.value,
            notes: dom.gameNotes.value.trim(),
            rotation: rotation,
            currentPeriod: 1,
            timerState: {
                isRunning: false,
                remainingSeconds: state.settings.periodLength * 60,
                totalSeconds: state.settings.periodLength * 60
            },
            scores: {
                home: 0,
                away: 0
            },
            playerIds: selectedPlayerIds
        };
        
        // Add to games array
        state.games.push(newGame);
        state.currentGameId = newGame.id;
        
        saveToLocalStorage();
        showGameView();
    }

    // Get current game object
    function getCurrentGame() {
        if (!state.currentGameId || !state.games) return null;
        return state.games.find(g => g.id === state.currentGameId);
    }

    // Get players for current game
    function getGamePlayers(game) {
        if (!game || !game.playerIds) return [];
        return state.players.filter(p => game.playerIds.includes(p.id));
    }

    // Generate rotation for a single game (8 periods)
    function generateSingleGameRotation(players) {
        const playerCount = players.length;
        const totalPeriods = 8;
        const playersPerPeriod = 4;
        const gamePattern = Array(playerCount).fill(0).map(() => Array(8).fill(0));

        // Calculate target plays for each player
        const totalSlots = totalPeriods * playersPerPeriod;
        const basePlays = Math.floor(totalSlots / playerCount);
        let extraSlots = totalSlots % playerCount;

        const targetPlays = players.map((player, i) => {
            // Higher priority (top of list, lower index) gets extra slots
            if (i < extraSlots) {
                return basePlays + 1;
            }
            return basePlays;
        });

        // Track total plays
        const totalPlayed = Array(playerCount).fill(0);

        // Track consecutive periods played for each player (0, 1, or 2)
        const consecutiveStreak = Array(playerCount).fill(0);

        // Track player pairings - how many times each pair has played together
        const pairingMatrix = Array(playerCount).fill(0).map(() => Array(playerCount).fill(0));

        // Generate schedule for all 8 periods
        for (let period = 0; period < totalPeriods; period++) {
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
                gamePattern[selected.player][period] = 1;
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

        return gamePattern;
    }

    // Handle New Game click from landing
    function handleNewGameClick() {
        // Check if user has any players in roster
        if (state.players.length === 0) {
            showModal(
                'No Players in Roster',
                'Please add players to your team roster first.',
                () => {
                    showTeamManagementView();
                }
            );
            return;
        }
        
        // Go directly to game creation view
        showGameCreationView();
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
            'Exit to Landing?',
            'Go back to the games list?',
            () => {
                showLandingView();
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
        const currentGame = getCurrentGame();
        if (!currentGame) return;

        let newPeriod = currentGame.currentPeriod + direction;

        // Keep within bounds (1-8)
        if (newPeriod < 1) newPeriod = 1;
        if (newPeriod > 8) newPeriod = 8;

        currentGame.currentPeriod = newPeriod;
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
        const currentGame = getCurrentGame();
        if (!currentGame) {
            alert('No game selected to export');
            return;
        }

        // Add timestamp to header
        const timestamp = document.createElement('p');
        timestamp.className = 'print-only';
        timestamp.textContent = `Generated: ${new Date().toLocaleString()}`;
        timestamp.style.textAlign = 'center';
        timestamp.style.margin = '0.5rem 0 1rem';
        timestamp.style.fontFamily = "'Courier New', Courier, monospace";
        document.querySelector('header').appendChild(timestamp);

        // Trigger print dialog (prints current game view)
        window.print();

        // Remove timestamp after print dialog closes
        setTimeout(() => {
            timestamp.remove();
        }, 100);
    }

    // Render game view
    // Render game header with title, metadata, and selector
    function renderGameHeader() {
        const currentGame = getCurrentGame();
        if (!currentGame) return;

        // Show game header
        dom.gameHeader?.classList.remove('hidden');

        // Set title
        if (dom.currentGameTitle) {
            dom.currentGameTitle.textContent = currentGame.opponent || 'Untitled Game';
        }

        // Set metadata (date, time, period)
        if (dom.gameMetadata) {
            const metadata = [];
            if (currentGame.date) {
                metadata.push(currentGame.date);
            }
            if (currentGame.time) {
                metadata.push(currentGame.time);
            }
            metadata.push(`Period ${currentGame.currentPeriod}/8`);
            
            dom.gameMetadata.innerHTML = metadata.join(' • ');
        }

        // Populate game selector
        if (dom.gameSelector) {
            dom.gameSelector.innerHTML = '';
            state.games.forEach(game => {
                const option = document.createElement('option');
                option.value = game.id;
                option.textContent = game.opponent || `Game ${game.id}`;
                option.selected = game.id === state.currentGameId;
                dom.gameSelector.appendChild(option);
            });

            // Show/hide selector based on number of games
            if (state.games.length <= 1) {
                dom.gameSelector.style.display = 'none';
            } else {
                dom.gameSelector.style.display = '';
            }
        }
    }

    // ============================================
    // PERIOD TIMER FUNCTIONS
    // ============================================

    function formatTimerDisplay(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    function updateTimerDisplay() {
        const currentGame = getCurrentGame();
        if (!currentGame || !dom.timerDisplay) return;

        const seconds = currentGame.timerState.remainingSeconds;
        dom.timerDisplay.textContent = formatTimerDisplay(seconds);

        // Apply visual warnings
        dom.timerDisplay.classList.remove('warning', 'critical');
        if (seconds <= 10 && seconds > 0) {
            dom.timerDisplay.classList.add('critical');
        } else if (seconds <= 30 && seconds > 10) {
            dom.timerDisplay.classList.add('warning');
        }

        // Update button state
        if (currentGame.timerState.isRunning) {
            dom.timerStartPause.textContent = '⏸';
            dom.timerStartPause.className = 'timer-btn timer-btn-pause';
            dom.timerStartPause.title = 'Pause Timer';
        } else {
            dom.timerStartPause.textContent = '▶';
            dom.timerStartPause.className = 'timer-btn timer-btn-play';
            dom.timerStartPause.title = 'Start Timer';
        }
    }

    function startTimer() {
        const currentGame = getCurrentGame();
        if (!currentGame) return;

        if (timerInterval) {
            clearInterval(timerInterval);
        }

        currentGame.timerState.isRunning = true;
        updateTimerDisplay();
        saveToLocalStorage();

        timerInterval = setInterval(() => {
            const game = getCurrentGame();
            if (!game || !game.timerState.isRunning) {
                stopTimer();
                return;
            }

            game.timerState.remainingSeconds--;

            if (game.timerState.remainingSeconds <= 0) {
                game.timerState.remainingSeconds = 0;
                stopTimer();
                
                // Play sound if enabled
                if (state.settings.timerSound) {
                    playTimerSound();
                }
                
                // Visual alert
                alert('Period time is up!');
            }

            updateTimerDisplay();
            saveToLocalStorage();
        }, 1000);
    }

    function stopTimer() {
        const currentGame = getCurrentGame();
        if (!currentGame) return;

        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }

        currentGame.timerState.isRunning = false;
        updateTimerDisplay();
        saveToLocalStorage();
    }

    function resetTimer() {
        const currentGame = getCurrentGame();
        if (!currentGame) return;

        stopTimer();
        currentGame.timerState.remainingSeconds = currentGame.timerState.totalSeconds;
        updateTimerDisplay();
        saveToLocalStorage();
    }

    function toggleTimer() {
        const currentGame = getCurrentGame();
        if (!currentGame) return;

        if (currentGame.timerState.isRunning) {
            stopTimer();
        } else {
            startTimer();
        }
    }

    function playTimerSound() {
        // Simple beep using Web Audio API
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    }

    function showTimerPanel() {
        if (dom.periodTimerPanel) {
            dom.periodTimerPanel.classList.remove('hidden');
        }
    }

    function hideTimerPanel() {
        if (dom.periodTimerPanel) {
            dom.periodTimerPanel.classList.add('hidden');
        }
        stopTimer();
    }

    // ============================================
    // END TIMER FUNCTIONS
    // ============================================

    // ============================================
    // SCOREBOARD FUNCTIONS
    // ============================================

    function updateScoreDisplay() {
        const currentGame = getCurrentGame();
        if (!currentGame || !dom.homeScoreDisplay || !dom.awayScoreDisplay) return;

        // Update scores
        dom.homeScoreDisplay.textContent = currentGame.scores.home;
        dom.awayScoreDisplay.textContent = currentGame.scores.away;

        // Update labels dynamically
        if (dom.homeScoreLabel) {
            dom.homeScoreLabel.textContent = state.teamName || 'Home';
        }
        if (dom.awayScoreLabel) {
            dom.awayScoreLabel.textContent = currentGame.opponent || 'Away';
        }
    }

    function incrementHomeScore() {
        const currentGame = getCurrentGame();
        if (!currentGame) return;

        currentGame.scores.home++;
        updateScoreDisplay();
        saveToLocalStorage();
    }

    function decrementHomeScore() {
        const currentGame = getCurrentGame();
        if (!currentGame) return;

        if (currentGame.scores.home > 0) {
            currentGame.scores.home--;
            updateScoreDisplay();
            saveToLocalStorage();
        }
    }

    function incrementAwayScore() {
        const currentGame = getCurrentGame();
        if (!currentGame) return;

        currentGame.scores.away++;
        updateScoreDisplay();
        saveToLocalStorage();
    }

    function decrementAwayScore() {
        const currentGame = getCurrentGame();
        if (!currentGame) return;

        if (currentGame.scores.away > 0) {
            currentGame.scores.away--;
            updateScoreDisplay();
            saveToLocalStorage();
        }
    }

    // ============================================
    // END SCOREBOARD FUNCTIONS
    // ============================================

    function renderGame() {
        const currentGame = getCurrentGame();
        if (!currentGame) {
            console.error('No current game to render');
            return;
        }

        renderGameHeader();
        showTimerPanel();
        updateTimerDisplay();
        updateScoreDisplay();
        renderPlayerStatus();
        renderRotationTable();
        renderPairingAnalytics();
        updateReshuffleButton();
        
        // Initialize drag-and-drop for rotation table
        initRotationTableSortable();
    }
    
    // Render pairing analytics and fairness scoring
    function renderPairingAnalytics() {
        const analyticsEl = document.getElementById('pairingAnalytics');
        if (!analyticsEl) return;
        
        const currentGame = getCurrentGame();
        if (!currentGame) return;

        const gamePlayers = getGamePlayers(currentGame);
        const playerCount = gamePlayers.length;
        
        if (playerCount < 2) {
            analyticsEl.innerHTML = '<p style="text-align: center; color: #666;">Add more players to see analytics</p>';
            return;
        }
        
        // Build pairing matrix from current game
        const pairingMatrix = Array(playerCount).fill(0).map(() => Array(playerCount).fill(0));
        
        for (let p = 0; p < 8; p++) {
            const lineup = [];
            currentGame.rotation.forEach((playerRotation, i) => {
                if (playerRotation && playerRotation[p] === 1) {
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
        
        // Build pairing list
        const pairings = [];
        for (let i = 0; i < playerCount; i++) {
            for (let j = i + 1; j < playerCount; j++) {
                pairings.push({
                    player1: gamePlayers[i].name,
                    player2: gamePlayers[j].name,
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
        
        // Calculate playing time for each player in this game
        const playingTimes = gamePlayers.map((player, i) => {
            const periods = currentGame.rotation[i]?.reduce((sum, val) => sum + val, 0) || 0;
            return { name: player.name, periods };
        });
        
        const times = playingTimes.map(p => p.periods);
        const min = Math.min(...times);
        const max = Math.max(...times);
        const avg = times.reduce((a, b) => a + b, 0) / times.length;
        const variance = max - min;
        
        // Fairness indicator
        const isFair = variance <= 1;
        const fairnessClass = isFair ? 'fair' : 'unfair';
        const fairnessIcon = isFair ? '✓' : '⚠';
        
        html += `<div class="fairness-summary ${fairnessClass}">`;
        html += `<p><strong>${fairnessIcon} Fairness Score: ${variance} period variance</strong></p>`;
        html += `<p style="font-size: 0.85rem;">Min: ${min} | Avg: ${avg.toFixed(1)} | Max: ${max}</p>`;
        html += `</div>`;
        
        // Playing time bars (scaled to actual max)
        html += '<div class="fairness-bars">';
        playingTimes.forEach(pt => {
            const percentage = max > 0 ? (pt.periods / max) * 100 : 0;
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
        const currentGame = getCurrentGame();
        if (!currentGame) {
            dom.reshuffleRotation.disabled = true;
            dom.reshuffleRotation.title = 'No game selected';
            return;
        }

        const gamePlayers = getGamePlayers(currentGame);
        const eligibleCount = gamePlayers.filter(p => p.active).length;
        
        if (eligibleCount < 4) {
            dom.reshuffleRotation.disabled = true;
            dom.reshuffleRotation.title = `Need at least 4 active players (currently ${eligibleCount})`;
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
            games: JSON.parse(JSON.stringify(state.games)),
            players: JSON.parse(JSON.stringify(state.players))
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
            state.games = JSON.parse(JSON.stringify(snapshot.games));
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
        state.games = JSON.parse(JSON.stringify(snapshot.games));
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

    function renderPlayerStatus() {
        dom.playerStatus.innerHTML = '';

        const currentGame = getCurrentGame();
        if (!currentGame) return;

        const gamePlayers = getGamePlayers(currentGame);
        const periodIndex = currentGame.currentPeriod - 1;

        // Render each player in the game
        gamePlayers.forEach((player, gamePlayerIndex) => {
            // Calculate total periods played in this game
            const total = currentGame.rotation[gamePlayerIndex]?.reduce((a, b) => a + b, 0) || 0;

            // Check if player is playing in current period
            const isPlayingNow = currentGame.rotation[gamePlayerIndex]?.[periodIndex] === 1;

            const item = document.createElement('div');
            const classes = ['player-status-item'];
            if (isPlayingNow) classes.push('active-now');

            item.className = classes.join(' ');
            item.innerHTML = `
                <div>
                    <span class="player-name">${player.name}</span>
                    <span class="player-total">(${total} periods)</span>
                </div>
            `;

            dom.playerStatus.appendChild(item);
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
    function togglePlayerInPeriod(playerIndex, period) {
        const currentGame = getCurrentGame();
        if (!currentGame) return;

        const currentValue = currentGame.rotation[playerIndex][period];

        // If currently playing (1), allow removal
        if (currentValue === 1) {
            currentGame.rotation[playerIndex][period] = 0;
            saveToLocalStorage();
            renderGame();
            
            // Debounce snapshot for manual edits
            clearTimeout(manualEditTimeout);
            manualEditTimeout = setTimeout(() => {
                saveSnapshot("Edited rotation manually");
            }, 1000);
            
            return;
        }

        // If currently not playing (0), check if we can add
        // Count how many players are in this period
        const playersInPeriod = currentGame.rotation.reduce((count, playerRotation) => {
            return count + (playerRotation && playerRotation[period] === 1 ? 1 : 0);
        }, 0);

        // If at capacity (4 players), reject
        if (playersInPeriod >= 4) {
            return;
        }

        // Add player to period
        currentGame.rotation[playerIndex][period] = 1;
        saveToLocalStorage();
        renderGame();
        
        // Debounce snapshot for manual edits
        clearTimeout(manualEditTimeout);
        manualEditTimeout = setTimeout(() => {
            saveSnapshot("Edited rotation manually");
        }, 1000);
    }

    function renderRotationTable() {
        const currentGame = getCurrentGame();
        if (!currentGame || !dom.gameTable) return;

        const gamePlayers = getGamePlayers(currentGame);
        const rotation = currentGame.rotation;
        const periods = 8;

        let html = '<thead><tr><th></th>';
        for (let p = 1; p <= periods; p++) {
            const isSelected = (p === currentGame.currentPeriod);
            const isHalftimeEnd = (p === 4);
            const isHalftimeStart = (p === 5);
            const halfClass = p <= 4 ? 'first-half' : 'second-half';
            
            // Count players in this period
            let playersInThisPeriod = 0;
            rotation.forEach((playerRotation) => {
                if (playerRotation && playerRotation[p - 1] === 1) {
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
                         title="${tooltip}">${p}</th>`;
        }
        html += '<th>Total</th></tr></thead><tbody>';

        // Player rows
        gamePlayers.forEach((player, gamePlayerIndex) => {
            html += `<tr data-player-index="${gamePlayerIndex}"><td class="player-cell">
                <span class="rotation-drag-handle" title="Drag to reorder (higher = more priority)">⋮⋮</span>
                <span class="player-name-text">${player.name}</span>
            </td>`;

            for (let p = 0; p < periods; p++) {
                const isPlaying = rotation[gamePlayerIndex] && rotation[gamePlayerIndex][p] === 1;
                const isCurrent = (p === currentGame.currentPeriod - 1);
                const isPast = (p < currentGame.currentPeriod - 1);
                const isHalftimeEnd = (p === 3);  // Period 4 (index 3)
                const isHalftimeStart = (p === 4);  // Period 5 (index 4)

                // Count players in this period
                const playersInPeriod = rotation.reduce((count, playerRotation) => {
                    return count + (playerRotation && playerRotation[p] === 1 ? 1 : 0);
                }, 0);

                const isAtCapacity = playersInPeriod >= 4 && !isPlaying;

                let classes = [];
                if (isPlaying) {
                    classes.push('playing');
                } else {
                    classes.push('resting');
                }
                if (isCurrent) classes.push('current-period');
                if (isPast) classes.push('past');
                if (isHalftimeEnd) classes.push('halftime-end');
                if (isHalftimeStart) classes.push('halftime-start');
                if (isPast || isAtCapacity) classes.push('disabled');

                const indicator = isPlaying ? '✓' : '';  // Checkmark for B&W printing
                html += `<td class="${classes.join(' ')} editable-cell" 
                             data-player-index="${gamePlayerIndex}" 
                             data-period="${p}">
                            <span class="cell-indicator">${indicator}</span>
                         </td>`;
            }

            const total = rotation[gamePlayerIndex]?.reduce((a, b) => a + b, 0) || 0;
            html += `<td class="total-cell">${total}</td>`;
            html += '</tr>';
        });

        // Players on court row
        html += '<tr class="players-on-court"><td>On Court</td>';
        for (let p = 0; p < periods; p++) {
            let count = 0;
            rotation.forEach((playerRotation) => {
                if (playerRotation && playerRotation[p] === 1) count++;
            });
            const cellClass = count < 4 ? 'under-capacity' : '';
            html += `<td class="${cellClass}">${count}</td>`;
        }
        html += '<td></td></tr>';

        html += '</tbody>';
        dom.gameTable.innerHTML = html;

        // Add click handlers to period headers
        dom.gameTable.querySelectorAll('.period-header').forEach(th => {
            th.addEventListener('click', (e) => {
                const period = parseInt(e.target.dataset.period);
                currentGame.currentPeriod = period;
                saveToLocalStorage();
                renderGame();
            });
        });

        // Add click handlers to editable cells
        dom.gameTable.querySelectorAll('.editable-cell').forEach(cell => {
            cell.addEventListener('click', (e) => {
                // Don't process clicks on disabled cells
                if (e.target.classList.contains('disabled')) {
                    return;
                }

                const playerIndex = parseInt(e.target.dataset.playerIndex);
                const period = parseInt(e.target.dataset.period);

                togglePlayerInPeriod(playerIndex, period);
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
            
            // Set defaults for missing properties
            if (!loaded.teamName) loaded.teamName = '';
            if (!loaded.nextPlayerId) loaded.nextPlayerId = 1;
            if (!loaded.nextGameId) loaded.nextGameId = 1;
            if (!loaded.games) loaded.games = [];
            if (!loaded.players) loaded.players = [];
            if (!loaded.currentGameId) loaded.currentGameId = null;
            if (!loaded.settings) {
                loaded.settings = {
                    periodLength: 5,
                    timerSound: false
                };
            }
            if (!loaded.history) loaded.history = [];
            if (loaded.historyIndex === undefined) loaded.historyIndex = -1;
            
            // Ensure scores exist for all games (backward compatibility)
            if (loaded.games) {
                loaded.games.forEach(game => {
                    if (!game.scores) {
                        game.scores = { home: 0, away: 0 };
                    }
                });
            }
            
            Object.assign(state, loaded);
        }
    }

    // Start the app
    init();
})();
