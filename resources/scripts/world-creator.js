const map = new maplibregl.Map({
    container: 'map',
    style: 'https://demotiles.maplibre.org/style.json',
    center: [0, 20],
    zoom: 1.5,
    maxZoom: 8,
    minZoom: 1
});

const tooltip = document.getElementById('tooltip');

map.on('load', async function() {
    const usStatesResponse = await fetch('resources/us-states.geojson');
    const usStatesData = await usStatesResponse.json();
    
    map.addSource('us-states', {
        type: 'geojson',
        data: usStatesData
    });
    
    const countryLayers = map.getStyle().layers;
    
    const graticuleLayers = countryLayers.filter(layer => 
        layer.id.includes('graticule') || 
        layer.id.includes('grid') ||
        layer.id.includes('latitude') ||
        layer.id.includes('longitude')
    );
    
    graticuleLayers.forEach(layer => {
        map.removeLayer(layer.id);
    });
    const countryLayerIds = countryLayers
        .filter(layer => layer.id.includes('country') || layer.id.includes('boundary'))
        .map(layer => layer.id);
    
    countryLayerIds.forEach(layerId => {
        const layer = map.getLayer(layerId);
        if (layer && layer.type === 'fill') {
            map.setFilter(layerId, ['!=', ['get', 'iso_a2'], 'US']);
            map.setPaintProperty(layerId, 'fill-color', '#69b3a2');
            map.setPaintProperty(layerId, 'fill-opacity', 1);
        }
        if (layer && layer.type === 'line') {
            map.setFilter(layerId, ['!=', ['get', 'iso_a2'], 'US']);
            map.setPaintProperty(layerId, 'line-color', '#fff');
            map.setPaintProperty(layerId, 'line-width', 1);
        }
    });
    
    map.addLayer({
        id: 'us-states-fill',
        type: 'fill',
        source: 'us-states',
        paint: {
            'fill-color': '#69b3a2',
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
    
    countryLayerIds.forEach(layerId => {
        const layer = map.getLayer(layerId);
        if (layer && layer.type === 'fill') {
            map.on('mousemove', layerId, function(e) {
                if (e.features.length > 0) {
                    map.getCanvas().style.cursor = 'pointer';
                    map.setPaintProperty(layerId, 'fill-color', [
                        'case',
                        ['==', ['id'], e.features[0].id],
                        '#2d7a5e',
                        '#69b3a2'
                    ]);
                    
                    const countryName = e.features[0].properties.name || e.features[0].properties.NAME;
                    tooltip.style.opacity = '1';
                    tooltip.innerHTML = countryName;
                    tooltip.style.left = (e.point.x + 10) + 'px';
                    tooltip.style.top = (e.point.y - 10) + 'px';
                }
            });
            
            map.on('mouseleave', layerId, function() {
                map.getCanvas().style.cursor = '';
                map.setPaintProperty(layerId, 'fill-color', '#69b3a2');
                tooltip.style.opacity = '0';
            });
        }
    });
    
    map.on('mousemove', 'us-states-fill', function(e) {
        if (e.features.length > 0) {
            map.getCanvas().style.cursor = 'pointer';
            map.setPaintProperty('us-states-fill', 'fill-color', [
                'case',
                ['==', ['get', 'NAME'], e.features[0].properties.NAME],
                '#2d7a5e',
                '#69b3a2'
            ]);
            
            tooltip.style.opacity = '1';
            tooltip.innerHTML = e.features[0].properties.NAME;
            tooltip.style.left = (e.point.x + 10) + 'px';
            tooltip.style.top = (e.point.y - 10) + 'px';
        }
    });
    
    map.on('mouseleave', 'us-states-fill', function() {
        map.getCanvas().style.cursor = '';
        map.setPaintProperty('us-states-fill', 'fill-color', '#69b3a2');
        tooltip.style.opacity = '0';
    });
});
