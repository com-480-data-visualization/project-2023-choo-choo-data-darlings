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

    let map: any = null;
    let network: any = null;

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
        slidesNavigation: false,
        controlArrows: false,
        verticalCentered: false,
        scrollingSpeed: SCROLL_DURATION,
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

            // Map loading, resume and pause
            if (destination.index === 9){
                if (map === null) {
                    map = new Map();
                } else {
                    map.resumeSimulation();
                }
            } else {
                if (map !== null) {
                    map.pauseSimulation();
                }
            }

            // Network loading
            if (network === null && destination.index === 5) {
                network = new GraphManager();
                setTimeout(() => {
                    network.load();
                }, SCROLL_DURATION);
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
});