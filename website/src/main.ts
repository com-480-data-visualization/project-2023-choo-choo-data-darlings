//@ts-nocheck
import { CirclePacking } from './CirclePacking.ts';
import { HierarchicalEdgeBundling } from './HierarchicalEdgeBundling.ts';
import { HourlyBarPlot } from './HourlyBarPlot.ts';
import { GraphManager } from './network.ts';
import { Map } from './map.ts';

import fullpage from 'fullpage.js';
import 'fullpage.js/dist/fullpage.css';

const SCROLL_DURATION = 1000;

document.addEventListener("DOMContentLoaded", () => {
    new CirclePacking();
    new HierarchicalEdgeBundling();
    new HourlyBarPlot();

    // Fullpage.js
    const sectionsLocked = [
        false,  // title
        false,  // introduction
        true,   // circle packing
        true,   // interactive table
        true,   // hierarchical edge bundling
        true,   // network introduction
        true,   // network
        true,   // hourly plot
        true,   // map introduction
        true,   // map
        true,   // final
    ];

    new fullpage('#fullpage', {
        navigation: true,
        navigationTooltips: [
            'Title',
            'Introduction',
            'Circle Packing',
            'Interactive Table',
            'Hierarchical Edge Bundling',
            'Network Introduction',
            'Network',
            'Hourly Plot',
            'Map Introduction',
            'Map',
            'Final'
        ],
        slidesNavigation: true,
        controlArrows: false,
        verticalCentered: false,
        scrollingSpeed: 1000,
        scrollOverflow: true,
        onLeave: function(_: any, destination: any, direction: any){
            // if we are going forward and the destination is locked...
            if(direction == 'down' && sectionsLocked[destination.index]) {
                // don't let them leave the section (by canceling the move)
                return false;
            }
            // otherwise, unlock the next section (if it exists)
            else if(destination.index + 1 < sectionsLocked.length) {
                sectionsLocked[destination.index + 1] = false;
                navItems[destination.index + 1].classList.remove('locked');
            }
        }
    });

    var navItems = document.querySelectorAll('#fp-nav li');

    // apply initial opacity
    function applyOpacityToLockedSections() {
        navItems.forEach(function(item, index) {
            if (sectionsLocked[index]) {
                item.classList.add('locked');
            }
        });
    }
    applyOpacityToLockedSections();

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