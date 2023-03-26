class SwissMap {
    constructor(
        map_file,
        scale = 9000,
        center = [8, 47],
        min_zoom_dimension = 100,
        default_zone_color = "grey",
    ) {
        this.map_file = map_file;

        // Basic render settings
        this.scale = scale;
        this.center = center;
        this.min_zoom_dimension = min_zoom_dimension;
        this.default_zone_color = default_zone_color;
        
        // State variables
        this.is_zoomed = false;
        this.clicked_zone = null;

        // Initialize map
        this.svg = this.init_svg();
        this.g = this.init_g();
        this.projection = this.init_projection();
        this.zoom = this.init_zoom();
    }

    init_svg() {
        const svg = d3.select("svg");
        return svg;
    }

    init_projection() {
        const projection = d3.geoMercator()
            .center(this.center)
            .scale(this.scale)
            .translate([this.svg_width / 2, this.svg_height / 2]);
        return projection;
    }

    init_g() {
        const g = this.svg.append("g");
        return g;
    }

    init_zoom() {
        const zoom = d3.zoom()
        .scaleExtent([1, 8])
        .on("zoom", ({transform}) => {
            this.g.attr("transform", transform);
        });

        this.svg.call(zoom);

        return zoom;
    }

    get svg_width() {
        const svgNode = this.svg.node();
        return svgNode.getBoundingClientRect().width;
    }

    get svg_height() {
        const svgNode = this.svg.node();
        return svgNode.getBoundingClientRect().height;
    }

    get path_generator() {
        return d3.geoPath().projection(this.projection);
    }

    load_data() {
        d3.json(this.map_file).then(data => {
            this.g.selectAll("path")
                .data(data.features)
                .enter()
                .append("path")
                .attr("fill", this.default_zone_color)
                .attr("d", d3.geoPath()
                    .projection(this.projection)
                )
                .style("stroke", "white")
                .style("stroke-width", 0.2) 
                .on("mouseover", d => {
                    this.onMouseOverZone(d.target)
                })
                .on("mouseout", d => {
                    this.onMouseOutZone(d.target)
                })
                .on("click", d => {
                    if (this.is_zoomed) {
                        this.zoomOut()
                    } else {
                        this.zoomOnZone(d.target)
                    }
                    this.is_zoomed = !this.is_zoomed
                    this.zoom.filter(() => !this.is_zoomed) 
                    if (!this.is_zoomed) {
                        this.resetZone(this.clicked_zone)
                    }
                    this.clicked_zone = this.is_zoomed ? d.target : null
                });
    
            const moudon_coordinates = [6.798421825543208, 46.66993202039939]
            this.g.append("circle")
                .attr("cx", this.projection(moudon_coordinates)[0])
                .attr("cy", this.projection(moudon_coordinates)[1])
                .attr("r", 2)
                .attr("fill", "black")
                .style("pointer-events", "none")
            // Add moudon text
            this.g.append("text")
                .attr("x", this.projection(moudon_coordinates)[0])
                .attr("y", this.projection(moudon_coordinates)[1])
                .attr("dy", -3)
                .attr("text-anchor", "middle")
                .text("Moudon")
                .attr("font-family", "sans-serif")
                .attr("font-size", "5px")
                .attr("fill", "black")
                .style("pointer-events", "none")
        });
    }

    update_data(new_map_file) {
        this.map_file = new_map_file;
        this.g.selectAll("*").remove();
        this.load_data();
    }

    onMouseOverZone(zone) {
        if (this.is_zoomed) { return }

        this.fadeToColor(zone, "red")

        const result = this.getZoneCenter(zone)
        const zone_center = result[0]
        this.addZoneTitle(zone, zone_center[0], zone_center[1])
    }

    onMouseOutZone(zone) {
        if (this.is_zoomed) { return }

        this.fadeToColor(zone, this.default_zone_color)
        this.removeZoneTitle()
    }

    fadeToColor(zone, color) {
        if (this.is_zoomed) { return }

        d3.select(zone)
            .transition()
            .duration(200)
            .attr("fill", color)
    }

    getZoneCenter(zone, project, return_borders) {
        const zone_coordinates_arrays = d3.select(zone).data()[0].geometry.coordinates
        const most_bottoms = []
        const most_lefts = []
        const most_rights = []
        const most_tops = []

        zone_coordinates_arrays.forEach(function(coordinates_array) {
            most_bottoms.push(d3.min(coordinates_array, function(d) { return d[1] }))
            most_lefts.push(d3.min(coordinates_array, function(d) { return d[0] }))
            most_rights.push(d3.max(coordinates_array, function(d) { return d[0] }))
            most_tops.push(d3.max(coordinates_array, function(d) { return d[1] }))
        })

        const most_bottom = d3.min(most_bottoms)
        const most_left = d3.min(most_lefts)
        const most_right = d3.max(most_rights)
        const most_top = d3.max(most_tops)

        // Place points at locations
        let bottom_left = [most_left, most_bottom]
        let bottom_right = [most_right, most_bottom]
        let top_left = [most_left, most_top]
        if (project) {
            bottom_left = this.projection(bottom_left)
            bottom_right = this.projection(bottom_right)
            top_left = this.projection(top_left)
        }

        const center = [(bottom_left[0] + bottom_right[0]) / 2, (bottom_left[1] + top_left[1]) / 2]

        return [center, return_borders ? [bottom_left, bottom_right, top_left] : null]
    }

    addZoneTitle(zone, lat, long) {
        const zone_title = d3.select(zone).data()[0].properties.NAME
        this.g.append("text")
            .attr("x", this.projection([lat, long])[0])
            .attr("y", this.projection([lat, long])[1])
            .attr("text-anchor", "middle")
            .attr("id", "zone_name")
            .text(zone_title)
            .attr("font-family", "sans-serif")
            .attr("font-size", "20px")
            .attr("fill", "black")
            .style("pointer-events", "none")
    }

    removeZoneTitle() {
        d3.select("#zone_name").remove()
    }

    zoomOnZone(zone) {
        const result = this.getZoneCenter(zone, true, true)
        const center = result[0]
        const bottom_left = result[1][0]
        const bottom_right = result[1][1]
        const top_left = result[1][2]

        let zone_width = Math.abs(bottom_right[0] - bottom_left[0])
        zone_width = Math.max(zone_width, this.min_zoom_dimension)
        let zone_height = Math.abs(top_left[1] - bottom_left[1])
        zone_height = Math.max(zone_height, this.min_zoom_dimension)

        const scale_factor = Math.min(this.svg_width / zone_width, this.svg_height / zone_height) * 0.7

        const translate_x = this.svg_width / 2 - center[0] * scale_factor
        const translate_y = this.svg_height / 2 - center[1] * scale_factor

        const transform = d3.zoomIdentity
            .translate(translate_x, translate_y)
            .scale(scale_factor)

            this.svg.transition()
            .duration(750)
            .call(this.zoom.transform, transform)
    }

    zoomOut() {
        this.svg.transition()
            .duration(750)
            .call(this.zoom.transform, d3.zoomIdentity)
    }

    resetZone(zone) {
        this.fadeToColor(zone, this.default_zone_color)
        this.removeZoneTitle()
    }
}

// Dataset from this link: https://labs.karavia.ch/swiss-boundaries-geojson/
year = '2020'
swiss_districts_data = "data/" + year + "/swissBOUNDARIES3D_1_3_TLM_BEZIRKSGEBIET.geojson"
swiss_territory_data = "data/" + year + "/swissBOUNDARIES3D_1_3_TLM_HOHEITSGEBIET.geojson"
swiss_canton_data = "data/" + year + "/swissBOUNDARIES3D_1_3_TLM_KANTONSGEBIET.geojson"
swiss_country_data = "data/" + year + "/swissBOUNDARIES3D_1_3_TLM_LANDESGEBIET.geojson"

current_map_idx = 0
maps = [swiss_districts_data, swiss_territory_data, swiss_canton_data, swiss_country_data]

let map = null

// run load_network() when page is loaded
window.onload = function() {
    map = new SwissMap(maps[current_map_idx])
    map.load_data()
}

function change_source() {
    // Delete old map
    //d3.select("svg").selectAll("*").remove()
    // Load new map
    current_map_idx = (current_map_idx + 1) % maps.length
    map.update_data(maps[current_map_idx])
}
 
document.onkeydown = function(e) {
    if (e.keyCode == 32) {
        change_source()
    }
}
