function load_map(
    data_file,
    width = 800,
    height = 600,
    scale = 9000,
    center = [8, 47],
    min_zoom_dimension = 100,
    default_zone_color = "grey",
) {
    // Global state variables
    let is_zoomed = false
    let clicked_zone = null

    // Define projection
    const projection = d3.geoMercator()
        .center(center)
        .scale(scale)
        .translate([width / 2, height / 2])

    // Define path generator
    const path_generator = d3.geoPath().projection(projection);

    // Create SVG
    const svg = d3.select("svg")
        .attr("width", 800)
        .attr("height", 600)

    const g = svg.append("g")

    // Load data
    d3.json(data_file).then(function(data) {

        g.selectAll("path")
            .data(data.features)
            .enter()
            .append("path")
            .attr("fill", default_zone_color)
            .attr("d", d3.geoPath()
                .projection(projection)
            )
            .style("stroke", "white")
            .style("stroke-width", 0.2) 

        // On hover of a country, change the color
        .on("mouseover", function(d) {
            onMouseOverZone(this)
        })
        .on("mouseout", function(d) {
            onMouseOutZone(this)
        })
        .on("click", function(d) {
            zoom.filter(() => is_zoomed)
            if (is_zoomed) {
                zoomOut()
            } else {
                zoomOnZone(this)
            }
            is_zoomed = !is_zoomed
            if (!is_zoomed) {
                resetZone(clicked_zone)
            }
            clicked_zone = is_zoomed ? this : null
        })
    });

    // Define zoom and drag behavior
    const zoom = d3.zoom()
        .scaleExtent([1, 8])
        .on("zoom", function({transform}) {
            g.attr("transform", transform);
        });

    svg.call(zoom);

    function onMouseOverZone(zone) {
        if (is_zoomed) { return }

        fadeToColor(zone, "red")

        const zone_center = getZoneCenter(zone)
        addZoneTitle(zone, zone_center[0], zone_center[1])
    }

    function onMouseOutZone(zone) {
        if (is_zoomed) { return }

        fadeToColor(zone, default_zone_color)
        removeZoneTitle()
    }

    function fadeToColor(zone, color) {
        if (is_zoomed) { return }

        d3.select(zone)
            .transition()
            .duration(200)
            .attr("fill", color)
    }

    function getZoneCenter(zone, sample_size = 10) {
        // Necessary computation to handle the data structure
        const zone_coordinates_arrays = d3.select(zone).data()[0].geometry.coordinates
        var coordinates_total_counts_arrays = []
        var coordinates_total_count = 0
        zone_coordinates_arrays.forEach(function(coordinates_array) {
            coordinates_total_counts_arrays.push(coordinates_array.length)
            coordinates_total_count += coordinates_array.length
        })

        // Sample some coordinates and compute the center of the zone
        var center = [0, 0]
        var num_coordinates_sampled = 0
        const step = Math.floor(coordinates_total_count / sample_size)
        for (var i = 0; i < coordinates_total_count; i += step) {
            // Find the coordinates array that contains the i-th coordinate
            var coordinates_array_idx = 0
            var acc_coordinates_count = coordinates_total_counts_arrays[0]
            while (i >= acc_coordinates_count) {
                coordinates_array_idx += 1
                acc_coordinates_count += coordinates_total_counts_arrays[coordinates_array_idx]
            }

            // Find the location of the i-th coordinate in the coordinates array
            var coordinates_idx = i - (acc_coordinates_count - coordinates_total_counts_arrays[coordinates_array_idx])

            // Add the coordinates to the center
            center[0] += zone_coordinates_arrays[coordinates_array_idx][coordinates_idx][0]
            center[1] += zone_coordinates_arrays[coordinates_array_idx][coordinates_idx][1]

            // Increment the number of coordinates sampled
            num_coordinates_sampled += 1
        }

        // Compute the average
        center[0] /= num_coordinates_sampled
        center[1] /= num_coordinates_sampled

        return center
    }

    function addZoneTitle(zone, lat, long) {
        const zone_title = d3.select(zone).data()[0].properties.NAME
        g.append("text")
            .attr("x", projection([lat, long])[0])
            .attr("y", projection([lat, long])[1])
            .attr("text-anchor", "middle")
            .attr("id", "zone_name")
            .text(zone_title)
            .attr("font-family", "sans-serif")
            .attr("font-size", "20px")
            .attr("fill", "black")
            .style("pointer-events", "none")
    }

    function removeZoneTitle() {
        d3.select("#zone_name").remove()
    }

    function zoomOnZone(zone) {
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
        const bottom_left = projection([most_left, most_bottom])
        const bottom_right = projection([most_right, most_bottom])
        const top_left = projection([most_left, most_top])

        let zone_width = Math.abs(bottom_right[0] - bottom_left[0])
        zone_width = Math.max(zone_width, min_zoom_dimension)
        let zone_height = Math.abs(top_left[1] - bottom_left[1])
        zone_height = Math.max(zone_height, min_zoom_dimension)


        const center = [(bottom_left[0] + bottom_right[0]) / 2, (bottom_left[1] + top_left[1]) / 2]

        const scale_factor = Math.min(width / zone_width, height / zone_height) * 0.7

        const translate_x = width / 2 - center[0] * scale_factor
        const translate_y = height / 2 - center[1] * scale_factor

        const transform = d3.zoomIdentity
            .translate(translate_x, translate_y)
            .scale(scale_factor)

        svg.transition()
            .duration(750)
            .call(zoom.transform, transform)
    }

    function zoomOut() {
        svg.transition()
            .duration(750)
            .call(zoom.transform, d3.zoomIdentity)
    }

    function resetZone(zone) {
        console.log("Resetting zone", zone, is_zoomed)
        fadeToColor(zone, default_zone_color)
        removeZoneTitle()
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

// run load_network() when page is loaded
window.onload = function() {
    load_map(data_file=maps[current_map_idx])
}

function change_source() {
    // Delete old map
    d3.select("svg").selectAll("*").remove()
    // Load new map
    current_map_idx = (current_map_idx + 1) % maps.length
    load_map(data_file=maps[current_map_idx])
}
 
document.onkeydown = function(e) {
    if (e.keyCode == 32) {
        change_source()
    }
}
