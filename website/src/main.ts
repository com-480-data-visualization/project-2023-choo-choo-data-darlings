import { CirclePacking } from './CirclePacking.ts';
import { HierarchicalEdgeBundling } from './HierarchicalEdgeBundling.ts';
import { HourlyBarPlot } from './HourlyBarPlot.ts';
import { GraphManager } from './network.ts';
import { Map } from './map.ts';

const SCROLL_DURATION = 1000;

document.addEventListener("DOMContentLoaded", () => {
    new CirclePacking();
    new HierarchicalEdgeBundling();
    new HourlyBarPlot();

    // Load the graph when scoll to the p5-container div
    const p5Container = document.getElementById("p5-container");
    if (p5Container) {
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                const graphManager = new GraphManager();
                graphManager.load();
                observer.unobserve(p5Container);
            }
        }, { threshold: 1 });
        observer.observe(p5Container);
    }

    // Load the map when scoll to the map-container div
    let map: any = null;
    // Observer for p8-container
    const p8Container = document.getElementById("p8-container");
    if (p8Container) {
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && map === null) {
                map = new Map();
            }
        }, { threshold: 1 });
        observer.observe(p8Container);
    }

    // Observer for p9-container
    const p9Container = document.getElementById("p9-container");
    if (p9Container) {
        const observer = new IntersectionObserver((entries) => {
            if (map === null) return;

            if (entries[0].isIntersecting) {
                map.resumeSimulation();
            } else {
                setTimeout(() => {
                    map.pauseSimulation();
                }, SCROLL_DURATION);
            }
        }, { threshold: 1 });
        observer.observe(p9Container);
    }
});