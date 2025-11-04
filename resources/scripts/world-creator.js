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
    fictionalCountries: [],
    nextCountryId: 1,
    selectedColor: '#ff6b6b'
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
                ['coalesce', ['feature-state', 'countryColor'], '#69b3a2']
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
                ['coalesce', ['feature-state', 'countryColor'], '#69b3a2']
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
                ['coalesce', ['feature-state', 'countryColor'], '#69b3a2']
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
            
            map.setFeatureState(
                { source: 'countries', id: hoveredCountryId },
                { hover: true }
            );
            
            const countryName = e.features[0].properties.ADMIN || e.features[0].properties.name;
            tooltip.style.opacity = '1';
            tooltip.innerHTML = countryName;
            tooltip.style.left = (e.point.x + 10) + 'px';
            tooltip.style.top = (e.point.y - 10) + 'px';
        }
    });
    
    map.on('mouseleave', 'countries-fill', function() {
        map.getCanvas().style.cursor = '';
        
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
            
            map.setFeatureState(
                { source: 'us-states', id: hoveredStateId },
                { hover: true }
            );
            
            const stateName = e.features[0].properties.name || e.features[0].properties.NAME;
            tooltip.style.opacity = '1';
            tooltip.innerHTML = stateName;
            tooltip.style.left = (e.point.x + 10) + 'px';
            tooltip.style.top = (e.point.y - 10) + 'px';
        }
    });
    
    map.on('mouseleave', 'us-states-fill', function() {
        map.getCanvas().style.cursor = '';
        
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
            
            map.setFeatureState(
                { source: 'uk-countries', id: hoveredUKId },
                { hover: true }
            );
            
            const ukCountryName = e.features[0].properties.areanm;
            tooltip.style.opacity = '1';
            tooltip.innerHTML = ukCountryName;
            tooltip.style.left = (e.point.x + 10) + 'px';
            tooltip.style.top = (e.point.y - 10) + 'px';
        }
    });
    
    map.on('mouseleave', 'uk-countries-fill', function() {
        map.getCanvas().style.cursor = '';
        
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
        const createBtn = document.getElementById('create-country-btn');
        
        counter.textContent = `${state.selectedTerritories.length} territories selected`;
        clearBtn.disabled = state.selectedTerritories.length === 0;
        createBtn.disabled = state.selectedTerritories.length === 0;
    }
    
    map.on('click', 'countries-fill', function(e) {
        if (e.features.length > 0) {
            const feature = e.features[0];
            const countryName = feature.properties.ADMIN || feature.properties.name;
            toggleTerritorySelection('countries', feature.id, countryName);
        }
    });
    
    map.on('click', 'us-states-fill', function(e) {
        if (e.features.length > 0) {
            const feature = e.features[0];
            const stateName = feature.properties.name || feature.properties.NAME;
            toggleTerritorySelection('us-states', feature.id, stateName);
        }
    });
    
    map.on('click', 'uk-countries-fill', function(e) {
        if (e.features.length > 0) {
            const feature = e.features[0];
            const ukCountryName = feature.properties.areanm;
            toggleTerritorySelection('uk-countries', feature.id, ukCountryName);
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
    
    document.getElementById('create-country-btn').addEventListener('click', function() {
        const modal = document.getElementById('country-modal');
        modal.classList.add('active');
        document.getElementById('country-name').value = '';
        document.getElementById('country-name').focus();
    });
    
    document.getElementById('modal-cancel').addEventListener('click', function() {
        document.getElementById('country-modal').classList.remove('active');
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
        const countryName = document.getElementById('country-name').value.trim();
        
        if (!countryName) {
            alert('Please enter a country name');
            return;
        }
        
        if (state.selectedTerritories.length === 0) {
            alert('No territories selected');
            return;
        }
        
        const country = {
            id: state.nextCountryId++,
            name: countryName,
            color: state.selectedColor,
            territories: [...state.selectedTerritories]
        };
        
        state.fictionalCountries.push(country);
        
        state.selectedTerritories.forEach(territory => {
            map.setFeatureState(
                { source: territory.source, id: territory.id },
                { selected: false, countryColor: state.selectedColor }
            );
        });
        
        state.selectedTerritories = [];
        
        updateSelectionUI();
        updateCountriesList();
        
        document.getElementById('country-modal').classList.remove('active');
    });
    
    function updateCountriesList() {
        const list = document.getElementById('countries-list');
        list.innerHTML = '';
        
        if (state.fictionalCountries.length === 0) {
            list.innerHTML = '<p style="color: #666; font-size: 12px;">No countries created yet</p>';
            return;
        }
        
        state.fictionalCountries.forEach(country => {
            const item = document.createElement('div');
            item.className = 'country-item';
            item.style.borderLeftColor = country.color;
            
            item.innerHTML = `
                <div class="country-item-header">
                    <span class="country-name">${country.name}</span>
                    <button class="country-delete" data-id="${country.id}">Delete</button>
                </div>
                <div class="country-info">${country.territories.length} territories</div>
            `;
            
            item.querySelector('.country-delete').addEventListener('click', function(e) {
                e.stopPropagation();
                deleteCountry(country.id);
            });
            
            item.addEventListener('click', function() {
                country.territories.forEach(territory => {
                    map.setFeatureState(
                        { source: territory.source, id: territory.id },
                        { hover: true }
                    );
                });
                
                setTimeout(() => {
                    country.territories.forEach(territory => {
                        map.setFeatureState(
                            { source: territory.source, id: territory.id },
                            { hover: false }
                        );
                    });
                }, 1000);
            });
            
            list.appendChild(item);
        });
    }
    
    function deleteCountry(countryId) {
        const country = state.fictionalCountries.find(c => c.id === countryId);
        if (!country) return;
        
        country.territories.forEach(territory => {
            map.setFeatureState(
                { source: territory.source, id: territory.id },
                { countryColor: null }
            );
        });
        
        state.fictionalCountries = state.fictionalCountries.filter(c => c.id !== countryId);
        updateCountriesList();
    }
    
    document.getElementById('export-btn').addEventListener('click', function() {
        const data = {
            version: 1,
            countries: state.fictionalCountries
        };
        
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'fictional-countries.json';
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
                
                if (!data.countries || !Array.isArray(data.countries)) {
                    alert('Invalid file format');
                    return;
                }
                
                state.fictionalCountries.forEach(country => {
                    country.territories.forEach(territory => {
                        map.setFeatureState(
                            { source: territory.source, id: territory.id },
                            { countryColor: null }
                        );
                    });
                });
                
                state.fictionalCountries = data.countries;
                state.nextCountryId = Math.max(...data.countries.map(c => c.id), 0) + 1;
                
                state.fictionalCountries.forEach(country => {
                    country.territories.forEach(territory => {
                        map.setFeatureState(
                            { source: territory.source, id: territory.id },
                            { countryColor: country.color }
                        );
                    });
                });
                
                updateCountriesList();
                alert('Countries imported successfully!');
            } catch (error) {
                alert('Error reading file: ' + error.message);
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    });
    
    updateCountriesList();
});
