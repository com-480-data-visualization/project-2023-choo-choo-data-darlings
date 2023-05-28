//@ts-nocheck
import * as d3 from "d3";
import './style.css';

const DATA_FOLDER = "./data2";

const TABLE_ELEMENT_ID = "table-container";
const BAR_ELEMENT_ID = "bar-plot";

const DEFAULT_COLUMN = 'n_arrival_delay'

const BAR_WIDTH = 1;

// not used anymore but could be
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

interface HistData {
  hist_values: number;
  bins: number;
}


const margin = { top: 20, right: 20, bottom: 30, left: 50 };
const width = 960 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

export class TablePlot {
  private svg: d3.Selection<SVGGElement, unknown, HTMLElement, any>;
  private data!: any[];

  private xScale!: d3.ScaleLinear<number, number>;
  private yScale!: d3.ScaleLinear<number, number>;

  private bars!: d3.Selection<(SVGRectElement|d3.BaseType), { bins: number; hist_values: number; }, SVGGElement, unknown> | 
                   d3.Selection<d3.BaseType, { bins: number; hist_values: number; }, SVGGElement, unknown>;
    
  constructor() {
        this.initStaticElements();

        this.clickedAttribute = DEFAULT_COLUMN
        this.updatePlot(this.clickedAttribute)
        this.initPlot()
  }

  private initData(): void {
    // Parse the time for each data point
    // the scales
    //this.xScale = d3
    //    .scaleLinear()
    //    .range([0, this.width]);
    console.log("Data:", this.data);

    this.xScale = d3
        .scaleLinear()
        .domain([d3.min(this.data.bins), d3.max(this.data.bins)]) // Set the domain based on your data
        .range([0, width]);
    
    this.yScale = d3
        .scaleLog()
        .domain([1, d3.max(this.data.hist_values)])
        .nice()
        .range([height, 0]);
}

  private initStaticElements(): void {
    this.svg = d3
        .select("#bar-plot")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
  }
  
  
private async loadData(clickedAttribute: any): Promise<void> {
  //const attribute = this.clickedAttribute;
  //const filename = `${attribute}.json`;
  //console.log(attribute)
  return new Promise((resolve, reject) => {
      d3.json(`${DATA_FOLDER}/${clickedAttribute}.json`).then((data) => {
          this.data = data;
          resolve();
      })
      .catch((error) => {
          reject(error);
      });
  });
}

  private createLine(): d3.Line<{ bins: number }> {
    return d3
      .line<{ bins: number }>()
      .x((d) => this.xScale(d.bins))
      .y((d) => this.yScale(d.hist_values));
  }

  private createBars(): void {
    // Convert bins and hist_values into an array of objects
    const data = this.data.bins.map((bin, i) => ({
      bins: bin,
      hist_values: this.data.hist_values[i]
    }));

    // Create the bar generator function
    this.barGroup = this.svg.append('g')
      .attr('class', 'bar-group');

    this.bars = this.barGroup.selectAll(".bar")
        .data(data)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", (d) => this.xScale(d.bins))
        .attr("y", (d) => this.yScale(d.hist_values + 0.0001))
        .attr("width", width / this.data.num_bins)
        .attr("height", (d) => this.yScale.range()[0] - this.yScale(d.hist_values + 0.0001))
        .attr("fill", "#00A59B");
  }

  private createAxes(): void {
    this.svg
        .append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(this.xScale));
    
    this.svg
        .append("g")
        .attr("class", "y-axis")
        .call(d3.axisLeft(this.yScale));
  }

  private initPlot(): void {
    this.loadData(DEFAULT_COLUMN).then(() => {
        this.createLine();
        this.createBars();
        this.createAxes();
    });
  }

  private async updatePlot(clickedAttribute: string): Promise<void> {
    return new Promise((resolve, reject) => {
        this.loadData(clickedAttribute).then(() => {
          // Parse data and update scales 
          /// TO IMPLEMENT THIS
          this.initData()

          // Convert bins and hist_values into an array of objects
          const data = this.data.bins.map((bin, i) => ({
            bins: bin,
            hist_values: this.data.hist_values[i]
          }));

          // Update the bars
          this.bars = this.barGroup.selectAll(".bar")
              .data(data);
  
          this.bars.join(
              enter => enter
                  .append("rect")
                  .attr("class", "bar")
                  .attr("x", (d) => this.xScale(d.bins))
                  .attr("y", this.yScale(0)) // start from the bottom of the chart
                  .attr("width", width / this.data.num_bins)
                  .attr("height", 0) // start with a height of 0
                  .attr("fill", "steelblue"),

              update => update
                  .transition() // Start a transition
                  .duration(1000) // Make it last 1 second
                  .attr("x", (d) => this.xScale(d.bins))
                  .attr("y", (d) => this.yScale(d.hist_values + 0.0001))
                  .attr("width", width / this.data.num_bins)
                  .attr("height", (d) => height - this.yScale(d.hist_values + 0.0001)),

              exit => exit
                  .transition() // Start a transition
                  .duration(1000) // Make it last 1 second
                  .attr("y", this.yScale(0)) // Move to the bottom of the chart
                  .attr("height", 0) // End with a height of 0
                  .remove() // After the transition, remove the bar
          );
  
          // Update the axes
          this.svg.select(".x-axis")
              .transition()
              .duration(1000)
              .call(d3.axisBottom(this.xScale));
  
              this.svg.select(".y-axis")
              .transition()
              .duration(1000)
              .call(d3.axisLeft(this.yScale));
          
          resolve();
      })
      .catch((error) => {
          reject(error);
      });
    });
  }

  private createHorizontalLine(clickedCell: number): void {
    // Remove existing lines
    this.svg.selectAll(".vertical-line").remove();
    console.log(clickedCell)

    //Add a horizontal line
    this.svg.append("line")
      .attr("class", "vertical-line")
      .attr("y1", 0)
      .attr("x1", this.xScale(clickedCell))
      .attr("y2", height)
      .attr("x2", this.xScale(clickedCell))
      .attr("stroke", "red")
      .attr("stroke-width", 2);
  }




}


export class HomePageTable {
  private data: StopData[];
  private table: d3.Selection<HTMLTableElement, unknown, HTMLElement, any>;
  private plot: TablePlot;

  private rows: any;

  constructor() {
    this.loadData().then(() => {
      this.initTable();
      this.initPagination();
      this.sortedTable(); //sort values depending on attribute
      this.updateTable(); //hover and click behaviours
      //this.plot = new TablePlot(); // link bar plot
      this.plot = new TablePlot(); //link bar plot
    });
  }

  private initPagination(): void {
    const tableContainer = document.getElementById(TABLE_ELEMENT_ID);
    const paginationContainer = document.getElementById("pagination-container");
  
    const itemsPerPage = 25; // Number of items to display per page
  
    const pageCount = Math.ceil(this.data.length / itemsPerPage);
    const pagination = Array.from({ length: pageCount }).map((_, index) => index + 1);
  
    paginationContainer.innerHTML = "";
  
    pagination.forEach((pageNum) => {
      const pageButton = document.createElement("button");
      pageButton.innerText = pageNum.toString();
  
      pageButton.addEventListener("click", () => {
        this.renderTablePage(pageNum, itemsPerPage);
      });
  
      paginationContainer.appendChild(pageButton);
    });
  
    this.renderTablePage(1, itemsPerPage); // Render the first page
  }

  private renderTablePage(pageNum, itemsPerPage): void {
    const startIndex = (pageNum - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageData = this.data.slice(startIndex, endIndex);
  
    this.rows = this.table.select("tbody").selectAll("tr")
      .data(pageData, (d) => d.stop_id.toString());
  
    this.rows.exit().remove();
  
    const newRows = this.rows.enter().append("tr");
    newRows.selectAll("td")
      .data((d) => Object.values(d))
      .enter()
      .append("td")
      .text((d) => d);
  
    this.rows = newRows.merge(this.rows);
  
    this.updateTable();
  }

  private async loadData(): Promise<void> {
    try {
      const data = await d3.json('table_sub_df.json');
      this.data = data;
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }

  private initTable(): void {
    // container element where the table will be appended
    const container = d3.select(`#${TABLE_ELEMENT_ID}`);

    // width of the table to 90% of the screen width
    const screenWidth = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
    const tableWidth = 0.9 * screenWidth;

    this.table = container.append('table')
      .attr('class', 'choo-choo-table-class')
      .style('width', `${tableWidth}px`);

    //header
    const thead = this.table.append('thead');
    // body
    const tbody = this.table.append('tbody');

    // table header row
    const headerRow = thead.append('tr');

    // attributes from the first entry in table_df.json
    const attributes = Object.keys(this.data[0]);

    // table cols based on this attributes
    headerRow.selectAll('th')
      .data(attributes)
      .enter()
      .append('th')
      .text((d) => d);

    // table body rows
    this.rows = tbody.selectAll('tr')
      .data(this.data)
      .enter()
      .append('tr');

    // create table cells and fill them up with the data
    this.rows.selectAll('td')
      .data((d) => Object.values(d))
      .enter()
      .append('td')
      .text((d) => d);
  }

  private sortedTable(): void {
    // get table element by its class
    const table = d3.select('.choo-choo-table-class');
    const headerRow = table.select('thead tr');
    const tbody = table.select('tbody');

    // sorter function
    const sortTable = (attribute: string, ascending: boolean) => {
      const sortedData = this.data.slice().sort((a, b) => {
        if (ascending) {
          return d3.ascending(a[attribute], b[attribute]);
        } else {
          return d3.descending(a[attribute], b[attribute]);
        }
      });

      // Remove the old rows
      tbody.selectAll('tr').remove();

      // Add new sorted rows
      this.rows = tbody.selectAll('tr')
        .data(sortedData)
        .enter()
        .append('tr');

      // Add data to the rows
      this.rows.selectAll('td')
        .data((d: any) => Object.values(d))
        .enter()
        .append('td')
        .text((d: any) => d);

      this.updateTable();
    };

    // respond to clicks on header
    headerRow.selectAll('th')
      .on('click', function (d) {
        const currentSortOrder = d3.select(this).classed('sorted-ascending');
        headerRow.selectAll('th').classed('sorted-ascending', false);
        headerRow.selectAll('th').classed('sorted-descending', false);
        d3.select(this).classed('sorted-ascending', !currentSortOrder);
        d3.select(this).classed('sorted-descending', currentSortOrder);

        // Sort the table based on the clicked attribute
        sortTable(d.target.innerHTML, !currentSortOrder);
      });
  }

  private handleCellClick(cell: HTMLElement, attribute: string): void {
    const columnData = this.data.map((d) => d[attribute]);
  
    // Highlight the clicked cell
    d3.select(cell).classed("clicked", true);

    // Update the plot
    this.plot.updatePlot(attribute)
    this.plot.createHorizontalLine(cell)
}

  private updateTable(): void {
    // hover 
    this.rows.on('mouseover', function () {
      d3.select(this).classed('hovered', true);
    }).on('mouseout', function () {
      d3.select(this).classed('hovered', false);
    });

    // click
    const self = this
    this.rows
      .selectAll("td")
      // determine the clicked cell and what attribute it belongs to
      .on("click", function(d) {
        const clickedCell = d3.select(this).node() as HTMLElement;

        // Get index of clickedCell within its parent tr
        const cellIndex = Array.prototype.indexOf.call(clickedCell.parentNode.children, clickedCell);

        // Get header (th) element corresponding to the clicked cell
        const headerRow = d3.select(`#${TABLE_ELEMENT_ID}`).select('thead tr').node() as HTMLElement;
        const clickedHeader = headerRow.children[cellIndex];

        // Get the HTML content of the header cell
        const clickedAttribute = clickedHeader.innerHTML;

        console.log(clickedCell, clickedAttribute);

        self.handleCellClick(clickedCell, clickedAttribute);
      });
  }
}