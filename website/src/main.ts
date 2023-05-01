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

const tree = d3.cluster()
    .size([2 * Math.PI, radius - 100])

const line = d3.lineRadial()
    .curve(d3.curveBundle.beta(0.85))
    .radius(d => d.y)
    .angle(d => d.x);

function bilink(root) {
    const map = new Map(root.leaves().map(d => [id(d), d]));
    console.log(map);
    for (const d of root.leaves()) {
        d.outgoing = d.data.children.map(i => [d, map.get(i)]);
        console.log(d.outgoing);
        break;
    }
    throw new Error();
    d.incoming = [], d.outgoing = d.data.map(i => [d, map.get(i)]);
    for (const d of root.leaves()) for (const o of d.outgoing) o[1].incoming.push(o);
    return root;
}

function id(node) {
    return `${node.parent ? id(node.parent) + "." : ""}${node.data.name}`;
}

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

    d3.csv(EDGES_PATH).then((edges: any) => {
        d3.csv(NODES_PATH).then((nodes: any) => {
            // Process the data
            var data = {};
            nodes.forEach(function (node) {
                var id = node.id;
                data[id] = { name: node.label, children: [] };
            });
            edges.forEach(function (edge) {
                var source = edge.source;
                var target = edge.target;
                if (data[source] && data[target]) {
                    data[source].children.push(data[target]);
                }
            });
            console.log(d3.hierarchy(data));
            throw new Error();
            const root = tree(bilink(d3.hierarchy(data)
                .sort((a, b) => d3.ascending(a.data.name, b.data.name))
            ));

            const svg = d3.select("#hierarchy").append("svg")
                .attr("viewBox", [-width / 2, -width / 2, width, width]);

            const node = svg.append("g")
                .attr("font-family", "sans-serif")
                .attr("font-size", 10)
                .selectAll("g")
                .data(root.leaves())
                .join("g")
                .attr("transform", d => `rotate(${d.x * 180 / Math.PI - 90}) translate(${d.y},0)`)
                .append("text")
                .attr("dy", "0.31em")
                .attr("x", d => d.x < Math.PI ? 6 : -6)
                .attr("text-anchor", d => d.x < Math.PI ? "start" : "end")
                .attr("transform", d => d.x >= Math.PI ? "rotate(180)" : null)
                .text(d => d.data.name)
                .each(function (d) { d.text = this; })
                .on("mouseover", overed)
                .on("mouseout", outed)
                .call(text => text.append("title").text(d => {
                    `${id(d)}`
                }));
            
            root.leaves().flatMap(leaf => leaf.outgoing).forEach(element => {
                console.log(element);
                throw new Error("Method not implemented.");
            });
            
            const link = svg.append("g")
                .attr("stroke", colornone)
                .attr("fill", "none")
                .selectAll("path")
                .data(root.leaves().flatMap(leaf => leaf.outgoing))
                .join("path")
                    .style("mix-blend-mode", "multiply")
                    .attr("d", ([i, o]) => line(i.path(o)))
                    .each(function (d) { d.path = this; });

            return svg.nodes();
        });
    });
});