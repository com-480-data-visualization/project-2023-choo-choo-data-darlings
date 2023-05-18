//@ts-nocheck
import * as d3 from "d3";
import './style.css';
//import data from "table_df.json";

const DATA_FOLDER = "data/home_table";

const TABLE_ELEMENT_ID = "table-container";
const BAR_ELEMENT_ID = "table-bar-plot";

const margin = { top: 20, right: 20, bottom: 30, left: 50 };
const width = 960 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;


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

//EPFL Stop ID
const DEFAULT_STOP_ID = 8579233; 


// link this like arnaud showed in edge bundling
export class TablePlot {
    private barChart: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>;
  
    constructor() {
      this.barChart = d3.select(`#${BAR_ELEMENT_ID}`)
        .append('svg')
        .attr('class', 'bar-chart');
    }
  
    public updatePlot(attributes: string[], rowData: any): void {
      // clear previous plot
      this.barChart.html('');
  
      const barWidth = 300;
      const barHeight = 30;
  
      const xScale = d3.scaleLinear()
        .domain([0, d3.max(rowData, (d) => +d.value)])
        .range([0, barWidth - 100]);
  
      const bar = this.barChart.selectAll('g')
        .data(rowData)
        .enter()
        .append('g')
        .attr('transform', (d, i) => `translate(0, ${i * barHeight})`);
  
      bar.append('rect')
        .attr('width', (d) => xScale(+d.value))
        .attr('height', barHeight - 4)
        .attr('fill', 'steelblue');
  
      bar.append('text')
        .attr('x', (d) => xScale(+d.value) + 5)
        .attr('y', barHeight / 2)
        .attr('dy', '0.35em')
        .text((d) => d.value);
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
          this.plot = new TablePlot(); // link bar plot
      });
  }

  private async loadData(): Promise<void> {
      try {
        const data = await d3.json('table_df.json');
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
        .on('click', function(d) {
            const currentSortOrder = d3.select(this).classed('sorted-ascending');
            headerRow.selectAll('th').classed('sorted-ascending', false);
            headerRow.selectAll('th').classed('sorted-descending', false);
            d3.select(this).classed('sorted-ascending', !currentSortOrder);
            d3.select(this).classed('sorted-descending', currentSortOrder);

            // Sort the table based on the clicked attribute
            sortTable(d.target.innerHTML, !currentSortOrder);
        });
  }  

    private updateTable(): void {
        // hover 
        this.rows.on('mouseover', function () {
          d3.select(this).classed('hovered', true);
        }).on('mouseout', function () {
          d3.select(this).classed('hovered', false);
        });
      
        // clicked on a cell in a row
        this.rows.on('click', (event: any, d: any) => {
            // delete previous plot
            // d3.select('#bar-plot').html('');
            d3.selectAll('.selected-row').classed('selected-row', false);
            d3.select(event.target).classed('selected-row', true);

            const attributes = ['mean_arrival_delay', 'mean_departure_delay', 'n_cancelled', 'n_entries'];
            const barData = attributes.map((attribute) => ({ attribute, value: d[attribute] }));

             /// LINK THIS LIKE ARNAUD TOLD ME
            this.plot.updatePlot(attributes, barData);
      
    });
  }
}
