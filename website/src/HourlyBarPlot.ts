//@ts-nocheck
import * as d3 from "d3";
//import './style.css';

const SHIFTED_MINUTES = 20
// const MINUTES_INTERVAL = 30
const DATA_FOLDER = "data/hourly_plot";

const BAR_ELEMENT_ID = "hourly-bar-chart";
const BAR_BUTTONS_ELEMENT_ID = "hourly-bar-buttons";

const margin = { top: 20, right: 20, bottom: 30, left: 50 };

const BAR_WIDTH_FACTOR = 0.016;

const COLOR_MAP = {
    "Train": "#00A59B",
    "Bus": "#6F2282",
    "Boat": "#E84E10",
    "Metro": "#FCBB00",
    "Tram": "#143A85",
    "Rack Railway": "#00973B"
};

const DEFAULT_TRANSPORT_METHOD = "Train";

export class HourlyBarPlot {
    private svg: d3.Selection<SVGGElement, unknown, HTMLElement, any>;
    private data!: any[];
    private parseTime = d3.timeParse("%H:%M:%S");
    private xScale!: d3.ScaleTime<number, number>;
    private yScale!: d3.ScaleLinear<number, number>;
    private startTime!: Date;
    private endTime!: Date;
    //private line!: d3.Line<any>;
    private bars!: d3.Selection<(SVGRectElement|d3.BaseType), { departure_time: string; count: number; }, SVGGElement, unknown> | 
                   d3.Selection<d3.BaseType, { departure_time: string; count: number; }, SVGGElement, unknown>;
    
    constructor() {
        this.initDimensions();
        this.initStaticElements();
        this.initPlot()
    }

    /**
     * Initializes the dimensions of the circle packing visualization.
     * @returns {void}
     */
        initDimensions(): void {
            const parentElement = document.getElementById(BAR_ELEMENT_ID);
            if (parentElement) {
                this.width = parentElement.clientWidth;
                this.height = parentElement.clientHeight / 2;
            }
        }

    private initStaticElements(): void {
        this.svg = d3
            .select(`#${BAR_ELEMENT_ID}`)
            .append("svg")
            .attr("width", this.width + margin.left + margin.right)
            .attr("height", this.height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);
    }

    private async loadData(transportMethod: string): Promise<void> {
        const data_path = `${DATA_FOLDER}/df_${transportMethod.toLowerCase().replace(' ', '_')}.json`;

        return new Promise((resolve, reject) => {
            d3.json(data_path).then((data: any) => {
                resolve(data);
            });
        });
    }

    private initData(): void {
        // Parse the time for each data point
        this.data.forEach(d => {
            d.departure_time = this.parseTime(d.departure_time);
            d.departure_time.setYear(1970);
        });
        // Shift the start time to the next minute
        const timeExtent = d3.extent(this.data, (d) => d.departure_time) as string[];
        this.startTime = new Date(timeExtent[0]);
        this.startTime.setMinutes(this.startTime.getMinutes() - SHIFTED_MINUTES);

        this.endTime = new Date(timeExtent[1]);
        this.endTime.setMinutes(this.endTime.getMinutes() + SHIFTED_MINUTES);
        
        // the scales
        this.xScale = d3
            .scaleTime()
            .domain([this.startTime, this.endTime])
            .range([0, this.width]);
        
        this.yScale = d3
            .scaleLinear()
            .domain([0, d3.max(this.data, (d) => d.count) as number])
            .nice()
            .range([this.height, 0]);
    }

    private createLine(): void {
        // Create the line generator function
        d3
            .line()
            .x((d: { departure_time: number }) => this.xScale(d.departure_time))
            .y((d) => this.yScale(d.count));
    }

    private createBars(): void {
        // Create the bar generator function
        this.bars = this.svg
            .selectAll(".bar")
            .data(this.data)
            .enter()
            .append("rect")
            .attr("class", "bar")
            .attr("x", (d) => this.xScale(d.departure_time) - (this.width * BAR_WIDTH_FACTOR) / 2)
            .attr("y", (d) => this.yScale(d.count))
            .attr("width", this.width * BAR_WIDTH_FACTOR)
            .attr("height", (d) => this.height - this.yScale(d.count))
            .attr("fill", "#00A59B");
    }

    private createAxes(): void {
        this.svg
            .append("g")
            .attr("class", "x axis")
            .attr("transform", `translate(0,${this.height})`)
            .call(d3.axisBottom(this.xScale).tickFormat(d3.timeFormat("%H:%M")));
        
        this.svg
            .append("g")
            .attr("class", "y axis")
            .call(d3.axisLeft(this.yScale));

        this.svg
            .selectAll(".tick")
            .attr("font-size", "var(--small-font-size)")
    }

    private initPlot(): void {
        this.loadData(DEFAULT_TRANSPORT_METHOD).then((data: any) => {
            this.data = data;

            this.initData();
            this.createLine();
            this.createBars();
            this.createAxes();
            this.addButtons();
        });
    }
    
    private async updatePlot(transportMethod: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.loadData(transportMethod).then((data: any) => {
                this.data = data

                // Parse data and update scales
                this.initData()
        
                // Update the bars
                this.bars = this.svg.selectAll(".bar")
                    .data(this.data);
        
                this.bars.join(
                    enter => enter.append("rect")
                        .attr("class", "bar")
                        .attr("x", (d) => this.xScale(d.departure_time) - this.width * BAR_WIDTH_FACTOR / 2)
                        .attr("y", this.yScale(0)) // start from the bottom of the chart
                        .attr("width", this.width * BAR_WIDTH_FACTOR)
                        .attr("height", 0) // start with a height of 0
                        .attr("fill", "steelblue"),

                    update => update
                        .transition() // Start a transition
                        .duration(1000) // Make it last 1 second
                        .attr("x", (d) => this.xScale(d.departure_time) - this.width * BAR_WIDTH_FACTOR / 2)
                        .attr("y", (d) => this.yScale(d.count))
                        .attr("width", this.width * BAR_WIDTH_FACTOR)
                        .attr("height", (d) => this.height - this.yScale(d.count))
                        .attr("fill", COLOR_MAP[transportMethod]),
                    exit => exit
                        .transition() // Start a transition
                        .duration(1000) // Make it last 1 second
                        .attr("y", this.yScale(0)) // Move to the bottom of the chart
                        .attr("height", 0) // End with a height of 0
                        .remove() // After the transition, remove the bar
                );
        
                // Update the axes
                this.svg.select(".x.axis")
                    .transition()
                    .duration(1000)
                    .call(d3.axisBottom(this.xScale).tickFormat(d3.timeFormat("%H:%M")));
        
                    this.svg.select(".y.axis")
                    .transition()
                    .duration(1000)
                    .call(d3.axisLeft(this.yScale));
            });
        });
    }

    private addButtons(): void {
        // Define an array of cities
        const transportTypes = ["Train", "Bus", "Boat", "Metro", "Tram", "Rack Railway"];

        // create button for each type of transport
        for (let i = 0; i < transportTypes.length; i++) {
            const transportMethod = transportTypes[i];
            const button = document.createElement("button");
            button.setAttribute("type", "button");
            button.setAttribute('id', transportMethod);
            button.innerHTML = transportMethod;
            if (transportMethod === DEFAULT_TRANSPORT_METHOD) {
                button.classList.add("pushed");
            }
            button.onclick = () => {
                // Set button as pushed
                const buttons = document.getElementById(BAR_BUTTONS_ELEMENT_ID)!.getElementsByTagName("button");
                for (let j = 0; j < buttons.length; j++) {
                    buttons[j].classList.remove("pushed");
                }
                button.classList.add("pushed");

                this.updatePlot(transportMethod);
            };

            document.getElementById(BAR_BUTTONS_ELEMENT_ID)!.appendChild(button);
        }
    }
}