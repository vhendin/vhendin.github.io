// Basketball Game Planner
// Manages player rotations for 6-13 players across two 8-period games

(function() {
    'use strict';

    // Default rotation patterns from paper notes
    const DEFAULT_PATTERNS = {
        6: {
            game1: [
                [1,0,1,0,1,0,1,0],
                [1,0,0,1,0,1,0,1],
                [0,1,0,1,0,1,0,1],
                [0,1,0,1,0,1,0,1],
                [0,1,0,1,0,1,0,1],
                [1,0,1,0,1,0,1,0]
            ],
            game2: [
                [1,0,0,1,0,1,0,1],
                [1,0,0,1,0,1,0,1],
                [0,1,0,0,1,0,1,0],
                [0,1,0,0,1,0,1,0],
                [0,1,0,1,0,1,0,1],
                [1,0,1,0,1,0,1,0]
            ]
        },
        7: {
            game1: [
                [1,0,0,1,0,1,0,1],
                [1,0,0,1,0,0,1,0],
                [0,1,0,1,0,1,0,1],
                [0,1,0,1,0,1,0,0],
                [0,1,0,1,0,0,1,0],
                [1,0,1,0,1,0,0,1],
                [0,0,1,0,1,0,1,0]
            ],
            game2: [
                [0,1,0,0,1,0,1,0],
                [0,1,0,0,1,0,0,1],
                [1,0,1,0,1,0,1,0],
                [1,0,0,1,0,1,0,0],
                [0,1,0,1,0,0,1,0],
                [0,1,0,1,0,1,0,1],
                [1,0,1,0,1,0,0,1]
            ]
        },
        8: {
            game1: [
                [1,0,0,1,0,0,1,0],
                [1,0,0,1,0,0,1,0],
                [0,1,0,1,0,1,0,0],
                [0,1,0,1,0,0,1,0],
                [0,1,0,1,0,1,0,0],
                [1,0,1,0,1,0,1,0],
                [0,1,0,1,0,0,1,0],
                [1,0,1,0,1,0,0,1]
            ],
            game2: [
                [1,0,0,1,0,0,1,0],
                [0,1,0,1,0,1,0,0],
                [0,1,0,1,0,1,0,0],
                [0,1,0,1,0,1,0,0],
                [1,0,1,0,1,0,1,0],
                [0,1,0,1,0,0,1,0],
                [0,1,0,1,0,0,1,0],
                [1,0,1,0,1,0,0,1]
            ]
        },
        9: {
            game1: [
                [1,0,0,1,0,1,0,0],
                [1,0,0,1,0,0,1,0],
                [1,0,0,1,0,0,1,0],
                [0,1,0,1,0,1,0,0],
                [0,1,0,1,0,1,0,0],
                [0,1,0,1,0,0,1,0],
                [0,1,0,0,1,0,0,1],
                [0,1,0,1,0,1,0,0],
                [0,0,1,0,1,0,1,0]
            ],
            game2: [
                [1,0,0,1,0,0,1,0],
                [0,1,0,1,0,1,0,0],
                [0,1,0,1,0,0,1,0],
                [0,1,0,1,0,1,0,0],
                [0,1,0,1,0,1,0,0],
                [1,0,1,0,1,0,0,1],
                [0,1,0,1,0,0,1,0],
                [0,1,0,1,0,1,0,0],
                [1,0,1,0,1,0,0,1]
            ]
        },
        10: {
            game1: [
                [1,0,0,1,0,0,1,0],
                [1,0,0,1,0,0,1,0],
                [0,1,0,1,0,1,0,0],
                [1,0,0,1,0,0,1,0],
                [0,1,0,1,0,1,0,0],
                [1,0,1,0,1,0,0,1],
                [0,1,0,1,0,1,0,0],
                [0,1,0,1,0,1,0,0],
                [0,0,1,0,1,0,0,1],
                [0,0,1,0,0,1,0,1]
            ],
            game2: [
                [0,1,0,0,1,0,0,1],
                [0,1,0,0,1,0,0,1],
                [0,1,0,1,0,1,0,0],
                [0,1,0,1,0,1,0,0],
                [0,1,0,1,0,0,1,0],
                [1,0,1,0,1,0,1,0],
                [0,1,0,1,0,1,0,0],
                [0,1,0,1,0,1,0,0],
                [1,0,1,0,0,1,0,1],
                [1,0,1,0,0,1,0,1]
            ]
        },
        11: {
            game1: [
                [1,0,0,1,0,0,1,0],
                [1,0,0,1,0,0,1,0],
                [1,0,0,1,0,1,0,0],
                [1,0,0,1,0,1,0,0],
                [0,1,0,1,0,0,1,0],
                [0,1,0,1,0,1,0,0],
                [0,1,0,1,0,0,1,0],
                [0,1,0,1,0,0,1,0],
                [0,0,1,0,1,0,0,1],
                [0,0,1,0,1,0,0,1],
                [0,0,1,0,0,1,0,1]
            ],
            game2: [
                [1,0,0,1,0,0,1,0],
                [0,1,0,0,1,0,0,1],
                [0,1,0,1,0,1,0,0],
                [0,1,0,1,0,1,0,0],
                [0,1,0,1,0,0,1,0],
                [0,1,0,1,0,1,0,0],
                [0,1,0,1,0,1,0,0],
                [0,1,0,1,0,0,1,0],
                [0,1,0,1,0,0,1,0],
                [0,1,0,1,0,1,0,0],
                [1,0,1,0,0,1,0,1]
            ]
        },
        12: {
            game1: [
                [1,0,0,1,0,0,1,0],
                [1,0,0,1,0,0,1,0],
                [1,0,0,1,0,1,0,0],
                [1,0,0,1,0,0,1,0],
                [0,1,0,1,0,1,0,0],
                [0,1,0,1,0,1,0,0],
                [0,1,0,1,0,0,1,0],
                [0,1,0,1,0,0,1,0],
                [0,0,1,0,1,0,1,0],
                [0,0,1,0,1,0,0,1],
                [0,0,1,0,0,1,0,1],
                [0,0,1,0,0,1,0,1]
            ],
            game2: [
                [0,1,0,0,1,0,0,1],
                [1,0,1,0,0,1,0,1],
                [0,1,0,1,0,1,0,0],
                [0,1,0,1,0,1,0,0],
                [0,1,0,1,0,0,1,0],
                [0,1,0,1,0,1,0,0],
                [0,1,0,1,0,1,0,0],
                [0,1,0,1,0,1,0,0],
                [1,0,1,0,1,0,0,1],
                [0,1,0,1,0,1,0,0],
                [1,0,1,0,0,1,0,1],
                [1,0,1,0,0,1,0,1]
            ]
        },
        13: {
            game1: [
                [1,0,0,1,0,0,1,0],
                [1,0,0,1,0,0,1,0],
                [1,0,0,1,0,1,0,0],
                [1,0,0,1,0,0,1,0],
                [0,1,0,1,0,0,1,0],
                [0,1,0,0,1,0,0,1],
                [0,1,0,1,0,0,1,0],
                [0,1,0,1,0,0,1,0],
                [0,0,1,0,1,0,1,0],
                [0,0,1,0,1,0,0,1],
                [0,0,1,0,1,0,0,1],
                [0,0,1,0,1,0,0,1],
                [0,0,1,0,1,0,0,1]
            ],
            game2: [
                [0,1,0,0,1,0,0,1],
                [0,1,0,0,1,0,0,1],
                [1,0,1,0,0,1,0,1],
                [0,1,0,1,0,1,0,0],
                [1,0,1,0,0,1,0,1],
                [0,1,0,0,1,0,0,1],
                [0,1,0,1,0,1,0,0],
                [0,1,0,1,0,1,0,0],
                [0,1,0,1,0,0,1,0],
                [0,1,0,1,0,0,0,1],
                [0,1,0,1,0,0,1,0],
                [0,1,0,1,0,0,1,0],
                [0,1,0,1,0,0,1,0]
            ]
        }
    };

    // Application state
    const state = {
        players: [],
        currentGame: 1,
        currentPeriod: 1,
        rotation: { game1: [], game2: [] },
        useDefault: true,
        draggedIndex: null
    };

    // DOM elements
    const dom = {
        setupView: document.getElementById('setupView'),
        gameView: document.getElementById('gameView'),
        playerCount: document.getElementById('playerCount'),
        playerInputs: document.getElementById('playerInputs'),
        useDefault: document.getElementById('useDefault'),
        startGame: document.getElementById('startGame'),
        backToSetup: document.getElementById('backToSetup'),
        clearData: document.getElementById('clearData'),
        prevPeriod: document.getElementById('prevPeriod'),
        nextPeriod: document.getElementById('nextPeriod'),
        currentPeriodDisplay: document.getElementById('currentPeriod'),
        playerStatus: document.getElementById('playerStatus'),
        game1Table: document.getElementById('game1Table'),
        game2Table: document.getElementById('game2Table')
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
        dom.prevPeriod.addEventListener('click', () => navigatePeriod(-1));
        dom.nextPeriod.addEventListener('click', () => navigatePeriod(1));
    }

    // Render player input fields with drag-and-drop
    function renderPlayerInputs() {
        const count = parseInt(dom.playerCount.value);
        
        // Capture existing names before clearing
        const existingNameInputs = document.querySelectorAll('.player-name');
        const existingNames = Array.from(existingNameInputs).map(input => input.value);
        
        dom.playerInputs.innerHTML = '';
        
        for (let i = 0; i < count; i++) {
            const row = document.createElement('div');
            row.className = 'player-input-row';
            row.draggable = true;
            row.dataset.index = i;
            
            // Use existing name if available, otherwise use default
            const playerName = existingNames[i] || `Player ${i + 1}`;
            
            row.innerHTML = `
                <span class="drag-handle">⋮⋮</span>
                <input type="text" class="player-name" placeholder="Name" value="${playerName}">
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
            // Get all name inputs before reordering
            const nameInputs = document.querySelectorAll('.player-name');
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
                    <span class="drag-handle">⋮⋮</span>
                    <input type="text" class="player-name" placeholder="Name" value="${names[i]}">
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
        const nameInputs = document.querySelectorAll('.player-name');
        
        state.players = [];
        nameInputs.forEach((input, i) => {
            state.players.push({
                name: input.value || `Player ${i + 1}`,
                active: true
            });
        });

        // No sorting - players are already in order from top to bottom
        state.useDefault = dom.useDefault.checked;
        state.currentGame = 1;
        state.currentPeriod = 1;

        generateRotation();
        saveToLocalStorage();
        showGameView();
    }

    // Generate rotation pattern
    function generateRotation() {
        const playerCount = state.players.length;
        
        if (state.useDefault && DEFAULT_PATTERNS[playerCount]) {
            // Use default pattern
            const pattern = DEFAULT_PATTERNS[playerCount];
            state.rotation.game1 = pattern.game1.map(row => [...row]);
            state.rotation.game2 = pattern.game2.map(row => [...row]);
        } else {
            // Generate balanced pattern
            state.rotation.game1 = generateBalancedPattern(playerCount);
            state.rotation.game2 = generateBalancedPattern(playerCount);
        }
    }

    // Generate balanced rotation pattern based on list order
    function generateBalancedPattern(playerCount) {
        const periods = 8;
        const playersPerPeriod = 4;
        const pattern = Array(playerCount).fill(0).map(() => Array(periods).fill(0));
        
        // Calculate target plays for each player based on position in list
        const totalSlots = periods * playersPerPeriod;
        const basePlays = Math.floor(totalSlots / playerCount);
        let extraSlots = totalSlots % playerCount;
        
        const targetPlays = state.players.map((player, i) => {
            // Higher priority (top of list) gets extra slots
            if (i < extraSlots) {
                return basePlays + 1;
            }
            return basePlays;
        });

        // Assign players to periods
        for (let period = 0; period < periods; period++) {
            const available = [];
            
            // Find players who haven't reached target and haven't played recently
            for (let p = 0; p < playerCount; p++) {
                const played = pattern[p].slice(0, period).reduce((a, b) => a + b, 0);
                if (played < targetPlays[p]) {
                    // Check if player didn't play in last period (if possible)
                    if (period === 0 || pattern[p][period - 1] === 0) {
                        available.push({ player: p, played, priority: p });
                    }
                }
            }
            
            // Add players who played recently but need more time (if we don't have enough)
            if (available.length < playersPerPeriod) {
                for (let p = 0; p < playerCount; p++) {
                    const played = pattern[p].slice(0, period).reduce((a, b) => a + b, 0);
                    if (played < targetPlays[p] && !available.find(a => a.player === p)) {
                        available.push({ player: p, played, priority: p });
                    }
                }
            }

            // Sort by list position (lower index = higher priority)
            available.sort((a, b) => {
                if (a.played !== b.played) return a.played - b.played;
                return a.priority - b.priority;
            });

            // Assign top 4 players
            for (let i = 0; i < Math.min(playersPerPeriod, available.length); i++) {
                pattern[available[i].player][period] = 1;
            }
        }

        return pattern;
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
            const totalRemainingSlots = (periods - startP) * 4 + (g === 0 ? 8 * 4 : 0);
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

                // Sort: prioritize players who didn't play last, then by list position
                available.sort((a, b) => {
                    if (a.playedLast !== b.playedLast) return a.playedLast ? 1 : -1;
                    if (a.played !== b.played) return a.played - b.played;
                    return a.priority - b.priority;
                });

                // Assign top 4
                for (let i = 0; i < Math.min(4, available.length); i++) {
                    state.rotation[gameName][available[i].player][period] = 1;
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

    // Back to setup
    function backToSetup() {
        if (confirm('Start a new game? Current progress will be saved.')) {
            state.players = [];
            state.rotation = { game1: [], game2: [] };
            saveToLocalStorage();
            dom.setupView.classList.remove('hidden');
            dom.gameView.classList.add('hidden');
            renderPlayerInputs();
        }
    }

    // Clear all data
    function clearAllData() {
        if (confirm('Clear all data? This cannot be undone.')) {
            localStorage.removeItem('basketballGamePlanner');
            location.reload();
        }
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

    // Render game view
    function renderGame() {
        updatePeriodDisplay();
        renderPlayerStatus();
        renderRotationTable('game1', dom.game1Table);
        renderRotationTable('game2', dom.game2Table);
    }

    function updatePeriodDisplay() {
        dom.currentPeriodDisplay.textContent = `Game ${state.currentGame} - Period ${state.currentPeriod}`;
    }

    function renderPlayerStatus() {
        dom.playerStatus.innerHTML = '';
        
        state.players.forEach((player, index) => {
            const total1 = state.rotation.game1[index]?.reduce((a, b) => a + b, 0) || 0;
            const total2 = state.rotation.game2[index]?.reduce((a, b) => a + b, 0) || 0;
            const total = total1 + total2;

            const item = document.createElement('div');
            item.className = `player-status-item ${!player.active ? 'inactive' : ''}`;
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

    function renderRotationTable(gameName, tableEl) {
        const periods = 8;
        const rotation = state.rotation[gameName];
        
        let html = '<thead><tr><th></th>';
        for (let p = 1; p <= periods; p++) {
            html += `<th>${p}</th>`;
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
                
                let classes = [];
                if (isPlaying) classes.push('playing');
                else classes.push('resting');
                if (isCurrent) classes.push('current-period');
                if (isPast) classes.push('past');
                
                html += `<td class="${classes.join(' ')}">${isPlaying ? '1' : ''}</td>`;
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
