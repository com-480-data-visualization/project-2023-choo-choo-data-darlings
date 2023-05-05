import * as d3 from 'd3';
import { zoom } from 'd3';

const NETWORK_PATH = "src/network/data/networks/transports/web_data/";
const EDGES_PATH = NETWORK_PATH + "network_edges.csv";
const NODES_PATH = NETWORK_PATH + "network_nodes.csv";

const CANTONS_SELECTION_ID = "select_cantons";
const BUNDLING_ELEMENT_ID = 'hierarchy'

const BUNDLING_MARGIN = 200;
const BUNDLING_RADIUS_SCALE = 20;

const BUNDLING_WIDTH = 800;
const BUNDLING_HEIGHT = 800;

const MIN_WEIGHT_SCALE = 1;
const MAX_WEIGHT_SCALE = 10;

const MIN_ZOOM_SCALE = 0.1;
const MAX_ZOOM_SCALE = 10;

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

const DEFAULT_SELECTED_CANTONS =['VD']

const BUNDLE_SELECTED_EDGE_COLOR = "#EB0000";
const BUNDLE_INCREASE_EDGE_WIDTH = 5;

export class HierarchicalEdgeBundling {
    private root!: any;
    private edges!: any;
    private nodes!: any;

    private selectedEdges!: any;
    private selectedNodes!: any;

    private width: number = BUNDLING_WIDTH;
    private height: number = BUNDLING_HEIGHT;
    private radius!: number;
    private margin: number = BUNDLING_MARGIN;

    private weightScale!: any;

    private defaultZoomState: any = d3.zoomIdentity;

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

                    // Degine the weight scale
                    const minWeight = d3.min(
                        edges, 
                        function (edge: { weight: string; }) { return parseInt(edge.weight); }
                    ) ?? 0;
                    const maxWeight = d3.max(
                        edges,
                        function (edge: { weight: string; }) { return parseInt(edge.weight); }
                    ) ?? 0;

                    this.weightScale = d3.scaleLinear()
                        .domain([minWeight, maxWeight])
                        .range([MIN_WEIGHT_SCALE, MAX_WEIGHT_SCALE]);

                    // Add selections to the cantons selection
                    const cantonsSelection = document.getElementById(CANTONS_SELECTION_ID);
                    if (cantonsSelection) {
                        // Fill the cantons selection with the cantons
                        Object.keys(CANTON_COLORS).forEach(canton => {
                            const option = document.createElement("option");
                            if (DEFAULT_SELECTED_CANTONS.includes(canton)) {
                                option.selected = true;
                            }
                            option.value = canton;
                            option.text = canton;
                            cantonsSelection.appendChild(option);
                        });

                        // Set event listener for cantons selection
                        cantonsSelection.addEventListener("change", () => {
                            const cantons = (cantonsSelection as HTMLSelectElement).selectedOptions;
                            const cantonsList = Array.from(cantons).map(canton => canton.value);
                            
                            this.filterByCantons(cantonsList, true);
                        });
                    }

                    this.nodes = nodes;
                    this.edges = edges;

                    // Filter the selected edges and nodes by selected cantons
                    if (cantonsSelection) {
                        const cantons = (cantonsSelection as HTMLSelectElement).selectedOptions;
                        const cantonsList = Array.from(cantons).map(canton => canton.value);

                        this.filterByCantons(cantonsList, false)
                    } else {
                        this.selectedEdges = edges;
                        this.selectedNodes = nodes;
                    }

                    resolve();
                });
            });
        });
    }

    initBundle() {
        // Update useful variables before creating the bundle
        this.radius = BUNDLING_RADIUS_SCALE * this.selectedNodes.length / (2 * Math.PI);

        const scaleFactor = Math.min(this.width, this.height) / (2 * (this.radius + this.margin));
        const translateX = (this.width / 2);
        const translateY = (this.height / 2);

        this.defaultZoomState = d3.zoomIdentity
            .translate(translateX, translateY)
            .scale(scaleFactor);

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
                            city: string;
                        }[] 
                    }[] 
                }[] 
            } = { name: "Network", children: [] };

        // Group nodes by canton
        const cantons = d3.group(this.selectedNodes, (d: any) => d.canton);

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
        this.selectedNodes.forEach(function (node: { id: string; label: string; }) {
            stationNames[node.id] = node.label;
        });

        // Map edges to list of stops
        this.selectedEdges = this.selectedEdges.map(function (edge: any) {
            return [
                {
                    name: stationNames[edge.source],
                    id: edge.source,
                    weight: edge.weight
                },
                {
                    name: stationNames[edge.target],
                    id: edge.target,
                    weight: edge.weight
                }
            ];
        });


        // Use d3's Hierarchy and Cluster layout to calculate the layout of the visualization
        const cluster = d3.cluster().size([360, this.radius]);
        const bilink = (root: any) => {
            const map = new Map(root.leaves().map((d: any) => [d.data.name, d]));
            for (const d of root.leaves()) {
                d.incoming = [];
                d.outgoing = [];
                const nodeEdges = this.selectedEdges.filter((edge: any) => edge[0].name === d.data.name);
                nodeEdges.forEach((edge: any[]) => {
                    const targetNode = map.get(edge[1].name);
                    if (targetNode) d.outgoing.push({ nodes: [d, targetNode], weight: edge[0].weight });
                });
            }
            for (const d of root.leaves()) {
                for (const o of d.outgoing) {
                    o.nodes[1].incoming.push(o);
                }
            }
            return root;
        }

        this.root = root;
        const rootNodes = d3.hierarchy(this.root);
        cluster(rootNodes);
        bilink(rootNodes);

        const zoomBehavior = zoom<SVGSVGElement, unknown>()
            .scaleExtent([MIN_ZOOM_SCALE, MAX_ZOOM_SCALE])
            .on("zoom", (event) => this.zoomed(event));

        // Create an SVG element in the #network div
        const svg = d3.select(`#${BUNDLING_ELEMENT_ID}`).append("svg")
            .attr("width", this.width)
            .attr("height", this.height)
            .call(zoomBehavior)

        const g = svg.append("g")
            .attr("transform", this.defaultZoomState.toString());

        // Use d3's Line radial generator to create curved links between the stations
        const line = d3.lineRadial()
            .curve(d3.curveBundle.beta(0.5))
            .radius((d: any) => d.y)
            .angle((d: any) => d.x * Math.PI / 180);

        const link = g.append("g")
            .attr("stroke", "black")
            .attr("fill", "none")
            .selectAll("path")
            .data(rootNodes.leaves().flatMap((leaf: any) => leaf.outgoing))
            .join("path")
            .style("mix-blend-mode", "multiply")
            .attr("stroke-width", d => this.weightScale(d.weight))
            .attr("d", (d) => line(d.nodes[0].path(d.nodes[1])))
            .each(function(d) {
                d.path = this;
            });

        // Use d3's Circle generator to create circles for each station
        const node = g.selectAll(".node")
            .data(rootNodes.descendants())
            .enter()
            .append("g")
            .filter(d => d.children === undefined)
            .attr("class", "node")
            .attr("transform", function (d: any) {
                return "rotate(" + (d.x - 90) + ")translate(" + d.y + ")";
            })

        node
            .append("circle")
            .attr("r", 4.5)
            .attr("fill", function (d) { return CANTON_COLORS[d.data.canton]; });

        node
            .append("text")
            .attr("dy", ".31em")
            .attr("x", function (d: any) { return d.x < 180 ? 8 : -8; })
            .style("text-anchor", function (d: any) { return d.x < 180 ? "start" : "end"; })
            .attr("transform", function (d: any) { return d.x < 180 ? null : "rotate(180)"; })
            .text(function (d) { return d.data.name; })
            .each(function (d: any) { d.text = this; })
            .attr("fill", function (d) { return CANTON_COLORS[d.data.canton]; })
            .on("mouseover", overed)
            .on("mouseout", outed);

        function overed(event: any, d: any) {
            link.style("mix-blend-mode", null);
            // Get the font-size of the text element
            const fontSize = parseFloat(d3.select(this).style("font-size"));
            d3.select(this).attr("font-weight", "bold").attr("font-size", fontSize * 1.5);
            d3.selectAll(d.incoming.map((d: any) => d.nodes[0].text)).attr("fill", BUNDLE_SELECTED_EDGE_COLOR).attr("font-weight", "bold");
            d3.selectAll(d.outgoing.map((d: any) => d.nodes[1].text)).attr("fill", BUNDLE_SELECTED_EDGE_COLOR).attr("font-weight", "bold");
            d3.selectAll(d.incoming.map((d: any) => d.path)).each(function() {
                const strokeWidth = parseFloat(d3.select(this).style("stroke-width"));
                d3.select(this).attr("stroke", BUNDLE_SELECTED_EDGE_COLOR).attr("stroke-width", strokeWidth + BUNDLE_INCREASE_EDGE_WIDTH);
            });
            d3.selectAll(d.outgoing.map((d: any) => d.path)).each(function() {
                const strokeWidth = parseFloat(d3.select(this).style("stroke-width"));
                d3.select(this).attr("stroke", BUNDLE_SELECTED_EDGE_COLOR).attr("stroke-width", strokeWidth + BUNDLE_INCREASE_EDGE_WIDTH);
            });
        }

        function outed (event: any, d: any) {
            link.style("mix-blend-mode", "multiply");
            const fontSize = parseFloat(d3.select(this).style("font-size"));
            d3.select(this).attr("font-weight", null).attr("font-size", fontSize / 1.5);
            d3.selectAll(d.incoming.map((d: any) => d.nodes[0].text)).attr("fill", function (d: any) { return CANTON_COLORS[d.data.canton]; }).attr("font-weight", null);
            d3.selectAll(d.outgoing.map((d: any) => d.nodes[1].text)).attr("fill", function (d: any) { return CANTON_COLORS[d.data.canton]; }).attr("font-weight", null);
            d3.selectAll(d.incoming.map((d: any) => d.path)).each(function() {
                const strokeWidth = parseFloat(d3.select(this).style("stroke-width"));
                d3.select(this).attr("stroke", "black").attr("stroke-width", strokeWidth - BUNDLE_INCREASE_EDGE_WIDTH);
            });
            d3.selectAll(d.outgoing.map((d: any) => d.path)).each(function() {
                const strokeWidth = parseFloat(d3.select(this).style("stroke-width"));
                d3.select(this).attr("stroke", "black").attr("stroke-width", strokeWidth - BUNDLE_INCREASE_EDGE_WIDTH);
            });
        }
    }

    filterByCantons(cantons: string[], initBundle = false) {
        // Filter nodes based on selected cantons
        this.selectedNodes = this.nodes.filter((node: any) => cantons.includes(node.canton));
    
        // Filter edges based on selected cantons
        this.selectedEdges = this.edges.filter((edge: any) => {
            return this.selectedNodes.some((node: any) => node.id === edge.source) &&
                this.selectedNodes.some((node: any) => node.id === edge.target);
        });
    
        // Remove the old bundle and create a new one
        d3.select("#hierarchy svg").remove();

        if (initBundle) {
            this.initBundle();
        }
    }

    zoomed(event: any) {
        const newTransform: any = d3.zoomIdentity
            .translate(event.transform.x, event.transform.y)
            .scale(event.transform.k)
            .translate(this.defaultZoomState.x, this.defaultZoomState.y)
            .scale(this.defaultZoomState.k);
      
        d3.select("#hierarchy svg g").attr("transform", newTransform);
      }
}