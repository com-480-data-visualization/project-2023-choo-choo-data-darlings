//@ts-nocheck
import * as d3 from 'd3';
import { zoom } from 'd3';
import * as d3Tip from 'd3-tip';

const NETWORK_PATH = 'data/network/networks/transports/web_data/';
const EDGES_PATH = `${NETWORK_PATH}network_edges.csv`;
const NODES_PATH = `${NETWORK_PATH}network_nodes.csv`;

const BUNDLING_ELEMENT_ID = 'hierarchy-plot';

const BUNDLING_MARGIN = 200;
const BUNDLING_RADIUS_SCALE = 20;

const BUNDLING_NODE_FONT_SIZE_SCALE = 1.5;

const MIN_WEIGHT_SCALE = 1;
const MAX_WEIGHT_SCALE = 10;

const MIN_ZOOM_SCALE = 0.1;
const MAX_ZOOM_SCALE = 10;

const CANTON_COLORS: { [x: string]: string } = {
    'ZH': '#a48641',
    'BE': '#5d8ad4',
    'LU': '#b25437',
    'UR': '#9fac3b',
    'SZ': '#c758b0',
    'OW': '#543584',
    'NW': '#48be9a',
    'GL': '#842860',
    'ZG': '#6672e1',
    'FR': '#b24555',
    'SO': '#d33d82',
    'BS': '#cd9338',
    'BL': '#66be3f',
    'SH': '#e23d5e',
    'AR': '#d777a8',
    'AI': '#df36ad',
    'SG': '#7ed532',
    'GR': '#5f8e3f',
    'AG': '#b582cf',
    'TG': '#ae67d3',
    'TI': '#c943cd',
    'VD': '#5bc776',
    'GE': '#984ee8',
    'NE': '#522db0',
    'VS': '#d94c28',
    'JU': '#deb421'
}

const BUNDLE_SELECTED_COLOR = '#EB0000';
const BUNDLE_INCREASE_EDGE_WIDTH = 5;

const TRANSITION_DURATION = 750;

export class HierarchicalEdgeBundling {
    private root!: any;
    private edges!: any;
    private nodes!: any;
    private selectedEdges!: any;
    private selectedNodes!: any;

    private width!: number;
    private height!: number;
    private radius!: number;
    private margin: number = BUNDLING_MARGIN;

    private svg!: any;
    private g!: any;
    private zoomBehavior!: any;

    private weightScale!: any;
    private defaultZoomState: any = d3.zoomIdentity;

    constructor() {
        this.loadData().then(() => {
            this.initDimensions();
            this.initStaticElements();
            this.updateBundle();
            new MiniMap(this);// Create the minimap that is linked to this plot
        });
    }

    /**
     * Load the data from the CSV files
     * @returns {Promise<void>}
     * @throws {Error} if the data failed to load
     */
    async loadData(): Promise<void> {
        return new Promise((resolve) => {
            Promise.all([
                d3.csv(NODES_PATH),
                d3.csv(EDGES_PATH)
            ]).then(([nodes, edges]: any[]) => {
                // Filter the nodes to only include train stops
                nodes = nodes.filter(function (node: any) {
                    return node.is_train_stop === 'True';
                });

                // Filter the links to only include train stops
                edges = edges.filter(function (edge: { source: any; target: any; }) {
                    return nodes.some(function (node: { id: any; is_train_stop: string; }) {
                        return node.id === edge.source && node.is_train_stop === 'True';
                    }) && nodes.some(function (node: { id: any; is_train_stop: string; }) {
                        return node.id === edge.target && node.is_train_stop === 'True';
                    });
                })

                // Define the edges weight scale
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

                // Define nodes and edges, current nodes and edges is empty
                this.nodes = nodes;
                this.edges = edges;
                this.filterByCantons([], false)

                resolve();
            });
        });
    }

    /**
     * Initializes the dimensions of the circle packing visualization.
     * @returns {void}
     */
    initDimensions(): void {
        const parentElement = document.getElementById(BUNDLING_ELEMENT_ID);
        if (parentElement) {
            const dimensions = Math.min(parentElement.clientWidth, parentElement.clientHeight);
            this.width = dimensions;
            this.height = dimensions;
        }
    }

    /**
     * Initialize the static elements of the plot
     * @returns {void}
     */
    initStaticElements(): void {
        // Define zoom behavior
        this.zoomBehavior = zoom<SVGSVGElement, unknown>()
            .scaleExtent([MIN_ZOOM_SCALE, MAX_ZOOM_SCALE])
            .on('zoom', (event) => this.zoomed(event));

        // Define SVG element
        this.svg = d3.select(`#${BUNDLING_ELEMENT_ID}`).append('svg')
            .attr('width', this.width)
            .attr('height', this.height)
            .call(this.zoomBehavior)

        // Define the group element for the nodes and edges
        this.g = this.svg.append('g');

        // Create the links group
        this.g.append('g').attr('class', 'links');

        // Create the nodes group
        this.g.append('g').attr('class', 'nodes');
    }

    /**
     * Build the hierarchy of the nodes and edges
     * @returns {void}
     */
    buildRoot(): void {
        // Create a hierarchy of the stations
        const root: any = { name: 'Network', children: [] };

        // Group nodes by canton
        const cantons: d3.InternMap<any, any[]> = d3.group(this.selectedNodes, (d: any) => d.canton);

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
                            id: node.id,
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

        this.root = d3.hierarchy(root);

        // Use d3's Hierarchy and cluster layout to calculate the layout of the visualization
        const cluster = d3.cluster().size([360, this.radius]);
        cluster(this.root);

        const map = new Map(this.root.leaves().map((d: any) => [d.data.name, d]));
        for (const d of this.root.leaves()) {
            d.incoming = [];
            d.outgoing = [];
            const nodeEdges = this.selectedEdges.filter((edge: any) => edge[0].name === d.data.name);
            nodeEdges.forEach((edge: any[]) => {
                const targetNode = map.get(edge[1].name);
                if (targetNode) d.outgoing.push({ nodes: [d, targetNode], weight: edge[0].weight });
            });
        }
        for (const d of this.root.leaves()) {
            for (const o of d.outgoing) {
                o.nodes[1].incoming.push(o);
            }
        }
    }

    /**
     * Update the bundle with the current selected nodes and edges
     * @returns {void}
     */
    updateBundle(): void {
        // Update scale and translation before creating the bundle
        this.radius = BUNDLING_RADIUS_SCALE * this.selectedNodes.length / (2 * Math.PI);

        const scaleFactor = Math.min(this.width, this.height) / (2 * (this.radius + this.margin));
        const translateX = (this.width / 2);
        const translateY = (this.height / 2);

        this.defaultZoomState = d3.zoomIdentity
            .translate(translateX, translateY)
            .scale(scaleFactor);

        //Update zoomBehavior internal state
        this.zoomBehavior.transform(
            this.svg.transition().duration(TRANSITION_DURATION), 
            this.defaultZoomState
        );

        // Smooth transition
        this.g
            .transition()
            .duration(TRANSITION_DURATION)
            .attr('transform', this.defaultZoomState.toString());

        // Create hierarchy
        this.buildRoot();

        // Nodes
        this.g
            .select('g.nodes')
            .selectAll('g.node')
            .data(
                this.root.descendants().filter((d: any) => d.children === undefined && d.parent !== null), 
                (d: any) => `${d.data.id}`
            ).join(
                (enter: any) => {
                    // This block handles the enter selection
                    const newNode = enter
                        .append('g')
                        .filter((d: any) => d.children === undefined && d.parent !== null) // Remove hierarchy nodes
                        .attr('class', 'node')
                        .attr('transform', 'rotate(0)translate(0)') // Initial position at the center

                    newNode
                        .append('circle')
                        .attr('r', 4.5)
                        .attr('fill', function (d: any) { return CANTON_COLORS[d.data.canton]; });

                    newNode
                        .append('text')
                        .attr('dy', '.31em')
                        .attr('x', (d: any) => { return d.x < 180 ? 8 : -8; })
                        .style('text-anchor', (d: any) => { return d.x < 180 ? 'start' : 'end'; })
                        .attr('transform', (d: any) => { return d.x < 180 ? null : 'rotate(180)'; })
                        .text((d: any) => { return d.data.name; })
                        .each(function (this: any, d: any) { d.text = this; })
                        .attr('fill', (d: any) => { return CANTON_COLORS[d.data.canton]; })

                    // Store the text element as a property of the node object
                    newNode.each(function (this: any, d: any) {
                        d.text = this;
                    });

                    // Attach the event listeners to the new selection
                    newNode
                        .on('mouseover', (event: any, d: any) => this.overed(event, d))
                        .on('mouseout', (event: any, d: any) => this.outed(event, d));

                    // Transition to final position
                    newNode
                        .transition()
                        .duration(TRANSITION_DURATION)
                        .attr('transform', function (d: any) {
                            return 'rotate(' + (d.x - 90) + ')translate(' + d.y + ')';
                        });
                },
                (update: any) => {
                    // This block handles the update selection
                    update
                        .transition()
                        .duration(TRANSITION_DURATION)
                        .attr('transform', function (d: any) {
                            return 'rotate(' + (d.x - 90) + ')translate(' + d.y + ')';
                        });

                    // Store the text element as a property of the node object
                    update.each(function (this: any, d: any) {
                        d.text = this;
                    });

                    // Attach the event listeners to the update selection
                    update
                        .on('mouseover', (event: any, d: any) => this.overed(event, d))
                        .on('mouseout', (event: any, d: any) => this.outed(event, d));

                    update
                        .select('circle')
                        .transition()
                        .duration(TRANSITION_DURATION)
                        .attr('fill', function (d: any) { return CANTON_COLORS[d.data.canton]; });

                    update
                        .select('text')
                        .transition()
                        .duration(TRANSITION_DURATION)
                        .attr('x', function (d: any) { return d.x < 180 ? 8 : -8; })
                        .style('text-anchor', function (d: any) { return d.x < 180 ? 'start' : 'end'; })
                        .attr('transform', function (d: any) { return d.x < 180 ? null : 'rotate(180)'; })
                        .text(function (d: any) { return d.data.name; })
                        .attr('fill', function (d: any) { return CANTON_COLORS[d.data.canton]; });
                },
                (exit: any) => {
                    // This block handles the exit selection
                    return exit.transition()
                    .duration(TRANSITION_DURATION)
                    .attr('transform', (d: any) => {
                        const distance = this.radius + 1000;
                        return 'rotate(' + (d.x - 90) + ')translate(' + distance + ')';
                    })
                    .remove(); // Remove nodes after the transition
                }
            );

        // Links
        const line = d3.lineRadial()
            .curve(d3.curveBundle.beta(0.5))
            .radius((d: any) => d.y)
            .angle((d: any) => d.x * Math.PI / 180);

        const centerLine = d3.lineRadial()
            .curve(d3.curveBundle.beta(0.5))
            .radius(0) // Fixed radius at the center
            .angle((d: any) => d.x * Math.PI / 180);
            
        this.g.select('g.links')
            .selectAll('path')
            .data(
                this.root.leaves().flatMap((leaf: any) => leaf.outgoing), 
                (d: any) => `${d.nodes[0].data.name},${d.nodes[0].data.city},${d.nodes[0].data.canton}->${d.nodes[1].data.name},${d.nodes[1].data.city},${d.nodes[1].data.canton}`
            ).join(
                (enter: any) => {
                    const newLink = enter
                        .append('path')
                        .attr('stroke', 'black')
                        .attr('fill', 'none')
                        .attr('stroke-width', (d: any) => this.weightScale(d.weight))
                        .attr('d', (d: any) => centerLine(d.nodes[0].path(d.nodes[1])))
                        .attr('stroke-opacity', 0);

                    // Store the path element as a property of the link object
                    newLink.each(function (this: any, d: any) {
                        d.path = this;
                    });

                    // Transition the d attribute and stroke-opacity for entering links
                    newLink
                        .transition()
                        .duration(TRANSITION_DURATION)
                        .attr('d', (d: any) => line(d.nodes[0].path(d.nodes[1])))
                        .attr('stroke-opacity', 1);
                },
                (update: any) => {
                    update
                        .transition()
                        .duration(TRANSITION_DURATION)
                        .attr('d', (d: any) => line(d.nodes[0].path(d.nodes[1])))
                        .attr('stroke-width', (d: any) => this.weightScale(d.weight));
                },
                (exit: any) => {
                    exit.transition()
                        .duration(TRANSITION_DURATION / 2)
                        .attr('stroke-opacity', 0)
                        .remove();
                }
            )
    }

    /**
     * This function is called when the mouse leaves a node.
     * @param event the mouse event
     * @param d the node data
     * @returns void
     */
    overed(event: any, d: any): void {
        const links = this.g.select('g.links');
        links.style('mix-blend-mode', null);
    
        // Update the font size on hovered nodes
        const element = event.currentTarget;
        const fontSize = parseFloat(d3.select(element).style('font-size'));
        d3.select(element)
            .attr('font-weight', 'bold')
            .attr('font-size', fontSize * BUNDLING_NODE_FONT_SIZE_SCALE);
    
        // Use data-based selection for incoming and outgoing links
        this.g.selectAll('path')
            .filter((linkData: any) => 
                d.incoming.some((incomingLink: any) => incomingLink === linkData) 
                || d.outgoing.some((outgoingLink: any) => outgoingLink === linkData)
            )
            .each(function (this: any) {
                const strokeWidth = parseFloat(d3.select(this).style('stroke-width'));
                d3.select(this).attr('stroke', BUNDLE_SELECTED_COLOR).attr('stroke-width', strokeWidth + BUNDLE_INCREASE_EDGE_WIDTH);
            });
    
        // Update text elements based on data
        d3.selectAll(d.incoming.map((d: any) => d.nodes[0].text))
            .attr('font-weight', 'bold');
        d3.selectAll(d.outgoing.map((d: any) => d.nodes[1].text))
            .attr('font-weight', 'bold');
    }

    /**
     * This function is called when the mouse leaves a node.
     * @param event the mouse event
     * @param d the node data
     * @returns {void}
     */
    outed(event: any, d: any): void {
        const links = this.g.select('g.links');
        links.style('mix-blend-mode', 'multiply');
    
        // Update the font size on hovered nodes
        const element = event.currentTarget;
        const fontSize = parseFloat(d3.select(element).style('font-size'));
        d3.select(element).attr('font-weight', null).attr('font-size', fontSize / BUNDLING_NODE_FONT_SIZE_SCALE);
    
        // Use data-based selection for incoming and outgoing links
        this.g.selectAll('path')
            .filter((linkData: any) => 
                d.incoming.some((incomingLink: any) => incomingLink === linkData) 
                || d.outgoing.some((outgoingLink: any) => outgoingLink === linkData)
            )
            .each(function (this: any) {
                const strokeWidth = parseFloat(d3.select(this).style('stroke-width'));
                d3.select(this).attr('stroke', 'black').attr('stroke-width', strokeWidth - BUNDLE_INCREASE_EDGE_WIDTH);
            });
    
        // Update text elements based on data
        d3.selectAll(d.incoming.map((d: any) => d.nodes[0].text))
            .attr('font-weight', null);
        d3.selectAll(d.outgoing.map((d: any) => d.nodes[1].text))
            .attr('font-weight', null);
    }

    /**
     * Update the nodes and edges based on the selected cantons, and optionally update the bundle.
     * @param cantons the selected cantons
     * @param updateBundle whether to update the bundle
     * @returns {void}
     */
    filterByCantons(cantons: string[], updateBundle = false): void {
        // Filter nodes based on selected cantons
        this.selectedNodes = this.nodes.filter((node: any) => cantons.includes(node.canton));
    
        // Filter edges based on selected cantons
        this.selectedEdges = this.edges.filter((edge: any) => {
            return this.selectedNodes.some((node: any) => node.id === edge.source) &&
                this.selectedNodes.some((node: any) => node.id === edge.target);
        });

        if (updateBundle) {
            this.updateBundle();
        }
    }

    /**
     * Define the zoom behavior.
     * @param event the zoom event
     * @returns {void}
     */
    zoomed(event: any): void {
        const newTransform: any = d3.zoomIdentity
            .translate(event.transform.x, event.transform.y)
            .scale(event.transform.k)
      
        d3.select(`#${BUNDLING_ELEMENT_ID} svg g`).attr('transform', newTransform);
      }
}



const SWISS_MAP_BY_CANTON_PATH = 'data/swiss_map_by_canton.json';
const MINIMAP_ELEMENT_ID = 'hierarchy-minimap'
const CANTON_NAMES_TO_ABBREVIATIONS: any = {
    'Zürich': 'ZH',
    'Bern': 'BE',
    'Luzern': 'LU',
    'Uri': 'UR',
    'Schwyz': 'SZ',
    'Obwalden': 'OW',
    'Nidwalden': 'NW',
    'Glarus': 'GL',
    'Zug': 'ZG',
    'Fribourg': 'FR',
    'Solothurn': 'SO',
    'Basel-Stadt': 'BS',
    'Basel-Landschaft': 'BL',
    'Schaffhausen': 'SH',
    'Appenzell Ausserrhoden': 'AR',
    'Appenzell Innerrhoden': 'AI',
    'St. Gallen': 'SG',
    'Graubünden': 'GR',
    'Aargau': 'AG',
    'Thurgau': 'TG',
    'Ticino': 'TI',
    'Vaud': 'VD',
    'Valais': 'VS',
    'Neuchâtel': 'NE',
    'Genève': 'GE',
    'Jura': 'JU'
};

const DEFAULT_CANTON_COLOR = 'rgba(0, 0, 0, 0)';

const MINIMAP_PADDING_BOTTOM = 20;

export class MiniMap {
    private width!: number;
    private height!: number;

    private data: any;

    private svg: any;

    private projection: any;
    private pathGenerator: any;

    private heb: HierarchicalEdgeBundling;
    private selectedCantons: string[] = [];

    constructor(heb: HierarchicalEdgeBundling) {
        this.heb = heb;

        this.loadData().then(() => {
            this.initDimensions();
            this.initStaticElements();
            this.drawMap();
        });
    }

    /**
     * Loads the data for the map.
     * @returns {Promise<void>} a promise that resolves when the data is loaded
     */
    async loadData(): Promise<void> {
        return new Promise((resolve) => {
            d3.json(SWISS_MAP_BY_CANTON_PATH).then((data: any) => {
                this.data = data;

                // Inverse features because of D3 clockwise polygon construction
                this.data.features.forEach((feature: any) => {
                    const coordinates = feature.geometry.coordinates[0];
                    feature.geometry.coordinates[0] = coordinates.reverse();
                });

                resolve();
            });
        });
    }

    /**
     * Initializes the dimensions of the circle packing visualization.
     * @returns {void}
     */
    initDimensions(): void {
        const parentElement = document.getElementById(MINIMAP_ELEMENT_ID);
        if (parentElement) {
            this.width = parentElement.clientWidth;
            this.height = parentElement.clientHeight;
        }
    }

    /**
     * Initializes the static elements of the circle packing visualization.
     * @returns {void}
     */
    initStaticElements(): void {
        this.svg = d3.select(`#${MINIMAP_ELEMENT_ID}`)
            .append('svg')
            .attr('width', this.width)
            .attr('height', this.height - MINIMAP_PADDING_BOTTOM)
            .attr('viewBox', [0, 0, this.width, this.height]);

        this.projection = d3.geoMercator()
            .fitSize([this.width, this.height], this.data);
        this.pathGenerator = d3.geoPath().projection(this.projection);
    }

    /**
     * Draws the map.
     * @returns {void}
     */
    drawMap(): void {
        // Function to select cantons
        const selectCanton = (_: any, d:any) => {
            // Add canton abbreviation to selected cantons and update HEB
            const canton = CANTON_NAMES_TO_ABBREVIATIONS[d.properties.NAME] ?? null;
            const index = this.selectedCantons.indexOf(canton);
            if (index === -1) {
                this.selectedCantons.push(canton);
            } else {
                this.selectedCantons.splice(index, 1);
            }
            this.heb.filterByCantons(this.selectedCantons, true);

            // Update color of all paths from selected cantons 
            this.svg.selectAll('path')
                .filter((d: any) => this.selectedCantons.includes(CANTON_NAMES_TO_ABBREVIATIONS[d.properties.NAME]))
                .attr('fill', (d: any) => CANTON_COLORS[CANTON_NAMES_TO_ABBREVIATIONS[d.properties.NAME]])
                .call(tip) // Attach the tooltip to the selected canton paths
            this.svg.selectAll('path')
                .filter((d: any) => !this.selectedCantons.includes(CANTON_NAMES_TO_ABBREVIATIONS[d.properties.NAME]))
                .attr('fill', DEFAULT_CANTON_COLOR)
                .call(tip) // Attach the tooltip to the non-selected canton paths as well
        }

        // Add tooltip to see canton name on hover
        const tip = d3Tip
            .default()
            .attr('class', 'd3-tip')
            .html((_: any, d: any) => d.properties.NAME)
            .direction('n')
            .offset([-10, 0]);

        tip
            .style('background-color', 'var(--green)')
            .style('color', 'var(--off-white)')
            .style('border-radius', '5px')
            .style('padding', '8px')
            .style('font-size', 'var(--small-font-size)')
            .style('font-family', 'var(--default-font-family)')

        this.svg.call(tip);

        this.svg.selectAll('path')
            .data(this.data.features)
            .join('path')
            .attr('d', this.pathGenerator)
            .attr('fill', DEFAULT_CANTON_COLOR)
            .attr('stroke', 'black')
            .attr('stroke-width', 1.5)
            .on('click', selectCanton)
            .call(tip)
            .on('mouseover', tip.show)
            .on('mouseout', tip.hide);
    }
}