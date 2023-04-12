import {csvParseRows, csvFormatRows} from 'd3-dsv';
import Graph from 'graphology';
import Sigma from 'sigma';

// Fixed variables
const GRAPH_CONTAINER_ID = 'container';
const SELECT_LAYOUT_ID = 'select_layout';
const SELECT_NODE_SIZE_ID = 'select_node_size';
const CHECKBOX_EDGE_OPACITY_ID = 'edges_opacity';
const W_SLIDER_ID = 'w_slider';
const W_SLIDER_LABEL_ID = 'w_slider_label';
const B_SLIDER_ID = 'b_slider';
const B_SLIDER_LABEL_ID = 'b_slider_label';

const DEFAULT_LAYOUT_MODE = 'random';
const DEFAULT_LAYOUT_TRANSITION_DURATION = 2_000;

const DEFAULT_NODE_SIZE_MODE = 'fixed';
const DEFAULT_NODE_SIZE_TRANSITION_DURATION = 1_000;
const DEFAULT_NODE_SIZE = 2;
const DEFAULT_NODE_TEXT_COLOR = '#FFFFFF';
const MIN_NODE_SIZE = 1;
const MAX_NODE_SIZE = 10;
const DEFAULT_NODE_COLOR_MODE = 'fixed';
const DEFAULT_NODE_COLOR_TRANSITION_DURATION = 1_000;
const DEFAULT_NODE_COLOR = '#aaaaaa';
const DEGREE_NODE_COLOR = '#db3927';
const BETWEENESS_CENTRALITY_NODE_COLOR = '#8d2eb2';

const DEFAULT_EDGE_SCALING = 50_000;
const DEFAULT_EDGE_OPACITY = 0.5;
const DEFAULT_EDGE_COLOR = 'rgba(150, 150, 150, ' + DEFAULT_EDGE_OPACITY + ')';

const NETWORK_SOURCE = 'transports';
const NODES_FILE_PATH = '/data/networks/' + NETWORK_SOURCE + '/web_data/network_nodes.csv';
const EDGES_FILE_PATH = '/data/networks/' + NETWORK_SOURCE + '/web_data/network_edges.csv';

class GraphManager {
  constructor() {
    this.graph = null;
    this.renderer = null;
    this.layout_manager = new LayoutManager(this, this.renderer);
    this.node_size_manager = new NodeSizeManager(this, this.renderer);
    this.color_manager = new ColorManager(this, this.renderer);
  }

  get_normalized_value(value, min, max) {
    return (value - min) / (max - min);
  }

  get_normalized_node_size(value, min, max) {
    const normalized_value = this.get_normalized_value(value, min, max);
    return normalized_value * (MAX_NODE_SIZE - MIN_NODE_SIZE) + MIN_NODE_SIZE;
  }

  /**
   * Load data from CSV files and create graph
   * @returns {Promise<Graph>}
   */
  async load_data () {
    // Fetch data
    const node_response = await fetch(NODES_FILE_PATH);
    const node_data = await node_response.text();
  
    const edge_response = await fetch(EDGES_FILE_PATH);
    const edge_data = await edge_response.text();

    // Create graph
    const graph = new Graph();

    // Add nodes
    csvParseRows(node_data, (row, index) => {
      // Skip the header row
      if (index === 0) return null;
  
      const id = row[0];
  
      // Add source if it doesn't exist
      if (!graph.hasNode(id)) {
        const label = row[1];
        const x_rdm = Math.random();
        const y_rdm = Math.random();
        const x_fa2 = parseFloat(row[2]);
        const y_fa2 = parseFloat(row[3]);
        const x_geo = parseFloat(row[4]);
        const y_geo = parseFloat(row[5]);

        const indegree = parseInt(row[6]);
        const outdegree = parseInt(row[7]);
        const degree = parseInt(row[8]);
        const betweeness_centrality = parseFloat(row[9]);


        graph.addNode(id, {
          label: label, 
          color: DEFAULT_NODE_COLOR,
          x_rdm: x_rdm,
          y_rdm: y_rdm,
          x_fa2: x_fa2, 
          y_fa2: y_fa2,
          x_geo: x_geo,
          y_geo: y_geo,
          x: x_rdm,
          y: y_rdm,
          size: DEFAULT_NODE_SIZE,
          size_fix: DEFAULT_NODE_SIZE,
          size_ide: indegree,
          size_ode: outdegree,
          size_deg: degree,
          size_bce: betweeness_centrality,
          color_fix: DEFAULT_NODE_COLOR,
        });
      }
      return null;
    });

    // Normalize nodes coordinates
    let min_fa2 = Math.min(...graph.nodes().map(node => graph.getNodeAttribute(node, 'x_fa2')));
    min_fa2 = Math.min(min_fa2, Math.min(...graph.nodes().map(node => graph.getNodeAttribute(node, 'y_fa2'))));
    let max_fa2 = Math.max(...graph.nodes().map(node => graph.getNodeAttribute(node, 'x_fa2')));
    max_fa2 = Math.max(max_fa2, Math.max(...graph.nodes().map(node => graph.getNodeAttribute(node, 'y_fa2'))));
    let min_geo = Math.min(...graph.nodes().map(node => graph.getNodeAttribute(node, 'x_geo')));
    min_geo = Math.min(min_geo, Math.min(...graph.nodes().map(node => graph.getNodeAttribute(node, 'y_geo'))));
    let max_geo = Math.max(...graph.nodes().map(node => graph.getNodeAttribute(node, 'x_geo')));
    max_geo = Math.max(max_geo, Math.max(...graph.nodes().map(node => graph.getNodeAttribute(node, 'y_geo'))));
    graph.forEachNode((node, attributes) => {
      attributes.x_fa2 = this.get_normalized_value(attributes.x_fa2, min_fa2, max_fa2);
      attributes.y_fa2 = this.get_normalized_value(attributes.y_fa2, min_fa2, max_fa2);
      attributes.x_geo = this.get_normalized_value(attributes.x_geo, min_geo, max_geo);
      attributes.y_geo = this.get_normalized_value(attributes.y_geo, min_geo, max_geo);
    });

    // Fix missing values in node sizes
    graph.forEachNode((node, attributes) => {
      if (isNaN(attributes.size_ide)) {
        attributes.size_ide = 0;
      }
      if (isNaN(attributes.size_ode)) {
        attributes.size_ode = 0;
      }
      if (isNaN(attributes.size_deg)) {
        attributes.size_deg = 0;
      }
      if (isNaN(attributes.size_bce)) {
        attributes.size_bce = 0;
      }
    });

    // Normalize nodes size
    const min_ide = Math.min(...graph.nodes().map(node => graph.getNodeAttribute(node, 'size_ide')));
    const max_ide = Math.max(...graph.nodes().map(node => graph.getNodeAttribute(node, 'size_ide')));
    const min_ode = Math.min(...graph.nodes().map(node => graph.getNodeAttribute(node, 'size_ode')));
    const max_ode = Math.max(...graph.nodes().map(node => graph.getNodeAttribute(node, 'size_ode')));
    const min_deg = Math.min(...graph.nodes().map(node => graph.getNodeAttribute(node, 'size_deg')));
    const max_deg = Math.max(...graph.nodes().map(node => graph.getNodeAttribute(node, 'size_deg')));
    const min_bce = Math.min(...graph.nodes().map(node => graph.getNodeAttribute(node, 'size_bce')));
    const max_bce = Math.max(...graph.nodes().map(node => graph.getNodeAttribute(node, 'size_bce')));
    graph.forEachNode((node, attributes) => {
      attributes.size_ide = this.get_normalized_node_size(attributes.size_ide, min_ide, max_ide);
      attributes.size_ode = this.get_normalized_node_size(attributes.size_ode, min_ode, max_ode);
      attributes.size_deg = this.get_normalized_node_size(attributes.size_deg, min_deg, max_deg);
      attributes.size_bce = this.get_normalized_node_size(attributes.size_bce, min_bce, max_bce);
    });

  
    // Add edges
    csvParseRows(edge_data, (row, index) => {
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

    this.load_data().then(graph => {
      // Define graph
      this.graph = graph;
      this.renderer = new Sigma(this.graph, document.getElementById(GRAPH_CONTAINER_ID));

      // Add event listeners
      const selectLayoutElement = document.getElementById(SELECT_LAYOUT_ID);
      selectLayoutElement.addEventListener('change', (event) => {
        this.layout_manager.handleLayoutSelectChange(event);
      });

      const selectNodeSizeElement = document.getElementById(SELECT_NODE_SIZE_ID);
      selectNodeSizeElement.addEventListener('change', (event) => {
        this.node_size_manager.handleNodeSizeSelectChange(event);
      });

      const selectNodeColorElement = document.getElementById(SELECT_NODE_SIZE_ID);
      selectNodeColorElement.addEventListener('change', (event) => {
        this.color_manager.handleNodeColorSelectChange(event);
      });

      const edgesOpacityCheckbox = document.getElementById(CHECKBOX_EDGE_OPACITY_ID);
      edgesOpacityCheckbox.addEventListener('change', (event) => {
        const isChecked = event.target.checked;
        this.color_manager.handleEdgesOpacityCheckboxChange(isChecked);
      });

      const wSlider = document.getElementById(W_SLIDER_ID);
      wSlider.addEventListener("input", (event) => {
        const w_scale = parseFloat(event.target.value);
        this.color_manager.handleWSliderChange(w_scale);

        // Rename slider label
        const wSliderLabel = document.getElementById(W_SLIDER_LABEL_ID);
        wSliderLabel.innerHTML = `W ${w_scale.toFixed(2)}`;
      });

      const bSlider = document.getElementById(B_SLIDER_ID);
      bSlider.addEventListener("input", (event) => {
        const b_scale = parseFloat(event.target.value);
        this.color_manager.handleBSliderChange(b_scale);

        // Rename slider label
        const bSliderLabel = document.getElementById(B_SLIDER_LABEL_ID);
        bSliderLabel.innerHTML = `B ${b_scale.toFixed(2)}`;
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
  constructor(graph_manager) {
    this.graph_manager = graph_manager;
    this.layout_mode = DEFAULT_LAYOUT_MODE;
    this.layout_transition_duration = DEFAULT_LAYOUT_TRANSITION_DURATION;
  }

  /**
   * Linear interpolation between two values
   * @param {number} a, the start value
   * @param {number} b, the end value
   * @param {number} t, the interpolation value between 0 and 1
   * @returns {number} the interpolated value
   */
  lerp(a, b, t) {
    return a + (b - a) * t;
  }
  
  /**
   * Update node positions
   * @param {string} old_x_arg, the old x coordinate attribute name
   * @param {string} old_y_arg, the old y coordinate attribute name
   * @param {string} new_x_arg, the new x coordinate attribute name
   * @param {string} new_y_arg, the new y coordinate attribute name
   * @param {number} progress, the interpolation value between 0 and 1
   * @returns {void}
   */
  update_node_positions(
    old_x_arg, 
    old_y_arg, 
    new_x_arg, 
    new_y_arg, 
    progress
  ) {
    // Iterate through the nodes and update their positions
    this.graph_manager.graph.nodes().forEach(node => {
      const node_obj = this.graph_manager.graph.getNodeAttributes(node);
      node_obj.x = this.lerp(node_obj[old_x_arg], node_obj[new_x_arg], progress);
      node_obj.y = this.lerp(node_obj[old_y_arg], node_obj[new_y_arg], progress);
    });
  }
  
  /**
   * 
   * @param {string} old_x_arg, the old x coordinate attribute name
   * @param {string} old_y_arg, the old y coordinate attribute name
   * @param {string} new_x_arg, the new x coordinate attribute name
   * @param {string} new_y_arg, the new y coordinate attribute name
   * @param {function} easing_function, the easing function to use
   */
  animate_node_transition(
    old_x_arg, 
    old_y_arg, 
    new_x_arg, 
    new_y_arg, 
    easing_function,
  ) {
    const startTime = performance.now();
  
    const step = (timestamp) => {
      const progress = Math.min((timestamp - startTime) / this.layout_transition_duration, 1);
      const easedProgress = easing_function(progress);

      this.update_node_positions(old_x_arg, old_y_arg, new_x_arg, new_y_arg, easedProgress);
  
      // Refresh the renderer to display the updated positions
      this.graph_manager.renderer.refresh();
  
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    }
  
    requestAnimationFrame(step);
  }

  /**
   * Get the x and y coordinate attribute names for the current layout
   * @returns {string[]} the x and y coordinate attribute names
   */
  get_layout_coordinates_arg() {
    if (this.layout_mode === 'random') return ['x_rdm', 'y_rdm'];
    if (this.layout_mode === 'forceatlas2') return ['x_fa2', 'y_fa2'];
    if (this.layout_mode === 'geographical') return ['x_geo', 'y_geo'];
  
    console.error('Unknown layout: ' + this.layout_mode);
    return ['x_rdm', 'y_rdm'];
  }

  /**
   * Ease in out quad, to be used as easing function for layout transitions
   * @param {number} t, the interpolation value between 0 and 1
   * @returns {number} the eased interpolation value
   */
  ease_in_out_quad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  /**
   * Set the layout mode
   * @param {string} layout_mode, the layout mode
   * @param {string} new_x_arg, the new x coordinate attribute name
   * @param {string} new_y_arg, the new y coordinate attribute name
   * @returns 
   */
  set_layout_mode(layout_mode, new_x_arg, new_y_arg) {
    if (this.layout_mode === layout_mode) return;

    const coordinates_arg = this.get_layout_coordinates_arg();
    const old_x_arg = coordinates_arg[0];
    const old_y_arg = coordinates_arg[1];
    this.animate_node_transition(
      old_x_arg, 
      old_y_arg, 
      new_x_arg, 
      new_y_arg, 
      this.ease_in_out_quad,
    );
    this.layout_mode = layout_mode;
  }

  /**
   * Handle layout select change
   * @param {*} event 
   */
  handleLayoutSelectChange(event) {
    const selectedOption = event.target.value;
  
    if (selectedOption === 'rdm') {
      this.set_layout_mode('random', 'x_rdm', 'y_rdm');
    } else if (selectedOption === 'fa2') {
      this.set_layout_mode('forceatlas2', 'x_fa2', 'y_fa2');
    } else if (selectedOption === 'geo') {
      this.set_layout_mode('geographical', 'x_geo', 'y_geo');
    }
  }
}



class NodeSizeManager {
  constructor(graph_manager, renderer) {
    this.graph_manager = graph_manager;
    this.renderer = renderer;
    this.node_size_mode = DEFAULT_NODE_SIZE_MODE;
    this.node_size_transition_duration = DEFAULT_NODE_SIZE_TRANSITION_DURATION;
  }

  /**
   * Linear interpolation between two values
   * @param {number} a, the start value
   * @param {number} b, the end value
   * @param {number} t, the interpolation value between 0 and 1
   * @returns {number} the interpolated value
   */
    lerp(a, b, t) {
      return a + (b - a) * t;
    }

  /**
   * Update the node sizes
   * @param {string} new_size_arg, the new size attribute name
   * @param {number} progress, the interpolation value between 0 and 1
   * @returns {void}
   */
  update_node_sizes(new_size_arg, progress) {
    this.graph_manager.graph.nodes().forEach((node) => {
      const node_obj = this.graph_manager.graph.getNodeAttributes(node);
      node_obj.size = this.lerp(node_obj.old_size, node_obj[new_size_arg], progress);
    });
  }

  animate_node_transition(
    new_size_arg, 
    easing_function
  ) {
    const startTime = performance.now();

    // Define old size attribute
    this.graph_manager.graph.nodes().forEach((node) => {
      const node_obj = this.graph_manager.graph.getNodeAttributes(node);
      node_obj.old_size = node_obj.size;
    });

    const step = (timestamp) => {
      const progress = Math.min((timestamp - startTime) / this.node_size_transition_duration, 1);
      const easedProgress = easing_function(progress);

      this.update_node_sizes(new_size_arg, easedProgress);

      // Refresh the renderer to display the updated positions
      this.graph_manager.renderer.refresh();

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    }

    requestAnimationFrame(step);
  }

  /**
   * Ease in out quad, to be used as easing function for layout transitions
   * @param {number} t, the interpolation value between 0 and 1
   * @returns {number} the eased interpolation value
   */
  ease_in_out_quad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  set_node_size_mode(node_size_mode, new_size_arg) {
    if (this.node_size_mode === node_size_mode) return;
    this.animate_node_transition(
      new_size_arg,
      this.ease_in_out_quad,
    );

    this.node_size_mode = node_size_mode;
  }

  handleNodeSizeSelectChange(event) {
    const selectedOption = event.target.value;
  
    if (selectedOption === 'fix') {
      this.set_node_size_mode('fixed', 'size_fix');
    } else if (selectedOption === 'ide') {
      this.set_node_size_mode('in_degree', 'size_ide');
    } else if (selectedOption === 'ode') {
      this.set_node_size_mode('out_degree', 'size_ode');
    } else if (selectedOption === 'deg') {
      this.set_node_size_mode('degree', 'size_deg');
    } else if (selectedOption === 'bce') {
      this.set_node_size_mode('betweeness_centrality', 'size_bce');
    }
  }
}

class ColorManager {
  constructor(graph_manager, renderer) {
    this.graph_manager = graph_manager;
    this.renderer = renderer;
    this.node_color_mode = DEFAULT_NODE_COLOR_MODE;
    this.node_color_transition_duration = DEFAULT_NODE_COLOR_TRANSITION_DURATION;

    this.w_scale = 1;
    this.b_scale = 0.5;
  }

  isRgbaColor(color) {
    const rgbaRegex = /^rgba\(\d{1,3},\s*\d{1,3},\s*\d{1,3},\s*(0(\.\d+)?|1(\.0+)?)\)$/i;
    return rgbaRegex.test(color);
  }
  
  isRgbColor(color) {
    const rgbRegex = /^rgb\(\d{1,3},\s*\d{1,3},\s*\d{1,3}\)$/i;
    return rgbRegex.test(color);
  }
  
  isHexColor(color) {
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    return hexRegex.test(color);
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  }

  hexToRgba(hex, alpha = 1) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  
    if (result) {
      const r = parseInt(result[1], 16);
      const g = parseInt(result[2], 16);
      const b = parseInt(result[3], 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
  
    return null;
  }
  
  rgbToHex(r, g, b) {
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

  rgbToRgba(rgb, alpha = 1) {
    const result = rgb.match(/rgb?\((\d+),\s*(\d+),\s*(\d+)\)/i);

    if (result) {
      const r = parseInt(result[1]);
      const g = parseInt(result[2]);
      const b = parseInt(result[3]);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    return null;
  }

  rgbaToHex(rgba) {
    const result = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+(?:\.\d+)?))?\)/i);
  
    if (result) {
      const r = parseInt(result[1]);
      const g = parseInt(result[2]);
      const b = parseInt(result[3]);
      return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    }
  
    return null;
  }

  setRgbaAlpha(rgba, alpha) {
    const result = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+(?:\.\d+)?))?\)/i);

    if (result) {
      const r = parseInt(result[1]);
      const g = parseInt(result[2]);
      const b = parseInt(result[3]);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    return null;
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

  color_lerp(hex_color_1, hex_Color_2, t) {
    const color_1 = this.hexToRgb(hex_color_1);
    const color_2 = this.hexToRgb(hex_Color_2);
  
    const r = Math.round(this.lerp(color_1.r, color_2.r, t));
    const g = Math.round(this.lerp(color_1.g, color_2.g, t));
    const b = Math.round(this.lerp(color_1.b, color_2.b, t));
  
    return this.rgbToHex(r, g, b);
  }

  /**
   * Update the node colors
   * @param {string} node_color_mode, the new color mode
   * @param {number} progress, the interpolation value between 0 and 1
   * @returns {void}
   */
  update_node_colors(progress = 1) {
    this.graph_manager.graph.nodes().forEach((node) => {
      const node_obj = this.graph_manager.graph.getNodeAttributes(node);
      node_obj.color = this.color_lerp(node_obj.old_color, node_obj.new_color, progress);
    });
  }

  update_edge_colors(progress = 1) {
    const graph = this.graph_manager.graph;
    graph.edges().forEach((edge) => {
      // Get edge and source node
      const edge_obj = this.graph_manager.graph.getEdgeAttributes(edge);
      const source_node = edge_obj.source;
      const source_node_obj = this.graph_manager.graph.getNodeAttributes(source_node);
      // Get final color
      let final_color = this.color_lerp(source_node_obj.old_color, source_node_obj.new_color, progress);
      if (this.isRgbaColor(edge_obj.color)){
        final_color = this.hexToRgba(final_color, DEFAULT_EDGE_OPACITY);
      }
      // Update edge color
      edge_obj.color = final_color;
    });
  }

  set_nodes_color(
    new_color, 
    color_scale_arg,
    immediate = false
  ) {
    // Define old and new color attribute
    this.graph_manager.graph.nodes().forEach((node) => {
      const node_obj = this.graph_manager.graph.getNodeAttributes(node);
      // Define old color
      node_obj.old_color = node_obj.color;
      // Define new color
      let color_scale = 1;
      if (color_scale_arg) {
        color_scale = node_obj[color_scale_arg];
        color_scale = (color_scale - this.graph_manager.get_normalized_value(color_scale, MIN_NODE_SIZE, MAX_NODE_SIZE)) / (MAX_NODE_SIZE - MIN_NODE_SIZE);
        color_scale = 1 / (1 + Math.exp(-this.w_scale * (color_scale - this.b_scale)));
      }

      node_obj.new_color = this.color_lerp(DEFAULT_NODE_COLOR, new_color, color_scale);
    });

    if (immediate) {
      this.update_node_colors();
      this.update_edge_colors();
    }
  }

  animate_node_transition(
    new_color, 
    color_scale_arg,
    easing_function,
  ) {
    const startTime = performance.now();

    this.set_nodes_color(new_color, color_scale_arg);

    const step = (timestamp) => {
      const progress = Math.min((timestamp - startTime) / this.node_color_transition_duration, 1);
      const easedProgress = easing_function(progress);

      this.update_node_colors(easedProgress);
      this.update_edge_colors(easedProgress);

      // Refresh the renderer to display the updated positions
      this.graph_manager.renderer.refresh();

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    }

    requestAnimationFrame(step);
  }

  /**
   * Ease in out quad, to be used as easing function for layout transitions
   * @param {number} t, the interpolation value between 0 and 1
   * @returns {number} the eased interpolation value
   */
  ease_in_out_quad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  set_node_color_mode(node_color_mode, new_color, color_scale_arg) {
    if (this.node_color_mode === node_color_mode) return;

    this.animate_node_transition(
      new_color,
      color_scale_arg,
      this.ease_in_out_quad,
    );

    this.node_color_mode = node_color_mode;
  }

  handleNodeColorSelectChange(event) {
    const selectedOption = event.target.value;
  
    if (selectedOption === 'fix') {
      this.set_node_color_mode('fixed', DEFAULT_NODE_COLOR, null);
    } else if (selectedOption === 'ide') {
      this.set_node_color_mode('in_degree', DEGREE_NODE_COLOR, 'size_ide');
    } else if (selectedOption === 'ode') {
      this.set_node_color_mode('out_degree', DEGREE_NODE_COLOR, 'size_ode');
    } else if (selectedOption === 'deg') {
      this.set_node_color_mode('degree', DEGREE_NODE_COLOR, 'size_deg');
    } else if (selectedOption === 'bce') {
      this.set_node_color_mode('betweeness_centrality', BETWEENESS_CENTRALITY_NODE_COLOR, 'size_bce', 1);
    }
  }

  handleEdgesOpacityCheckboxChange(is_checked) {
    const graph = this.graph_manager.graph;
  
    if (is_checked) {
      graph.edges().forEach((edge) => {
        const edge_obj = graph.getEdgeAttributes(edge);
        if (this.isRgbaColor(edge_obj.color)) return;
        if (this.isHexColor(edge_obj.color)) {
          edge_obj.color = this.hexToRgba(edge_obj.color, DEFAULT_EDGE_OPACITY);
        } else if (this.isRgbColor(edge_obj.color)) {
          edge_obj.color = this.rgbToRgba(edge_obj.color, DEFAULT_EDGE_OPACITY);
        }
      });
    } else {
      graph.edges().forEach((edge) => {
        const edge_obj = graph.getEdgeAttributes(edge);
        if (this.isHexColor(edge_obj.color)) return;
        if (this.isRgbColor(edge_obj.color)) {
          edge_obj.color = this.rgbToHex(edge_obj.color);
        } else if (this.isRgbaColor(edge_obj.color)) {
          edge_obj.color = this.rgbaToHex(edge_obj.color);
        }
      });
    }

    this.graph_manager.renderer.refresh();
  }

  handleWSliderChange(w_scale) {
    this.w_scale = w_scale;
    this.handleSliderChange();
  }

  handleBSliderChange(b_scale) {
    this.b_scale = b_scale;
    this.handleSliderChange();
  }

  handleSliderChange() {
    if (this.node_color_mode === 'fixed') return;

    if (this.node_color_mode === 'in_degree') {
      this.set_nodes_color(DEGREE_NODE_COLOR, 'size_ide', true);
    } else if (this.node_color_mode === 'out_degree') {
      this.set_nodes_color(DEGREE_NODE_COLOR, 'size_ode', true);
    } else if (this.node_color_mode === 'degree') {
      this.set_nodes_color(DEGREE_NODE_COLOR, 'size_deg', true);
    } else if (this.node_color_mode === 'betweeness_centrality') {
      this.set_nodes_color(BETWEENESS_CENTRALITY_NODE_COLOR, 'size_bce', true);
    }

    this.graph_manager.renderer.refresh();
  }
}


document.addEventListener('DOMContentLoaded', () => {
  const graphManager = new GraphManager();
  graphManager.load();
});