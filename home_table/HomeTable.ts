//@ts-nocheck
import * as d3 from "d3";
import './style.css';

const DATA_FOLDER = "./data2";
const DATA_FILE_NAME = 'table_df.json';

const TABLE_ELEMENT_ID = "table-container";
const BAR_ELEMENT_ID = "bar-plot";

const DEFAULT_COLUMN = 'n_arrival_delay'

const BAR_WIDTH = 1;

const HEADER_NAME_MAP = (name: String) => {
  const map = {
    "stop_name": "Stop Name",
    "city": "City",
    "canton": "Canton",
    "mean_arrival_delay": "Mean Arrival Delay",
    "mean_departure_delay": "Mean Departure Delay",
    "n_arrival_delay": "Number of Arrival Delays",
    "n_departure_delay": "Number of Departure Delays",
    "n_cancelled": "Number of Cancelled Trips",
    "n_through_trip": "Number of Through Trips",
    "n_additional_trip": "Number of Additional Trips",
    "n_entries": "Number of Entries"
  }
  return map[name] ?? name
};

const REVERSE_HEADER_NAME_MAP = (name: String) => {
  const map = {
    "Stop Name": "stop_name",
    "City": "city",
    "Canton": "canton",
    "Mean Arrival Delay": "mean_arrival_delay",
    "Mean Departure Delay": "mean_departure_delay",
    "Number of Arrival Delays": "n_arrival_delay",
    "Number of Departure Delays": "n_departure_delay",
    "Number of Cancelled Trips": "n_cancelled",
    "Number of Through Trips": "n_through_trip",
    "Number of Additional Trips": "n_additional_trip",
    "Number of Entries": "n_entries"
  }
  return map[name] ?? name
};

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

  private bars!: d3.Selection<(SVGRectElement | d3.BaseType), { bins: number; hist_values: number; }, SVGGElement, unknown> |
    d3.Selection<d3.BaseType, { bins: number; hist_values: number; }, SVGGElement, unknown>;

  constructor() {
    this.initStaticElements();

    this.clickedAttribute = DEFAULT_COLUMN
    this.updatePlot(this.clickedAttribute, null)
    this.initPlot();
  }

  private initData(): void {
    // Parse the time for each data point
    // the scales
    //this.xScale = d3
    //    .scaleLinear()
    //    .range([0, this.width]);
    //console.log("Data:", this.data);

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

  private async updatePlot(clickedAttribute: string, cell: HTMLElement): Promise<void> {
    return new Promise((resolve, reject) => {
      this.loadData(clickedAttribute).then(() => {
        // Parse data and update scales 
        /// TO IMPLEMENT THIS
        this.initData()

        // Create the line
        if (cell) {
          this.createHorizontalLine(cell);
        }

        // Convert bins and hist_values into an array of objects
        const data = this.data.bins.map((bin, i) => ({
          bins: bin,
          hist_values: this.data.hist_values[i]
        }));

        // Update the bars
        if (!this.barGroup) {
          this.barGroup = this.svg.append('g')
            .attr('class', 'bar-group');
        }
        this.bars = this.barGroup.selectAll(".bar")
          .data(data);

        this.bars.join(
          enter => enter
            .append("rect")
            .attr("class", "bar")
            .attr("x", (d) => this.xScale(d.bins))
            .attr("y", this.yScale(1)) // start from the bottom of the chart
            .attr("width", width / this.data.num_bins)
            .attr("height", 0) // start with a height of 0
            .attr("fill", "steelblue"),

          update => update
            .transition() // Start a transition
            .duration(1000) // Make it last 1 second
            .attr("x", (d) => this.xScale(d.bins))
            .attr("y", (d) => this.yScale(d.hist_values + 1.0001))
            .attr("width", width / this.data.num_bins)
            .attr("height", (d) => height - this.yScale(d.hist_values + 1.0001)),

          exit => exit
            .transition() // Start a transition
            .duration(1000) // Make it last 1 second
            .attr("y", this.yScale(1)) // Move to the bottom of the chart
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

  private createHorizontalLine(clickedCell: HTMLElement): void {
    // Select the existing line, if it exists
    let line = this.svg.select(".vertical-line");

    // If no line exists, create one
    if (line.empty()) {
      line = this.svg.append("line")
        .attr("class", "vertical-line")
        .attr("y1", 0)
        .attr("y2", height)
        .attr("stroke", "red")
        .attr("stroke-width", 2);
    }

    // Calculate new x position
    const newX = this.xScale(clickedCell.__data__);

    // Transition line to new position
    line.transition()
      .duration(1000) // 1000 ms transition duration
      .attr("x1", newX)
      .attr("x2", newX);
  }
}

export class HomePageTable {
  private data: StopData[];
  private table: d3.Selection<HTMLTableElement, unknown, HTMLElement, any>;
  private plot: TablePlot;
  private ranks: number[];

  private rows: any;

  private currentPageNumber: number = 1;
  private itemsPerPage: number = 25;

  private maxVisibleButtons: number = 10; // Maximum number of visible buttons

  private colorScale: d3.ScaleSequential<string>;

  private lastClickedCell: HTMLElement;

  constructor() {
    this.loadData().then(() => {
      // Get the number of data points
      const nDataPoints = this.data.length;

      // Create a segmented color scale from green to red
      this.colorScale = d3
        .scaleSequential(d3.interpolateRdYlGn)
        .domain([nDataPoints, 1]);

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

    const pageCount = Math.ceil(this.data.length / this.itemsPerPage);
    const pagination = Array.from({ length: pageCount }).map((_, index) => index + 1);

    paginationContainer.innerHTML = "";

    const currentButtonIndex = this.currentPageNumber - 1;

    let startPage = Math.max(currentButtonIndex - Math.floor(this.maxVisibleButtons / 2), 0);
    let endPage = Math.min(startPage + this.maxVisibleButtons, pageCount);

    if (endPage - startPage < this.maxVisibleButtons) {
      startPage = Math.max(endPage - this.maxVisibleButtons, 0);
    }

    pagination.slice(startPage, endPage + 1).forEach((pageNum) => { // Increment endPage by 1
      const pageButton = document.createElement("button");
      pageButton.innerText = pageNum.toString();

      pageButton.addEventListener("click", () => {
        this.updateButtons(pageNum, pageCount, pagination, paginationContainer);
        this.renderTablePage(pageNum);
      });

      paginationContainer.appendChild(pageButton);
    });

    // Add a button that goes forward 10 pages if it is not present
    const nextPageButton = document.createElement("button");
    nextPageButton.innerText = ">";
    nextPageButton.addEventListener("click", () => {
      this.updateButtons(endPage + 1, pageCount, pagination, paginationContainer);
      this.renderTablePage(endPage + 1);
    });
    paginationContainer.appendChild(nextPageButton);


    // Add the last button to go to the last page
    const lastPageButton = document.createElement("button");
    lastPageButton.innerText = ">>";
    lastPageButton.addEventListener("click", () => {
      this.updateButtons(pageCount, pageCount, pagination, paginationContainer);
      this.renderTablePage(pageCount);
    });
    paginationContainer.appendChild(lastPageButton);

    this.renderTablePage(this.currentPageNumber); // Render the first page
  }

  private updateButtons(pageNum, pageCount, pagination, paginationContainer): void {
    // Update the rendered button to inlcude the following 5 buttons
    let startPage = Math.max(pageNum - Math.floor(this.maxVisibleButtons / 2), 0);
    let endPage = Math.min(startPage + this.maxVisibleButtons, pageCount);

    if (endPage - startPage < this.maxVisibleButtons) {
      startPage = Math.max(endPage - this.maxVisibleButtons, 0);
    }

    paginationContainer.innerHTML = "";
    pagination.slice(startPage, endPage + 1).forEach((pageNum) => {
      const pageButton = document.createElement("button");
      pageButton.innerText = pageNum.toString();

      pageButton.addEventListener("click", () => {
        this.updateButtons(pageNum, pageCount, pagination, paginationContainer);
        this.renderTablePage(pageNum);
      });
      paginationContainer.appendChild(pageButton);
    });

    // Add a button that goes back 10 pages if it is not present
    if (startPage > this.maxVisibleButtons) {
      const previousPageButton = document.createElement("button");
      previousPageButton.innerText = "<";
      previousPageButton.addEventListener("click", () => {
        this.updateButtons(startPage - this.maxVisibleButtons, pageCount, pagination, paginationContainer);
        this.renderTablePage(startPage - this.maxVisibleButtons);
      });
      paginationContainer.prepend(previousPageButton);
    }
    // Add the first button if it is not present
    if (startPage > 0) {
      const firstPageButton = document.createElement("button");
      firstPageButton.innerText = "<<";
      firstPageButton.addEventListener("click", () => {
        this.updateButtons(1, pageCount, pagination, paginationContainer);
        this.renderTablePage(1);
      });
      paginationContainer.prepend(firstPageButton);
    }

    // Add a button that goes forward 10 pages if it is not present
    if (endPage < pageCount - this.maxVisibleButtons) {
      const nextPageButton = document.createElement("button");
      nextPageButton.innerText = ">";
      nextPageButton.addEventListener("click", () => {
        this.updateButtons(endPage + 1, pageCount, pagination, paginationContainer);
        this.renderTablePage(endPage + 1);
      });
      paginationContainer.appendChild(nextPageButton);
    }

    // Add the last button if it is not present
    if (endPage < pageCount) {
      // Add the last button to go to the last page
      const lastPageButton = document.createElement("button");
      lastPageButton.innerText = ">>";
      lastPageButton.addEventListener("click", () => {
        this.updateButtons(pageCount, pageCount, pagination, paginationContainer);
        this.renderTablePage(pageCount);
      });
      paginationContainer.appendChild(lastPageButton);
    }
  }

  private renderTablePage(pageNum): void {
    // Update the current page number
    this.currentPageNumber = pageNum;

    const startIndex = (pageNum - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    const pageData = this.data.slice(startIndex, endIndex);

    // update the ranks based on the current page data
    this.ranks = Array.from({ length: pageData.length }, (_, index) => startIndex + index + 1);

    this.rows = this.table
      .select("tbody")
      .selectAll("tr")
      .data(pageData, (d) => d.stop_id.toString());

    this.rows.exit().remove();

    const newRows = this.rows.enter().append("tr");
    newRows.selectAll("td")
      .data((d) => {
        // Remove first element (stop_id) and replace it by last element
        const values = Object.values(d);
        values.shift();

        // Make the last element the first element
        const lastElement = values.pop();
        values.unshift(lastElement);

        return values;
      })
      .enter()
      .append("td")
      .text((d) => {
        // If the value is a number, round it
        if (typeof d === "number") {
          return Math.round(d);
        }
        return d;
      });
    this.rows = newRows.merge(this.rows);

    // Add colors to the rows based on the rank
    this.rows.style('background-color', (d) => this.colorScale(d.rank));

    this.updateTable();
  }

  private async loadData(): Promise<void> {
    try {
      const data = await d3.json(DATA_FILE_NAME);
      // Remove the attributes: median_arrival_delay	median_departure_delay	std_arrival_delay	std_departure_delay
      data.forEach((d) => {
        delete d.median_arrival_delay;
        delete d.median_departure_delay;
        delete d.std_arrival_delay;
        delete d.std_departure_delay;
        delete d.n_through_trip;
        delete d.n_additional_trip;
        delete d.n_entries;
      });

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

    this.table = container
      .append('table')
      .attr('class', 'choo-choo-table-class')
      .style('width', `${tableWidth}px`);

    //header
    const thead = this.table.append('thead');
    // body
    const tbody = this.table.append('tbody');

    // table header row
    const headerRow = thead.append('tr');

    // Add the rank column header
    headerRow.append('th').text('Rank');

    // attributes from the first entry in table_df.json
    const attributes = Object.keys(this.data[0]);

    // table cols based on this attributes
    headerRow.selectAll('th')
      .data(attributes)
      .enter()
      .append('th')
      .text((d) => HEADER_NAME_MAP(d));

    // Update the data to include the ranks
    this.data = this.data.map((d, i) => ({ ...d, rank: i + 1 }));

    // table body rows
    this.rows = tbody.selectAll('tr')
      .data(this.data)
      .enter()
      .append('tr');

    // Add the rank column cells
    //this.rows.append('tr').text((_, i) => this.ranks[i]);

    // create table cells and fill them up with the data
    this.rows.selectAll('td')
      .data((d) => {
        // Remove first element (stop_id) and replace it by last element
        const values = Object.values(d);
        values.shift();

        // Make the last element the first element
        const lastElement = values.pop();
        values.unshift(lastElement);

        return values;
      })
      .enter()
      .append('td')
      .text((d) => {
        // If the value is a number, round it
        if (typeof d === "number") {
          return Math.round(d);
        }
        return d;
      });

    // Add colors to the rows based on the rank
    this.rows.style('background-color', (d) => this.colorScale(d.rank));
  }

  private sortedTable(): void {
    // get table element by its class
    const table = d3.select('.choo-choo-table-class');
    const headerRow = table.select('thead tr');
    const tbody = table.select('tbody');

    // sorter function
    const sortTable = (attribute: string, ascending: boolean) => {
      // Sort the data
      this.data.sort((a, b) => {
        if (ascending) {
          return d3.ascending(a[attribute], b[attribute]);
        } else {
          return d3.descending(a[attribute], b[attribute]);
        }
      });

      console.log(this.data);

      // Update the data to include the ranks
      this.data = this.data.map((d, i) => ({ ...d, rank: i + 1 }));

      // Store current page number
      const currentPageNumber = this.currentPageNumber;

      // Initialize the table with the first page of sorted data
      this.initPagination();
      this.renderTablePage(currentPageNumber);
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
        sortTable(REVERSE_HEADER_NAME_MAP(d.target.innerHTML), !currentSortOrder);
      });
  }

  private handleCellClick(cell: HTMLElement, attribute: string): void {
    const columnData = this.data.map((d) => d[attribute]);

    // Highlight the clicked cell
    d3.select(cell).classed("clicked", true);

    // Unhighlight the previously clicked cell
    this.lastClickedCell?.classList.remove("clicked");
    
    // Store the clicked cell
    this.lastClickedCell = cell;

    // Update the plot
    this.plot.updatePlot(attribute, cell);
  }

  private updateTable(): void {
    // hover 
    this.rows.on('mouseover', function () {
      //d3.select(this).classed('hovered', true);
      // Get the old background color
      const oldColor = d3.select(this).style('background-color');
      // Make the oldColor lighter
      const lighterColor = d3.color(oldColor)?.brighter(0.5).toString();
      d3.select(this)
        .style('background-color', lighterColor)
        .attr('old-color', oldColor);
    }).on('mouseout', function () {
      //d3.select(this).classed('hovered', false);
      // Get the old background color
      const oldColor = d3.select(this).attr('old-color');

      d3.select(this).style('background-color', (d) => oldColor);
    });

    // click
    const self = this
    this.rows
      .selectAll("td")
      // determine the clicked cell and what attribute it belongs to
      .on("click", function (d) {
        const clickedCell = d3.select(this).node() as HTMLElement;

        // Get index of clickedCell within its parent tr
        const cellIndex = Array.prototype.indexOf.call(clickedCell.parentNode.children, clickedCell);

        // Get header (th) element corresponding to the clicked cell
        const headerRow = d3.select(`#${TABLE_ELEMENT_ID}`).select('thead tr').node() as HTMLElement;
        const clickedHeader =headerRow.children[cellIndex];

        // Get the HTML content of the header cell
        const clickedAttribute =  REVERSE_HEADER_NAME_MAP(clickedHeader.innerHTML);

        //console.log(clickedCell, clickedAttribute);

        self.handleCellClick(clickedCell, clickedAttribute);
      });

    // Update the rank column cells
    //this.rows.select('td').text((_, i) => this.ranks[i]);
  }
}