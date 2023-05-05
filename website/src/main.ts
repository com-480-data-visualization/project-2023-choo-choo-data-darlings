import './style.css';
import { HierarchicalEdgeBundling } from './HierarchicalEdgeBundling.ts';
import { CirclePacking } from './CirclePacking.ts';

document.addEventListener("DOMContentLoaded", () => {
    new HierarchicalEdgeBundling();
    new CirclePacking();
});