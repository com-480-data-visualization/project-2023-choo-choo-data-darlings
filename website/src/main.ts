import * as d3 from 'd3';
import { zoom } from 'd3';
import './style.css';

//const SVG_FILES_PATH = "data/svgs.json";
const NETWORK_PATH = "src/network/data/networks/transports/web_data/";
const EDGES_PATH = NETWORK_PATH + "network_edges.csv";
const NODES_PATH = NETWORK_PATH + "network_nodes.csv";

const BUNDLING_MARGIN = 200;
const BUNDLING_RADIUS = 4000;

const BUNDLING_WIDTH = 2000;
const BUNDLING_HEIGHT = 2000;

const CANTON_COLORS: { [x: string]: string } = {
    "ZH": "#c94be1",
    "BE": "#b2e431",
    "LU": "#8547e4",
    "UR": "#6cd44c",
    "SZ": "#5527b6",
    "OW": "#ccc842",
    "NW": "#8270f6",
    "GL": "#57dc84",
    "ZG": "#d63ebf",
    "FR": "#6eae45",
    "SO": "#7557d3",
    "BS": "#db9326",
    "BL": "#5581f2",
    "SH": "#e4441c",
    "AR": "#3d1b7f",
    "AI": "#c85d2c",
    "SG": "#7d6cd5",
    "GR": "#d13f3c",
    "AG": "#7638a1",
    "TG": "#da305f",
    "TI": "#d077dd",
    "VD": "#e85684",
    "GE": "#a93a99",
    "NE": "#d22e75",
    "VS": "#d940a3",
    "JU": "#d53e8d"
}

const BUNDLE_SELECTED_EDGE_COLOR = "#EB0000";

class HierarchicalEdgeBundling {
    private root!: any;
    private edges!: any;

    private width!: number;
    private height!: number;
    private radius!: number;
    private margin!: number;

    constructor() {
        this.loadData().then(() => {
            this.initBundle();
        });
    }

    /**
     * Load the data from the CSV files
     * @returns {Promise<void>}
     * @throws {Error} if the data failed to load
     */
    async loadData(): Promise<void> {

        return new Promise((resolve, reject) => {
            d3.csv(NODES_PATH).then((nodes: any) => {
                d3.csv(EDGES_PATH).then((edges: any) => {

                    // Filter the nodes to only include train stops
                    nodes = nodes.filter(function (node: any) {
                        return node.is_train_stop === "True";
                    });

                    // Filter the links to only include train stops
                    edges = edges.filter(function (edge: { source: any; target: any; }) {
                        return nodes.some(function (node: { id: any; is_train_stop: string; }) {
                            return node.id === edge.source && node.is_train_stop === "True";
                        }) && nodes.some(function (node: { id: any; is_train_stop: string; }) {
                            return node.id === edge.target && node.is_train_stop === "True";
                        });
                    })

                    // Create a hierarchy of the stations
                    const root: 
                        { 
                            name: string; 
                            children: { 
                                name: string; 
                                children: { 
                                    name: string; 
                                    children: { 
                                        name: string; 
                                        canton: string; 
                                        city: string; }[] 
                                    }[] 
                                }[] 
                        } = { name: "Network", children: [] };

                    // Group nodes by canton
                    const cantons = d3.group(nodes, (d: any) => d.canton);

                    cantons.forEach((cantonNodes, cantonName) => {
                        // For each canton, create a child of the root node
                        const cantonChild = { name: cantonName, children: [] as any[] };
                        
                        // Group nodes within the canton by city
                        const cities = d3.group(cantonNodes, d => d.city);

                        cities.forEach((cityNodes, cityName) => {
                            // For each city, create a child of the canton node
                            const cityChild = { name: cityName, children: [] as any[] };

                            // Then create children for each station in the city
                            cityNodes.forEach(node => {
                                cityChild.children.push(
                                    { 
                                        name: node.label,
                                        canton: node.canton,
                                        city: node.city,
                                    }
                                );
                            });

                            // Add the city child to the canton node
                            cantonChild.children.push(cityChild);
                        });

                        // Add the canton child to the root node
                        root.children.push(cantonChild);
                    });

                    // Map station IDs to names
                    const stationNames: { [x: string]: string; } = {};
                    nodes.forEach(function (node: { id: string; label: string; }) {
                        stationNames[node.id] = node.label;
                    });

                    // Map edges to list of stops
                    edges = edges.map(function (edge: any) {
                        return [
                            {
                                name: stationNames[edge.source],
                                id: edge.source
                            },
                            {
                                name: stationNames[edge.target],
                                id: edge.target
                            }
                        ];
                    });

                    this.root = root;
                    this.edges = edges;

                    resolve();
                });
            });
        });
    }

    initBundle() {
        this.width = BUNDLING_WIDTH;
        this.height = BUNDLING_HEIGHT;
        this.radius = BUNDLING_RADIUS;
        this.margin = BUNDLING_MARGIN;

        const scaleFactor = Math.min(this.width, this.height) / (2 * (this.radius + this.margin));
        const translateX = (this.width / 2);
        const translateY = (this.height / 2);


        // Use d3's Hierarchy and Cluster layout to calculate the layout of the visualization
        const cluster = d3.cluster().size([360, this.radius]);
        const bilink = (root: any) => {
            const map = new Map(root.leaves().map((d: any) => [d.data.name, d]));
            for (const d of root.leaves()) {
                d.incoming = [];
                d.outgoing = [];
                const nodeEdges = this.edges.filter((edge: any) => edge[0].name === d.data.name);
                nodeEdges.forEach((edge: any[]) => {
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

        var rootNodes = d3.hierarchy(this.root);
        cluster(rootNodes);
        bilink(rootNodes);

        const zoomBehavior = zoom<SVGSVGElement, unknown>().on("zoom", (event) => this.zoomed(event));

        // Create an SVG element in the #network div
        var svg = d3.select("#hierarchy").append("svg")
            .attr("width", this.width)
            .attr("height", this.height)
            .call(zoomBehavior)
            .append("g")
            .attr("transform", `translate(${translateX},${translateY})scale(${scaleFactor})`);

        // Use d3's Line radial generator to create curved links between the stations
        var line = d3.lineRadial()
            .curve(d3.curveBundle.beta(0.4))
            .radius((d: any) => d.y)
            .angle((d: any) => d.x * Math.PI / 180);

        const link = svg.append("g")
            .attr("stroke", "black")
            .attr("fill", "none")
            .selectAll("path")
            .data(rootNodes.leaves().flatMap((leaf: any) => leaf.outgoing))
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
            .attr("transform", function (d: any) {
                return "rotate(" + (d.x - 90) + ")translate(" + d.y + ")";
            });

        node
            .filter(d => d.children === undefined)
            .append("circle")
            .attr("r", 4.5)
            .attr("fill", function (d) { return CANTON_COLORS[d.data.canton]; });

        node
            .filter(d => d.children === undefined)
            .append("text")
            .attr("dy", ".31em")
            .attr("x", function (d: any) { return d.x < 180 ? 8 : -8; })
            .style("text-anchor", function (d: any) { return d.x < 180 ? "start" : "end"; })
            .attr("transform", function (d: any) { return d.x < 180 ? null : "rotate(180)"; })
            .text(function (d) { return d.data.name; })
            .each(function (d: any) { d.text = this; })
            .attr("fill", function (d) { return CANTON_COLORS[d.data.canton]; })
            .on("mouseover", overed)
            .on("mouseout", outed)
    
        function overed(event, d) {
            link.style("mix-blend-mode", null);
            // Get the font-size of the text element
            var fontSize = parseFloat(d3.select(this).style("font-size"));
            d3.select(this).attr("font-weight", "bold").attr("font-size", fontSize * 1.5);
            d3.selectAll(d.incoming.map(d => d.path)).attr("stroke", BUNDLE_SELECTED_EDGE_COLOR).attr("stroke-width", 10).raise();
            d3.selectAll(d.incoming.map(([d]) => d.text)).attr("fill", BUNDLE_SELECTED_EDGE_COLOR).attr("font-weight", "bold");
            d3.selectAll(d.outgoing.map(d => d.path)).attr("stroke", BUNDLE_SELECTED_EDGE_COLOR).attr("stroke-width", 10).raise();
            d3.selectAll(d.outgoing.map(([, d]) => d.text)).attr("fill", BUNDLE_SELECTED_EDGE_COLOR).attr("font-weight", "bold");
        }

        function outed (event, d) {
            link.style("mix-blend-mode", "multiply");
            var fontSize = parseFloat(d3.select(this).style("font-size"));
            d3.select(this).attr("font-weight", null).attr("font-size", fontSize / 1.5);
            d3.selectAll(d.incoming.map(d => d.path)).attr("stroke", null).attr("stroke-width", null);
            d3.selectAll(d.incoming.map(([d]) => d.text)).attr("fill", CANTON_COLORS[d.data.canton]).attr("font-weight", null);
            d3.selectAll(d.outgoing.map(d => d.path)).attr("stroke", null).attr("stroke-width", null);
            d3.selectAll(d.outgoing.map(([, d]) => d.text)).attr("fill", CANTON_COLORS[d.data.canton]).attr("font-weight", null);
        }
    }

    zoomed(event) {
        const { transform } = event;
        d3.select("#hierarchy svg g").attr("transform", transform);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    new HierarchicalEdgeBundling();
});