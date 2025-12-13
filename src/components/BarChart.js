import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const BarChart = ({ data, width = 600, height = 400 }) => {
  const svgRef = useRef();

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 20, bottom: 40, left: 80 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Aggregate data by bedrooms
    const aggregated = d3.rollup(
      data,
      v => d3.mean(v, d => d.price),
      d => d.bedrooms
    );
    
    const chartData = Array.from(aggregated, ([bedrooms, avgPrice]) => ({
      bedrooms,
      avgPrice
    })).sort((a, b) => a.bedrooms - b.bedrooms);

    const xScale = d3.scaleBand()
      .domain(chartData.map(d => d.bedrooms))
      .range([0, innerWidth])
      .padding(0.2);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(chartData, d => d.avgPrice)])
      .range([innerHeight, 0]);

    const colorScale = d3.scaleSequential(d3.interpolateBlues)
      .domain([0, chartData.length - 1]);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Add bars
    g.selectAll('rect')
      .data(chartData)
      .enter().append('rect')
      .attr('x', d => xScale(d.bedrooms))
      .attr('y', d => yScale(d.avgPrice))
      .attr('width', xScale.bandwidth())
      .attr('height', d => innerHeight - yScale(d.avgPrice))
      .attr('fill', (d, i) => colorScale(i))
      .on('mouseenter', function(event, d) {
        d3.select(this).attr('opacity', 0.7);
        
        // Remove any existing tooltips first
        g.selectAll('.tooltip').remove();
        
        // Create tooltip
        const tooltip = g.append('g')
          .attr('class', 'tooltip')
          .style('pointer-events', 'none');
        
        const rect = tooltip.append('rect')
          .attr('fill', 'black')
          .attr('opacity', 0.8)
          .attr('rx', 3);
        
        const text = tooltip.append('text')
          .attr('fill', 'white')
          .attr('font-size', '12px')
          .attr('dy', '0.35em');
        
        text.append('tspan').attr('x', 0).attr('dy', '0em').text(`${d.bedrooms} Bedroom${d.bedrooms !== 1 ? 's' : ''}`);
        text.append('tspan').attr('x', 0).attr('dy', '1.2em').text(`Avg Price: $${Math.round(d.avgPrice).toLocaleString()}`);
        
        const bbox = text.node().getBBox();
        rect.attr('x', bbox.x - 5).attr('y', bbox.y - 5)
          .attr('width', bbox.width + 10).attr('height', bbox.height + 10);
        
        // Position tooltip below the bar
        const tooltipX = xScale(d.bedrooms) + xScale.bandwidth() / 2 - bbox.width / 2;
        const tooltipY = innerHeight + 10; // Position below the chart area
        tooltip.attr('transform', `translate(${tooltipX},${tooltipY})`);
      })
      .on('mouseleave', function() {
        d3.select(this).attr('opacity', 1);
        // Add small delay to prevent rapid flickering
        setTimeout(() => {
          g.selectAll('.tooltip').remove();
        }, 50);
      });

    // Add value labels on bars
    g.selectAll('.label')
      .data(chartData)
      .enter().append('text')
      .attr('class', 'label')
      .attr('x', d => xScale(d.bedrooms) + xScale.bandwidth() / 2)
      .attr('y', d => yScale(d.avgPrice) - 5)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .text(d => `$${(d.avgPrice/1000000).toFixed(1)}M`);

    // X axis
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale));

    // Y axis
    g.append('g')
      .call(d3.axisLeft(yScale).tickFormat(d => `$${d/1000000}M`));

    // Labels
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left)
      .attr('x', 0 - (innerHeight / 2))
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .text('Average Price (Millions)');

    g.append('text')
      .attr('transform', `translate(${innerWidth / 2}, ${innerHeight + margin.bottom})`)
      .style('text-anchor', 'middle')
      .text('Number of Bedrooms');

  }, [data, width, height]);

  return (
    <div>
      <h3>Bedroom Count Investment Analysis</h3>
      <p className="chart-description">
        <strong>Investor Strategy:</strong> Identify the bedroom count sweet spot for maximum ROI. 
        Consider conversion potential - can you add a bedroom to a 2BR to capture 3BR pricing? 
        Family homes (3-4BR) often provide the best resale value in most markets.
      </p>
      <svg ref={svgRef} width={width} height={height}></svg>
      <div className="chart-insights">
        <small>🏠 <strong>Investment Insight:</strong> Target 3-4 bedroom properties for family appeal • 
        Consider renovation to add bedrooms for value uplift • Avoid oversized homes unless in premium areas</small>
      </div>
    </div>
  );
};

export default BarChart;