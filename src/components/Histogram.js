import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

const Histogram = ({ data, width = 600, height = 400 }) => {
  const svgRef = useRef();
  const [variable, setVariable] = useState('price');
  const [binCount, setBinCount] = useState(15);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 20, bottom: 40, left: 70 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Process data for different variables
    const processedData = data.map(d => ({
      ...d,
      pricePerSqFt: d.price / d.area,
      totalRooms: d.bedrooms + d.bathrooms
    }));

    const getVariableValue = (d, variable) => {
      switch(variable) {
        case 'price': return d.price;
        case 'area': return d.area;
        case 'pricePerSqFt': return d.pricePerSqFt;
        case 'bedrooms': return d.bedrooms;
        case 'bathrooms': return d.bathrooms;
        case 'totalRooms': return d.totalRooms;
        default: return d.price;
      }
    };

    const variableData = processedData.map(d => getVariableValue(d, variable));
    
    const xScale = d3.scaleLinear()
      .domain(d3.extent(variableData))
      .range([0, innerWidth]);

    const histogram = d3.histogram()
      .value(d => getVariableValue(d, variable))
      .domain(xScale.domain())
      .thresholds(binCount);

    const bins = histogram(processedData);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(bins, d => d.length)])
      .range([innerHeight, 0]);

    const colorScale = d3.scaleSequential(d3.interpolateViridis)
      .domain([0, bins.length - 1]);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Add bars
    g.selectAll('rect')
      .data(bins)
      .enter().append('rect')
      .attr('x', d => xScale(d.x0))
      .attr('y', d => yScale(d.length))
      .attr('width', d => Math.max(0, xScale(d.x1) - xScale(d.x0) - 1))
      .attr('height', d => innerHeight - yScale(d.length))
      .attr('fill', (d, i) => colorScale(i))
      .on('mouseenter', function(event, d) {
        d3.select(this).attr('opacity', 0.7);
        
        // Remove any existing tooltips first
        g.selectAll('.tooltip').remove();
        
        // Tooltip
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
        
        text.append('tspan').attr('x', 0).attr('dy', '0em')
          .text(`Price Range: $${(d.x0/1000000).toFixed(1)}M - $${(d.x1/1000000).toFixed(1)}M`);
        text.append('tspan').attr('x', 0).attr('dy', '1.2em').text(`Count: ${d.length} houses`);
        
        const bbox = text.node().getBBox();
        rect.attr('x', bbox.x - 5).attr('y', bbox.y - 5)
          .attr('width', bbox.width + 10).attr('height', bbox.height + 10);
        
        // Position tooltip above mouse cursor
        const [mouseX, mouseY] = d3.pointer(event, g.node());
        tooltip.attr('transform', `translate(${mouseX - bbox.width/2},${mouseY - bbox.height - 15})`);
      })
      .on('mousemove', function(event, d) {
        // Update tooltip position as mouse moves
        const tooltip = g.select('.tooltip');
        if (!tooltip.empty()) {
          const bbox = tooltip.select('text').node().getBBox();
          const [mouseX, mouseY] = d3.pointer(event, g.node());
          tooltip.attr('transform', `translate(${mouseX - bbox.width/2},${mouseY - bbox.height - 15})`);
        }
      })
      .on('mouseleave', function() {
        d3.select(this).attr('opacity', 1);
        // Add small delay to prevent rapid flickering
        setTimeout(() => {
          g.selectAll('.tooltip').remove();
        }, 50);
      });

    // X axis
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).tickFormat(d => `$${d/1000000}M`));

    // Y axis
    g.append('g')
      .call(d3.axisLeft(yScale));

    // Labels
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left)
      .attr('x', 0 - (innerHeight / 2))
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .text('Number of Houses');

    const getVariableLabel = (variable) => {
      switch(variable) {
        case 'price': return 'Price Range (Millions)';
        case 'area': return 'Area Range (sq ft)';
        case 'pricePerSqFt': return 'Price per Sq Ft Range';
        case 'bedrooms': return 'Number of Bedrooms';
        case 'bathrooms': return 'Number of Bathrooms';
        case 'totalRooms': return 'Total Room Count';
        default: return 'Value Range';
      }
    };

    g.append('text')
      .attr('transform', `translate(${innerWidth / 2}, ${innerHeight + margin.bottom})`)
      .style('text-anchor', 'middle')
      .text(getVariableLabel(variable));

  }, [data, width, height, variable, binCount]);

  return (
    <div>
      <h3>Market Segment Distribution Analysis</h3>
      <p className="chart-description">
        <strong>Investment Strategy:</strong> Identify which market segment to target for flips. 
        High-frequency price ranges indicate active buyer demand - focus your investments here for faster sales. 
        Avoid price gaps where few buyers exist, unless you can position uniquely.
      </p>
      <svg ref={svgRef} width={width} height={height}></svg>
      <div className="chart-insights">
        <small>🎯 <strong>Investment Focus:</strong> Target the peak distribution ranges for fastest turnover • 
        Luxury segment ($8M+) = longer hold times but higher margins • Mass market = quick flips with volume</small>
      </div>
    </div>
  );
};

export default Histogram;