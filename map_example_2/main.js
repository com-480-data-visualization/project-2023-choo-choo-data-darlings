import * as d3 from 'd3';
import * as THREE from 'three';
import { MeshLine, MeshLineMaterial, MeshLineRaycast } from 'three.meshline';

const DIV_CONTAINER_ID = 'container';

const MAP_PATH = 'data/swissBOUNDARIES3D_1_3_TLM_LANDESGEBIET.geojson';

const SWISS_BORDER_LINE_NAME = 'swissborder';

const DEFAULT_MAP_BORDER_COLOR = 0xaaaaaa;
const DEFAULT_MAP_BORDER_WIDTH = 30;

class Map {
  constructor() {
    this.initScene();
    this.initMap();
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
  }

  initProjection(minLon, maxLon, minLat, maxLat) {
    // Get real coordinates after geoMercator projection
    const geoMercatorProjection = d3.geoMercator();
    const bottomLeft = geoMercatorProjection([minLon, minLat]);
    const topRight = geoMercatorProjection([maxLon, maxLat]);
  
    // Calculate the aspect ratio of the input bounding box and the output dimensions
    const inputWidth = topRight[0] - bottomLeft[0];
    const inputHeight = bottomLeft[1] - topRight[1];
    const inputAspectRatio = inputWidth / inputHeight;
  
    const outputAspectRatio = this.width / this.height;
  
    // Determine the minimum scale factor
    let scaleFactor;
    if (inputAspectRatio > outputAspectRatio) {
      scaleFactor = this.width / inputWidth;
    } else {
      scaleFactor = this.height / inputHeight;
    }
  
    // Calculate the translation needed to center the map
    const centerX = (bottomLeft[0] + topRight[0]) / 2;
    const centerY = (bottomLeft[1] + topRight[1]) / 2;
    const translateX = this.width / 2 - centerX * scaleFactor;
    const translateY = this.height / 2 - centerY * scaleFactor;
  
    this.projection = (coordinates) => {
      const mercatorCoordinates = d3.geoMercator()(coordinates);
      return [
        translateX + scaleFactor * mercatorCoordinates[0],
        this.height - (translateY + scaleFactor * mercatorCoordinates[1]) // Invert the y-axis
      ];
    };
  }

  initMap() {
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

  updateMapRender(t) {
    this.scene.traverse((child) => {
      if (child.name !== SWISS_BORDER_LINE_NAME) { return; }
      const positionArray = child.geometry.attributes.position.array;
      for (let index = 0; index < positionArray.length; index++) {
        if (index % 3 === 0) {
          positionArray[index] += Math.sin(t * 25) * Math.random();
        } else if (index % 3 === 1) {
          positionArray[index] += Math.cos(t) * Math.random();
        } else {
        }
      }
      child.geometry.attributes.position.needsUpdate = true;
    });
  }
  
  

  render() {
    let t = 0;
    const animate = () => {
      requestAnimationFrame(animate);
      //this.updateMapRender(t);
      this.renderer.render(this.scene, this.camera);
      t += 0.01;
    }
    animate();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const map = new Map();
  map.render();
});
