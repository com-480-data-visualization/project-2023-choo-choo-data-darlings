import * as d3 from 'd3';
import './style.css';

const SVG_FILES_PATH = "data/svgs.json";

document.addEventListener("DOMContentLoaded", () => {

    const colors = ["red", "orange", "yellow", "green", "blue", "indigo", "violet"];
    let colorIndex = 0;

    const app = document.querySelector("body");

    setInterval(() => {
        colorIndex = (colorIndex + 1) % colors.length;
        app!.style.transition = "background-color 2s ease";
        app!.style.backgroundColor = colors[colorIndex];
    }, 1000);

    d3.json(SVG_FILES_PATH).then((data: any) => {
        const svgFiles = data.files;
        const banner = document.querySelector(".banner");
        svgFiles.forEach((svgFile: any) => {
            // Append the SVG to the banner
            d3.xml(svgFile).then((data: any) => {
                banner!.appendChild(data.documentElement);
            })
        });
    });
});