import * as d3 from 'd3';
import './style.css';

const SVG_FILES_PATH = "data/svgs.json";
const NETWORK_PATH = "src/network/data/networks/transports/web_data/";
const EDGES_PATH = NETWORK_PATH + "network_edges_test.csv";
const NODES_PATH = NETWORK_PATH + "network_nodes_test.csv";

const width = 954;
const radius = width / 2;

const colorin = "#00f";
const colorout = "#f00";
const colornone = "#ccc";

function overed(event, d) {
    link.style("mix-blend-mode", null);
    d3.select(this).attr("font-weight", "bold");
    d3.selectAll(d.incoming.map(d => d.path)).attr("stroke", colorin).raise();
    d3.selectAll(d.incoming.map(([d]) => d.text)).attr("fill", colorin).attr("font-weight", "bold");
    d3.selectAll(d.outgoing.map(d => d.path)).attr("stroke", colorout).raise();
    d3.selectAll(d.outgoing.map(([, d]) => d.text)).attr("fill", colorout).attr("font-weight", "bold");
}

function outed(event, d) {
    link.style("mix-blend-mode", "multiply");
    d3.select(this).attr("font-weight", null);
    d3.selectAll(d.incoming.map(d => d.path)).attr("stroke", null);
    d3.selectAll(d.incoming.map(([d]) => d.text)).attr("fill", null).attr("font-weight", null);
    d3.selectAll(d.outgoing.map(d => d.path)).attr("stroke", null);
    d3.selectAll(d.outgoing.map(([, d]) => d.text)).attr("fill", null).attr("font-weight", null);
}

document.addEventListener("DOMContentLoaded", () => {

    const colors = ["red", "orange", "yellow", "green", "blue", "indigo", "violet"];
    let colorIndex = 0;

    const app = document.querySelector("body");

    // setInterval(() => {
    //     colorIndex = (colorIndex + 1) % colors.length;
    //     app!.style.transition = "background-color 2s ease";
    //     app!.style.backgroundColor = colors[colorIndex];
    // }, 1000);

    // d3.json(SVG_FILES_PATH).then((data: any) => {
    //     const svgFiles = data.files;
    //     const banner = document.querySelector(".banner");
    //     svgFiles.forEach((svgFile: any) => {
    //         // Append the SVG to the banner
    //         d3.xml(svgFile).then((data: any) => {
    //             banner!.appendChild(data.documentElement);
    //         })
    //     });
    // });
    d3.csv(NODES_PATH).then((nodes: any) => {
        d3.csv(EDGES_PATH).then((edges: any) => {
            // Filter the stations to only include train stops
            var stations = nodes.filter(function (station) {
                return station.is_train_stop === "True";
            });

            // Map the station IDs to names
            var stationNames = {};
            stations.forEach(function (station) {
                stationNames[station.id] = station.label;
            });

            // Create a hierarchy of the stations
            var root = { name: "Network", children: [] };
            stations.forEach(function (station) {
                root.children.push({ name: station.label });
            });

            // Filter the links to only include train stations
            var links = edges.filter(function (link) {
                return stations.some(function (station) {
                    return station.id === link.source && station.is_train_stop === "True";
                }) && stations.some(function (station) {
                    return station.id === link.target && station.is_train_stop === "True";
                });
            });

            // Create an array of link objects
            var linkArray = links.map(function (link) {
                return {
                    source: stationNames[link.source],
                    target: stationNames[link.target]
                };
            });

            // Use d3's Hierarchy and Cluster layout to calculate the layout of the visualization
            var cluster = d3.cluster()
                .size([360, 500]);
            var rootNodes = d3.hierarchy(root);
            cluster(rootNodes);
            
            // Create an SVG element in the #network div
            var svg = d3.select("#hierarchy").append("svg")
                .attr("width", 10000)
                .attr("height", 10000)
                .append("g")
                .attr("transform", "translate(500,500)");

            // Use d3's Line radial generator to create curved links between the stations
            var link = d3.linkRadial()
                .angle(function (d) { return d.x / 180 * Math.PI; })
                .radius(function (d) { return d.y; });
            
            var linkPath = svg.selectAll(".link")
                .data(linkArray)
                .enter().append("path")
                .attr("class", "link")
                .attr("d", function (d) {
                    var source = rootNodes.descendants().find(function (node) {
                        return node.data.name === d.source;
                    });
                    var target = rootNodes.descendants().find(function (node) {
                        return node.data.name === d.target;
                    });
                    return link({ source: source, target: target });
                });

            // Use d3's Circle generator to create circles for each station
            var node = svg.selectAll(".node")
                .data(rootNodes.descendants())
                .enter().append("g")
                .attr("class", "node")
                .attr("transform", function (d) {
                    return "rotate(" + (d.x - 90) + ")translate(" + d.y + ")";
                });
            node.append("circle")
                .attr("r", 4.5);
            node.append("text")
                .attr("dy", ".31em")
                .attr("x", function (d) { return d.x < 180 ? 8 : -8; })
                .style("text-anchor", function (d) { return d.x < 180 ? "start" : "end"; })
                .attr("transform", function (d) { return d.x < 180 ? null : "rotate(180)"; })
                .text(function (d) { return d.data.name; });
        });
    });
});