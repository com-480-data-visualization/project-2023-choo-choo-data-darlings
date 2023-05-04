import * as d3 from 'd3';
import './style.css';

const SVG_FILES_PATH = "data/svgs.json";
const NETWORK_PATH = "src/network/data/networks/transports/web_data/";
const EDGES_PATH = NETWORK_PATH + "network_edges.csv";
const NODES_PATH = NETWORK_PATH + "network_nodes.csv";

const width = 954;
const radius = width / 2;

const colorin = "#00f";
const colorout = "#f00";
const colornone = "#ccc";

const CIRCLE_MARGIN = 200
const CIRCLE_RADIUS = 2000;

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
                return station.is_train_stop === "True" && (station.canton === 'VD' || station.canton === 'SZ')
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
                return [
                    {
                        name: stationNames[link.source],
                        id: link.source
                    },
                    {
                        name: stationNames[link.target],
                        id: link.target
                    }
                ];
            });

            // Use d3's Hierarchy and Cluster layout to calculate the layout of the visualization
            var cluster = d3.cluster()
                .size([360, CIRCLE_RADIUS]);

            function bilink(root) {
                const map = new Map(root.leaves().map(d => [d.data.name, d]));
                for (const d of root.leaves()) {
                    d.incoming = [];
                    d.outgoing = [];
                    const nodeEdges = linkArray.filter(edge => edge[0].name === d.data.name);
                    nodeEdges.forEach(edge => {
                        const targetNode = map.get(edge[1].name);
                        if (targetNode) d.outgoing.push([d, targetNode]);
                    });
                }
                for (const d of root.leaves()) {
                    for (const o of d.outgoing) {
                        o[1].incoming.push(o);
                    }
                }
                return root;
            }
            var rootNodes = d3.hierarchy(root);
            cluster(rootNodes);
            bilink(rootNodes);
            
            // Create an SVG element in the #network div
            var svg = d3.select("#hierarchy").append("svg")
                .attr("width", 2 * CIRCLE_RADIUS + 2 * CIRCLE_MARGIN)
                .attr("height", 2 * CIRCLE_RADIUS + 2 * CIRCLE_MARGIN)
                .append("g")
                .attr("transform", `translate(${CIRCLE_RADIUS + CIRCLE_MARGIN},${CIRCLE_RADIUS + CIRCLE_MARGIN})`);

            // Use d3's Line radial generator to create curved links between the stations
            var line = d3.lineRadial()
                .curve(d3.curveBundle.beta(0.2))
                .radius(d => d.y)
                .angle(d => d.x * Math.PI / 180);

            const link = svg.append("g")
                .attr("stroke", "black")
                .attr("fill", "none")
                .selectAll("path")
                .data(rootNodes.leaves().flatMap(leaf => leaf.outgoing))
                .join("path")
                .style("mix-blend-mode", "multiply")
                .attr("d", ([i, o]) => line(i.path(o)))
                .each(function(d) {
                    d.path = this;
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