import { CirclePacking } from './CirclePacking.ts';
import { HierarchicalEdgeBundling } from './HierarchicalEdgeBundling.ts';
import { HourlyBarPlot } from './HourlyBarPlot.ts';
import { GraphManager } from './network.ts';

document.addEventListener("DOMContentLoaded", () => {
    new CirclePacking();
    new HierarchicalEdgeBundling();
    new HourlyBarPlot();

    // Load the graph when scoll to the p5-container div
    const p5Container = document.getElementById("p5-container");
    if (p5Container) {
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                console.log("loading graph")
                const graphManager = new GraphManager();
                graphManager.load();
                observer.unobserve(p5Container);
            }
        }, { threshold: 1 });
        observer.observe(p5Container);
    }
    
});