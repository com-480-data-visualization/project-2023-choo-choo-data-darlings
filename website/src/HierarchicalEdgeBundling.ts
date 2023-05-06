import * as d3 from 'd3';
import { zoom } from 'd3';

const NETWORK_PATH = 'src/network/data/networks/transports/web_data/';
const EDGES_PATH = NETWORK_PATH + 'network_edges.csv';
const NODES_PATH = NETWORK_PATH + 'network_nodes.csv';

const CANTONS_SELECTION_ID = 'select_cantons';
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
    'ZH': '#c94be1',
    'BE': '#b2e431',
    'LU': '#8547e4',
    'UR': '#6cd44c',
    'SZ': '#5527b6',
    'OW': '#ccc842',
    'NW': '#8270f6',
    'GL': '#57dc84',
    'ZG': '#d63ebf',
    'FR': '#6eae45',
    'SO': '#7557d3',
    'BS': '#db9326',
    'BL': '#5581f2',
    'SH': '#e4441c',
    'AR': '#3d1b7f',
    'AI': '#c85d2c',
    'SG': '#7d6cd5',
    'GR': '#d13f3c',
    'AG': '#7638a1',
    'TG': '#da305f',
    'TI': '#d077dd',
    'VD': '#e85684',
    'GE': '#a93a99',
    'NE': '#d22e75',
    'VS': '#d940a3',
    'JU': '#d53e8d'
}

const BUNDLE_SELECTED_EDGE_COLOR = '#EB0000';
const BUNDLE_INCREASE_EDGE_WIDTH = 5;

const TRANSITION_DURATION = 750;

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

    private svg!: any;
    private g!: any;
    private zoomBehavior!: any;

    private weightScale!: any;
    private defaultZoomState: any = d3.zoomIdentity;

    constructor() {
        this.loadData().then(() => {
            this.initStaticElements();
            this.updateBundle();
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
                    if (cantonsSelection !== null) {
                        // Generate custom options
                        const cantonOptions = Object.keys(CANTON_COLORS).map((canton) => {
                            const option = document.createElement('div');
                            option.classList.add('custom-option');
                            option.dataset.value = canton;
                            option.textContent = canton;
                            return option;
                        });
                        
                        // Append custom options to the custom select
                        const customSelect = document.getElementById('select_cantons');
                        for (const option of cantonOptions) {
                            customSelect.appendChild(option);
                        }
                        
                        // Add click event listener for custom options
                        customSelect.addEventListener('click', (event) => {
                            const target = event.target;
                            if (target.classList.contains('custom-option')) {
                            // Toggle the 'selected' class
                            target.classList.toggle('selected');

                            if (target.classList.contains('selected')) {
                                target.style.backgroundColor = CANTON_COLORS[target.dataset.value];
                            } else {
                                target.style.backgroundColor = '';
                            }
                        
                            // Get the selected options
                            const selectedOptions = customSelect.querySelectorAll('.custom-option.selected');
                            const selectedValues = Array.from(selectedOptions).map((option) => option.dataset.value);
                        
                            // Call your filter function
                            this.filterByCantons(selectedValues, true);
                            }
                        });

                    }

                    this.nodes = nodes;
                    this.edges = edges;
                    this.filterByCantons([], false)

                    resolve();
                });
            });
        });
    }

    initStaticElements() {
        // Define zoom behavior
        this.zoomBehavior = zoom<SVGSVGElement, unknown>()
            .scaleExtent([MIN_ZOOM_SCALE, MAX_ZOOM_SCALE])
            .on('zoom', (event) => this.zoomed(event));

        // Define SVG element
        this.svg = d3.select(`#${BUNDLING_ELEMENT_ID}`).append('svg')
            .attr('width', this.width)
            .attr('height', this.height)
            .call(this.zoomBehavior)

        this.g = this.svg.append('g');

        // Create the links group
        this.g.append('g').attr('class', 'links');

        // Create the nodes group
        this.g.append('g').attr('class', 'nodes');
    }

    buildRoot() {
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
            } = { name: 'Network', children: [] };

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

        this.root = d3.hierarchy(root);

        // Use d3's Hierarchy and Cluster layout to calculate the layout of the visualization
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

    updateBundle() {
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
                (d: any) => `${d.data.name},${d.data.city},${d.data.canton}`
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
                        .attr('x', function (d: any) { return d.x < 180 ? 8 : -8; })
                        .style('text-anchor', function (d: any) { return d.x < 180 ? 'start' : 'end'; })
                        .attr('transform', function (d: any) { return d.x < 180 ? null : 'rotate(180)'; })
                        .text(function (d: any) { return d.data.name; })
                        .each(function (d: any) { d.text = this; })
                        .attr('fill', function (d: any) { return CANTON_COLORS[d.data.canton]; })

                    // Store the text element as a property of the node object
                    newNode.each(function (d: any) {
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
                    update.each(function (d: any) {
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

        const exitLine = (d: any, distance: number) => {
            const sourceAngle = d.nodes[0].x * Math.PI / 180;
            const targetAngle = d.nodes[1].x * Math.PI / 180;
            return d3.lineRadial()
                .curve(d3.curveBundle.beta(0.5))
                .radius((_, i) => i === 0 ? d.nodes[0].y : d.nodes[0].y + distance)
                .angle((_, i) => i === 0 ? sourceAngle : targetAngle)([d.nodes[0], d.nodes[1]]);
        };
            

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
                    newLink.each(function (d: any) {
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
                    const distance = 2000;
                    exit.transition()
                        .duration(TRANSITION_DURATION / 2)
                        .attr('stroke-opacity', 0)
                        .remove();
                }
            )
    }

    overed(event: any, d: any) {
        const links = this.g.select('g.links');
        links.style('mix-blend-mode', null);
    
        const element = event.currentTarget;
    
        // Get the font-size of the text element
        const fontSize = parseFloat(d3.select(element).style('font-size'));
        d3.select(element).attr('font-weight', 'bold').attr('font-size', fontSize * 1.5);
    
        // Use data-based selection for incoming and outgoing links
        this.g.selectAll('path')
            .filter((linkData: any) => d.incoming.some(incomingLink => incomingLink === linkData) || d.outgoing.some(outgoingLink => outgoingLink === linkData))
            .each(function () {
                const strokeWidth = parseFloat(d3.select(this).style('stroke-width'));
                d3.select(this).attr('stroke', BUNDLE_SELECTED_EDGE_COLOR).attr('stroke-width', strokeWidth + BUNDLE_INCREASE_EDGE_WIDTH);
            });
    
        // Update text elements based on data
        d3.selectAll(d.incoming.map((d: any) => d.nodes[0].text)).attr('fill', BUNDLE_SELECTED_EDGE_COLOR).attr('font-weight', 'bold');
        d3.selectAll(d.outgoing.map((d: any) => d.nodes[1].text)).attr('fill', BUNDLE_SELECTED_EDGE_COLOR).attr('font-weight', 'bold');
    }

    outed(event: any, d: any) {
        const links = this.g.select('g.links');
        links.style('mix-blend-mode', 'multiply');
    
        const element = event.currentTarget;
    
        const fontSize = parseFloat(d3.select(element).style('font-size'));
        d3.select(element).attr('font-weight', null).attr('font-size', fontSize / 1.5);
    
        // Use data-based selection for incoming and outgoing links
        this.g.selectAll('path')
            .filter((linkData: any) => d.incoming.some(incomingLink => incomingLink === linkData) || d.outgoing.some(outgoingLink => outgoingLink === linkData))
            .each(function () {
                const strokeWidth = parseFloat(d3.select(this).style('stroke-width'));
                d3.select(this).attr('stroke', 'black').attr('stroke-width', strokeWidth - BUNDLE_INCREASE_EDGE_WIDTH);
            });
    
        // Update text elements based on data
        d3.selectAll(d.incoming.map((d: any) => d.nodes[0].text)).attr('fill', function (d: any) { return CANTON_COLORS[d.data.canton]; }).attr('font-weight', null);
        d3.selectAll(d.outgoing.map((d: any) => d.nodes[1].text)).attr('fill', function (d: any) { return CANTON_COLORS[d.data.canton]; }).attr('font-weight', null);
    }

    filterByCantons(cantons: string[], updateBundle = false) {
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

    zoomed(event: any) {
        const newTransform: any = d3.zoomIdentity
            .translate(event.transform.x, event.transform.y)
            .scale(event.transform.k)
      
        d3.select('#hierarchy svg g').attr('transform', newTransform);
      }
}