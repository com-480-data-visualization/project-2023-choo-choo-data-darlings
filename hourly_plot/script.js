import * as d3 from "d3";
import data from "./df_train.json";

const BAR_WIDTH = 15
const SHIFTED_MINUTES = 20
const MINUTES_INTERVAL = 30

const margin = { top: 20, right: 20, bottom: 30, left: 50 };
const width = 960 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

// Parse the time for each data point
const parseTime = d3.timeParse("%H:%M:%S");
data.forEach(d => {
  d.departure_time = parseTime(d.departure_time);
  d.departure_time.setYear(1970);
});

// svg container
const svg = d3
  .select("#chart")
  .append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

// Shift the start time to the next minute
const timeExtent = d3.extent(data, (d) => d.departure_time);
const startTime = new Date(timeExtent[0]);
startTime.setMinutes(startTime.getMinutes() - SHIFTED_MINUTES);
  
const endTime = new Date(timeExtent[1]);
endTime.setMinutes(endTime.getMinutes() + SHIFTED_MINUTES);

// the scales
const xScale = d3
  .scaleTime()
  .domain([startTime, endTime])
  .range([0, width]);

const yScale = d3
  .scaleLinear()
  .domain([0, d3.max(data, (d) => d.count)])
  .nice()
  .range([height, 0]);

// Create the line generator function
const line = d3
  .line()
  .x((d) => xScale(d.departure_time))
  .y((d) => yScale(d.count));

// Create the bar generator function
svg.selectAll(".bar")
  .data(data)
  .enter()
  .append("rect")
  .attr("class", "bar")
  .attr("x", (d) => xScale(d.departure_time) - BAR_WIDTH / 2)
  .attr("y", (d) => yScale(d.count))
  .attr("width", BAR_WIDTH)
  .attr("height", (d) => height - yScale(d.count))
  .attr("fill", "steelblue");

// axis-es
svg
  .append("g")
  .attr("class", "x axis")
  .attr("transform", `translate(0,${height})`)
  .call(d3.axisBottom(xScale).tickFormat(d3.timeFormat("%H:%M")));

svg.append("g")
  .attr("class", "y axis")
  .call(d3.axisLeft(yScale));

function updatePlot(transportMethod) {
  const data_path = `./df_${transportMethod.toLowerCase().replace(' ', '_')}.json`;
  d3.json(data_path).then((data) => {
    // Parse the time for each data point
    data.forEach(d => {
      d.departure_time = parseTime(d.departure_time);
      d.departure_time.setYear(1970);
    });

    // Update the xScale and yScale domain
    const timeExtent = d3.extent(data, (d) => d.departure_time);
    const startTime = new Date(timeExtent[0]);
    startTime.setMinutes(startTime.getMinutes() - SHIFTED_MINUTES);

    const endTime = new Date(timeExtent[1]);
    endTime.setMinutes(endTime.getMinutes() + SHIFTED_MINUTES);

    xScale.domain([startTime, endTime]);
    yScale.domain([0, d3.max(data, (d) => d.count)]).nice();

    // Update the bars
    const bars = svg.selectAll(".bar")
      .data(data);

    bars.join(
      enter => enter.append("rect")
        .attr("class", "bar")
        .attr("x", (d) => xScale(d.departure_time) - BAR_WIDTH / 2)
        .attr("y", yScale(0)) // start from the bottom of the chart
        .attr("width", BAR_WIDTH)
        .attr("height", 0) // start with a height of 0
        .attr("fill", "steelblue"),
      update => update
        .transition() // Start a transition
        .duration(1000) // Make it last 1 second
        .attr("x", (d) => xScale(d.departure_time) - BAR_WIDTH / 2)
        .attr("y", (d) => yScale(d.count))
        .attr("width", BAR_WIDTH)
        .attr("height", (d) => height - yScale(d.count))
        .attr("fill", transportMethod == "Train" ? "steelblue" : "red"),
      exit => exit
        .transition() // Start a transition
        .duration(1000) // Make it last 1 second
        .attr("y", yScale(0)) // Move to the bottom of the chart
        .attr("height", 0) // End with a height of 0
        .remove() // After the transition, remove the bar
    );
    
    // Update the axes
    svg.select(".x.axis")
      .transition()
      .duration(1000)
      .call(d3.axisBottom(xScale).tickFormat(d3.timeFormat("%H:%M")));

    svg.select(".y.axis")
      .transition()
      .duration(1000)
      .call(d3.axisLeft(yScale));
  });
}

document.addEventListener("DOMContentLoaded", () => {
  // Define an array of cities
  const transportTypes = ["Train", "Bus", "Boat", "Metro", "Tram", "Rack Railway"];
  
  // create button for each type of transport
  for (let i = 0; i < transportTypes.length; i++) {
    const transportMethod = transportTypes[i];
    const button = document.createElement("button");
    button.setAttribute("type", "button");
    button.setAttribute('id', transportMethod);
    button.innerHTML = transportMethod;
    button.onclick = function() {
      updatePlot(transportMethod);
    };

    document.getElementById("buttons").appendChild(button);
  }
});