//@ts-nocheck
import * as d3 from "d3";
import './style.css';

const DATA_FOLDER = "data/home_table";

const TABLE_ELEMENT_ID = "table-container";
const BAR_ELEMENT_ID = "bar-plot";
const NUMBER_STOPS = 5527916;

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

// TODO: use json files instead for the plot
export class TablePlot {
  private barChart: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>;
  private xScale: d3.ScaleLinear<number, number>;
  private yScale: d3.ScaleLinear<number, number>;

  constructor(barChartId: string) {
    this.barChart = d3.select(`#${BAR_ELEMENT_ID}`);

    const margin = { top: 10, right: 10, bottom: 30, left: 30 };
    const width = 400 - margin.left - margin.right;
    const height = 200 - margin.top - margin.bottom;

    // SVG barchart
    const svg = this.barChart
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // scales and axis
    this.xScale = d3.scaleLinear().range([0, width]);
    this.yScale = d3.scaleLinear().range([height, 0]);

    svg.append("g").attr("class", "x-axis").attr("transform", `translate(0, ${height})`);

    svg.append("g").attr("class", "y-axis");
  }

  public updatePlot(data: any[], attribute: string, highlightedValue?: number): void {
    // calculate hist. bins
    
    const histogram = d3.histogram<number>().domain(this.xScale.domain()).thresholds(NUMBER_STOPS)(data);

    // the scales
    this.xScale.domain(d3.extent(data) as [number, number]);
    this.yScale.domain([0, d3.max(histogram, (d) => d.length) || 0]);

    // bars
    const bars = this.barChart.select("svg").selectAll(".bar").data(histogram);

    // bars
    // new
    bars
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", (d) => this.xScale(d.x0) + 1)
      .attr("y", (d) => this.yScale(d.length))
      .attr("width", (d) => Math.max(0, this.xScale(d.x1) - this.xScale(d.x0) - 1))
      .attr("height", (d) => Math.max(0, this.yScale(0) - this.yScale(d.length)));

    // updates
    bars
      .attr("x", (d) => this.xScale(d.x0) + 1)
      .attr("y", (d) => this.yScale(d.length))
      .attr("width", (d) => Math.max(0, this.xScale(d.x1) - this.xScale(d.x0) - 1))
      .attr("height", (d) => Math.max(0, this.yScale(0) - this.yScale(d.length)));

    // removing old
    bars.exit().remove();

    // update axis
    this.barChart.select(".x-axis").call(d3.axisBottom(this.xScale));
    this.barChart.select(".y-axis").call(d3.axisLeft(this.yScale));

    // highlight the value of selected cell in the plot
    if (highlightedValue !== undefined) {
      this.barChart
        .select("svg")
        .selectAll(".bar")
        .classed("highlighted", (d) => d.x0 <= highlightedValue && highlightedValue <= d.x1);
    }
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
      this.sortedTable(); //sort values depending on attribute
      this.updateTable(); //hover and click behaviours
      //this.plot = new TablePlot(); // link bar plot
      this.plot = new TablePlot(BAR_ELEMENT_ID); //link bar plot
    });
  }

  private async loadData(): Promise<void> {
    try {
      const data = await d3.json('table_sub_df.json');
      this.data = data;
      console.log(this.data);
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

    console.log(columnData, attribute, this.data[0][attribute]);
  
    // Update the plot
    this.plot.updatePlot(columnData, attribute, this.data[0][attribute]);
}

  private updateTable(): void {
    // hover 
    this.rows.on('mouseover', function () {
      d3.select(this).classed('hovered', true);
    }).on('mouseout', function () {
      d3.select(this).classed('hovered', false);
    });

    // click
    const self = this;
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