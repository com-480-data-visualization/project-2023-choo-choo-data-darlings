import { CirclePacking } from './CirclePacking.ts';
import { HierarchicalEdgeBundling } from './HierarchicalEdgeBundling.ts';
import { HourlyBarPlot } from './HourlyBarPlot.ts';
import './style.css';

document.addEventListener("DOMContentLoaded", () => {
    new HierarchicalEdgeBundling();
    new CirclePacking();
    new HourlyBarPlot();
});