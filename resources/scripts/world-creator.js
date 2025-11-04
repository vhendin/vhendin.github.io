const width = window.innerWidth;
const height = window.innerHeight;

const svg = d3.select("#world-map")
    .attr("width", width)
    .attr("height", height);

const projection = d3.geoMercator()
    .scale(width / 6.5)
    .translate([width / 2, height / 1.4])
    .center([0, 0]);

const path = d3.geoPath().projection(projection);

const tooltip = d3.select("#tooltip");

d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson").then(function(data) {
    svg.append("g")
        .selectAll("path")
        .data(data.features)
        .join("path")
            .attr("class", "country")
            .attr("fill", "#69b3a2")
            .attr("d", path)
            .attr("stroke", "#fff")
            .attr("stroke-width", 0.5)
            .on("mouseenter", function(event, d) {
                d3.select(this)
                    .attr("fill", "#2d7a5e");
                
                tooltip
                    .style("opacity", 1)
                    .html(d.properties.name)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px");
            })
            .on("mousemove", function(event) {
                tooltip
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px");
            })
            .on("mouseleave", function() {
                d3.select(this)
                    .attr("fill", "#69b3a2");
                
                tooltip
                    .style("opacity", 0);
            });
});

window.addEventListener('resize', function() {
    location.reload();
});
