//@ts-nocheck
import * as d3 from 'd3';

const PACKING_DATA_PATH = '../data/circle_packing_data.json';

const PACKING_ELEMENT_ID = "circle_packing";

const PACKING_WIDTH = 800;
const PACKING_HEIGHT = 800;

export class CirclePacking {

    private data!: any;

    private width: number = PACKING_WIDTH;
    private height: number = PACKING_HEIGHT;

    constructor() {
        this.loadData().then(() => {
            this.initPacking();
        });
    }

    async loadData(): Promise<void> {
        return new Promise((resolve, reject) => {
            d3.json(PACKING_DATA_PATH).then((data) => {
                this.data = data;
                resolve();
            });
        });
    }

    initPacking(): void {
        const pack = (data: any) => d3.pack()
            .size([this.width, this.height])
            .padding(3)(
                d3.hierarchy(data)
                .sum(d => d.value)
                .sort((a: any, b: any) => b.value - a.value)
            )

        const format = d3.format(",d")

        const color = d3.scaleLinear()
            .domain([0, 2])
            .range(["#F6F6F6", "#2D327D"])
            .interpolate(d3.interpolateHcl)

        const root = pack(this.data);
        let focus = root;
        let view;

        const svg = d3.select(`#${PACKING_ELEMENT_ID}`).append("svg")
            .attr("viewBox", `-${this.width / 2} -${this.height / 2} ${this.width} ${this.height}`)
            .style("display", "block")
            .style("margin", "0 -14px")
            .style("background", color(0))
            .style("cursor", "pointer")
            .on("click", (event) => zoom(event, root));

        const node = svg.append("g")
            .selectAll("circle")
            .data(root.descendants().slice(1))
            .join("circle")
            .attr("fill", d => d.children ? color(d.depth) : "#FFFFFF")
            .attr("pointer-events", d => !d.children ? "none" : null)
            .on("mouseover", function() { d3.select(this).attr("stroke", "#000"); })
            .on("mouseout", function() { d3.select(this).attr("stroke", null); })
            .on("click", (event, d) => focus !== d && (zoom(event, d), event.stopPropagation()));

        const label = svg.append("g")
            .style("font", "10px sans-serif")
            .attr("pointer-events", "none")
            .attr("text-anchor", "middle")
            .selectAll("text")
            .data(root.descendants())
            .join("text")
            .style("fill-opacity", d => d.parent === root ? 1 : 0)
            .style("display", d => d.parent === root ? "inline" : "none")
            .text((d: any) => d.data.name);
        
        const zoomTo = (v: any) => {
            const k = this.width / v[2];
        
            view = v;
        
            label.attr("transform", d => `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`);
            node.attr("transform", d => `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`);
            node.attr("r", d => d.r * k);
        }

        zoomTo([root.x, root.y, root.r * 2]);
        
          function zoom(event, d) {
            const focus0 = focus;
        
            focus = d;
        
            const transition = svg.transition()
                .duration(event.altKey ? 7500 : 750)
                .tween("zoom", d => {
                  const i = d3.interpolateZoom(view, [focus.x, focus.y, focus.r * 2]);
                  return t => zoomTo(i(t));
                });
        
            label
              .filter(function(d) { return d.parent === focus || this.style.display === "inline"; })
              .transition(transition)
                .style("fill-opacity", d => d.parent === focus ? 1 : 0)
                .on("start", function(d) { if (d.parent === focus) this.style.display = "inline"; })
                .on("end", function(d) { if (d.parent !== focus) this.style.display = "none"; });
          }
    }
}