import * as d3 from 'd3';
import * as THREE from 'three';

/*
 * TODO:
 * Add a slider for the choice of MAX_TRAIN_DELAY
 * Be able to highlight train types (e.g. IC, IR, RE, etc.)
 * Add a legend for the heatmap (maybe)
 */

// MAP
const DIV_CONTAINER_ID = 'container';
const SELECT_HEATMAP_ID = 'select_heatmap';
const SELECT_TRAIN_COLOR_MODE_ID = 'select_train_color_mode';
const SLIDER_SIMULATION_SPEED_ID = 'slider_simulation_speed';
const SLIDER_SIMULATION_SPEED_LABEL_ID = 'slider_simulation_speed_label';

const MAP_PATH = '../../data/map/swissBOUNDARIES3D_1_3_TLM_LANDESGEBIET.geojson';
const TRAINS_FOLDER_PATH = '../../data/map/train_trips_bins/';
const HEATMAP_PATH = '../../data/map/density_heatmap.png';
const HEATMAP_TRANSPORT_TYPE_PATH_PREFIX = '../../data/map/density_heatmap_';
const HEATMAP_TRANSPORT_TYPE_PATH_SUFFIX = '.png';

const SWISS_BORDER_LINE_NAME = 'swissborder_line';
const SWISS_BORDER_GROUP_NAME = 'swissborder_group';
const HEATMAP_SCENE_NAME = 'heatmap';
const TRAIN_SCENE_NAME_PREFIX = 'train_';

const TRAIN_FILES_BIN_SIZE = 15;

const DEFAULT_SIMULATION_SPEED = 60;

const MAX_TRAIN_DELAY = 3 * 60;
const MAX_TRAIN_SPEED = 7;

const DEFAULT_HEATMAP_MODE = null;
const DEFAULT_TRAIN_COLOR_MODE = 'uniform';

const DEFAULT_MAP_BORDER_COLOR = '#aaaaaa';
const DEFAULT_TRAIN_COLOR = '#eeeeee';
const EARLY_TRAIN_COLOR = '#00ff00';
const LATE_TRAIN_COLOR = '#ff0000';
const SLOW_TRAIN_COLOR = '#0000ff';
const FAST_TRAIN_COLOR = '#ffff00';

const DEFAULT_HEATMAP_SCALE_FACTOR_INC = 0.02;
const DEFAULT_HEATMAP_X_OFFSET = 10;
const DEFAULT_HEATMAP_Y_OFFSET = 5;

// CLOCK
const CLOCK_RADIUS = 100;
const CLOCK_SCALE_FACTOR = 0.8;
const CLOCK_MARGIN = CLOCK_RADIUS * CLOCK_SCALE_FACTOR + 20;

class Clock {
  private scene: THREE.Scene;
  private clock!: THREE.Object3D;

  private hourHandMesh!: THREE.Mesh;
  private hourHandPivot: THREE.Object3D = new THREE.Object3D();
  private minuteHandMesh!: THREE.Mesh;
  private minuteHandPivot: THREE.Object3D = new THREE.Object3D();

  private x: number;
  private y: number;
  private radius: number;
  private scaleFactor: number;
  private backgroundColor: THREE.Color;
  private markerColor: THREE.Color;
  private clockHandColor: THREE.Color;

  private time: number;

  constructor(
      scene: THREE.Scene,

      x: number,
      y: number,
      scaleFactor: number,
      backgroundColor: THREE.Color,
      markerColor: THREE.Color,
      clockHandColor: THREE.Color,
  ) {
      this.scene = scene;
      this.x = x;
      this.y = y;
      this.radius = CLOCK_RADIUS;
      this.scaleFactor = scaleFactor;
      this.backgroundColor = backgroundColor;
      this.markerColor = markerColor;
      this.clockHandColor = clockHandColor;

      this.time = 0;

      this.init();
  }

  setTime(time: number) {
      this.time = time;
  }

  getTime() {
      return this.time;
  }

  init() {
      // Draw the clock background
      this.clock = new THREE.Object3D();
      const clockGeometry = new THREE.CircleGeometry(this.radius, 64);
      const clockMaterial = new THREE.MeshBasicMaterial({
          color: this.backgroundColor,
          side: THREE.DoubleSide,
      });
      const clockMesh = new THREE.Mesh(clockGeometry, clockMaterial);
      this.clock.add(clockMesh);

      // Draw the first 12 markers
      const markerGeometry = new THREE.PlaneGeometry(7, 25);
      const markerMaterial = new THREE.MeshBasicMaterial({
          color: this.markerColor,
          side: THREE.DoubleSide,
      });
      for (let i = 0; i < 12; i++) {
          const markerMesh = new THREE.Mesh(markerGeometry, markerMaterial);
          markerMesh.position.set(
              0.8 * this.radius * Math.cos(i * Math.PI / 6),
              0.8 * this.radius * Math.sin(i * Math.PI / 6),
              0
          );
          markerMesh.rotation.z = Math.PI / 2 + i * Math.PI / 6;
          this.clock.add(markerMesh);
      }

      // Draw the other smaller markers
      const markerGeometry2 = new THREE.PlaneGeometry(2.5, 8);
      for (let i = 0; i < 60; i++) {
          const markerMesh = new THREE.Mesh(markerGeometry2, markerMaterial);
          markerMesh.position.set(
              0.87 * this.radius * Math.cos(i * Math.PI / 30),
              0.87 * this.radius * Math.sin(i * Math.PI / 30),
              0
          );
          markerMesh.rotation.z = Math.PI / 2 + i * Math.PI / 30;
          this.clock.add(markerMesh);
      }

      // Draw the hour hand
      const hourHandGeometry = new THREE.PlaneGeometry(9, 75);
      const hourHandMaterial = new THREE.MeshBasicMaterial({
          color: this.clockHandColor,
          side: THREE.DoubleSide,
      });
      this.hourHandMesh = new THREE.Mesh(hourHandGeometry, hourHandMaterial);
      this.hourHandMesh.position.set(0, 15, 0); // Offset the mesh by half its length
      this.hourHandPivot.add(this.hourHandMesh);
      this.hourHandPivot.position.set(0, 0, 0);
      this.clock.add(this.hourHandPivot);

      // Draw the minute hand
      const minuteHandGeometry = new THREE.PlaneGeometry(6, 100);
      const minuteHandMaterial = new THREE.MeshBasicMaterial({
          color: this.clockHandColor,
          side: THREE.DoubleSide,
      });
      this.minuteHandMesh = new THREE.Mesh(minuteHandGeometry, minuteHandMaterial);
      this.minuteHandMesh.position.set(0, 30, 0); // Offset the mesh by half its length
      this.minuteHandPivot.add(this.minuteHandMesh);
      this.minuteHandPivot.position.set(0, 0, 0);
      this.clock.add(this.minuteHandPivot);

      // Scale and translate the clock
      this.clock.scale.set(this.scaleFactor, this.scaleFactor, 1);
      this.clock.position.set(this.x, this.y, 0);

  }

  draw() {
    // update rotation of hour hand
    this.hourHandPivot.rotation.z = -this.time * Math.PI / 360;

    // update rotation of minute hand
    this.minuteHandPivot.rotation.z = -this.time * Math.PI / 30;

  }

  addToScene() {
    this.scene.add(this.clock);
  }
}

class Map {
  // Loaded data
  private swissBorderData!: any;
  private trips!: any;
  private binSize!: number;

  // Scene
  private container!: HTMLElement;
  private width!: number;
  private height!: number;
  private scene!: THREE.Scene;
  private camera!: THREE.OrthographicCamera;
  private renderer!: THREE.WebGLRenderer;
  private projection!: (coordinates: [number, number], cached: boolean) => [number, number] | null;

  // Clock
  private clock!: Clock;

  // Heatmap
  private heatmapMode: string | null = DEFAULT_HEATMAP_MODE;
  private heatmapObject!: THREE.Mesh;

  // Train
  private trainColorMode: string = DEFAULT_TRAIN_COLOR_MODE;
  private trainObjects: { [key: string]: THREE.Mesh } = {};
  private trainPool: THREE.Mesh[] = [];
  private swissBorderObjects!: THREE.Group;

  // Cache
  private projectionCache: { [key: string]: [number, number] } = {};
  private angleCache: { [key: string]: number } = {};

  private simulationSpeed: number = DEFAULT_SIMULATION_SPEED;

  constructor() {
    this.loadData().then(() => {
      this.initScene();
      this.initEvents();

      this.drawSwissBorder();
      this.drawHeatMap(DEFAULT_HEATMAP_MODE);

      this.clock = new Clock(
        this.scene,
        CLOCK_MARGIN,
        this.height - CLOCK_MARGIN,
        CLOCK_SCALE_FACTOR,
        new THREE.Color(0xdddddd),
        new THREE.Color(0x000000),
        new THREE.Color(0x000000)
      );
      this.clock.addToScene();

      this.render();
    });
  }

  /**
   * Initialize the scene
   * @returns {void}
   */
  private initScene(): void {
    this.container = document.getElementById(DIV_CONTAINER_ID) as HTMLElement;
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(
      0,
      this.width,
      this.height,
      0,
      0.1, // near plane
      1000 // far plane
    );

    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true
    });
    this.renderer.autoClear = true;
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.container.appendChild(this.renderer.domElement);

    this.camera.position.z = 10;
  }

  /**
   * Initialize the events
   * @returns {void}
   */
  private initEvents(): void {
    // Heatmap
    const selectHeatmap = document.getElementById(SELECT_HEATMAP_ID) as HTMLSelectElement;
    selectHeatmap.addEventListener('change', (event: Event) => {
      if (!event || !event.target) return;

      const target = event.target as HTMLSelectElement;
      const heatmapMode = target.value;
      if (heatmapMode === '') {
        this.drawHeatMap(null);
        return;
      }

      this.drawHeatMap(heatmapMode);
    });

    // Train color mode
    const selectTrainColor = document.getElementById(SELECT_TRAIN_COLOR_MODE_ID) as HTMLSelectElement;
    selectTrainColor.addEventListener('change', (event) => {
      if (!event || !event.target) return;

      const target = event.target as HTMLSelectElement;
      const trainColorMode = target.value;
      this.setTrainColorMode(trainColorMode);
    });

    // Simulation FPS
    const sliderSimulationFps = document.getElementById(SLIDER_SIMULATION_SPEED_ID) as HTMLInputElement;
    sliderSimulationFps.addEventListener('input', (event) => {
      const target = event.target as HTMLInputElement;
      const fps = target.value;
      this.setSimulationFps(Number(fps));

      // Rename slider label
      const sliderSimulationFpsLabel = document.getElementById(SLIDER_SIMULATION_SPEED_LABEL_ID) as HTMLElement;
      sliderSimulationFpsLabel.innerHTML = `speed`;
    });
  }

  /**
   * Initialize the projection
   * @param {number} minLon the minimum longitude
   * @param {number} maxLon the maximum longitude
   * @param {number} minLat the minimum latitude
   * @param {number} maxLat the maximum latitude
   * @returns {void}
   * @throws {Error} if the screen coordinates are invalid
   */
  private initProjection(minLon: number, maxLon: number, minLat: number, maxLat: number): void {
    // Project the coordinates to the 2D plane
    const geoMercatorProjection = d3.geoMercator();
    const bottomLeft = geoMercatorProjection([minLon, minLat]);
    const topRight = geoMercatorProjection([maxLon, maxLat]);
    if (!bottomLeft || !topRight) throw new Error('Invalid screen coordinates for projection initialization.');

    // Calculate the scale factor
    const inputWidth = topRight[0] - bottomLeft[0];
    const inputHeight = bottomLeft[1] - topRight[1];
    const inputAspectRatio = inputWidth / inputHeight;

    const outputAspectRatio = this.width / this.height;

    let scaleFactor: number;
    if (inputAspectRatio > outputAspectRatio) {
      scaleFactor = this.width / inputWidth;
    } else {
      scaleFactor = this.height / inputHeight;
    }

    // Calculate the translation
    const centerX = (bottomLeft[0] + topRight[0]) / 2;
    const centerY = (bottomLeft[1] + topRight[1]) / 2;
    const translateX = this.width / 2 - centerX * scaleFactor;
    const translateY = this.height / 2 - centerY * scaleFactor;

    this.projection = (coordinates: [number, number], cache: boolean): [number, number] | null => {
      const cacheKey = `${coordinates[0]}-${coordinates[1]}`;

      // Check if the result is already cached
      if (this.projectionCache[cacheKey]) {
        return this.projectionCache[cacheKey];
      }

      // If not cached, calculate and store the result
      const mercatorCoordinates = d3.geoMercator()(coordinates);
      if (!mercatorCoordinates) return null;

      const result: [number, number] = [
        translateX + scaleFactor * mercatorCoordinates[0],
        this.height - (translateY + scaleFactor * mercatorCoordinates[1]), // Invert the y-axis
      ];

      if (cache) {
        this.projectionCache[cacheKey] = result;
      }
      return result;
    };
  }

  /**
   * Load the swiss border data
   * @returns {Promise<void>}
   * @throws {Error} if the data could not be loaded
   */
  async loadSwissBorder(): Promise<void> {
    const data = await d3.json(MAP_PATH);
    if (!data) throw new Error('Invalid Swiss border data at path: ' + MAP_PATH);
    this.swissBorderData = data;
  }

  /**
   * Load the train data
   * @returns {Promise<void>}
   * @throws {Error} if the data could not be loaded
   */
  async loadTrains(): Promise<void> {
    const data: {
      bins: { [index: number]: any };
      bin_size: number;
    } = { bins: {}, bin_size: TRAIN_FILES_BIN_SIZE };

    // Generate an array of promises to read all bin files concurrently
    const binFilePromises = [];
    for (let i = 0; i < 60 * 24; i += TRAIN_FILES_BIN_SIZE) {
      binFilePromises.push(
        d3.json(TRAINS_FOLDER_PATH + i + '.json').then((trainData) => {
          if (!trainData) throw new Error('Invalid train data at path: ' + TRAINS_FOLDER_PATH + i + '.json');
          data.bins[i] = trainData;
        })
      );
    }

    // Wait for all bin files to be read and processed
    await Promise.all(binFilePromises);

    this.trips = data.bins;
    this.binSize = data.bin_size;
  }

  /**
   * Load all data
   * @returns {Promise<void>}
   */
  async loadData(): Promise<void> {
    await this.loadSwissBorder();
    await this.loadTrains();
  }

  /**
   * Draw the swiss border
   * @returns {void}
   */
  private drawSwissBorder(): void {
      // Define the projection
      function getMinMax(data: any, coordinateIndex: number, compareFunc: (a: number, b: number) => boolean, initialValue: number): number {
        return data.features.map((feature: any) => {
          const coordinates = feature.geometry.coordinates[0];
          return coordinates.reduce((acc: number, p: [number, number]) => compareFunc(p[coordinateIndex], acc) ? p[coordinateIndex] : acc, initialValue);
        }).reduce((acc: number, p: number) => compareFunc(p, acc) ? p : acc, initialValue);
      }
      const minLon = getMinMax(this.swissBorderData, 0, (a, b) => a < b, Infinity);
      const maxLon = getMinMax(this.swissBorderData, 0, (a, b) => a > b, -Infinity);
      const minLat = getMinMax(this.swissBorderData, 1, (a, b) => a < b, Infinity);
      const maxLat = getMinMax(this.swissBorderData, 1, (a, b) => a > b, -Infinity);

      this.initProjection(minLon, maxLon, minLat, maxLat);

      // Draw the swiss borders
      const drawFeature = (feature: any) => {
        const coordinates = feature.geometry.coordinates[0];
        const points = coordinates.map((coordinate: [number, number]) => {
          const x = this.projection(coordinate, false)![0];
          const y = this.projection(coordinate, false)![1];
          return new THREE.Vector3(x, y, 0);
        });

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
          color: new THREE.Color(DEFAULT_MAP_BORDER_COLOR),
        });

        const line = new THREE.Line(geometry, material);
        line.name = SWISS_BORDER_LINE_NAME;
        this.swissBorderObjects.add(line);
      }

      this.swissBorderObjects = new THREE.Group();
      this.swissBorderObjects.name = SWISS_BORDER_GROUP_NAME;

      this.swissBorderData.features.forEach((feature: any) => {
        drawFeature(feature);
      });

      this.scene.add(this.swissBorderObjects);
  }

  /**
    * Remove the heatmap
    * @returns {void}
    */
  private removeHeatMap(): void {
    const heatmapScene = this.scene.getObjectByName(HEATMAP_SCENE_NAME);
    if (heatmapScene) {
      heatmapScene.traverse((child: THREE.Object3D) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          child.material.dispose();
          if (child.material.map) {
            child.material.map.dispose();
          }
        }
      });
      this.scene.remove(heatmapScene);
    }
  }

  /**
   * Draw the heatmap
   * @param {string} heatmapMode the heatmap mode of the new heatmap
   * @returns {void}
   */
  public drawHeatMap(heatmapMode: string | null): void {
    if (this.heatmapMode === heatmapMode) { return; }

    this.heatmapMode = heatmapMode;
    this.removeHeatMap();

    if (!heatmapMode) return;

    let heatmapPath: string | null = null;
    if (this.heatmapMode === 'all') {
      heatmapPath = HEATMAP_PATH;
    } else {
      heatmapPath = `${HEATMAP_TRANSPORT_TYPE_PATH_PREFIX}${this.heatmapMode}${HEATMAP_TRANSPORT_TYPE_PATH_SUFFIX}`;
    }

    // Load the heatmap texture
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(heatmapPath, (texture: THREE.Texture) => {
      const heatmapMaterial = new THREE.ShaderMaterial({
        uniforms: {
          heatmapTexture: { value: texture },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform sampler2D heatmapTexture;
          varying vec2 vUv;
          void main() {
            vec4 heatmapColor = texture2D(heatmapTexture, vUv);
            float intensity = heatmapColor.r + heatmapColor.g + heatmapColor.b;
            vec3 lowColor = vec3(0.0, 0.0, 0.2);
            vec3 highColor = vec3(0.2, 0.0, 0.1);
            vec3 color = mix(lowColor, highColor, intensity);
            gl_FragColor = vec4(color.rgb, intensity);
          }
        `,
        transparent: true,
      });
      const textureWidth = texture.image.width;
      const textureHeight = texture.image.height;
      const scaleFactor = Math.min(this.width / textureWidth, this.height / textureHeight) + DEFAULT_HEATMAP_SCALE_FACTOR_INC;

      const geometry = new THREE.PlaneGeometry(textureWidth * scaleFactor, textureHeight * scaleFactor);
      this.heatmapObject = new THREE.Mesh(geometry, heatmapMaterial);

      // Position the heatmap to match the Swiss border
      this.heatmapObject.position.set(
        this.width / 2 + DEFAULT_HEATMAP_X_OFFSET,
        this.height / 2 + DEFAULT_HEATMAP_Y_OFFSET, -1
      ); // Set a small z-offset to avoid z-fighting
      this.heatmapObject.name = HEATMAP_SCENE_NAME;
      this.scene.add(this.heatmapObject);
    });
  }

  /**
 * Check if a color is in hex format
 * @param {string} color the color
 * @returns {boolean} true if the color is in hex format, false otherwise
 */
  private isHexColor(color: string): boolean {
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    return hexRegex.test(color);
  }

  /**
   * Map a hex color to an rgb map
   * @param {string} hex the hex color
   * @returns {object} the rgb map or null if the color is not in hex format
   */
  private hexToRgbMap(hex: string): { r: number; g: number; b: number } | null {
    if (!this.isHexColor(hex)) return null;

    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return null;

    return {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    };
  }

  /**
   * Map an rgb map to a hex color
   * @param {object} rgbMap the rgb map
   * @returns {string} the hex color
   */
  private rgbMapToHex(rgbMap: { r: number; g: number; b: number }): string {
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
   * Linear interpolation between two values
   * @param {*} a the start color
   * @param {*} b the end color
   * @param {number} t the interpolation value between 0 and 1
   * @returns {number} the interpolated value
   */
  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  /**
   * Linear interpolation between two colors
   * @param {*} hexColor1 the first color
   * @param {*} hexColor2 the second color
   * @param {*} t the interpolation value between 0 and 1
   * @returns {string} the interpolated color
   */
  public colorLerp(hexColor1: string, hexColor2: string, t: number): string {
    const color1 = this.hexToRgbMap(hexColor1);
    const color2 = this.hexToRgbMap(hexColor2);
    if (!color1 || !color2) return hexColor1;

    const r = Math.round(this.lerp(color1.r, color2.r, t));
    const g = Math.round(this.lerp(color1.g, color2.g, t));
    const b = Math.round(this.lerp(color1.b, color2.b, t));
    const rgbMap = {
      r: r,
      g: g,
      b: b,
    };

    return this.rgbMapToHex(rgbMap);
  }

  /**
   * Get the train coordinates at a given time
   * @param {object} segment the segment informations
   * @param {number} time the time
   * @returns {number[]} the train coordinates
   */
  private getTrainCoordinates(
    segment: {
      start_time: number;
      end_time: number;
      start_longitude: number;
      end_longitude: number;
      start_latitude: number;
      end_latitude: number
    },
    time: number
  ): [number, number] {
    const dTime = segment.end_time - segment.start_time;
    const dLon = segment.end_longitude - segment.start_longitude;
    const dLat = segment.end_latitude - segment.start_latitude;

    const lon = segment.start_longitude + dLon * (time - segment.start_time) / dTime;
    const lat = segment.start_latitude + dLat * (time - segment.start_time) / dTime;

    return [lon, lat];
  }

  /**
   * Set the train color mode
   * @param trainColorMode the train color mode to set
   * @returns {void}
   */
  public setTrainColorMode(trainColorMode: string): void {
    this.trainColorMode = trainColorMode;
  }

  /**
   * Get the train color at a given time
   * @param {*} segment the segment informations
   * @param {*} time the time
   * @returns {string} the train color
   * @throws {Error} if the train color mode is not supported
   */
  private getTrainColor(
    segment: {
      start_time: number;
      end_time: number;
      start_longitude: number;
      end_longitude: number;
      start_latitude: number;
      end_latitude: number;
      start_departure_delay: number;
      end_arrival_delay: number
    },
    time: number
  ): string {
    if (this.trainColorMode === DEFAULT_TRAIN_COLOR_MODE) {
      return DEFAULT_TRAIN_COLOR;
    } else if (this.trainColorMode === 'speed') {
      const dTime = segment.end_time - segment.start_time;

      // Get train speed by computing the distance between the start and end coordinates
      const startCoordinates = this.projection([segment.start_longitude, segment.start_latitude], true);
      const endCoordinates = this.projection([segment.end_longitude, segment.end_latitude], true);
      if (!startCoordinates || !endCoordinates) return DEFAULT_TRAIN_COLOR;

      const dX = endCoordinates[0] - startCoordinates[0];
      const dY = endCoordinates[1] - startCoordinates[1];
      const distance = Math.sqrt(dX * dX + dY * dY);
      const speed = distance / dTime;

      const speedRatio = Math.min(Math.max(speed / MAX_TRAIN_SPEED, 0), 1);
      const color = this.colorLerp(SLOW_TRAIN_COLOR, FAST_TRAIN_COLOR, speedRatio);

      return color;
    } else if (this.trainColorMode === 'delay') {
      const dTime = segment.end_time - segment.start_time;
      const dDelay = segment.end_arrival_delay - segment.start_departure_delay;

      const delay = segment.start_departure_delay + dDelay * (time - segment.start_time) / dTime;
      const delayRatio = Math.min(Math.max(delay / MAX_TRAIN_DELAY, 0), 1);
      const color = this.colorLerp(EARLY_TRAIN_COLOR, LATE_TRAIN_COLOR, delayRatio);

      return color;
    } else {
      throw new Error(`Unknown train color mode: ${this.trainColorMode}`);
    }
  }

  /**
   * Get the train angle at a given segment
   * @param segment the segment informations
   * @returns {number} the train angle
   */
  private getTrainAngle(
    segment: {
      start_longitude: number;
      start_latitude: number;
      end_longitude: number;
      end_latitude: number
    }
  ): number {
    const cacheKey = `${segment.start_longitude}-${segment.start_latitude}-${segment.end_longitude}-${segment.end_latitude}`;

    if (this.angleCache[cacheKey]) {
      return this.angleCache[cacheKey];
    }

    const startCoordinates = this.projection([segment.start_longitude, segment.start_latitude], true);
    const endCoordinates = this.projection([segment.end_longitude, segment.end_latitude], true);
    if (!startCoordinates || !endCoordinates) return 0;

    const dX = endCoordinates[0] - startCoordinates[0];
    const dY = endCoordinates[1] - startCoordinates[1];
    const angle = Math.atan2(dY, dX) + Math.PI / 2;

    this.angleCache[cacheKey] = angle;
    return angle;
  }

  /**
   * Draw a train
   * @param {string} trainSceneName the train scene name
   * @returns {THREE.Mesh} the train object
   */
  private getTrainFromPool(): THREE.Mesh {
    if (this.trainPool.length > 0) {
      const poolTrain = this.trainPool.pop()
      if (poolTrain) {
        return poolTrain;
      } 
    }

    return new THREE.Mesh(
      new THREE.PlaneGeometry(3, 10),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(DEFAULT_TRAIN_COLOR) })
    );
  }

  /**
   * Remove a train from a trip id
   * @param {string} tripId the trip id
   * @returns {void}
   */
  removeTrainfromTripId(tripId: string): void {
    const trainSceneName = TRAIN_SCENE_NAME_PREFIX + tripId
    if (trainSceneName in this.trainObjects) {
      this.trainPool.push(this.trainObjects[trainSceneName]);
      this.scene.remove(this.trainObjects[trainSceneName]);
      delete this.trainObjects[trainSceneName];
    }
  }

  /**
   * Update a train
   * @param {string} tripId the trip id
   * @param {object} trainCoordinates the train coordinates
   * @param {string} trainColor the train color
   * @param {number} trainAngle the train angle
   * @returns {void}
   */
  drawTrain(tripId: string, trainCoordinates: [number, number], trainColor: string, trainAngle: number): void {
    // Check that train position is valid first
    const trainPosition = this.projection(trainCoordinates, true);
    if (!trainPosition) return;

    // Get existing train or get it from the pool
    const trainName = TRAIN_SCENE_NAME_PREFIX + tripId
    let train = this.trainObjects[trainName];
    if (!train) {
      train = this.getTrainFromPool();
      this.trainObjects[trainName] = train;
    }

    // Update train position
    train.position.set(trainPosition[0], trainPosition[1], 0);

    // Update train color
    if (train.material instanceof THREE.MeshBasicMaterial) {
      train.material.color.set(trainColor);
    }

    // Update train angle
    train.rotation.z = trainAngle;

    // Update train name
    train.name = trainName;

    this.scene.add(train);
  }

  /**
   * Update trains
   * @param {number} time 
   * @returns {void}
   */
  drawTrains(time: number): void {
    if (!this.trips) return;

    // Find bin
    const roundedTimeStr = time - time % this.binSize;
    const trips = this.trips[roundedTimeStr].trips;

    trips.forEach((trip: any) => {
      // Find the current segment
      const segment = trip.segments.find((segment: any) => segment.start_time <= time && time < segment.end_time);
      if (!segment) {
        this.removeTrainfromTripId(trip.trip_id);
        return;
      }

      // Get train coordinates
      const trainCoordinates = this.getTrainCoordinates(segment, time);
      if (!trainCoordinates) return;

      // Get train color
      const trainColor = this.getTrainColor(segment, time);

      // Get train angle
      const trainAngle = this.getTrainAngle(segment);

      // draw train
      const trainId = trip.trip_id;
      this.drawTrain(trainId, trainCoordinates, trainColor, trainAngle);
    });
  }

  /**
   * Convert a timestamp to a time string
   * @param {number} timestamp 
   * @returns {string} the time string
   */
  timestampToTimeStr(timestamp: number): string {
    const hours = Math.floor(timestamp / 60);
    const minutes = timestamp % 60;
    return `${hours}:${minutes}`;
  }

  /**
 * Render the scene
 * @returns {void}
 */
render(): void {
  let t: number = 0;
  let previousTimestamp: number | null = null;

  // RENDER AND SIMULATION
  const animate = (timestamp: number) => {
    requestAnimationFrame(animate);

    if (!previousTimestamp) {
      previousTimestamp = timestamp;
    }

    const elapsed = timestamp - previousTimestamp;
    const dt = Math.min(this.simulationSpeed * elapsed / 1000, 1);

    // Update simulation
    t += dt;
    t = t % 1440;
    this.drawTrains(t);

    // Update clock
    this.clock.setTime(t);
    this.clock.draw();

    // Render the scene
    this.renderer.render(this.scene, this.camera);

    previousTimestamp = timestamp;
  };

  animate(performance.now());
}

  /**
   * Set the simulation fps
   * @param {number} value
   * @returns {void}
   */
  setSimulationFps(value: number): void {
    this.simulationSpeed = value;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new Map();
});