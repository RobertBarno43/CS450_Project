import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const BathroomRatioChart = ({ data, width = 600, height = 400 }) => {
  const svgRef = useRef();

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 20, bottom: 40, left: 70 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Calculate bathroom-to-bedroom ratio
    const processedData = data.map(d => ({
      ...d,
      bathroomRatio: d.bathrooms / d.bedrooms,
      pricePerSqFt: d.price / d.area
    }));

    const xScale = d3.scaleLinear()
      .domain(d3.extent(processedData, d => d.bathroomRatio))
      .range([0, innerWidth]);

    const yScale = d3.scaleLinear()
      .domain(d3.extent(processedData, d => d.price))
      .range([innerHeight, 0]);

    // Color scale based on bedrooms
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10)
      .domain([...new Set(processedData.map(d => d.bedrooms))]);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Add dots
    g.selectAll('circle')
      .data(processedData)
      .enter().append('circle')
      .attr('cx', d => xScale(d.bathroomRatio))
      .attr('cy', d => yScale(d.price))
      .attr('r', 5)
      .attr('fill', d => colorScale(d.bedrooms))
      .attr('opacity', 0.7)
      .attr('stroke', d => d.bedrooms === 6 ? '#ff0000' : 'none')
      .attr('stroke-width', d => d.bedrooms === 6 ? 3 : 0)
      .on('mouseover', function(event, d) {
        d3.select(this).attr('r', 8).attr('opacity', 1);
        
        // Tooltip
        const tooltip = g.append('g').attr('class', 'tooltip');
        const rect = tooltip.append('rect')
          .attr('fill', 'black')
          .attr('opacity', 0.8)
          .attr('rx', 3);
        
        const text = tooltip.append('text')
          .attr('fill', 'white')
          .attr('font-size', '12px')
          .attr('dy', '0.35em');
        
        text.append('tspan').attr('x', 0).attr('dy', '0em')
          .text(`${d.bedrooms}BR/${d.bathrooms}BA (Ratio: ${d.bathroomRatio.toFixed(2)})`);
        text.append('tspan').attr('x', 0).attr('dy', '1.2em')
          .text(`Price: $${d.price.toLocaleString()}`);
        text.append('tspan').attr('x', 0).attr('dy', '1.2em')
          .text(`Area: ${d.area} sq ft`);
        text.append('tspan').attr('x', 0).attr('dy', '1.2em')
          .text(`$/sq ft: $${Math.round(d.pricePerSqFt).toLocaleString()}`);
        
        const bbox = text.node().getBBox();
        rect.attr('x', bbox.x - 5).attr('y', bbox.y - 5)
          .attr('width', bbox.width + 10).attr('height', bbox.height + 10);
        
        tooltip.attr('transform', `translate(${xScale(d.bathroomRatio) + 10},${yScale(d.price) - 10})`);
      })
      .on('mouseout', function() {
        d3.select(this).attr('r', 5).attr('opacity', 0.7);
        g.select('.tooltip').remove();
      });

    // Add reference lines for optimal ratios
    const optimalRatios = [0.5, 0.67, 0.75]; // 2:1, 3:2, 4:3
    optimalRatios.forEach((ratio, i) => {
      g.append('line')
        .attr('x1', xScale(ratio))
        .attr('x2', xScale(ratio))
        .attr('y1', 0)
        .attr('y2', innerHeight)
        .attr('stroke', '#28a745')
        .attr('stroke-dasharray', '5,5')
        .attr('opacity', 0.6);
      
      g.append('text')
        .attr('x', xScale(ratio))
        .attr('y', -5)
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .attr('fill', '#28a745')
        .text(i === 0 ? 'Optimal' : i === 1 ? 'Good' : 'OK');
    });

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
      .text('Property Price');

    g.append('text')
      .attr('transform', `translate(${innerWidth / 2}, ${innerHeight + margin.bottom})`)
      .style('text-anchor', 'middle')
      .text('Bathroom-to-Bedroom Ratio');

    // Legend
    const bedroomCounts = [...new Set(processedData.map(d => d.bedrooms))].sort((a, b) => a - b);
    const legend = g.selectAll('.legend')
      .data(bedroomCounts)
      .enter().append('g')
      .attr('class', 'legend')
      .attr('transform', (d, i) => `translate(${innerWidth - 120}, ${i * 20})`);

    legend.append('circle')
      .attr('r', 5)
      .attr('fill', d => colorScale(d))
      .attr('stroke', d => d === 6 ? '#ff0000' : 'none')
      .attr('stroke-width', d => d === 6 ? 3 : 0);

    legend.append('text')
      .attr('x', 10)
      .attr('dy', '0.35em')
      .attr('font-size', '12px')
      .text(d => d === 6 ? `${d} bed (Problem!)` : `${d} bed${d !== 1 ? 's' : ''}`);

  }, [data, width, height]);

  return (
    <div>
      <h3>Bathroom-to-Bedroom Value Analysis</h3>
      <p className="chart-description">
        <strong>Renovation Opportunity Alert:</strong> Properties with poor bathroom ratios represent hidden value opportunities! 
        Large homes with insufficient bathrooms (red outlines) trade at steep discounts. 
        Adding bathrooms to these properties can unlock massive value appreciation.
      </p>
      <svg ref={svgRef} width={width} height={height}></svg>
      <div className="chart-insights">
        <small>🚿 <strong>Investment Opportunity:</strong> Target discounted large homes with bathroom deficits • 
        Adding bathrooms = instant equity gain • Aim for 1 bathroom per 2-2.5 bedrooms for optimal resale value</small>
      </div>
    </div>
  );
};

export default BathroomRatioChart;