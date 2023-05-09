//@ts-nocheck
import * as d3 from "d3";
import './style.css';
import data from "table_df.json";

const DATA_FOLDER = "data/home_table";

const margin = { top: 20, right: 20, bottom: 30, left: 50 };
const width = 960 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

interface StopData {
    stop_id: number;
    stop_name: string;
    city: string;
    canton: string;
    mean_arrival_delay: number;
    mean_departure_delay: number;
    median_arrival_delay: number;
    median_departure_delay: number;
    std_arrival_delay: number;
    std_departure_delay: number;
    n_arrival_delay: number;
    n_departure_delay: number;
    n_cancelled: number;
    n_through_trip: number;
    n_additional_trip: number;
    n_entries: number;
  }

//EPFL Stop ID
const DEFAULT_STOP_ID = 8579233; 

export class HomePageTable {
    private data: StopData[];
    private table: d3.Selection<HTMLTableElement, unknown, HTMLElement, any>;
    //private data!: any[];
    //private parseTime = d3.timeParse("%H:%M:%S");
    //private xScale!: d3.ScaleTime<number, number>;
    //private yScale!: d3.ScaleLinear<number, number>;
    //private startTime!: Date;
    //private endTime!: Date;
    //private line!: d3.Line<any>;
    //private bars!: d3.Selection<(SVGRectElement|d3.BaseType), { departure_time: string; count: number; }, SVGGElement, unknown> | 
    //               d3.Selection<d3.BaseType, { departure_time: string; count: number; }, SVGGElement, unknown>;
    
    constructor(data: StopData[]) {
        this.data = data;
        this.table = d3.select("#stop-table");
    }

    private initStaticElements(): void {
        this.svg = d3
            .select("#chart")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);
    }

    private loadData(): void {
        // just one JSON file this time.
    }

    private createTable(): void {
        // headers (cols)
        const headerRow = this.table.append("thead").append("tr");
        headerRow
          .append("th")
          .text("Stop ID")
          .attr("class", "stop-id-header");
        headerRow
          .append("th")
          .text("Stop Name")
          .attr("class", "stop-name-header");
        headerRow
          .append("th")
          .text("City")
          .attr("class", "city-header");
        headerRow
          .append("th")
          .text("Canton")
          .attr("class", "canton-header");
        headerRow
          .append("th")
          .text("Mean Arrival Delay (s)")
          .attr("class", "mean-arrival-delay-header");
        headerRow
          .append("th")
          .text("Mean Departure Delay (s)")
          .attr("class", "mean-departure-delay-header");
        headerRow
          .append("th")
          .text("Median Arrival Delay (s)")
          .attr("class", "median-arrival-delay-header");
        headerRow
          .append("th")
          .text("Median Departure Delay (s)")
          .attr("class", "median-departure-delay-header");
        headerRow
          .append("th")
          .text("Std Arrival Delay (s)")
          .attr("class", "std-arrival-delay-header");
        headerRow
          .append("th")
          .text("Std Departure Delay (s)")
          .attr("class", "std-departure-delay-header");
        headerRow
          .append("th")
          .text("N Arrival Delay")
          .attr("class", "n-arrival-delay-header");
        headerRow
          .append("th")
          .text("N Departure Delay")
          .attr("class", "n-departure-delay-header");
        headerRow
          .append("th")
          .text("N Cancelled")
          .attr("class", "n-cancelled-header");
        headerRow
          .append("th")
          .text("Through Trips")
          .attr("class", "n-through-trip-header");
        headerRow
          .append("th")
          .text("Additional Trips")
          .attr("class", "n-additional-trip-header");
        headerRow
          .append("th")
          .text("Entries")
          .attr("class", "n-entries-header");


        // rows 
        const rows = tableBody
        .selectAll("tr")
        .data(data)
        .join("tr")
        .attr("class", "stop-row")
        .on("mouseover", function () {
            d3.select(this).style("background-color", "lightblue");
        })
        .on("mouseout", function () {
            d3.select(this).style("background-color", null);
        });


        // add the data to cells
        
        rows
        .append("td")
        .text((d) => d.stop_id)
        .attr("class", "stop-id-cell");
        rows
        .append("td")
        .text((d) => d.stop_name)
        .attr("class", "stop-name-cell");
        rows
        .append("td")
        .text((d) => d.city)
        .attr("class", "city-cell");
        rows
        .append("td")
        .text((d) => d.canton)
        .attr("class", "canton-cell");
        rows
        .append("td")
        .text((d) => d.mean_arrival_delay)
        .attr("class", "mean-arrival-delay-cell");
        rows
        .append("td")
        .text((d) => d.mean_departure_delay)
        .attr("class", "mean-departure-delay-cell");
        rows
        .append("td")
        .text((d) => d.median_arrival_delay)
        .attr("class", "median-arrival-delay-cell");
        rows
        .append("td")
        .text((d) => d.median_departure_delay)
        .attr("class", "median-departure-delay-cell");
        rows
        .append("td")
        .text((d) => d.std_arrival_delay)
        .attr("class", "std-arrival-delay-cell");
        rows
        .append("td")
        .text((d) => d.std_departure_delay)
        .attr("class", "std-departure-delay-cell");
        rows
        .append("td")
        .text((d) => d.n_arrival_delay)
        .attr("class", "n-arrival-delay-cell");
        rows
        .append("td")
        .text((d) => d.n_departure_delay)
        .attr("class", "n-departure-delay-cell");
        rows
        .append("td")
        .text((d) => d.n_cancelled)
        .attr("class", "n-cancelled-cell");
        rows
        .append("td")
        .text((d) => d.n_through_trip)
        .attr("class", "n-through-trip-cell");
        rows
        .append("td")
        .text((d) => d.n_additional_trip)
        .attr("class", "n-additional-trip-cell");
        rows
        .append("td")
        .text((d) => d.n_entries)
        .attr("class", "n-entries-cell");

        // return the table element
        return table.node();

    }
}
