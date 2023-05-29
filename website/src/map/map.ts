import * as d3 from 'd3';
import * as THREE from 'three';
import { FontLoader, Font } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

// MAP
const DIV_CONTAINER_ID = 'map';
const SELECT_TRAIN_COLOR_MODE_ID = 'select-train-color-mode';
const SLIDER_SIMULATION_SPEED_ID = 'slider-simulation-speed';
const SLIDER_SIMULATION_SPEED_LABEL_ID = 'slider-simulation-speed-label';
const SELECT_ISO_ID = 'select-iso';
const CHECKBOX_SHOW_TRAINS_ID = 'checkbox-show-trains';

const CONTAINER_RATIO = 1071 / 643;

const MAP_PATH = '../../data/map/swissBOUNDARIES3D_1_3_TLM_LANDESGEBIET.json';
const TRAINS_FOLDER_PATH = '../../data/map/train_trips_bins/';
const ISO_FILE_PREFIX = '../../data/map/isochronic_map_';
const ISO_FILE_SUFFIX = '.json';

const SWISS_BORDER_LINE_NAME = 'swissborder_line';
const SWISS_BORDER_GROUP_NAME = 'swissborder_group';
const TRAIN_SCENE_NAME_PREFIX = 'train_';
const ISO_CENTER_NAME = 'iso_center';

const TRAIN_FILES_BIN_SIZE = 15;

const DEFAULT_SIMULATION_SPEED = 60;

const MAX_TRAIN_DELAY = 3 * 60;
const MAX_TRAIN_SPEED = 100;

const DEFAULT_TRAIN_COLOR_MODE = 'uniform';

const DEFAULT_MAP_BORDER_COLOR = '#2e5d52';
const DEFAULT_CITY_COLOR = '#fb9e82';
const DEFAULT_TRAIN_COLOR = '#FAF4DD';
const EARLY_TRAIN_COLOR = '#00ff00';
const LATE_TRAIN_COLOR = '#ff0000';
const SLOW_TRAIN_COLOR = '#0000ff';
const FAST_TRAIN_COLOR = '#ffff00';
const DEFAULT_ISO_COLOR = '#2c1e53';
const DEFAULT_TIME_COLOR = '#FAF4DD';

const DEFAULT_FONT_PATH = '../../data/map/Nunito_Regular.json';
const DEFAULT_CITY_FONT_SIZE = 15;
const DEFAULT_CITY_FONT_HEIGHT = 0.1;

const MAX_ISO_HOUR = 12;
const ISO_HOUR_STEP = 1;
const ISO_CIRCLE_NUM_POINTS = 64;

const DEFAULT_SHOW_TRAINS = true;

const ISO_STOPS = {
    'None': '',
    'Zurich': '8503000',
    'Bern': '8507000',
    'Basel': '8500010',
    'Lausanne': '8501120',
    'Geneva': '8587057',
    'St. Gallen': '8506302',
    'Lugano': '8505300',
}

const CITIES = {
  'Zurich': [8.54021816561537, 47.3781768166501],
  'Bern': [7.439131612366045, 46.94883398159425],
  'Basel': [7.589564242496508, 47.54741361808408],
  'Lausanne': [6.629092475966655, 46.51678813031248],
  'Geneva': [6.142437734120765, 46.20973474671916],
  'St. Gallen': [9.369903098414593, 47.42317912125387],
  'Lugano': [8.946990064034518, 46.00550466890416],
  'Chur': [9.529550381279392, 46.85346552066135],
  'Sion': [7.359035574991079, 46.22750935443004],
  'Brig': [7.988032639694566, 46.31954031184326],
  'Lucerne': [8.31040434100704, 47.04947411811181],
  'Schaffhausen': [8.63272780717279, 47.69831009611684],
  'St. Moritz': [9.845659523760567, 46.49805711182697],
  'Winterthur': [8.723759765486799, 47.50036580892898],
  'Zug': [8.515293769181659, 47.173556423907286],
  'Fribourg': [7.151098996153593, 46.80321267113013],
  'Neuchatel': [6.934358628867637, 46.996799932889424],
  'Thun': [7.629740555676791, 46.754938724947266],
  'Aarau': [8.05127546918844, 47.39133701804118],
}

const DEBUG_MODE = false;

// CLOCK
const CLOCK_RADIUS = 100;
const CLOCK_SCALE_FACTOR = 0.8;
const CLOCK_MARGIN = CLOCK_RADIUS * CLOCK_SCALE_FACTOR + 20;

const CLOCK_RENDER_ORDER = 999;

const CLOCK_NAME = 'clock';
const CLOCK_TEXT_NAME = 'clock_text';

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

  private font!: Font;
  private timeText!: THREE.Mesh;

  private time: number;

  constructor(
      scene: THREE.Scene,

      x: number,
      y: number,
      scaleFactor: number,
      backgroundColor: THREE.Color,
      markerColor: THREE.Color,
      clockHandColor: THREE.Color,
      font: Font,
  ) {
      this.scene = scene;
      this.x = x;
      this.y = y;
      this.radius = CLOCK_RADIUS;
      this.scaleFactor = scaleFactor;
      this.backgroundColor = backgroundColor;
      this.markerColor = markerColor;
      this.clockHandColor = clockHandColor;
      this.font = font;

      this.time = 0;

      this.init();
  }

  /**
   * Set the time of the clock
   * @param time Time in seconds
   * @returns {void}
   */
  public setTime(time: number): void {
      this.time = time;
  }

  /**
   * Get the time of the clock
   * @returns {number} Time in seconds
   */
  public getTime(): number {
      return this.time;
  }

  /**
   * Initialize the clock
   * @returns void
   */
  private init(): void {
      // Draw the clock background
      this.clock = new THREE.Object3D();
      const clockGeometry = new THREE.CircleGeometry(this.radius, 64);
      const clockMaterial = new THREE.MeshBasicMaterial({
          color: this.backgroundColor,
          side: THREE.DoubleSide,
      });
      const clockMesh = new THREE.Mesh(clockGeometry, clockMaterial);
      clockMesh.renderOrder = CLOCK_RENDER_ORDER;
      this.clock.add(clockMesh);

      // Draw the first 12 markers
      const markerGeometry = new THREE.PlaneGeometry(7, 25);
      const markerMaterial = new THREE.MeshBasicMaterial({
          color: this.markerColor,
          side: THREE.DoubleSide,
      });
      for (let i = 0; i < 12; i++) {
          const markerMesh = new THREE.Mesh(markerGeometry, markerMaterial);
          markerMesh.renderOrder = CLOCK_RENDER_ORDER + 1;
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
          markerMesh.renderOrder = CLOCK_RENDER_ORDER + 1;
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
      this.hourHandMesh.renderOrder = CLOCK_RENDER_ORDER + 1;
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
      this.minuteHandMesh.renderOrder = CLOCK_RENDER_ORDER + 1;
      this.minuteHandMesh.position.set(0, 30, 0); // Offset the mesh by half its length
      this.minuteHandPivot.add(this.minuteHandMesh);
      this.minuteHandPivot.position.set(0, 0, 0);
      this.clock.add(this.minuteHandPivot);

      // Scale and translate the clock
      this.clock.scale.set(this.scaleFactor, this.scaleFactor, 1);
      this.clock.position.set(this.x, this.y, 0);

      // Create time text
      this.createTimeText();
  }

  /**
   * Get the string representation of the time
   * @returns {string} Time in the format HH:MM
   */
  private getTimeString(): string {
    const date = new Date(0, 0, 0, 0, this.time, 0);
    // return without seconds
    return date.toLocaleTimeString().slice(0, -3);
  }

  private createTimeText(): void {
    if (!this.font) return;

    const timeString = this.getTimeString();
    const textGeometry = new TextGeometry(timeString, {
      font: this.font,
      size: DEFAULT_CITY_FONT_SIZE,
      height: DEFAULT_CITY_FONT_HEIGHT,
    });

    const textMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(DEFAULT_TIME_COLOR) });
    this.timeText = new THREE.Mesh(textGeometry, textMaterial);
    this.timeText.position.set(this.x - 27, this.y - this.radius, 0);
    this.timeText.name = CLOCK_TEXT_NAME;
    this.scene.add(this.timeText);
  }

  /**
   * Draw the clock
   * @returns {void}
   */
  public draw(): void {
    // update rotation of hour hand
    this.hourHandPivot.rotation.z = -this.time * Math.PI / 360;

    // update rotation of minute hand
    this.minuteHandPivot.rotation.z = -this.time * Math.PI / 30;

    // update time text
    if (this.timeText && this.font) {
      this.scene.remove(this.timeText);
      this.createTimeText();
    }
  }

  /**
   * Add the clock to the scene
   * @returns {void}
   */
  public addToScene(): void {
    this.clock.name = CLOCK_NAME;
    this.scene.add(this.clock);
  }

  /**
   * Remove the clock from the scene
   * @returns {void}
   */
  public removeFromScene(): void {
    this.scene.remove(this.clock);
    this.scene.remove(this.timeText);
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
  private projection!: (coordinates: [number, number], cached: boolean, useIso: boolean) => [number, number] | null;

  private isoProjection!: (coordinates: [number, number], cache: boolean) => [number, number] | null;
  private isIdIsoProjection!: boolean;
  private isoCenter!: [number, number] | null;
  private isoData!: any;
  private isoScreenToDataScaleX!: any;
  private isoScreenToDataScaleY!: any;
  // For transition
  private oldIsoProjectionParameters!: any;
  private oldIsoProjection!: (coordinates: [number, number]) => [number, number] | null;
  private newIsoProjection!: (coordinates: [number, number], cache: boolean) => [number, number] | null;
  private isoTransitionProgress: number = 1;

  private scale: number = 1;
  private translation: [number, number] = [0, 0];

  // Clock
  private fontLoader: FontLoader = new FontLoader();
  private font!: Font;
  private clock!: Clock;

  // Train
  private trainColorMode: string = DEFAULT_TRAIN_COLOR_MODE;
  private trainObjects: { [key: string]: THREE.Mesh } = {};
  private trainPool: THREE.Mesh[] = [];
  private swissBorderObjects!: THREE.Group;
  private isoCenterObject!: THREE.Mesh | null;
  private isoLineObjects: { [key: string]: THREE.Line } = {};
  private isoTextObjects: { [key: string]: THREE.Mesh } = {};

  private showTrains: boolean = DEFAULT_SHOW_TRAINS;

  // Cache
  private projectionCache: { [key: string]: [number, number] } = {};
  private isoProjectionCache: { [key: string]: [number, number] } = {};
  private angleCache: { [key: string]: number } = {};

  private simulationSpeed: number = DEFAULT_SIMULATION_SPEED;

  constructor() {
    this.loadData().then(() => {
      this.fontLoader.load(DEFAULT_FONT_PATH, (font: any) => {
        this.font = font;
        this.initScene();
        this.initEvents();

        this.initIsochroneProjection();
        this.initSwissBorder();
        this.initCities();

        this.initClock();
        this.clock.addToScene();

        this.render();
      });
    });
  }

  /**
   * Initialize the scene
   * @returns {void}
   */
  private initScene(): void {
    // Container
    this.container = document.getElementById(DIV_CONTAINER_ID) as HTMLElement;

    // Define the container size
    let containerWidth = window.innerWidth;
    let containerHeight = window.innerHeight;

    if (containerHeight * CONTAINER_RATIO > containerWidth) {
      containerHeight = containerWidth / CONTAINER_RATIO;
    } else {
      containerWidth = containerHeight * CONTAINER_RATIO;
    }

    this.container.style.width = containerWidth + 'px';
    this.container.style.height = containerHeight + 'px';

    // center the container
    this.container.style.top = ((window.innerHeight - containerHeight) / 2) + 'px';
    this.container.style.left = ((window.innerWidth - containerWidth) / 2) + 'px';

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

    // Isochronic map
    // Fill select with stops
    const selectIsoMapOptions = document.getElementById(SELECT_ISO_ID) as HTMLSelectElement;
    for (const stopId in ISO_STOPS) {
      const stopName = ISO_STOPS[stopId as keyof typeof ISO_STOPS];
      const option = document.createElement('option');
      option.text = stopId;
      option.value = stopName;
      selectIsoMapOptions.appendChild(option);
    }

    // Add event listener
    const selectIsoMap = document.getElementById(SELECT_ISO_ID) as HTMLSelectElement;
    selectIsoMap.addEventListener('change', (event) => {
      if (!event || !event.target) return;

      const target = event.target as HTMLSelectElement;
      const stopId = target.value;
      this.updateIsochroneProjection(stopId);
    });

    // Show trains
    const checkboxShowTrains = document.getElementById(CHECKBOX_SHOW_TRAINS_ID) as HTMLInputElement;
    checkboxShowTrains.addEventListener('change', (event) => {
      const target = event.target as HTMLInputElement;
      // Delete all train objects
      if (!target.checked) {
        for (const trainId in this.trainObjects) {
          const trainObject = this.trainObjects[trainId];
          this.scene.remove(trainObject);
        }
      }
      // Set the flag
      this.showTrains = target.checked;
    });
  }

  /**
   * Initialize the clock
   * @returns {void}
   */
  private initClock(): void {
    this.clock = new Clock(
      this.scene,
      CLOCK_MARGIN,
      this.height - CLOCK_MARGIN,
      CLOCK_SCALE_FACTOR,
      new THREE.Color(0xFAF4DD),
      new THREE.Color(0x000000),
      new THREE.Color(0x000000),
      this.font,
    );
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
  private initProjection(
    minLon: number, 
    maxLon: number, 
    minLat: number, 
    maxLat: number
  ): void {
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

    // Initialize the projection function, and use the isochrone projection
    this.projection = (coordinates: [number, number], cache: boolean, useIso: boolean): [number, number] | null => {
      const cacheKey = `${coordinates[0]}-${coordinates[1]}`;

      // Check if the result is already cached
      if (this.projectionCache[cacheKey]) {
        return useIso ? this.isoProjection(this.projectionCache[cacheKey], cache) : this.projectionCache[cacheKey];
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
      return useIso ? this.isoProjection(result, cache) : result;
    };
  }

  /**
   * Initialize the isochrone projection
   * @returns {void}
   */
  private initIsochroneProjection(): void {
    this.isoProjection = (screenCoordinates: [number, number], _:boolean): [number, number] | null => {
      return screenCoordinates; // Default: no isochrone projection
    }
    this.isIdIsoProjection = true;
  }

  /**
   * Set the old isochrone projection, for transition
   * @returns {void}
   */
  private setOldIsoProjection(): void {
    // If neutral, just use the identity projection
    if(this.isIdIsoProjection) {
      this.oldIsoProjection = (screenCoordinates: [number, number]): [number, number] | null => {
        return screenCoordinates; // Default: no isochrone projection
      }
      return;
    }

    // Define a 'deep copy' of old projection to avoid looping reference
    this.oldIsoProjectionParameters = {
      isoData: JSON.parse(JSON.stringify(this.isoData)),
      isoCenter: JSON.parse(JSON.stringify(this.isoCenter)),
      isoScreenToDataScaleX: this.isoScreenToDataScaleX,
      isoScreenToDataScaleY: this.isoScreenToDataScaleY,
      scale: JSON.parse(JSON.stringify(this.scale)),
      translation: JSON.parse(JSON.stringify(this.translation)),
    };

    this.oldIsoProjection = (screenCoordinates: [number, number]): [number, number] => {
      // Get parameters and use them instead of this
      const parameters = this.oldIsoProjectionParameters;
      // Convert screen coordinates to isochrone data coordinates
      let isoDataX = Math.floor(parameters.isoScreenToDataScaleX(screenCoordinates[0]));
      let isoDataY = Math.floor(parameters.isoScreenToDataScaleY(screenCoordinates[1]));
      const screenCenter = this.projection(parameters.isoCenter, false, false) ?? [0, 0];
      let isoDataCenterX = Math.floor(this.isoScreenToDataScaleX(screenCenter[0]));
      let isoDataCenterY = Math.floor(this.isoScreenToDataScaleY(screenCenter[1]));
      // Clamp the coordinates to the isochrone data range
      isoDataX = Math.max(0, Math.min(parameters.isoData[0].length - 1, isoDataX));
      isoDataY = Math.max(0, Math.min(parameters.isoData.length - 1, isoDataY));
      isoDataCenterX = Math.max(0, Math.min(parameters.isoData[0].length - 1, isoDataCenterX));
      isoDataCenterY = Math.max(0, Math.min(parameters.isoData.length - 1, isoDataCenterY));

      // Get the isochrone data value for the given coordinates
      const isoDataValue = parameters.isoData[isoDataY][isoDataX];
      const isoDataCenterValue = parameters.isoData[isoDataCenterY][isoDataCenterX];

      // Convert the screen coordinates to polar coordinates (with the origin at the isochrone center)
      const isoCenterCoordinates: any = this.projection(parameters.isoCenter, false, false);
      const dx = screenCoordinates[0] - isoCenterCoordinates[0];
      const dy = screenCoordinates[1] - isoCenterCoordinates[1];
      //const r = Math.sqrt(dx * dx + dy * dy);
      const theta = Math.atan2(dy, dx);

      // Adjust the radius based on the isochrone data value
      // Here we assume that the isochrone data value gives the new radius
      const newR = isoDataValue - isoDataCenterValue;

      // Convert back to Cartesian coordinates
      const transformedScreenCoordinates: [number, number] = [
        isoCenterCoordinates[0] + newR * Math.cos(theta),
        isoCenterCoordinates[1] + newR * Math.sin(theta)
      ];

      // Return the transformed coordinates
      return [
        transformedScreenCoordinates[0] * parameters.scale + parameters.translation[0],
        transformedScreenCoordinates[1] * parameters.scale + parameters.translation[1]
      ]
    }
  }

  /**
   * Update the isochrone projection
   * @param nodeId The node id to project to
   * @returns {void}
   */
  private updateIsochroneProjection(nodeId: string): void {
    // Store the old projection for transition
    this.setOldIsoProjection();

    // If the node is empty, set new projection to neutral
    if(nodeId === '') {
      // Transition back to normal
      this.isoTransitionProgress = 0;
      this.isIdIsoProjection = true;

      this.newIsoProjection = (screenCoordinates: [number, number], _: boolean): [number, number] | null => {
        return screenCoordinates; // Default: no isochrone projection
      }
      this.isoProjection = (screenCoordinates: [number, number], cache: boolean): [number, number] | null => {
        const oldCoordinates = this.oldIsoProjection(screenCoordinates);
        const newCoordinates = this.newIsoProjection(screenCoordinates, cache);
        if (!oldCoordinates || !newCoordinates) return null;
      
        return [
          newCoordinates[0] * this.isoTransitionProgress + oldCoordinates[0] * (1 - this.isoTransitionProgress),
          newCoordinates[1] * this.isoTransitionProgress + oldCoordinates[1] * (1 - this.isoTransitionProgress)
        ];
      };

      this.isoCenter = null;
      return;
    }

    // Otherwise, we want to load the new isochrone data and create the new projection
    this.isIdIsoProjection = false;

    // Load the new isochrone data and create the new projection
    const filePath = ISO_FILE_PREFIX + nodeId + ISO_FILE_SUFFIX;
    d3.json(filePath).then((data: any) => {
      // Reset the transition progress
      this.isoTransitionProgress = 0;

      // Define the data and scales used for the isochrone projection
      this.isoCenter = [data.iso_center[1], data.iso_center[0]];
      this.isoData = data.map;
      this.isoScreenToDataScaleX = d3.scaleLinear()
        .domain([0, this.width])
        .range([0, this.isoData[0].length - 1]);
      this.isoScreenToDataScaleY = d3.scaleLinear()
        .domain([0, this.height])
        .range([this.isoData.length - 1, 0]);

      // Create the new isochrone projection
      this.newIsoProjection = (screenCoordinates: [number, number], cache: boolean): [number, number] => {
        const cacheKey = `${screenCoordinates[0]}-${screenCoordinates[1]}`;

        // Check if the result is already cached
        if (this.isoProjectionCache[cacheKey]) {
          return this.isoProjectionCache[cacheKey];
        }

        // Convert screen coordinates to isochrone data coordinates
        let isoDataX = Math.floor(this.isoScreenToDataScaleX(screenCoordinates[0]));
        let isoDataY = Math.floor(this.isoScreenToDataScaleY(screenCoordinates[1]));
        const screenCenter = this.projection(this.isoCenter as [number, number], false, false) as [number, number];
        let isoDataCenterX = Math.floor(this.isoScreenToDataScaleX(screenCenter[0]));
        let isoDataCenterY = Math.floor(this.isoScreenToDataScaleY(screenCenter[1]));
        // Clamp the coordinates to the isochrone data range
        isoDataX = Math.max(0, Math.min(this.isoData[0].length - 1, isoDataX));
        isoDataY = Math.max(0, Math.min(this.isoData.length - 1, isoDataY));
        isoDataCenterX = Math.max(0, Math.min(this.isoData[0].length - 1, isoDataCenterX));
        isoDataCenterY = Math.max(0, Math.min(this.isoData.length - 1, isoDataCenterY));

        // Get the isochrone data value for the given coordinates
        const isoDataValue = this.isoData[isoDataY][isoDataX];
        const isoDataCenterValue = this.isoData[isoDataCenterY][isoDataCenterX];

        // Convert the screen coordinates to polar coordinates (with the origin at the isochrone center)
        const isoCenterCoordinates: any = this.projection(this.isoCenter as [number, number], false, false);
        const dx = screenCoordinates[0] - isoCenterCoordinates[0];
        const dy = screenCoordinates[1] - isoCenterCoordinates[1];
        //const r = Math.sqrt(dx * dx + dy * dy); // Not needed!
        const theta = Math.atan2(dy, dx);

        // Adjust the radius based on the isochrone data value
        // Here we assume that the isochrone data value gives the new radius
        const newR = isoDataValue - isoDataCenterValue;

        // Convert back to Cartesian coordinates
        const transformedScreenCoordinates: [number, number] = [
          isoCenterCoordinates[0] + newR * Math.cos(theta),
          isoCenterCoordinates[1] + newR * Math.sin(theta)
        ];

        const result: [number, number] = [
          transformedScreenCoordinates[0] * this.scale + this.translation[0],
          transformedScreenCoordinates[1] * this.scale + this.translation[1]
        ];

        if (cache) {
          this.isoProjectionCache[cacheKey] = result;
        }
        return result;
      };

      // Calculate the bounding box in new isochrone projection coordinates
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      for (const feature of this.swissBorderData.features) {
        for (const point of feature.geometry.coordinates[0]) {
          let projectedPoint = this.newIsoProjection(this.projection(point, false, false) ?? [0, 0], false);
          // Inverse transformations to avoid stacking transformations
          projectedPoint = [
            ((projectedPoint as [number, number])[0] - this.translation[0]) / this.scale,
            ((projectedPoint as [number, number])[1] - this.translation[1]) / this.scale
          ];
          minX = Math.min(minX, projectedPoint![0]);
          maxX = Math.max(maxX, projectedPoint![0]);
          minY = Math.min(minY, projectedPoint![1]);
          maxY = Math.max(maxY, projectedPoint![1]);
        }
      }
    
      // Calculate the scale and translation to make the bounding box fit within the screen
      const screenAspectRatio = this.width / this.height;
      const boundingBoxAspectRatio = (maxX - minX) / (maxY - minY);
      if (boundingBoxAspectRatio > screenAspectRatio) {
        this.scale = this.width / (maxX - minX);
      } else {
        this.scale = this.height / (maxY - minY);
      }
      this.translation = [
        this.width / 2 - this.scale * (minX + maxX) / 2,
        this.height / 2 - this.scale * (minY + maxY) / 2
      ];

      // Define actual isochrone projection as the interpolation between the old and new isochrone projections
      this.isoProjection = (screenCoordinates: [number, number], cache: boolean): [number, number] => {
        const oldCoordinates = this.oldIsoProjection(screenCoordinates);
        const newCoordinates = this.newIsoProjection(screenCoordinates, cache);
        if (!oldCoordinates || !newCoordinates) return screenCoordinates;
      
        return [
          newCoordinates[0] * this.isoTransitionProgress + oldCoordinates[0] * (1 - this.isoTransitionProgress),
          newCoordinates[1] * this.isoTransitionProgress + oldCoordinates[1] * (1 - this.isoTransitionProgress)
        ];
      };
    });
  }

  /**
   * Load the swiss border data
   * @returns {Promise<void>}
   * @throws {Error} if the data could not be loaded
   */
  private async loadSwissBorder(): Promise<void> {
    const data = await d3.json(MAP_PATH);
    if (!data) throw new Error('Invalid Swiss border data at path: ' + MAP_PATH);
    this.swissBorderData = data;
  }

  /**
   * Load the train data
   * @returns {Promise<void>}
   * @throws {Error} if the data could not be loaded
   */
  private async loadTrains(): Promise<void> {
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
  private async loadData(): Promise<void> {
    await this.loadSwissBorder();
    await this.loadTrains();
  }

  /**
   * Initializes the swiss border
   * @returns {void}
   */
  private initSwissBorder(): void {
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
      this.updateSwissBorder();
  }

  /**
   * Draw the swiss border
   * @returns {void}
   */
  private updateSwissBorder(): void {
    // Draw the Swiss borders
    const drawFeature = (feature: any) => {
      const coordinates = feature.geometry.coordinates[0];
      const points = coordinates.map((coordinate: [number, number]) => {
        const x = this.projection(coordinate, false, true)![0]; // Use the updated scale and translation
        const y = this.projection(coordinate, false, true)![1];
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
  
    // Check if the swiss border has already been added to the scene, and remove it if so
    const swissBorderGroup = this.scene.getObjectByName(SWISS_BORDER_GROUP_NAME);
    if (swissBorderGroup) {
      this.scene.remove(swissBorderGroup);
    }
  
    this.scene.add(this.swissBorderObjects);
  }  

  /**
   * Initialize the cities
   * @returns {void}
   */
  private initCities(): void {
    const loader = new FontLoader();

    loader.load(DEFAULT_FONT_PATH, (font) => {
        for (const city in CITIES) {
            // Draw the city point
            const coordinates = (CITIES as any)[city as any];
            const point = this.projection(coordinates, false, true);
            if (!point) continue;

            const geometry = new THREE.CircleGeometry(10, 32);
            const material = new THREE.MeshBasicMaterial({ color: new THREE.Color(DEFAULT_CITY_COLOR) });
            const circle = new THREE.Mesh(geometry, material);
            circle.position.set(point[0], point[1], 0);
            circle.name = city;
            this.scene.add(circle);

            // Draw the city name
            const textGeometry = new TextGeometry(city, {
                font: font,
                size: DEFAULT_CITY_FONT_SIZE,
                height: DEFAULT_CITY_FONT_HEIGHT,
            });

            const textMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(DEFAULT_CITY_COLOR) });
            const text = new THREE.Mesh(textGeometry, textMaterial);
            text.position.set(point[0] + 10, point[1] + 10, 0);
            text.name = city + '-text';
            this.scene.add(text);
        }
    });
  }

  /**
   * Update the cities
   * @returns {void}
   */
  private updateCities(): void {
    for (const city in CITIES) {
      // Draw the city point
      const coordinates = (CITIES as any)[city as any]
      const point = this.projection(coordinates, false, true);
      if (!point) continue;

      const cityPoint = this.scene.getObjectByName(city);
      if (!cityPoint) continue;

      cityPoint.position.set(point[0], point[1], 0);

      // Draw the city name
      const cityText = this.scene.getObjectByName(city + '-text');
      if (!cityText) continue;

      cityText.position.set(point[0] + 10, point[1] + 10, 0);
    }
  }

  /**
   * Update the isochronic center and lines
   */
  private updateIsoCenterAndLines(): void {
    if (!this.isoCenter) {
      this.removeIsoCenterAndLines();
      return;
    }

    // Check if the isochronic center has already been added to the scene, add it if not
    if (!this.isoCenterObject) {
      const geometry = new THREE.CircleGeometry(10, 32);
      const material = new THREE.MeshBasicMaterial({ color: new THREE.Color(DEFAULT_ISO_COLOR) });
      this.isoCenterObject = new THREE.Mesh(geometry, material);
      this.isoCenterObject.name = ISO_CENTER_NAME;
      this.scene.add(this.isoCenterObject);
    }

    // Update the isochronic center position
    const isoCenterPosition = this.projection(this.isoCenter, false, true) ?? [0, 0];
    this.isoCenterObject.position.set(isoCenterPosition[0], isoCenterPosition[1], 0);

    // Check if the isochronic lines have already been added to the scene, add them if not
    if (Object.keys(this.isoLineObjects).length === 0) {
      for (let hour = 1; hour <= MAX_ISO_HOUR; hour += ISO_HOUR_STEP) {
        const isoLinesCurve = new THREE.EllipseCurve(
          0,  0,            // ax, aY
          0, 0,             // xRadius, yRadius
          0,  2 * Math.PI,  // aStartAngle, aEndAngle
          false,            // aClockwise
          0                 // aRotation 
        );
        const isoLinesPoints = isoLinesCurve.getPoints(ISO_CIRCLE_NUM_POINTS);
        const isoLinesGeometry = new THREE.BufferGeometry().setFromPoints( isoLinesPoints );
        const isoLinesMaterial = new THREE.LineBasicMaterial({ color: new THREE.Color(DEFAULT_ISO_COLOR) });
        const isoLineObject = new THREE.Line(isoLinesGeometry, isoLinesMaterial);
        isoLineObject.name = hour.toString(); // Name is the hour

        // Add the line to the dictionnary
        this.isoLineObjects[isoLineObject.name] = isoLineObject;
        this.scene.add(isoLineObject);
      }
    }

    // Compute neutral radius
    const isCloseTo = (coordinates1: [number, number], coordinates2: [number, number]): boolean => {
      return Math.abs(coordinates1[0] - coordinates2[0]) < 0.0001 && Math.abs(coordinates1[1] - coordinates2[1]) < 0.0001;
    }

    let targetedCoordinates: [number, number] = [0, 0];
    if (isCloseTo(this.isoCenter, CITIES['Geneva'] as [number, number])) {
      targetedCoordinates = CITIES['Chur'] as [number, number];
    } else {
      targetedCoordinates = CITIES['Geneva'] as [number, number];
    }

    // Get the radius value of target city
    const screenCoordinates = this.projection(targetedCoordinates, false, false) ?? [0, 0];
    let isoDataX = Math.floor(this.isoScreenToDataScaleX(screenCoordinates[0]));
    let isoDataY = Math.floor(this.isoScreenToDataScaleY(screenCoordinates[1]));
    const screenCenter = this.projection(this.isoCenter, false, false) ?? [0, 0];
    let isoDataCenterX = Math.floor(this.isoScreenToDataScaleX(screenCenter[0]));
    let isoDataCenterY = Math.floor(this.isoScreenToDataScaleY(screenCenter[1]));
    // Clamp the coordinates to the isochrone data range
    isoDataX = Math.max(0, Math.min(this.isoData[0].length - 1, isoDataX));
    isoDataY = Math.max(0, Math.min(this.isoData.length - 1, isoDataY));
    isoDataCenterX = Math.max(0, Math.min(this.isoData[0].length - 1, isoDataCenterX));
    isoDataCenterY = Math.max(0, Math.min(this.isoData.length - 1, isoDataCenterY));

    // Get the isochrone data value for the given coordinates
    const isoDataValue = this.isoData[isoDataY][isoDataX];
    const isoDataCenterValue = this.isoData[isoDataCenterY][isoDataCenterX];

    // Find actual distance from iso projected cities
    const isoProjectedCenter = this.projection(this.isoCenter, false, true) ?? [0, 0];
    const isoProjectedCoordinates = this.projection(targetedCoordinates, false, true) ?? [0, 0];

    // Get the distance between the two points
    const distance = Math.sqrt(Math.pow(isoProjectedCenter[0] - isoProjectedCoordinates[0], 2) + Math.pow(isoProjectedCenter[1] - isoProjectedCoordinates[1], 2));

    // Compute the radius
    const radius = distance / ((isoDataValue - isoDataCenterValue) / 3600);

    // Update the isochronic lines
    for (const isoLineName in this.isoLineObjects) {
      // Name is the hour
      const hour = parseInt(isoLineName);

      // Change position
      const isoLine = this.isoLineObjects[isoLineName];
      isoLine.position.set(isoCenterPosition[0], isoCenterPosition[1], 0);

      // Change radius of ellipse curve
      isoLine.geometry.dispose();
      const isoLinesCurve = new THREE.EllipseCurve(
        0,  0,            // ax, aY
        hour * radius, hour * radius,   // xRadius, yRadius
        0,  2 * Math.PI,  // aStartAngle, aEndAngle
        false,            // aClockwise
        0                 // aRotation
      );
      const isoLinesPoints = isoLinesCurve.getPoints(ISO_CIRCLE_NUM_POINTS);
      const isoLinesGeometry = new THREE.BufferGeometry().setFromPoints(isoLinesPoints);
      isoLine.geometry = isoLinesGeometry;
    }

    // Add legends on each circle
    const positions = [
      {loc: 'top', angle: Math.PI / 2, xOff: -10, yOff: 7},          // Top
      {loc: 'bottom', angle: 3 * Math.PI / 2, xOff: -10, yOff: -15}, // Bottom
      {loc: 'left', angle: Math.PI, xOff: -20, yOff: -5},            // Left
      {lov: 'right', angle: 0, xOff: 5, yOff: 0}                     // Right
    ];
    if (Object.keys(this.isoTextObjects).length === 0) {
      for (const isoLineName in this.isoLineObjects) {
        // Name is the hour
        const hour = parseInt(isoLineName);
        positions.forEach(position => {
          // Compute the position
            const x = isoCenterPosition[0] + hour * radius * Math.cos(position.angle) + position.xOff;
            const y = isoCenterPosition[1] + hour * radius * Math.sin(position.angle) + position.yOff;
        
            // Create text geometry and material
            const textGeometry = new TextGeometry(hour.toString() + 'h', {
                font: this.font,
                size: 10,
                height: 0.1,
            });
            const textMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(DEFAULT_ISO_COLOR) });

            // Create text mesh and set its position
            const text = new THREE.Mesh(textGeometry, textMaterial);
            text.position.set(x, y, 0);
            text.name = isoLineName + '-' + position.loc;
        
            // Add the text to the scene
            this.scene.add(text);

            // Save the text object
            this.isoTextObjects[isoLineName + '-' + position.loc] = text;
            console.log(this.isoTextObjects);
        });
      }
    } else {
      // Update position of the existing text objects
      for (const isoLineName in this.isoLineObjects) {
        // Name is the hour
        const hour = parseInt(isoLineName);
        positions.forEach(position => {
            // Compute the new position
            const x = isoCenterPosition[0] + hour * radius * Math.cos(position.angle) + position.xOff;
            const y = isoCenterPosition[1] + hour * radius * Math.sin(position.angle) + position.yOff;

            // Update the position of the corresponding text object
            const text = this.isoTextObjects[isoLineName + '-' + position.loc];
            text.position.set(x, y, 0);
        });
      }
    }
  }

  private removeIsoCenterAndLines(): void {
    // Remove the isochronic lines
    for (const isoLineName in this.isoLineObjects) {
      const isoLine = this.isoLineObjects[isoLineName];
      this.scene.remove(isoLine);
    }
    this.isoLineObjects = {};

    // Remove the isochronic texts
    for (const isoTextName in this.isoTextObjects) {
      const isoText = this.isoTextObjects[isoTextName];
      this.scene.remove(isoText);
    }

    // Remove the isochronic center
    if (!this.isoCenterObject) return;
    this.scene.remove(this.isoCenterObject);
    this.isoCenterObject = null;
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
  private setTrainColorMode(trainColorMode: string): void {
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
      const startCoordinates = this.projection([segment.start_longitude, segment.start_latitude], true, false);
      const endCoordinates = this.projection([segment.end_longitude, segment.end_latitude], true, false);
      if (!startCoordinates || !endCoordinates) return DEFAULT_TRAIN_COLOR;

      const dX = endCoordinates[0] - startCoordinates[0];
      const dY = endCoordinates[1] - startCoordinates[1];

      let distance = Math.sqrt(dX * dX + dY * dY);
      // Scale it to the map scale
      const pixelToMeterRatio = 348000 / this.width;
      distance *= pixelToMeterRatio;

      // Get speed in meters per second
      const speed = distance / (dTime * 60) * 3.6; // 3.6 to convert from m/s to km/h

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

    if (this.angleCache[cacheKey] && this.isIdIsoProjection) {
      return this.angleCache[cacheKey];
    }

    const startCoordinates = this.projection([segment.start_longitude, segment.start_latitude], true, false);
    const endCoordinates = this.projection([segment.end_longitude, segment.end_latitude], true, false);
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
  private removeTrainfromTripId(tripId: string): void {
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
  private drawTrain(tripId: string, trainCoordinates: [number, number], trainColor: string, trainAngle: number): void {
    // Check that train position is valid first
    const trainPosition = this.projection(trainCoordinates, true, true);
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
  private drawTrains(time: number): void {
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
   * Render the scene
   * @returns {void}
   */
  private render(): void {
    let t: number = 0;
    let previousTimestamp: number | null = null;

    // RENDER AND SIMULATION
    const animate = (timestamp: number) => {
      requestAnimationFrame(animate);

      const t1 = performance.now();
      if (!previousTimestamp) {
        previousTimestamp = timestamp;
      }

      const elapsed = timestamp - previousTimestamp;
      const dt = Math.min(this.simulationSpeed * elapsed / 1000, 1);

      // Update simulation
      t += dt;
      t = t % 1440;
      if (this.showTrains) {
        this.drawTrains(t);

        // Update clock
        if (this.clock) {
          this.clock.setTime(t);
          this.clock.draw();
        }
      }

      if (this.showTrains && !this.scene.getObjectByName(CLOCK_NAME)) {
        this.clock.addToScene();
      } else if (!this.showTrains && this.scene.getObjectByName(CLOCK_NAME)) {
          this.clock.removeFromScene();
      }

      // Update iso transition
      this.isoTransitionProgress = Math.min(this.isoTransitionProgress + 0.01, 1);
      if (this.isoTransitionProgress < 1) {
        this.updateSwissBorder();
        this.updateCities();
        this.updateIsoCenterAndLines();
        this.isoProjectionCache = {}; // Clear cache
      }

      // Render the scene
      this.renderer.render(this.scene, this.camera);

      previousTimestamp = timestamp;
      const t2 = performance.now();
      if (DEBUG_MODE && t % 60 < 1) {
        console.log(`FPS: ${Math.round(1000 / (t2 - t1))} (ms: ${Math.round(t2 - t1)})`);
      }
    };

    animate(performance.now());
  }

  /**
   * Set the simulation fps
   * @param {number} value
   * @returns {void}
   */
  private setSimulationFps(value: number): void {
    this.simulationSpeed = value;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new Map();
});