//@ts-nocheck
import { csvParseRows } from 'd3-dsv';
import Graph from 'graphology';
import Sigma from 'sigma';
import { animateNodes } from 'sigma/utils/animate';

// Fixed variables
const GRAPH_CONTAINER_ID = 'graph-container';
const SELECT_LAYOUT_ID = 'select_layout';
const SELECT_NODE_SIZE_ID = 'select_node_size';
const GRAPH_DESCRIPTION_ID = 'graph-description';
const W_SLIDER_ID = 'w_slider';
const W_SLIDER_LABEL_ID = 'w_slider_label';
const B_SLIDER_ID = 'b_slider';
const B_SLIDER_LABEL_ID = 'b_slider_label';
const SEARCH_INPUT_ID = 'search_input';
const SEARCH_SUGGESTIONS_ID = 'search_suggestions';
const CHECKBOX_SEARCH_BY_CITY_ID = 'search_by_city';

const DEFAULT_LAYOUT_MODE = 'random';
const DEFAULT_LAYOUT_TRANSITION_DURATION = 2_000;

const DEFAULT_NODE_SIZE_MODE = 'fixed';
const DEFAULT_NODE_SIZE_TRANSITION_DURATION = 1_000;
const DEFAULT_NODE_SIZE = 2;
const MIN_NODE_SIZE = 1;
const MAX_NODE_SIZE = 10;
const DEFAULT_NODE_COLOR_MODE = 'fixed';
const DEFAULT_NODE_COLOR_TRANSITION_DURATION = 1_000;


//const DEFAULT_NODE_COLOR = '#0f1d18';
//const DEGREE_NODE_COLOR = '#db3927';
const DEFAULT_NODE_COLOR = "#FB9E82";
const DEGREE_NODE_COLOR = "#6F2282";
const BETWEENESS_CENTRALITY_NODE_COLOR = "#E84E10";
const WEIGHTED_DEGREE_NODE_COLOR = "#FCBB00";
const PAGERAND_NODE_COLOR = "#143A85";
const EIGEN_CENTRALITY_NODE_COLOR = "#00973B";


// const BETWEENESS_CENTRALITY_NODE_COLOR = '#8d2eb2';
const SEARCH_SELECTED_NODE_COLOR = '#f7b500';

const DEFAULT_SEARCH_BY = 'label';

const DEFAULT_EDGE_SCALING = 50_000;
const DEFAULT_EDGE_COLOR = 'rgba(250, 244, 221, 1)';

const SEARCH_ZOOM_RATIO = 0.05;

const NETWORK_SOURCE = 'transports';
const NODES_FILE_PATH = `data/network/networks/${NETWORK_SOURCE}/web_data/network_nodes.csv`;
const EDGES_FILE_PATH = `data/network/networks/${NETWORK_SOURCE}/web_data/network_edges.csv`;

const NODE_SIZE_DESCRIPTION = {
  'fix': "You can choose between the different layouts of the graph: random, geographical or force atlas 2.",
  'deg': "The degree is a fundamental metric in graph theory that measures the number of edges connected to a node in a graph. In our graph, this value represents the number of connections a station has with other stations in the transportation network. We can see that the central stations, such as Bern, Zürich or Fribourg have a high degree which means they connect to a lot of other stations in the country.",
  'bce': "Betweenness centrality is a measure of node importance in a graph based on the concept of how often a node lies on the shortest paths between other pairs of nodes. It quantifies the extent to which a node acts as a bridge or intermediary in connecting different parts of the graph. We can see that Bern has a high betweenness centrality, which means that it is a central station in Switzerland as there are many shortest paths that pass through it.",
  'wdeg': "Just as the degree, the weighted degree measures the number of edges connected to a node in a graph. However, in this case, the weight of the edges is taken into account. In our graph, this value represents the number of trips between two stations. We can see that cities such as Geneva or Zürich have a high weighted degree as there are a lot of busses or trams that go aroung those cities.",
  'pgr': "PageRank is an algorithm used to measure the importance or relevance of nodes in a graph. It assigns a numerical value to each node based on the incoming links from other nodes. We can see that the majority of the nodes with a high PageRank are located in cities, which makes sense as they connect the countryside to the cities.",
  'egn': "Eigen centrality calculates the centrality of a node by considering both its own importance and the importance of its neighbors. It identifies nodes that have a significant impact on the flow of information or influence throughout the graph. We can see that Zürich has the highest eigen centrality, which means that it is a central station in Switzerland as it has the highest concentration of buses, trams and train stations.",
};

export class GraphManager {
  constructor() {
    this.graph = null;
    this.renderer = null;
    this.layoutManager = new LayoutManager(this, this.renderer);
    this.nodeSizeManager = new NodeSizeManager(this, this.renderer);
    this.colorManager = new ColorManager(this, this.renderer);
    this.searchManager = new SearchManager(this, this.renderer);
  }

  /**
   * Get the normalized value between 0 and 1 of a value between min and max
   * @param {number} value 
   * @param {number} min 
   * @param {number} max 
   * @returns {number} the normalized value in the range [0, 1]
   */
  getNormalizedValue(value, min, max) {
    return (value - min) / (max - min);
  }

  /**
   * Maps a value between min and max to a value between MIN_NODE_SIZE and MAX_NODE_SIZE
   * @param {number} value 
   * @param {number} min 
   * @param {number} max 
   * @returns {number} the normalized value in the range [MIN_NODE_SIZE, MAX_NODE_SIZE]
   */
  getNormalizedNodeSize(value, min, max) {
    const normalizedValue = this.getNormalizedValue(value, min, max);
    return normalizedValue * (MAX_NODE_SIZE - MIN_NODE_SIZE) + MIN_NODE_SIZE;
  }

  /**
   * Load data from CSV files and create graph
   * @returns {Promise<Graph>} the loaded graph
   */
  async loadData () {
    // Fetch node data
    const nodeResponse = await fetch(NODES_FILE_PATH);
    const nodeData = await nodeResponse.text();
  
    // Create graph
    const graph = new Graph();

    // Add nodes
    csvParseRows(nodeData, (row, index) => {
      // Skip the header row
      if (index === 0) return null;
  
      const id = row[0];
  
      // Add node if it doesn't exist
      if (!graph.hasNode(id)) {
        const label = row[1];
        const xRdm = Math.random();
        const yRdm = Math.random();
        const xFa2 = parseFloat(row[2]);
        const yFa2 = parseFloat(row[3]);
        const xGeo = parseFloat(row[4]);
        const yGeo = parseFloat(row[5]);

        const betweenessCentrality = parseFloat(row[6]);

        // 7: transportType
        const transportType = row[7];
        
        // 8: city
        const city = row[8];
        // 9: canton
        const canton = row[9];
        
        // 10: isBusStop
        // 11: isTramStop
        // 12: isTrainStop
        // 13: isMetroStop
        // 14: isRackRailwayStop
        // 15: isBoatStop
        
        const pageRank = parseFloat(row[16]);
        // const modularityClass = parseInt(row[17]);
        const inDegree = parseInt(row[18]);
        const outDegree = parseInt(row[19]);
        const degree = parseInt(row[20]);
        const weightedInDegree = parseInt(row[21]);
        const weightedOutDegree = parseInt(row[22]);
        const weightedDegree = parseInt(row[23]);
        const eccentricity = parseInt(row[24]);
        const closenessCentrality = parseFloat(row[25]);
        const harmonicClosenessCentrality = parseFloat(row[26]);
        // const authority = parseFloat(row[27]);
        // const hub = parseFloat(row[28]);
        // const componentNumber = parseInt(row[29]);
        // const strongComponentNumber = parseInt(row[30]);
        // const statInfClass = parseInt(row[31]);
        // const clustering = parseFloat(row[32]);
        const eigenCentrality = parseFloat(row[33]);

        graph.addNode(id, {
          label: label, 
          color: DEFAULT_NODE_COLOR,
          x: xRdm,
          y: yRdm,
          xRdm: xRdm,
          yRdm: yRdm,
          xFa2: xFa2, 
          yFa2: yFa2,
          xGeo: xGeo,
          yGeo: yGeo,
          size: DEFAULT_NODE_SIZE,
          sizeFix: DEFAULT_NODE_SIZE,
          sizeBce: betweenessCentrality,
          sizeIde: inDegree,
          sizeOde: outDegree,
          sizeDeg: degree,
          sizeWide: weightedInDegree,
          sizeWode: weightedOutDegree,
          sizeWdeg: weightedDegree,
          sizePgr: pageRank,
          sizeEcc: eccentricity,
          sizeCcl: closenessCentrality,
          sizeHcl: harmonicClosenessCentrality,
          sizeEgn: eigenCentrality,
          transportType: transportType,
          city: city,
        });
      }
      return null;
    });

    // Normalize nodes coordinates
    const coordinatesFieldsToNormalize = ['Fa2', 'Geo'];
    coordinatesFieldsToNormalize.forEach(field => {
      let min = Math.min(...graph.nodes().map(node => graph.getNodeAttribute(node, `x${field}`)));
      min = Math.min(min, Math.min(...graph.nodes().map(node => graph.getNodeAttribute(node, `y${field}`))));
      let max = Math.max(...graph.nodes().map(node => graph.getNodeAttribute(node, `x${field}`)));
      max = Math.max(max, Math.max(...graph.nodes().map(node => graph.getNodeAttribute(node, `y${field}`))));
      graph.forEachNode((node, attributes) => {
        graph.setNodeAttribute(node, `x${field}`, this.getNormalizedValue(attributes[`x${field}`], min, max));
        graph.setNodeAttribute(node, `y${field}`, this.getNormalizedValue(attributes[`y${field}`], min, max));
      });
    });

    // Fix missing values in node sizes
    const sizeFielsToFix = ['Ide', 'Ode', 'Deg', 'Bce', 'Wide', 'Wode', 'Wdeg', 'Pgr', 'Ecc', 'Ccl', 'Hcl', 'Egn'];
    sizeFielsToFix.forEach(field => {
      graph.forEachNode((node, attributes) => {
        if (isNaN(attributes[`size${field}`])) {
          graph.setNodeAttribute(node, `size${field}`, 0);
        }
      });
    });

    // Normalize nodes size
    const sizeFieldsToNormalize = ['Ide', 'Ode', 'Deg', 'Bce', 'Wide', 'Wode', 'Wdeg', 'Pgr', 'Ecc', 'Ccl', 'Hcl', 'Egn'];
    sizeFieldsToNormalize.forEach(field => {
      const min = Math.min(...graph.nodes().map(node => graph.getNodeAttribute(node, `size${field}`)));
      const max = Math.max(...graph.nodes().map(node => graph.getNodeAttribute(node, `size${field}`)));
      graph.forEachNode((node, attributes) => {
        graph.setNodeAttribute(node, `size${field}`, this.getNormalizedNodeSize(attributes[`size${field}`], min, max));
      });
    });

    // Fetch edge data
    const edgeResponse = await fetch(EDGES_FILE_PATH);
    const edgeData = await edgeResponse.text();

  
    // Add edges
    csvParseRows(edgeData, (row, index) => {
      // Skip the header row
      if (index === 0) return null;
  
      const id = row[0];
      const source = row[1];
      const target = row[2];
      const weight = row[3];
  
      // Add edge if it doesn't exist
      if (!graph.hasEdge(id)) {
        graph.addEdgeWithKey(id, source, target, {
          source: source,
          target: target,
          weight: weight,
          color: DEFAULT_EDGE_COLOR,
          size: parseFloat(weight) / DEFAULT_EDGE_SCALING,
        });
      }
  
      return null;
    });

    return graph;
  }

  /**
   * Load graph and renderer, add event listeners and show graph
   * @returns {void}
   */
  load() {
    if (this.graph) {
      console.error('Graph already loaded.');
      return;
    }

    this.loadData().then(graph => {
      // Define graph
      this.graph = graph;
      this.renderer = new Sigma(
        this.graph, 
        document.getElementById(GRAPH_CONTAINER_ID),
      );

      // Fill out the search suggestions
      this.searchManager.setSearchSuggestions();

      // Add event listeners
      const selectLayoutElement = document.getElementById(SELECT_LAYOUT_ID);
      selectLayoutElement.addEventListener('change', (event) => {
        this.layoutManager.handleLayoutSelectChange(event);
      });

      const selectNodeSizeElement = document.getElementById(SELECT_NODE_SIZE_ID);
      selectNodeSizeElement.addEventListener('change', (event) => {
        this.nodeSizeManager.handleNodeSizeSelectChange(event);
        // Change the text in graph-description
        const selectedOption = event.target.value;
        const nodeSizeDescription = NODE_SIZE_DESCRIPTION[selectedOption];
        const graphDescriptionElement = document.getElementById(GRAPH_DESCRIPTION_ID);
        graphDescriptionElement.innerHTML = nodeSizeDescription;
      });

      const selectNodeColorElement = document.getElementById(SELECT_NODE_SIZE_ID);
      selectNodeColorElement.addEventListener('change', (event) => {
        this.colorManager.handleNodeColorSelectChange(event);
      });

      const wSlider = document.getElementById(W_SLIDER_ID);
      wSlider.addEventListener('input', (event) => {
        const wScale = parseFloat(event.target.value);
        this.colorManager.handleWSliderChange(wScale);

        // Rename slider label
        const wSliderLabel = document.getElementById(W_SLIDER_LABEL_ID);
        wSliderLabel.innerHTML = `W ${wScale.toFixed(2)}`;
      });

      const bSlider = document.getElementById(B_SLIDER_ID);
      bSlider.addEventListener('input', (event) => {
        const bScale = parseFloat(event.target.value);
        this.colorManager.handleBSliderChange(bScale);

        // Rename slider label
        const bSliderLabel = document.getElementById(B_SLIDER_LABEL_ID);
        bSliderLabel.innerHTML = `B ${bScale.toFixed(2)}`;
      });

      const searchInput = document.getElementById(SEARCH_INPUT_ID);
      searchInput.addEventListener('input', () => {
        this.searchManager.setSearchQuery(searchInput.value || '');
      });

      const searchByCityCheckbox = document.getElementById(CHECKBOX_SEARCH_BY_CITY_ID);
      searchByCityCheckbox.addEventListener('change', (event) => {
        const isChecked = event.target.checked;
        this.searchManager.handleSearchByCityCheckboxChange(isChecked);
      });

      // Show graph
      this.refresh();
    }).catch(error => {
      console.error('Error loading data:', error);
    });
  }

  /**
   * Show graph
   * @returns {void}
   */
  refresh() {
    if (!this.renderer) {
      console.error('Renderer not initialized.');
      return;
    }
    this.renderer.refresh();
  }
}



class LayoutManager {
  constructor(graphManager) {
    this.graphManager = graphManager;
    this.layoutMode = DEFAULT_LAYOUT_MODE;
    this.layoutTransitionDuration = DEFAULT_LAYOUT_TRANSITION_DURATION;
  }

  /**
   * Ease in out quad, to be used as easing function for layout transitions
   * @param {number} t the interpolation value between 0 and 1
   * @returns {number} the eased interpolation value
   */
  easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  /**
   * Set the layout mode
   * @param {string} layout_mode the layout mode
   * @param {string} newXArg the new x coordinate attribute name
   * @param {string} newYArg the new y coordinate attribute name
   * @returns {void}
   */
  setLayoutMode(layoutMode, newXArg, newYArg) {
    if (this.layoutMode === layoutMode) return;
  
    // Get the graph nodes
    const nodes = this.graphManager.graph.nodes();
  
    // Prepare an object with the target positions
    const targetPositions = nodes.reduce((acc, node) => {
      const node_obj = this.graphManager.graph.getNodeAttributes(node);
      acc[node] = {
        x: node_obj[newXArg],
        y: node_obj[newYArg],
      };
      return acc;
    }, {});
  
    // Animate the nodes using Sigma.js's built-in animateNodes function
    animateNodes(this.graphManager.graph, targetPositions, {
      duration: this.layoutTransitionDuration,
      easing: this.easeInOutQuad,
    });
  
    this.layoutMode = layoutMode;
  }

  /**
   * Handle layout select change
   * @param {*} event 
   * @returns {void}
   */
  handleLayoutSelectChange(event) {
    const selectedOption = event.target.value;

    const layoutModeMap = {
      'rdm': 'random',
      'fa2': 'forceatlas2',
      'geo': 'geographical',
    };
    const newArgMap = {
      'rdm': 'Rdm',
      'fa2': 'Fa2',
      'geo': 'Geo',
    };

    const newXArg = `x${newArgMap[selectedOption]}`;
    const newYArg = `y${newArgMap[selectedOption]}`;
    this.setLayoutMode(layoutModeMap[selectedOption], newXArg, newYArg);
  }
}



class NodeSizeManager {
  constructor(graphManager, renderer) {
    this.graphManager = graphManager;
    this.renderer = renderer;
    this.nodeSizeMode = DEFAULT_NODE_SIZE_MODE;
    this.nodeSizeTransitionDuration = DEFAULT_NODE_SIZE_TRANSITION_DURATION;
  }

  /**
   * Ease in out quad, to be used as easing function for layout transitions
   * @param {number} t the interpolation value between 0 and 1
   * @returns {number} the eased interpolation value
   */
  easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  /**
   * Set the node size mode
   * @param {string} nodeSizeMode the node size mode
   * @param {string} newSizeArg the new size attribute name
   * @returns 
   */
  setNodeSizeMode(nodeSizeMode, newSizeArg) {
    if (this.nodeSizeMode === nodeSizeMode) return;

    // Get the graph nodes
    const nodes = this.graphManager.graph.nodes();

    // Prepare an object with the target sizes
    const targetSizes = nodes.reduce((acc, node) => {
      const nodeObj = this.graphManager.graph.getNodeAttributes(node);
      acc[node] = {
        size: nodeObj[newSizeArg],
      };
      return acc;
    }, {});

    // Animate the node sizes using Sigma.js's built-in animateNodes function
    animateNodes(this.graphManager.graph, targetSizes, {
      duration: this.nodeSizeTransitionDuration,
      easing: this.easeInOutQuad,
    });

    this.nodeSizeMode = nodeSizeMode;
  }

  /**
   * Handle node size select change
   * @param {object} event
   * @returns {void} 
   */
  handleNodeSizeSelectChange(event) {
    const selectedOption = event.target.value;

    const nodeSizeModeMap = {
      'fix': 'fixed',
      'ide': 'in_degree',
      'ode': 'out_degree',
      'deg': 'degree',
      'bce': 'betweeness_centrality',
      'wide': 'weighted_in_degree',
      'wode': 'weighted_out_degree',
      'wdeg': 'weighted_degree',
      'pgr': 'page_rank',
      'ecc': 'eccentricity',
      'ccl': 'closeness_centrality',
      'hcl': 'harmonic_closeness_centrality',
      'egn': 'eigen_centrality',
    };
    const newSizeArgMap = {
      'fix': 'Fix',
      'ide': 'Ide',
      'ode': 'Ode',
      'deg': 'Deg',
      'bce': 'Bce',
      'wide': 'Wide',
      'wode': 'Wode',
      'wdeg': 'Wdeg',
      'pgr': 'Pgr',
      'ecc': 'Ecc',
      'ccl': 'Ccl',
      'hcl': 'Hcl',
      'egn': 'Egn',
    };

    const newSizeArg = `size${newSizeArgMap[selectedOption]}`;
    this.setNodeSizeMode(nodeSizeModeMap[selectedOption], newSizeArg);
  }
}

class ColorManager {
  constructor(graphManager, renderer) {
    this.graphManager = graphManager;
    this.renderer = renderer;
    this.nodeColorMode = DEFAULT_NODE_COLOR_MODE;
    this.nodeColorTransitionDuration = DEFAULT_NODE_COLOR_TRANSITION_DURATION;

    this.wScale = 1;
    this.bScale = 0.5;
  }
  
  /**
   * Check if a color is in hex format
   * @param {string} color the color
   * @returns {boolean} true if the color is in hex format, false otherwise
   */
  isHexColor(color) {
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    return hexRegex.test(color);
  }

  /**
   * Check if a color is in rgb format
   * @param {string} color the color
   * @returns {boolean} true if the color is in rgb format, false otherwise
   */
  isRgbColor(color) {
    const rgbRegex = /^rgb\(\d{1,3},\s*\d{1,3},\s*\d{1,3}\)$/i;
    return rgbRegex.test(color);
  }

  /**
   * Check if a color is in rgba format
   * @param {string} color the color
   * @returns {boolean} true if the color is in rgba format, false otherwise
   */
  isRgbaColor(color) {
    const rgbaRegex = /^rgba\(\d{1,3},\s*\d{1,3},\s*\d{1,3},\s*(0(\.\d+)?|1(\.0+)?)\)$/i;
    return rgbaRegex.test(color);
  }

  /**
   * Map a hex color to an rgb map
   * @param {string} hex the hex color
   * @returns {object} the rgb map or null if the color is not in hex format
   */
  hexToRgbMap(hex) {
    if (!this.isHexColor(hex)) return null;

    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    }
  }

  /**
   * Map a hex color to an rgb representation
   * @param {string} hex the hex color
   * @returns {string} the rgb representation or null if the color is not in hex format
   */
  hexToRgbRepr(hex) {
    const rgbMap = this.hexToRgbMap(hex);
    if (!rgbMap) return null;

    return `rgb(${rgbMap.r}, ${rgbMap.g}, ${rgbMap.b})`;
  }

  /**
   * Map a hex color to an rgba map
   * @param {string} hex the hex color
   * @param {number} alpha the alpha value
   * @returns {object} the rgba map or null if the color is not in hex format
   */
  hexToRgbaMap(hex, alpha = 1) {
    if (!this.isHexColor(hex)) return null;

    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
      a: alpha,
    }
  }

  /**
   * Map a hex color to an rgba representation
   * @param {string} hex the hex color
   * @param {number} alpha the alpha value
   * @returns {string} the rgba representation or null if the color is not in hex format
   */
  hexToRgbaRepr(hex, alpha = 1) {
    const rgbaMap = this.hexToRgbaMap(hex, alpha);
    if (!rgbaMap) return null;

    return `rgba(${rgbaMap.r}, ${rgbaMap.g}, ${rgbaMap.b}, ${rgbaMap.a})`;
  }
  
  /**
   * Map an rgb map to a hex color
   * @param {object} rgbMap the rgb map 
   * @returns {string} the hex color
   */
  rgbMapToHex(rgbMap) {
    const r = rgbMap.r;
    const g = rgbMap.g;
    const b = rgbMap.b;

    return (
      "#" +
      [r, g, b]
        .map((x) => {
          const hex = x.toString(16);
          return hex.length === 1 ? "0" + hex : hex;
        })
        .join("")
    );
  }

  /**
   * Map an rgb representation to a hex color
   * @param {string} rgb 
   * @returns {string} the hex color or null if the color is not in rgb format
   */
  rgbReprToHex(rgb) {
    if (!this.isRgbColor(rgb)) return null;

    const result = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/i);
    const r = parseInt(result[1]);
    const g = parseInt(result[2]);
    const b = parseInt(result[3]);

    return this.rgbMapToHex({ r, g, b });
  }

  /**
   * Map an rgb representation to an rgba representation
   * @param {string} rgb the rgb representation
   * @param {number} alpha the alpha value
   * @returns {string} the rgba representation or null if the color is not in rgb format
   */
  rgbReprToRgbaRepr(rgb, alpha = 1) {
    if (!this.isRgbColor(rgb)) return null;

    const result = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/i);
    const r = parseInt(result[1]);
    const g = parseInt(result[2]);
    const b = parseInt(result[3]);

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;

  }

  /**
   * Map an rgba representation to a hex color
   * @param {string} rgba 
   * @returns {string} the hex color or null if the color is not in rgba format
   */
  rgbaReprToHex(rgba) {
    if (!this.isRgbaColor(rgba)) return null;

    const result = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+(?:\.\d+)?))?\)/i);
    const r = parseInt(result[1]);
    const g = parseInt(result[2]);
    const b = parseInt(result[3]);

    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }

  /**
   * Set the alpha value of an rgba representation
   * @param {string} rgba 
   * @param {number} alpha 
   * @returns {string} the rgba representation or null if the color is not in rgba format
   */
  setRgbaAlpha(rgba, alpha) {
    if (!this.isRgbaColor(rgba)) return null;

    const result = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+(?:\.\d+)?))?\)/i);
    const r = parseInt(result[1]);
    const g = parseInt(result[2]);
    const b = parseInt(result[3]);

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  /**
   * Linear interpolation between two values
   * @param {*} a, the start color
   * @param {*} b, the end color
   * @param {number} t, the interpolation value between 0 and 1
   * @returns {number} the interpolated value
   */
  lerp(a, b, t) {
    return a + (b - a) * t;
  }

  colorLerp(hexColor1, hexColor2, t) {
    const color1 = this.hexToRgbMap(hexColor1);
    const color2 = this.hexToRgbMap(hexColor2);
  
    const r = Math.round(this.lerp(color1.r, color2.r, t));
    const g = Math.round(this.lerp(color1.g, color2.g, t));
    const b = Math.round(this.lerp(color1.b, color2.b, t));
    const rgbMap = {
      r: r,
      g: g,
      b: b,
    }
  
    return this.rgbMapToHex(rgbMap);
  }

  /**
   * Ease in out quad, to be used as easing function for layout transitions
   * @param {number} t, the interpolation value between 0 and 1
   * @returns {number} the eased interpolation value
   */
  easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  /**
   * Animate the color nodes of the graph
   * @param {object} targets the target attributes
   * @param {object} opts the options
   * @param {function} callback the callback 
   * @returns {void}
   */
  animateColorNodes(targets, opts, callback) {
    const start = performance.now();
    const options = {
      duration: 1000,
      easing: (t) => t,
      ...opts,
    };
  
    const initialAttributes = new Map();
    const targetAttributes = new Map();
  
    for (const node of this.graphManager.graph.nodes()) {
      const nodeAttributes = this.graphManager.graph.getNodeAttributes(node);
      const target = targets[node];
  
      initialAttributes.set(node, {
        color: nodeAttributes.color,
      });
  
      targetAttributes.set(node, {
        color: target.color,
      });
    }
  
    const step = () => {
      const now = performance.now();
      const t = Math.min((now - start) / options.duration, 1);
      const easedT = options.easing(t);
    
      for (const node of this.graphManager.graph.nodes()) {
        const initial = initialAttributes.get(node);
        const target = targetAttributes.get(node);
        
        const currentColor = this.colorLerp(initial.color, target.color, easedT);
        this.graphManager.graph.setNodeAttribute(node, "color", currentColor);
      }
    
      this.graphManager.refresh();
    
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        if (typeof callback === "function") {
          callback();
        }
      }
    }
  
    requestAnimationFrame(step);
  }

  /**
   * Set the color mode of the nodes
   * @param {string} nodeColorMode 
   * @param {string} newColor 
   * @param {string} colorScaleArg 
   * @param {boolean} immediate 
   * @returns {void}
   */
  setNodeColorMode(nodeColorMode, newColor, colorScaleArg, immediate = false) {
    console.log(nodeColorMode)
    if (this.nodeColorMode === nodeColorMode && !immediate) return;
  
    // Get the graph nodes
    const nodes = this.graphManager.graph.nodes();
  
    // Prepare an object with the target colors
    const targetColors = nodes.reduce((acc, node) => {
      const nodeObj = this.graphManager.graph.getNodeAttributes(node);
      let colorScale = 1;
      if (colorScaleArg) {
        colorScale = nodeObj[colorScaleArg];
        colorScale = (colorScale - this.graphManager.getNormalizedValue(colorScale, MIN_NODE_SIZE, MAX_NODE_SIZE)) / (MAX_NODE_SIZE - MIN_NODE_SIZE);
        colorScale = 1 / (1 + Math.exp(-this.wScale * (colorScale - this.bScale)));
      }
  
      const colorLerp = nodeColorMode === "fixed" ? DEFAULT_NODE_COLOR : this.colorLerp(DEFAULT_NODE_COLOR, newColor, colorScale);
      const color = nodeObj.searchSelected ? SEARCH_SELECTED_NODE_COLOR : colorLerp;
      acc[node] = {
        color: color,
        oldColor: colorLerp, // Only for seach deselect, to avoid old color update, see below
      };
      return acc;
    }, {});
  
    // Immediate vs animated
    if (immediate) {
      nodes.forEach(node => {
        const target = targetColors[node];
        this.graphManager.graph.setNodeAttribute(node, "color", target.color);
      });

      this.graphManager.renderer.refresh();
    } else {
      // Animate the node colors using Sigma.js's built-in animateNodes function
      this.animateColorNodes(targetColors, {
        duration: this.nodeColorTransitionDuration,
        easing: this.easeInOutQuad,
      });
  
      this.nodeColorMode = nodeColorMode;
    }

    // Set oldColor to new color to avoid old update on search deselect
    nodes.forEach(node => {
      const target = targetColors[node];
      this.graphManager.graph.setNodeAttribute(node, "oldColor", target.oldColor);
    });
  }

  /**
   * Handle the change of the node color select
   * @param {object} event 
   * @returns {void}
   */
  handleNodeColorSelectChange(event) {
    const selectedOption = event.target.value;

    const modeMap = {
      fix: 'fixed',
      ide: 'in_degree',
      ode: 'out_degree',
      deg: 'degree',
      bce: 'betweeness_centrality',
      wide: 'weighted_in_degree',
      wode: 'weighted_out_degree',
      wdeg: 'weighted_degree',
      pgr: 'page_rank',
      ecc: 'eccentricity',
      ccl: 'closeness_centrality',
      hcl: 'harmonic_closeness_centrality',
      egn: 'eigen_centrality',
    };

    const colorMap = {
      fix: DEFAULT_NODE_COLOR,
      //ide: DEGREE_NODE_COLOR,
      //ode: DEGREE_NODE_COLOR,
      deg: DEGREE_NODE_COLOR,
      bce: BETWEENESS_CENTRALITY_NODE_COLOR,
      //wide: DEGREE_NODE_COLOR,
      //wode: DEGREE_NODE_COLOR,
      wdeg: WEIGHTED_DEGREE_NODE_COLOR,
      pgr: PAGERAND_NODE_COLOR,
      //ecc: DEGREE_NODE_COLOR,
      //ccl: DEGREE_NODE_COLOR,
      //hcl: DEGREE_NODE_COLOR,
      egn: EIGEN_CENTRALITY_NODE_COLOR,
    };

    const colorScaleArgMap = {
      ide: 'Ide',
      ode: 'Ode',
      deg: 'Deg',
      bce: 'Bce',
      wide: 'Wide',
      wode: 'Wode',
      wdeg: 'Wdeg',
      pgr: 'Pgr',
      ecc: 'Ecc',
      ccl: 'Ccl',
      hcl: 'Hcl',
      egn: 'Egn',
    };

    const mode = modeMap[selectedOption];
    const newColor = colorMap[selectedOption];
    const colorScaleArg = `size${colorScaleArgMap[selectedOption]}` || null;

    //this.graphManager.graph.forEachNode((node, attributes) => {
    //  this.graphManager.graph.setNodeAttribute(node, 'selected', false);
    //  this.graphManager.graph.setNodeAttribute(node, 'oldColor', null);
    //});

    this.setNodeColorMode(mode, newColor, colorScaleArg, false);
  }

  /**
   * Handle the change of the node color sliders
   * @returns {void}
   */
  handleSliderChange() {
    if (this.nodeColorMode === 'fixed') return;
  
    const colorScaleArgMap = {
      in_degree: 'Ide',
      out_degree: 'Ode',
      degree: 'Deg',
      betweeness_centrality: 'Bce',
      weighted_in_degree: 'Wide',
      weighted_out_degree: 'Wode',
      weighted_degree: 'Wdeg',
      page_rank: 'Pgr',
      eccentricity: 'Ecc',
      closeness_centrality: 'Ccl',
      harmonic_closeness_centrality: 'Hcl',
      eigen_centrality: 'Egn',
    };
  
    const colorMap = {
      //in_degree: DEGREE_NODE_COLOR,
      //out_degree: DEGREE_NODE_COLOR,
      degree: DEGREE_NODE_COLOR,
      betweeness_centrality: BETWEENESS_CENTRALITY_NODE_COLOR,
      //weighted_in_degree: DEGREE_NODE_COLOR,
      //weighted_out_degree: DEGREE_NODE_COLOR,
      weighted_degree: WEIGHTED_DEGREE_NODE_COLOR,
      page_rank: PAGERANK_NODE_COLOR,
      //eccentricity: DEGREE_NODE_COLOR,
      //closeness_centrality: DEGREE_NODE_COLOR,
      //harmonic_closeness_centrality: DEGREE_NODE_COLOR,
      eigen_centrality: EIGEN_CENTRALITY_NODE_COLOR,
    };
  
    const colorScaleArg = `size${colorScaleArgMap[this.nodeColorMode]}`;
    const newColor = colorMap[this.nodeColorMode];
  
    this.setNodeColorMode(this.nodeColorMode, newColor, colorScaleArg, true);
    this.graphManager.renderer.refresh();
  }

  /**
   * Handle the change of the w slider
   * @param {number} wScale 
   */
  handleWSliderChange(wScale) {
    this.wScale = wScale;
    this.handleSliderChange();
  }

  /**
   * Handle the change of the b slider
   * @param {number} bScale
   * @returns {void}
   */
  handleBSliderChange(bScale) {
    this.bScale = bScale;
    this.handleSliderChange();
  }
}



class SearchManager {
  constructor(graphManager) {
    this.graphManager = graphManager;
    this.searchInput = document.getElementById(SEARCH_INPUT_ID);
    this.searchSuggestions = document.getElementById(SEARCH_SUGGESTIONS_ID);
    this.searchBy = DEFAULT_SEARCH_BY;
  }

  setSearchSuggestions() {
    this.setSearchSuggestionBy(this.searchBy);
  }

  setSearchSuggestionBy(byAttribute) {
    const existingOptions = []
    this.searchSuggestions.innerHTML = this.graphManager.graph
    .nodes()
    .map(node => {
      const nodeObj = this.graphManager.graph.getNodeAttributes(node);
      const option = nodeObj[byAttribute];
      if (existingOptions.includes(option)) return '';

      existingOptions.push(option);
      return `<option value="${option}">`;
    })
    .join("\n");
  }

  setSearchQuery(query) {
    let suggestions = null
    if (query === '') {
      suggestions = [];
    } else {
      suggestions = this.graphManager.graph
        .nodes()
        .map(node => {
          const nodeObj = this.graphManager.graph.getNodeAttributes(node);
          return {
            id: node,
            searchBy: nodeObj[this.searchBy].toLowerCase(),
          };
        })
        .filter(({ searchBy }) => searchBy.includes(query.toLowerCase()))
        .sort((a, b) => a.searchBy.localeCompare(b.searchBy));
    }

    const exactMatch = suggestions.find(({ searchBy }) => searchBy === query.toLowerCase());
    // If the query matches exactly one node, select this one only
    if (this.searchBy === DEFAULT_SEARCH_BY && exactMatch) {
      suggestions = [exactMatch];

      // Center the graph on this node
      const nodeXPosition = this.graphManager.renderer.getNodeDisplayData(exactMatch.id).x;
      const nodeYPosition = this.graphManager.renderer.getNodeDisplayData(exactMatch.id).y;
      this.graphManager.renderer.camera.animate({
        x: nodeXPosition,
        y: nodeYPosition,
        ratio: SEARCH_ZOOM_RATIO,
      }, {
        duration: 1000,
      });
    }

    // Set exact node to highlighted, other nodes to not highlighted
    this.graphManager.graph.forEachNode((node, attributes) => {
      const isHighlighted = this.searchBy === DEFAULT_SEARCH_BY && node === exactMatch?.id;
      this.graphManager.graph.setNodeAttribute(node, 'highlighted', isHighlighted);
    });

    // Get new nodes to update
    const oldSuggestions = this.graphManager.graph
      .nodes()
      .filter(node => this.graphManager.graph.getNodeAttributes(node).searchSelected);
    const nodesToDeselect = oldSuggestions.filter(
      node => !suggestions.find(suggestion => suggestion.id === node)
    );
    const nodesToSelect = suggestions.filter(
      suggestion => !oldSuggestions.find(node => node === suggestion.id)
    );

    // Update new unselected nodes
    nodesToDeselect.forEach(node => {
      this.graphManager.graph.setNodeAttribute(node, 'searchSelected', false, { skipIndexation: true });
      this.graphManager.graph.setNodeAttribute(node, 'color', this.graphManager.graph.getNodeAttributes(node).oldColor);
      this.graphManager.graph.setNodeAttribute(node, 'oldColor', null, { skipIndexation: true });
    });

    // Update new selected nodes
    nodesToSelect.forEach(({ id }) => {
      this.graphManager.graph.setNodeAttribute(id, 'searchSelected', true, { skipIndexation: true });
      this.graphManager.graph.setNodeAttribute(id, 'oldColor', this.graphManager.graph.getNodeAttributes(id).color);
      this.graphManager.graph.setNodeAttribute(id, 'color', SEARCH_SELECTED_NODE_COLOR, { skipIndexation: true });
    });

    this.graphManager.renderer.refresh();
  }

  handleSearchByCityCheckboxChange(isChecked) {
    this.searchBy = isChecked ? 'city' : DEFAULT_SEARCH_BY;
    this.setSearchSuggestions()
    this.setSearchQuery(this.searchInput.value);
  }
}
