import * as d3 from "d3";
import data from "./df_train.json";

const margin = { top: 20, right: 20, bottom: 30, left: 50 };
const width = 960 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

// svg container
const svg = d3
  .select("#chart")
  .append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

// the scales
const xScale = d3
  .scaleTime()
  .domain(d3.extent(data, (d) => new Date(`${d.departure_time}`)))
  .range([0, width]);
const yScale = d3
  .scaleLinear()
  .domain([0, d3.max(data, (d) => d.count)])
  .nice()
  .range([height, 0]);

// Create the line generator function
const line = d3
  .line()
  .x((d) => xScale(new Date(`${d.departure_time}`)))
  .y((d) => yScale(d.count));

// add the data to the svg .append(path)
svg
  .datum(data)
  .attr("fill", "none")
  .attr("stroke", "steelblue")
  .attr("stroke-width", 1.5)
  .attr("d", line);

// axis-es
svg
  .append("g")
  .attr("transform", `translate(0,${height})`)
  .call(d3.axisBottom(xScale));

svg.append("g").call(d3.axisLeft(yScale));