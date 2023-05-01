import * as d3 from 'd3';
import './style.css';

const SVG_FILES_PATH = "data/svgs.json";
const NETWORK_PATH = "src/network/data/networks/transports/web_data/";
const EDGES_PATH = NETWORK_PATH + "network_edges.csv";
const NODES_PATH = NETWORK_PATH + "network_nodes.csv";

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

    d3.csv(EDGES_PATH).then((edges: any) => {
        d3.csv(NODES_PATH).then((nodes: any) => {
            // Process the data
            var data = {};
            nodes.forEach(function(node) {
                var id = node.id;
                data[id] = { name: node.label, children: [] };
            });
            edges.forEach(function(edge) {
                var source = edge.source;
                var target = edge.target;
                if (data[source] && data[target]) {
                    data[source].children.push(data[target]);
                }
            });

            // Create the hierarchical layout
            var hierarchy = d3.hierarchy(data);
            var treeLayout = d3.tree().size([2*Math.PI, 500]);

            // Compute the positions of the nodes
            treeLayout(hierarchy);

            // Create the links between the nodes
            var links = hierarchy.links();

            // Create the nodes with the station names displayed
            var nodes = hierarchy.descendants();
            var svg = d3.select("#hierarchy").append("svg")
                .attr("width", 1000)
                .attr("height", 1000);
            var g = svg.append("g")
                .attr("transform", "translate(500,500)");
            var node = g.selectAll(".node")
                .data(nodes)
                .enter().append("g")
                .attr("class", "node")
                .attr("transform", function(d) { return "rotate(" + (d.x * 180 / Math.PI - 90) + ")translate(" + d.y + ")"; });
            node.append("circle")
                .attr("r", 4);
            node.append("text")
                .attr("dy", ".31em")
                .attr("text-anchor", function(d) { return d.x < Math.PI ? "start" : "end"; })
                .attr("transform", function(d) { return d.x < Math.PI ? "translate(8)" : "rotate(180)translate(-8)"; })
                .text(function (d) { return d.data.name; });
            
            // Create the links
            var link = g.selectAll(".link")
            .data(links)
            .enter().append("path")
            .attr("class", "link")
            .attr("d", d3.linkRadial()
                .angle(function(d) { return d.x; })
                .radius(function(d) { return d.y; }));
        });
    });
});