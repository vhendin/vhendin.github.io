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
                ['boolean', ['feature-state', 'hover'], false],
                '#cccccc',
                '#69b3a2'
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
                ['boolean', ['feature-state', 'hover'], false],
                '#cccccc',
                '#69b3a2'
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
                ['boolean', ['feature-state', 'hover'], false],
                '#cccccc',
                '#69b3a2'
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
});
