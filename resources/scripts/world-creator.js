const map = new maplibregl.Map({
    container: 'map',
    style: {
        version: 8,
        sources: {},
        layers: []
    },
    center: [0, 20],
    zoom: 1.5,
    maxZoom: 8,
    minZoom: 1
});

const tooltip = document.getElementById('tooltip');

const state = {
    selectedTerritories: [],
    territories: [],
    nextTerritoryId: 1,
    selectedColor: '#e74c3c',
    editingTerritoryId: null,
    editingChanges: {
        removedCountries: [],
        addedCountries: [],
        transferredCountries: [],
        newColor: null
    }
};

map.on('load', async function() {
    const [countriesResponse, usStatesResponse, ukCountriesResponse] = await Promise.all([
        fetch('resources/countries.geojson'),
        fetch('resources/us-states.geojson'),
        fetch('resources/uk-countries.geojson')
    ]);
    
    const countriesData = await countriesResponse.json();
    const usStatesData = await usStatesResponse.json();
    const ukCountriesData = await ukCountriesResponse.json();
    
    const countriesWithoutUSAndUK = {
        type: 'FeatureCollection',
        features: countriesData.features.filter(f => 
            f.properties.ADMIN !== 'United States of America' &&
            f.properties.ISO_A3 !== 'USA' &&
            f.properties.ADMIN !== 'United Kingdom' &&
            f.properties.ISO_A3 !== 'GBR'
        )
    };
    
    map.addSource('countries', {
        type: 'geojson',
        data: countriesWithoutUSAndUK,
        generateId: true
    });
    
    map.addSource('us-states', {
        type: 'geojson',
        data: usStatesData,
        generateId: true
    });
    
    map.addSource('uk-countries', {
        type: 'geojson',
        data: ukCountriesData,
        generateId: true
    });
    
    map.addLayer({
        id: 'countries-fill',
        type: 'fill',
        source: 'countries',
        paint: {
            'fill-color': [
                'case',
                ['boolean', ['feature-state', 'selected'], false],
                '#ffd93d',
                ['boolean', ['feature-state', 'hover'], false],
                '#cccccc',
                ['coalesce', ['feature-state', 'territoryColor'], '#69b3a2']
            ],
            'fill-opacity': 1
        }
    });
    
    map.addLayer({
        id: 'countries-line',
        type: 'line',
        source: 'countries',
        paint: {
            'line-color': '#fff',
            'line-width': 1
        }
    });
    
    map.addLayer({
        id: 'us-states-fill',
        type: 'fill',
        source: 'us-states',
        paint: {
            'fill-color': [
                'case',
                ['boolean', ['feature-state', 'selected'], false],
                '#ffd93d',
                ['boolean', ['feature-state', 'hover'], false],
                '#cccccc',
                ['coalesce', ['feature-state', 'territoryColor'], '#69b3a2']
            ],
            'fill-opacity': 1
        }
    });
    
    map.addLayer({
        id: 'us-states-line',
        type: 'line',
        source: 'us-states',
        paint: {
            'line-color': '#fff',
            'line-width': 1
        }
    });
    
    map.addLayer({
        id: 'uk-countries-fill',
        type: 'fill',
        source: 'uk-countries',
        paint: {
            'fill-color': [
                'case',
                ['boolean', ['feature-state', 'selected'], false],
                '#ffd93d',
                ['boolean', ['feature-state', 'hover'], false],
                '#cccccc',
                ['coalesce', ['feature-state', 'territoryColor'], '#69b3a2']
            ],
            'fill-opacity': 1
        }
    });
    
    map.addLayer({
        id: 'uk-countries-line',
        type: 'line',
        source: 'uk-countries',
        paint: {
            'line-color': '#fff',
            'line-width': 1
        }
    });
    
    let hoveredCountryId = null;
    
    map.on('mousemove', 'countries-fill', function(e) {
        if (e.features.length > 0) {
            map.getCanvas().style.cursor = 'pointer';
            
            if (hoveredCountryId !== null) {
                map.setFeatureState(
                    { source: 'countries', id: hoveredCountryId },
                    { hover: false }
                );
            }
            
            hoveredCountryId = e.features[0].id;
            
            const ownerTerritory = getCountryOwner('countries', hoveredCountryId);
            const newHoveredTerritoryId = ownerTerritory ? ownerTerritory.id : null;
            
            if (currentHoveredTerritoryId !== newHoveredTerritoryId) {
                if (currentHoveredTerritoryId !== null) {
                    unhighlightAllTerritoriesInGroup(currentHoveredTerritoryId);
                }
                currentHoveredTerritoryId = newHoveredTerritoryId;
                if (currentHoveredTerritoryId !== null) {
                    highlightAllTerritoriesInGroup(currentHoveredTerritoryId);
                }
            }
            
            if (!ownerTerritory) {
                map.setFeatureState(
                    { source: 'countries', id: hoveredCountryId },
                    { hover: true }
                );
            }
            
            const originalName = e.features[0].properties.ADMIN || e.features[0].properties.name;
            const displayName = getDisplayNameForTerritory('countries', hoveredCountryId, originalName);
            tooltip.style.opacity = '1';
            tooltip.innerHTML = displayName;
            tooltip.style.left = (e.point.x + 10) + 'px';
            tooltip.style.top = (e.point.y - 10) + 'px';
        }
    });
    
    map.on('mouseleave', 'countries-fill', function() {
        map.getCanvas().style.cursor = '';
        
        if (currentHoveredTerritoryId !== null) {
            unhighlightAllTerritoriesInGroup(currentHoveredTerritoryId);
            currentHoveredTerritoryId = null;
        }
        
        if (hoveredCountryId !== null) {
            map.setFeatureState(
                { source: 'countries', id: hoveredCountryId },
                { hover: false }
            );
        }
        
        hoveredCountryId = null;
        tooltip.style.opacity = '0';
    });
    
    let hoveredStateId = null;
    
    map.on('mousemove', 'us-states-fill', function(e) {
        if (e.features.length > 0) {
            map.getCanvas().style.cursor = 'pointer';
            
            if (hoveredStateId !== null) {
                map.setFeatureState(
                    { source: 'us-states', id: hoveredStateId },
                    { hover: false }
                );
            }
            
            hoveredStateId = e.features[0].id;
            
            const ownerTerritory = getCountryOwner('us-states', hoveredStateId);
            const newHoveredTerritoryId = ownerTerritory ? ownerTerritory.id : null;
            
            if (currentHoveredTerritoryId !== newHoveredTerritoryId) {
                if (currentHoveredTerritoryId !== null) {
                    unhighlightAllTerritoriesInGroup(currentHoveredTerritoryId);
                }
                currentHoveredTerritoryId = newHoveredTerritoryId;
                if (currentHoveredTerritoryId !== null) {
                    highlightAllTerritoriesInGroup(currentHoveredTerritoryId);
                }
            }
            
            if (!ownerTerritory) {
                map.setFeatureState(
                    { source: 'us-states', id: hoveredStateId },
                    { hover: true }
                );
            }
            
            const originalName = e.features[0].properties.name || e.features[0].properties.NAME;
            const displayName = getDisplayNameForTerritory('us-states', hoveredStateId, originalName);
            tooltip.style.opacity = '1';
            tooltip.innerHTML = displayName;
            tooltip.style.left = (e.point.x + 10) + 'px';
            tooltip.style.top = (e.point.y - 10) + 'px';
        }
    });
    
    map.on('mouseleave', 'us-states-fill', function() {
        map.getCanvas().style.cursor = '';
        
        if (currentHoveredTerritoryId !== null) {
            unhighlightAllTerritoriesInGroup(currentHoveredTerritoryId);
            currentHoveredTerritoryId = null;
        }
        
        if (hoveredStateId !== null) {
            map.setFeatureState(
                { source: 'us-states', id: hoveredStateId },
                { hover: false }
            );
        }
        
        hoveredStateId = null;
        tooltip.style.opacity = '0';
    });
    
    let hoveredUKId = null;
    let currentHoveredTerritoryId = null;
    
    function highlightAllTerritoriesInGroup(ownerTerritoryId) {
        const territory = state.territories.find(t => t.id === ownerTerritoryId);
        if (!territory) return;
        
        territory.countries.forEach(country => {
            map.setFeatureState(
                { source: country.source, id: country.id },
                { hover: true }
            );
        });
    }
    
    function unhighlightAllTerritoriesInGroup(ownerTerritoryId) {
        const territory = state.territories.find(t => t.id === ownerTerritoryId);
        if (!territory) return;
        
        territory.countries.forEach(country => {
            map.setFeatureState(
                { source: country.source, id: country.id },
                { hover: false }
            );
        });
    }
    
    map.on('mousemove', 'uk-countries-fill', function(e) {
        if (e.features.length > 0) {
            map.getCanvas().style.cursor = 'pointer';
            
            if (hoveredUKId !== null) {
                map.setFeatureState(
                    { source: 'uk-countries', id: hoveredUKId },
                    { hover: false }
                );
            }
            
            hoveredUKId = e.features[0].id;
            
            const ownerTerritory = getCountryOwner('uk-countries', hoveredUKId);
            const newHoveredTerritoryId = ownerTerritory ? ownerTerritory.id : null;
            
            if (currentHoveredTerritoryId !== newHoveredTerritoryId) {
                if (currentHoveredTerritoryId !== null) {
                    unhighlightAllTerritoriesInGroup(currentHoveredTerritoryId);
                }
                currentHoveredTerritoryId = newHoveredTerritoryId;
                if (currentHoveredTerritoryId !== null) {
                    highlightAllTerritoriesInGroup(currentHoveredTerritoryId);
                }
            }
            
            if (!ownerTerritory) {
                map.setFeatureState(
                    { source: 'uk-countries', id: hoveredUKId },
                    { hover: true }
                );
            }
            
            const originalName = e.features[0].properties.areanm;
            const displayName = getDisplayNameForTerritory('uk-countries', hoveredUKId, originalName);
            tooltip.style.opacity = '1';
            tooltip.innerHTML = displayName;
            tooltip.style.left = (e.point.x + 10) + 'px';
            tooltip.style.top = (e.point.y - 10) + 'px';
        }
    });
    
    map.on('mouseleave', 'uk-countries-fill', function() {
        map.getCanvas().style.cursor = '';
        
        if (currentHoveredTerritoryId !== null) {
            unhighlightAllTerritoriesInGroup(currentHoveredTerritoryId);
            currentHoveredTerritoryId = null;
        }
        
        if (hoveredUKId !== null) {
            map.setFeatureState(
                { source: 'uk-countries', id: hoveredUKId },
                { hover: false }
            );
        }
        
        hoveredUKId = null;
        tooltip.style.opacity = '0';
    });
    
    function toggleTerritorySelection(source, featureId, featureName) {
        const index = state.selectedTerritories.findIndex(
            t => t.source === source && t.id === featureId
        );
        
        if (index >= 0) {
            state.selectedTerritories.splice(index, 1);
            map.setFeatureState(
                { source: source, id: featureId },
                { selected: false }
            );
        } else {
            state.selectedTerritories.push({
                source: source,
                id: featureId,
                name: featureName
            });
            map.setFeatureState(
                { source: source, id: featureId },
                { selected: true }
            );
        }
        
        updateSelectionUI();
    }
    
    function updateSelectionUI() {
        const counter = document.getElementById('selection-count');
        const clearBtn = document.getElementById('clear-selection');
        const createBtn = document.getElementById('create-territory-btn');
        
        counter.textContent = `${state.selectedTerritories.length} countries selected`;
        clearBtn.disabled = state.selectedTerritories.length === 0;
        createBtn.disabled = state.selectedTerritories.length === 0;
    }
    
    map.on('click', 'countries-fill', function(e) {
        if (e.features.length > 0) {
            const feature = e.features[0];
            const countryName = feature.properties.ADMIN || feature.properties.name;
            
            if (state.editingTerritoryId !== null) {
                toggleTerritoryInEditMode('countries', feature.id, countryName);
            } else {
                toggleTerritorySelection('countries', feature.id, countryName);
            }
        }
    });
    
    map.on('click', 'us-states-fill', function(e) {
        if (e.features.length > 0) {
            const feature = e.features[0];
            const stateName = feature.properties.name || feature.properties.NAME;
            
            if (state.editingTerritoryId !== null) {
                toggleTerritoryInEditMode('us-states', feature.id, stateName);
            } else {
                toggleTerritorySelection('us-states', feature.id, stateName);
            }
        }
    });
    
    map.on('click', 'uk-countries-fill', function(e) {
        if (e.features.length > 0) {
            const feature = e.features[0];
            const ukCountryName = feature.properties.areanm;
            
            if (state.editingTerritoryId !== null) {
                toggleTerritoryInEditMode('uk-countries', feature.id, ukCountryName);
            } else {
                toggleTerritorySelection('uk-countries', feature.id, ukCountryName);
            }
        }
    });
    
    document.getElementById('clear-selection').addEventListener('click', function() {
        state.selectedTerritories.forEach(territory => {
            map.setFeatureState(
                { source: territory.source, id: territory.id },
                { selected: false }
            );
        });
        state.selectedTerritories = [];
        updateSelectionUI();
    });
    
    // Deselect all countries when clicking on ocean/empty space
    map.on('click', function(e) {
        // Check if click was on any country layer
        const features = map.queryRenderedFeatures(e.point, {
            layers: ['countries-fill', 'us-states-fill', 'uk-countries-fill']
        });
        
        // If no features clicked AND not in edit mode AND has selections
        if (features.length === 0 && 
            state.editingTerritoryId === null && 
            state.selectedTerritories.length > 0) {
            
            // Clear all selections
            state.selectedTerritories.forEach(territory => {
                map.setFeatureState(
                    { source: territory.source, id: territory.id },
                    { selected: false }
                );
            });
            state.selectedTerritories = [];
            updateSelectionUI();
        }
    });
    
    document.getElementById('create-territory-btn').addEventListener('click', function() {
        const modal = document.getElementById('territory-modal');
        modal.classList.add('active');
        document.getElementById('territory-name').value = '';
        document.getElementById('territory-name').focus();
    });
    
    document.getElementById('modal-cancel').addEventListener('click', function() {
        document.getElementById('territory-modal').classList.remove('active');
    });
    
    document.querySelectorAll('.color-option').forEach(option => {
        option.addEventListener('click', function() {
            document.querySelectorAll('.color-option').forEach(o => o.classList.remove('selected'));
            this.classList.add('selected');
            state.selectedColor = this.dataset.color;
        });
    });
    
    document.querySelector('.color-option').classList.add('selected');
    
    document.getElementById('modal-create').addEventListener('click', function() {
        const territoryName = document.getElementById('territory-name').value.trim();
        
        if (!territoryName) {
            alert('Please enter a territory name');
            return;
        }
        
        if (state.selectedTerritories.length === 0) {
            alert('No countries selected');
            return;
        }
        
        const territory = {
            id: state.nextTerritoryId++,
            name: territoryName,
            color: state.selectedColor,
            countries: [...state.selectedTerritories]
        };
        
        state.territories.push(territory);
        
        state.selectedTerritories.forEach(country => {
            map.setFeatureState(
                { source: country.source, id: country.id },
                { selected: false, territoryColor: state.selectedColor }
            );
        });
        
        state.selectedTerritories = [];
        
        updateSelectionUI();
        updateTerritoriesList();
        saveToLocalStorage();
        
        document.getElementById('territory-modal').classList.remove('active');
    });
    
    function updateTerritoriesList() {
        const list = document.getElementById('territories-list');
        list.innerHTML = '';
        
        if (state.territories.length === 0) {
            list.innerHTML = '<p style="color: #666; font-size: 12px;">No territories created yet</p>';
            return;
        }
        
        state.territories.forEach(territory => {
            const isEditing = state.editingTerritoryId === territory.id;
            const item = document.createElement('div');
            item.className = 'territory-item' + (isEditing ? ' editing' : '');
            item.style.borderLeftColor = territory.color;
            
            const activeCountries = territory.countries.filter(c => 
                !state.editingChanges.removedCountries.some(rc => 
                    rc.source === c.source && rc.id === c.id
                )
            );
            const totalCountries = activeCountries.length + 
                (isEditing ? state.editingChanges.addedCountries.length + state.editingChanges.transferredCountries.length : 0);
            const removedCount = isEditing ? state.editingChanges.removedCountries.length : 0;
            const addedCount = isEditing ? state.editingChanges.addedCountries.length + state.editingChanges.transferredCountries.length : 0;
            
            const displayColor = isEditing && state.editingChanges.newColor 
                ? state.editingChanges.newColor 
                : territory.color;
            
            item.style.borderLeftColor = displayColor;
            
            let html = `
                <div class="territory-item-header">
                    <span class="territory-name">${isEditing ? 'EDITING: ' : ''}${territory.name}</span>
                    <div class="territory-item-buttons">
            `;
            
            if (isEditing) {
                html += `
                    <button class="territory-save" data-id="${territory.id}">Save</button>
                    <button class="territory-cancel" data-id="${territory.id}">Cancel</button>
                `;
            } else {
                html += `
                    <button class="territory-edit" data-id="${territory.id}">Edit</button>
                    <button class="territory-delete" data-id="${territory.id}">Delete</button>
                `;
            }
            
            html += `
                    </div>
                </div>
            `;
            
            if (isEditing && (removedCount > 0 || addedCount > 0)) {
                html += `<div class="territory-info">${totalCountries} countries (${removedCount > 0 ? '-' + removedCount : ''} ${addedCount > 0 ? '+' + addedCount : ''})</div>`;
            } else {
                html += `<div class="territory-info">${totalCountries} countries</div>`;
            }
            
            if (isEditing) {
                html += `
                    <div class="edit-controls">
                        <div class="edit-instructions">• Click countries to add/remove
• Click again to undo changes</div>
                        <label style="display: block; margin-bottom: 8px; font-size: 12px; color: #ccc;">Change Color:</label>
                        <div class="edit-color-palette">
                            <div class="color-option" data-color="#e74c3c" style="background-color: #e74c3c;"></div>
                            <div class="color-option" data-color="#3498db" style="background-color: #3498db;"></div>
                            <div class="color-option" data-color="#9b59b6" style="background-color: #9b59b6;"></div>
                            <div class="color-option" data-color="#e67e22" style="background-color: #e67e22;"></div>
                            <div class="color-option" data-color="#1abc9c" style="background-color: #1abc9c;"></div>
                            <div class="color-option" data-color="#f39c12" style="background-color: #f39c12;"></div>
                            <div class="color-option" data-color="#c0392b" style="background-color: #c0392b;"></div>
                            <div class="color-option" data-color="#2980b9" style="background-color: #2980b9;"></div>
                            <div class="color-option" data-color="#8e44ad" style="background-color: #8e44ad;"></div>
                            <div class="color-option" data-color="#d35400" style="background-color: #d35400;"></div>
                            <div class="color-option" data-color="#16a085" style="background-color: #16a085;"></div>
                            <div class="color-option" data-color="#f1c40f" style="background-color: #f1c40f;"></div>
                            <div class="color-option" data-color="#e91e63" style="background-color: #e91e63;"></div>
                            <div class="color-option" data-color="#00bcd4" style="background-color: #00bcd4;"></div>
                            <div class="color-option" data-color="#673ab7" style="background-color: #673ab7;"></div>
                            <div class="color-option" data-color="#ff5722" style="background-color: #ff5722;"></div>
                        </div>
                    </div>
                `;
            }
            
            item.innerHTML = html;
            
            const editBtn = item.querySelector('.territory-edit');
            if (editBtn) {
                editBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    enterEditMode(territory.id);
                });
            }
            
            const saveBtn = item.querySelector('.territory-save');
            if (saveBtn) {
                saveBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    exitEditMode(true);
                });
            }
            
            const cancelBtn = item.querySelector('.territory-cancel');
            if (cancelBtn) {
                cancelBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    exitEditMode(false);
                });
            }
            
            const deleteBtn = item.querySelector('.territory-delete');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    deleteTerritory(territory.id);
                });
            }
            
            if (isEditing) {
                item.querySelectorAll('.edit-color-palette .color-option').forEach(option => {
                    if (option.dataset.color === displayColor) {
                        option.classList.add('selected');
                    }
                    option.addEventListener('click', function(e) {
                        e.stopPropagation();
                        changeEditingTerritoryColor(this.dataset.color);
                    });
                });
            } else {
                item.addEventListener('click', function() {
                    territory.countries.forEach(country => {
                        map.setFeatureState(
                            { source: country.source, id: country.id },
                            { hover: true }
                        );
                    });
                    
                    setTimeout(() => {
                        territory.countries.forEach(country => {
                            map.setFeatureState(
                                { source: country.source, id: country.id },
                                { hover: false }
                            );
                        });
                    }, 1000);
                });
            }
            
            list.appendChild(item);
        });
    }
    
    function deleteTerritory(territoryId) {
        const territory = state.territories.find(t => t.id === territoryId);
        if (!territory) return;
        
        territory.countries.forEach(country => {
            map.setFeatureState(
                { source: country.source, id: country.id },
                { territoryColor: null }
            );
        });
        
        state.territories = state.territories.filter(t => t.id !== territoryId);
        updateTerritoriesList();
        saveToLocalStorage();
    }
    
    function saveToLocalStorage() {
        try {
            const data = {
                version: 1,
                territories: state.territories,
                lastSaved: Date.now()
            };
            localStorage.setItem('world-creator-territories', JSON.stringify(data));
            
            const saveStatus = document.getElementById('save-status');
            if (saveStatus) {
                const now = new Date();
                const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                saveStatus.textContent = `Last saved: ${timeString}`;
            }
        } catch (error) {
            console.error('Failed to save to localStorage:', error);
        }
    }
    
    function loadFromLocalStorage() {
        try {
            const saved = localStorage.getItem('world-creator-territories');
            if (!saved) return false;
            
            const data = JSON.parse(saved);
            if (!data.territories || !Array.isArray(data.territories)) return false;
            
            state.territories = data.territories;
            state.nextTerritoryId = Math.max(...data.territories.map(t => t.id), 0) + 1;
            
            state.territories.forEach(territory => {
                territory.countries.forEach(country => {
                    map.setFeatureState(
                        { source: country.source, id: country.id },
                        { territoryColor: territory.color }
                    );
                });
            });
            
            updateTerritoriesList();
            
            const saveStatus = document.getElementById('save-status');
            if (saveStatus && data.lastSaved) {
                const savedTime = new Date(data.lastSaved);
                const timeString = savedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                saveStatus.textContent = `Last saved: ${timeString}`;
            }
            
            return true;
        } catch (error) {
            console.error('Failed to load from localStorage:', error);
            return false;
        }
    }
    
    function togglePanel() {
        const panel = document.getElementById('ui-panel');
        const btn = document.getElementById('toggle-panel-btn');
        const isHidden = panel.classList.toggle('hidden');
        
        btn.textContent = isHidden ? '☰' : '✕';
        btn.title = isHidden ? 'Show panel' : 'Hide panel';
        
        try {
            localStorage.setItem('world-creator-panel-visible', !isHidden);
        } catch (error) {
            console.error('Failed to save panel state:', error);
        }
    }
    
    function restorePanelVisibility() {
        try {
            const panelVisible = localStorage.getItem('world-creator-panel-visible');
            if (panelVisible === 'false') {
                const panel = document.getElementById('ui-panel');
                const btn = document.getElementById('toggle-panel-btn');
                panel.classList.add('hidden');
                btn.textContent = '☰';
                btn.title = 'Show panel';
            }
        } catch (error) {
            console.error('Failed to restore panel state:', error);
        }
    }
    
    function enterEditMode(territoryId) {
        if (state.editingTerritoryId !== null) {
            exitEditMode(false);
        }
        
        state.editingTerritoryId = territoryId;
        state.editingChanges = {
            removedCountries: [],
            addedCountries: [],
            transferredCountries: [],
            newColor: null
        };
        
        const territory = state.territories.find(t => t.id === territoryId);
        if (!territory) return;
        
        territory.countries.forEach(country => {
            map.setFeatureState(
                { source: country.source, id: country.id },
                { hover: true }
            );
        });
        
        updateTerritoriesList();
    }
    
    function exitEditMode(save) {
        if (state.editingTerritoryId === null) return;
        
        const territory = state.territories.find(t => t.id === state.editingTerritoryId);
        if (!territory) return;
        
        if (save) {
            const remainingCountries = territory.countries.filter(c => 
                !state.editingChanges.removedCountries.some(rc => 
                    rc.source === c.source && rc.id === c.id
                )
            );
            
            const finalCountryCount = remainingCountries.length + 
                state.editingChanges.addedCountries.length + 
                state.editingChanges.transferredCountries.length;
            
            if (finalCountryCount === 0) {
                alert('Territory must have at least 1 country');
                return;
            }
            
            state.editingChanges.removedCountries.forEach(country => {
                map.setFeatureState(
                    { source: country.source, id: country.id },
                    { territoryColor: null, hover: false }
                );
            });
            
            territory.countries = remainingCountries;
            
            state.editingChanges.transferredCountries.forEach(transfer => {
                const sourceTerritory = state.territories.find(t => t.id === transfer.fromTerritoryId);
                if (sourceTerritory) {
                    sourceTerritory.countries = sourceTerritory.countries.filter(c => 
                        !(c.source === transfer.country.source && c.id === transfer.country.id)
                    );
                }
                territory.countries.push(transfer.country);
            });
            
            state.editingChanges.addedCountries.forEach(country => {
                territory.countries.push(country);
            });
            
            const finalColor = state.editingChanges.newColor || territory.color;
            if (state.editingChanges.newColor) {
                territory.color = state.editingChanges.newColor;
            }
            
            territory.countries.forEach(country => {
                map.setFeatureState(
                    { source: country.source, id: country.id },
                    { territoryColor: finalColor, hover: false }
                );
            });
        } else {
            state.editingChanges.addedCountries.forEach(country => {
                map.setFeatureState(
                    { source: country.source, id: country.id },
                    { territoryColor: null, hover: false }
                );
            });
            
            state.editingChanges.transferredCountries.forEach(transfer => {
                const sourceTerritory = state.territories.find(t => t.id === transfer.fromTerritoryId);
                if (sourceTerritory) {
                    map.setFeatureState(
                        { source: transfer.country.source, id: transfer.country.id },
                        { territoryColor: sourceTerritory.color, hover: false }
                    );
                }
            });
            
            if (state.editingChanges.newColor) {
                territory.countries.forEach(country => {
                    map.setFeatureState(
                        { source: country.source, id: country.id },
                        { territoryColor: territory.color }
                    );
                });
            }
            
            territory.countries.forEach(country => {
                const isRemoved = state.editingChanges.removedCountries.some(c => 
                    c.source === country.source && c.id === country.id
                );
                
                if (isRemoved) {
                    map.setFeatureState(
                        { source: country.source, id: country.id },
                        { territoryColor: territory.color, hover: false }
                    );
                } else {
                    map.setFeatureState(
                        { source: country.source, id: country.id },
                        { hover: false }
                    );
                }
            });
        }
        
        state.editingTerritoryId = null;
        state.editingChanges = {
            removedCountries: [],
            addedCountries: [],
            transferredCountries: [],
            newColor: null
        };
        
        updateTerritoriesList();
        
        if (save) {
            saveToLocalStorage();
        }
    }
    
    function getCountryOwner(source, id) {
        for (const territory of state.territories) {
            const hasCountry = territory.countries.some(c => 
                c.source === source && c.id === id
            );
            if (hasCountry) {
                return territory;
            }
        }
        return null;
    }
    
    function getDisplayNameForTerritory(source, id, originalName) {
        const ownerTerritory = getCountryOwner(source, id);
        if (ownerTerritory !== null) {
            return ownerTerritory.name;
        }
        return originalName;
    }
    
    function toggleTerritoryInEditMode(source, id, name) {
        if (state.editingTerritoryId === null) return;
        
        const territory = state.territories.find(t => t.id === state.editingTerritoryId);
        if (!territory) return;
        
        const ownerTerritory = getCountryOwner(source, id);
        const belongsToEditingTerritory = territory.countries.some(c => 
            c.source === source && c.id === id
        );
        
        const alreadyRemoved = state.editingChanges.removedCountries.some(c => 
            c.source === source && c.id === id
        );
        const alreadyAdded = state.editingChanges.addedCountries.some(c => 
            c.source === source && c.id === id
        );
        const alreadyTransferred = state.editingChanges.transferredCountries.some(t => 
            t.country.source === source && t.country.id === id
        );
        
        if (belongsToEditingTerritory && !alreadyRemoved) {
            const remainingCount = territory.countries.length - 
                state.editingChanges.removedCountries.length - 1 +
                state.editingChanges.addedCountries.length +
                state.editingChanges.transferredCountries.length;
            
            if (remainingCount === 0) {
                alert('Territory must have at least 1 country');
                return;
            }
            
            state.editingChanges.removedCountries.push({ source, id, name });
            map.setFeatureState(
                { source: source, id: id },
                { territoryColor: '#666666' }
            );
        }
        else if (alreadyRemoved) {
            state.editingChanges.removedCountries = state.editingChanges.removedCountries.filter(c => 
                !(c.source === source && c.id === id)
            );
            const displayColor = state.editingChanges.newColor || territory.color;
            map.setFeatureState(
                { source: source, id: id },
                { territoryColor: displayColor }
            );
        }
        else if (!ownerTerritory && !alreadyAdded) {
            state.editingChanges.addedCountries.push({ source, id, name });
            const displayColor = state.editingChanges.newColor || territory.color;
            map.setFeatureState(
                { source: source, id: id },
                { territoryColor: displayColor }
            );
        }
        else if (alreadyAdded) {
            state.editingChanges.addedCountries = state.editingChanges.addedCountries.filter(c => 
                !(c.source === source && c.id === id)
            );
            map.setFeatureState(
                { source: source, id: id },
                { territoryColor: null }
            );
        }
        else if (ownerTerritory && ownerTerritory.id !== state.editingTerritoryId && !alreadyTransferred) {
            state.editingChanges.transferredCountries.push({
                fromTerritoryId: ownerTerritory.id,
                country: { source, id, name }
            });
            const displayColor = state.editingChanges.newColor || territory.color;
            map.setFeatureState(
                { source: source, id: id },
                { territoryColor: displayColor }
            );
        }
        else if (alreadyTransferred) {
            state.editingChanges.transferredCountries = state.editingChanges.transferredCountries.filter(t => 
                !(t.country.source === source && t.country.id === id)
            );
            if (ownerTerritory) {
                map.setFeatureState(
                    { source: source, id: id },
                    { territoryColor: ownerTerritory.color }
                );
            }
        }
        
        updateTerritoriesList();
    }
    
    function removeTerritoryFromEditingCountry(source, id) {
        if (state.editingTerritoryId === null) return;
        
        const territory = state.territories.find(t => t.id === state.editingTerritoryId);
        if (!territory) return;
        
        const countryInTerritory = territory.countries.find(c => 
            c.source === source && c.id === id
        );
        
        if (!countryInTerritory) return;
        
        const alreadyRemoved = state.editingChanges.removedCountries.some(c => 
            c.source === source && c.id === id
        );
        
        if (alreadyRemoved) return;
        
        const remainingCount = territory.countries.length - state.editingChanges.removedCountries.length - 1;
        if (remainingCount === 0) {
            alert('Territory must have at least 1 country');
            return;
        }
        
        state.editingChanges.removedCountries.push(countryInTerritory);
        
        map.setFeatureState(
            { source: source, id: id },
            { territoryColor: '#666666' }
        );
        
        updateTerritoriesList();
    }
    
    function changeEditingTerritoryColor(newColor) {
        if (state.editingTerritoryId === null) return;
        
        const territory = state.territories.find(t => t.id === state.editingTerritoryId);
        if (!territory) return;
        
        state.editingChanges.newColor = newColor;
        
        territory.countries.forEach(country => {
            const isRemoved = state.editingChanges.removedCountries.some(c => 
                c.source === country.source && c.id === country.id
            );
            
            if (!isRemoved) {
                map.setFeatureState(
                    { source: country.source, id: country.id },
                    { territoryColor: newColor }
                );
            }
        });
        
        state.editingChanges.addedCountries.forEach(country => {
            map.setFeatureState(
                { source: country.source, id: country.id },
                { territoryColor: newColor }
            );
        });
        
        state.editingChanges.transferredCountries.forEach(transfer => {
            map.setFeatureState(
                { source: transfer.country.source, id: transfer.country.id },
                { territoryColor: newColor }
            );
        });
        
        updateTerritoriesList();
    }
    
    document.getElementById('export-btn').addEventListener('click', function() {
        const data = {
            version: 1,
            territories: state.territories
        };
        
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'territories.json';
        a.click();
        URL.revokeObjectURL(url);
    });
    
    document.getElementById('import-btn').addEventListener('click', function() {
        document.getElementById('import-file').click();
    });
    
    document.getElementById('import-file').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const data = JSON.parse(event.target.result);
                
                // Support both old format (countries) and new format (territories)
                let importedTerritories;
                if (data.territories && Array.isArray(data.territories)) {
                    importedTerritories = data.territories;
                } else if (data.countries && Array.isArray(data.countries)) {
                    // Backward compatibility: convert old format to new
                    importedTerritories = data.countries.map(oldCountry => ({
                        id: oldCountry.id,
                        name: oldCountry.name,
                        color: oldCountry.color,
                        countries: oldCountry.territories || []
                    }));
                } else {
                    alert('Invalid file format');
                    return;
                }
                
                // Clear existing territory colors
                state.territories.forEach(territory => {
                    territory.countries.forEach(country => {
                        map.setFeatureState(
                            { source: country.source, id: country.id },
                            { territoryColor: null }
                        );
                    });
                });
                
                // Import new territories
                state.territories = importedTerritories;
                state.nextTerritoryId = Math.max(...importedTerritories.map(t => t.id), 0) + 1;
                
                // Apply new territory colors
                state.territories.forEach(territory => {
                    territory.countries.forEach(country => {
                        map.setFeatureState(
                            { source: country.source, id: country.id },
                            { territoryColor: territory.color }
                        );
                    });
                });
                
                updateTerritoriesList();
                saveToLocalStorage();
                alert('Territories imported successfully!');
            } catch (error) {
                alert('Error reading file: ' + error.message);
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    });
    
    document.getElementById('toggle-panel-btn').addEventListener('click', togglePanel);
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            togglePanel();
        }
    });
    
    restorePanelVisibility();
    
    if (!loadFromLocalStorage()) {
        updateTerritoriesList();
    }
});
