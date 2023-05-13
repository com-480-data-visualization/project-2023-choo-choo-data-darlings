import { CirclePacking } from './CirclePacking.ts';
import { HierarchicalEdgeBundling } from './HierarchicalEdgeBundling.ts';
import { HourlyBarPlot } from './HourlyBarPlot.ts';

document.addEventListener("DOMContentLoaded", () => {
    new CirclePacking();
    new HierarchicalEdgeBundling();
    new HourlyBarPlot();
});