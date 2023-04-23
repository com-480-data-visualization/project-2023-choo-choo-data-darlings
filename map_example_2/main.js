import * as d3 from 'd3';
import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';

const DIV_CONTAINER_ID = 'container';

const SELECT_HEATMAP_ID = 'select_heatmap';
const SLIDER_FPS_ID = 'slider_fps';
const SLIDER_FPS_LABEL_ID = 'slider_fps_label';

const DEFAULT_FPS = 60;

const MAP_PATH = 'data/swissBOUNDARIES3D_1_3_TLM_LANDESGEBIET.geojson';
const TRIPS_PATH = 'data/train_trips_bins.json'
const HEATMAP_PATH = 'data/density_heatmap.png';
const HEATMAP_TRANSPORT_TYPE_PATH_PREFIX = 'data/density_heatmap_';
const HEATMAP_TRANSPORT_TYPE_PATH_SUFFIX = '.png';

const SWISS_BORDER_LINE_NAME = 'swissborder';
const HEATMAP_SCENE_NAME = 'heatmap';
const TRAIN_INSTANCED_MESH_NAME = 'train_instanced_mesh';
const TRAIN_SCENE_NAME_PREFIX = 'train_';

const MAX_TRAIN_INSTANCES = 10000;


const DEFAULT_HEATMAP_MODE = null;

const DEFAULT_MAP_BORDER_COLOR = 0xaaaaaa;
const DEFAULT_TRAIN_COLOR = 0xddeeff;

class Map {
  constructor() {
    this.initScene();
    this.initEvents();
    this.initTrips();
    this.trainObjects = {};

    this.addSwissBorder();

    this.heatmapMode = null;
    this.addHeatMap(DEFAULT_HEATMAP_MODE);
  }

  createTrainInstancedMesh(maxInstances) {
    const trainGeometry = new THREE.CircleGeometry(5, 32);
    const trainMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(DEFAULT_TRAIN_COLOR) });
  
    const trainInstancedMesh = new THREE.InstancedMesh(trainGeometry, trainMaterial, maxInstances);
    trainInstancedMesh.name = TRAIN_INSTANCED_MESH_NAME;
  
    return trainInstancedMesh;
  }

  initScene() {
    this.container = document.getElementById(DIV_CONTAINER_ID);
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(
      0,
      this.width,
      this.height,
      0,
      1,
      1000
    );

    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.container.appendChild(this.renderer.domElement);

    // Position the camera
    this.camera.position.z = 10;

    // initialize the train instances
    this.maxTrainInstances = MAX_TRAIN_INSTANCES;
    this.trainInstancedMesh = this.createTrainInstancedMesh(this.maxTrainInstances);
    this.scene.add(this.trainInstancedMesh);
  }

  initEvents() {
    const selectHeatmap = document.getElementById(SELECT_HEATMAP_ID);
    selectHeatmap.addEventListener('change', (event) => {
      const heatmapMode = event.target.value;
      if (heatmapMode === '') {
        this.addHeatMap(null);
        return;
      }

      this.addHeatMap(heatmapMode);
    });

    const sliderFps = document.getElementById(SLIDER_FPS_ID);
    sliderFps.addEventListener('input', (event) => {
      const fps = event.target.value;
      this.setRenderFps(fps);

      // Rename slider label
      const sliderFpsLabel = document.getElementById(SLIDER_FPS_LABEL_ID);
      sliderFpsLabel.innerHTML = `FPS (${fps})`;
    });
  }

  initProjection(minLon, maxLon, minLat, maxLat) {
    const geoMercatorProjection = d3.geoMercator();
    const bottomLeft = geoMercatorProjection([minLon, minLat]);
    const topRight = geoMercatorProjection([maxLon, maxLat]);

    const inputWidth = topRight[0] - bottomLeft[0];
    const inputHeight = bottomLeft[1] - topRight[1];
    const inputAspectRatio = inputWidth / inputHeight;

    const outputAspectRatio = this.width / this.height;

    let scaleFactor;
    if (inputAspectRatio > outputAspectRatio) {
      scaleFactor = this.width / inputWidth;
    } else {
      scaleFactor = this.height / inputHeight;
    }

    const centerX = (bottomLeft[0] + topRight[0]) / 2;
    const centerY = (bottomLeft[1] + topRight[1]) / 2;
    const translateX = this.width / 2 - centerX * scaleFactor;
    const translateY = this.height / 2 - centerY * scaleFactor;

    // Initialize the cache object
    this.projectionCache = {};

    this.projection = (coordinates) => {
      const cacheKey = `${coordinates[0]},${coordinates[1]}`;

      // Check if the result is already cached
      if (this.projectionCache[cacheKey]) {
        return this.projectionCache[cacheKey];
      }

      // If not cached, calculate and store the result
      const mercatorCoordinates = d3.geoMercator()(coordinates);
      const result = [
        translateX + scaleFactor * mercatorCoordinates[0],
        this.height - (translateY + scaleFactor * mercatorCoordinates[1]), // Invert the y-axis
      ];

      this.projectionCache[cacheKey] = result;
      return result;
    };
  }

  initTrips() {
    d3.json(TRIPS_PATH).then((data) => {
      this.trips = data.bins;
      this.binSize = data.bin_size;
    });
  }

  addSwissBorder() {
    d3.json(MAP_PATH).then((data) => {
      // Define the projection
      function getMinMax(data, coordinateIndex, compareFunc, initialValue) {
        return data.features.map((feature) => {
          const coordinates = feature.geometry.coordinates[0];
          return coordinates.reduce((acc, p) => compareFunc(p[coordinateIndex], acc) ? p[coordinateIndex] : acc, initialValue);
        }).reduce((acc, p) => compareFunc(p, acc) ? p : acc, initialValue);
      }
      const minLon = getMinMax(data, 0, (a, b) => a < b, Infinity);
      const maxLon = getMinMax(data, 0, (a, b) => a > b, -Infinity);
      const minLat = getMinMax(data, 1, (a, b) => a < b, Infinity);
      const maxLat = getMinMax(data, 1, (a, b) => a > b, -Infinity);

      this.initProjection(minLon, maxLon, minLat, maxLat);

      // Draw the swiss borders
      const drawFeature = (feature) => {
        const coordinates = feature.geometry.coordinates[0];
        const points = coordinates.map((coordinate) => {
          const x = this.projection(coordinate)[0];
          const y = this.projection(coordinate)[1];
          return new THREE.Vector3(x, y, 0);
        });

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
          color: new THREE.Color(DEFAULT_MAP_BORDER_COLOR),
        });

        this.swissBorder = new THREE.Line(geometry, material);
        this.swissBorder.name = SWISS_BORDER_LINE_NAME;
        this.scene.add(this.swissBorder);
      }

      data.features.forEach((feature) => {
        drawFeature(feature);
      });
    });
  }

  removeHeatMap() {
    const heatmapScene = this.scene.getObjectByName(HEATMAP_SCENE_NAME);
    if (heatmapScene) {
      this.scene.remove(heatmapScene);
    }
  }

  addHeatMap(heatmapMode) {
    if (this.heatmapMode === heatmapMode) { return; }
    
    this.heatmapMode = heatmapMode;
    this.removeHeatMap();

    if (heatmapMode === null) {
      return;
    }

    let heatmapPath = null;
    if (this.heatmapMode === 'all') {
      heatmapPath = HEATMAP_PATH;
    } else {
      heatmapPath = `${HEATMAP_TRANSPORT_TYPE_PATH_PREFIX}${this.heatmapMode}${HEATMAP_TRANSPORT_TYPE_PATH_SUFFIX}`;
    }

    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(heatmapPath, (texture) => {
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
            gl_FragColor = vec4(intensity, 0.0, 1.0 - intensity, intensity);
          }
        `,
        transparent: true,
      });
      const textureWidth = texture.image.width;
      const textureHeight = texture.image.height;
      const scaleFactor = Math.min(this.width / textureWidth, this.height / textureHeight);

      const geometry = new THREE.PlaneGeometry(textureWidth * scaleFactor, textureHeight * scaleFactor);
      this.heatmap = new THREE.Mesh(geometry, heatmapMaterial);
    
      // Position the heatmap to match the Swiss border
      this.heatmap.position.set(this.width / 2, this.height / 2, -1); // Set a small z-offset to avoid z-fighting
      this.heatmap.name = HEATMAP_SCENE_NAME;
    
      this.scene.add(this.heatmap);
    });
  }

  getTrainCoordinates(trip, time) {
    const segment = trip.segments.find((segment) => segment.start_time <= time && time < segment.end_time);
    if (!segment) { return null; }

    const dTime = segment.end_time - segment.start_time;
    const dLon = segment.end_longitude - segment.start_longitude;
    const dLat = segment.end_latitude - segment.start_latitude;

    const lon = segment.start_longitude + dLon * (time - segment.start_time) / dTime;
    const lat = segment.start_latitude + dLat * (time - segment.start_time) / dTime;

    return [lon, lat];
  }

  removeTrainfromTripId(tripId) {
    const trainSceneName = TRAIN_SCENE_NAME_PREFIX + tripId
    if (trainSceneName in this.trainObjects) {
      this.scene.remove(this.trainObjects[trainSceneName]);
      delete this.trainObjects[trainSceneName];
    }
  }
  
  updateTrains(time) {
    if (!this.trips) { return; }
  
    // Find bin
    const roundedTimeStr = time - time % this.binSize;
    const trips = this.trips[roundedTimeStr].trips;
    if (!trips || trips.length === 0) { 
      this.removeTrains();
    }
  
    let instanceIndex = 0;
  
    trips.forEach((trip) => {
      const trainCoordinates = this.getTrainCoordinates(trip, time);
      if (trainCoordinates === null) { 
        this.removeTrainfromTripId(trip.trip_id);
        return; 
      }
  
      const trainPosition = this.projection(trainCoordinates);
  
      // Update the transformation matrix of the instance
      const matrix = new THREE.Matrix4();
      matrix.setPosition(new THREE.Vector3(trainPosition[0], trainPosition[1], 0));
      this.trainInstancedMesh.setMatrixAt(instanceIndex, matrix);
  
      instanceIndex++;
    });
  
    // Update the instance count to the actual number of instances
    this.trainInstancedMesh.count = instanceIndex;
    this.trainInstancedMesh.instanceMatrix.needsUpdate = true;
  }

  timestampToTimeStr(timestamp) {
    const hours = Math.floor(timestamp / 60);
    const minutes = timestamp % 60;
    return `${hours}:${minutes}`;
  }

  render() {
    this.setRenderFps(DEFAULT_FPS);
    let t = 0;
  
    const animate = (timestamp) => {
      requestAnimationFrame(animate);
  
      if (!this.previousTimestamp) {
        this.previousTimestamp = timestamp;
      }
  
      const elapsed = timestamp - this.previousTimestamp;
  
      // If enough time has passed, update the scene and render it
      if (elapsed > this.fpsInterval) {
        this.previousTimestamp = timestamp;
  
        this.updateTrains(t);
        this.renderer.render(this.scene, this.camera);
  
        // Print time on screen: TODO REMOVE
        document.getElementById("time").innerHTML = this.timestampToTimeStr(t);
        t += 1;
        t = t % 1439;
      }
    };
  
    animate();
  }
  
  setRenderFps(value) {
    this.renderFps = value;
    this.fpsInterval = 1000 / this.renderFps;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const map = new Map();
  map.render();
});
