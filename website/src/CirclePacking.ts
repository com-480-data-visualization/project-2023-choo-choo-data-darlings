import * as d3 from 'd3';

const PACKING_DATA_PATH = 'data/circle_packing_data.json';

const PACKING_ELEMENT_ID = "circle_packing";

const PACKING_WIDTH = 800;
const PACKING_HEIGHT = 800;

const OFF_WHITE_COLOR = '#f4efda';
const GREEN_COLOR = '#2e5d52';
const BLACK_COLOR = '#000000';

const CIRCLE_PADDING = 3;

const MIN_FONT_SIZE = 5;
const MAX_FONT_SIZE = 100;

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
        return new Promise((resolve) => {
            d3.json(PACKING_DATA_PATH).then((data) => {
                this.data = data;
                resolve();
            });
        });
    }

    updateDimensions(): void {
        const parentElement = document.getElementById(PACKING_ELEMENT_ID);
        if (parentElement) {
            const dimensions = Math.min(parentElement.clientWidth, parentElement.clientHeight);
            this.width = dimensions;
            this.height = dimensions;
        }
    }

    initPacking(): void {
        this.updateDimensions();

        const pack = (data: any) => d3.pack()
            .size([this.width, this.height])
            .padding(CIRCLE_PADDING)(
                d3.hierarchy(data)
                .sum(d => d.value)
                .sort((a: any, b: any) => b.value - a.value)
            )

        const root = pack(this.data);
        let focus = root;

        const colorScale = d3.scaleLinear()
            .domain([0, 2])
            .range([OFF_WHITE_COLOR, GREEN_COLOR] as Iterable<number>)

        const fontSizeScale = d3.scaleSqrt()
            .domain([d3.min(root.descendants(), d => d.r), d3.max(root.descendants(), d => d.r)])
            .range([MIN_FONT_SIZE, MAX_FONT_SIZE]);

        const svg = d3.select(`#${PACKING_ELEMENT_ID}`)
            .append("svg")
            .attr("width", this.width)
            .attr("height", this.height)
            .attr("viewBox", `-${this.width / 2} -${this.height / 2} ${this.width} ${this.height}`)
            .style("display", "block")
            .style("background", colorScale(0))
            .style("cursor", "pointer")
            .on("click", (event) => zoom(event, root));

        const node = svg.append("g")
            .selectAll("circle")
            .data(root.descendants().slice(1))
            .join("circle")
            .attr("fill", d => d.children ? colorScale(d.depth) : OFF_WHITE_COLOR)
            .attr("pointer-events", d => !d.children ? "none" : null)
            .on("mouseover", function() { d3.select(this).attr("stroke", BLACK_COLOR); })
            .on("mouseout", function() { d3.select(this).attr("stroke", null); })
            .on("click", (event, d) => focus !== d && (zoom(event, d), event.stopPropagation()));

        const label = svg.append("g")
            .style("font-family", "var(--default-font-family)")
            .attr("pointer-events", "none")
            .attr("text-anchor", "middle")
            .selectAll("text")
            .data(root.descendants())
            .join("text")
            .attr("dy", "0.3em")
            .style("font-size", (d: any) => `${fontSizeScale(d.r)}px`)
            .style("fill-opacity", d => d.parent === root ? 1 : 0)
            .style("display", d => d.parent === root ? "inline" : "none")
            .text((d: any) => d.data.name);
        
        let view: any;
        const zoomTo = (v: any) => {
            const k = this.width / v[2];
        
            view = v;
        
            label.attr("transform", d => `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`);
            node.attr("transform", d => `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`);
            node.attr("r", d => d.r * k);
        }

        zoomTo([root.x, root.y, root.r * 2]);
        
          function zoom(event: any, d: any) {
            focus = d;

            const transition = svg.transition()
                .duration(event.altKey ? 7500 : 750)
                .tween("zoom", () => {
                  const i = d3.interpolateZoom(view, [focus.x, focus.y, focus.r * 2]);
                  return (t: any) => zoomTo(i(t));
                });
        
            label
              .filter(function(d) { return d.parent === focus || (this as SVGElement).style.display === "inline"; })
              .transition(transition)
                .style("fill-opacity", d => d.parent === focus ? 1 : 0)
                .on("start", function(d) { if (d.parent === focus) (this as SVGElement).style.display = "inline"; })
                .on("end", function(d) { if (d.parent !== focus) (this as SVGElement).style.display = "none"; });
          }
    }
}