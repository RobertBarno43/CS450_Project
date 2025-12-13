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
    
    // Create uniform bins for equal width bars
    const [minVal, maxVal] = d3.extent(variableData);
    const binWidth = (maxVal - minVal) / binCount;
    
    // Create uniform bins manually
    const uniformBins = [];
    for (let i = 0; i < binCount; i++) {
      const binStart = minVal + (i * binWidth);
      const binEnd = binStart + binWidth;
      const binData = processedData.filter(d => {
        const value = getVariableValue(d, variable);
        return value >= binStart && (i === binCount - 1 ? value <= binEnd : value < binEnd);
      });
      
      uniformBins.push({
        x0: binStart,
        x1: binEnd,
        length: binData.length,
        data: binData
      });
    }

    // Use band scale for equal width bars
    const xScale = d3.scaleBand()
      .domain(uniformBins.map((d, i) => i))
      .range([0, innerWidth])
      .padding(0.1);

    // Create a linear scale for axis labels
    const xAxisScale = d3.scaleLinear()
      .domain([minVal, maxVal])
      .range([0, innerWidth]);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(uniformBins, d => d.length)])
      .range([innerHeight, 0]);

    // Use a custom purple palette with opacity variation for better visibility
    const maxCount = d3.max(uniformBins, d => d.length);
    const basePurple = '#6A5ACD'; // Slate blue base color
    
    // Function to create purple with varying opacity
    const getBarColor = (count) => {
      if (count === 0) return '#E6E6FA'; // Light lavender for empty bins
      const opacity = Math.max(0.4, (count / maxCount)); // 40% to 100% opacity
      return d3.color(basePurple).copy({opacity: opacity}).toString();
    };

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create persistent tooltip
    const tooltip = svg.append('g')
      .attr('class', 'tooltip')
      .style('pointer-events', 'none')
      .style('opacity', 0);

    const tooltipRect = tooltip.append('rect')
      .attr('fill', 'black')
      .attr('opacity', 0.8)
      .attr('rx', 3);

    const tooltipText = tooltip.append('text')
      .attr('fill', 'white')
      .attr('font-size', '12px')
      .attr('dy', '0.35em');

    // Format values function
    const formatValue = (val) => {
      if (variable === 'price') return `$${(val/1000000).toFixed(1)}M`;
      if (variable === 'area') return `${Math.round(val).toLocaleString()} sq ft`;
      if (variable === 'pricePerSqFt') return `$${Math.round(val).toLocaleString()}`;
      return Math.round(val);
    };

    // Add bars with equal widths
    g.selectAll('rect')
      .data(uniformBins)
      .enter().append('rect')
      .attr('x', (d, i) => xScale(i))
      .attr('y', d => yScale(d.length))
      .attr('width', xScale.bandwidth())
      .attr('height', d => innerHeight - yScale(d.length))
      .attr('fill', d => getBarColor(d.length))
      .attr('stroke', '#fff')
      .attr('stroke-width', 1)
      .on('mouseenter', function(event, d) {
        d3.select(this).attr('opacity', 0.7);
        
        // Update tooltip content
        tooltipText.selectAll('tspan').remove();
        tooltipText.append('tspan').attr('x', 0).attr('dy', '0em')
          .text(`Range: ${formatValue(d.x0)} - ${formatValue(d.x1)}`);
        tooltipText.append('tspan').attr('x', 0).attr('dy', '1.2em')
          .text(`Count: ${d.length} properties`);
        
        // Update tooltip box size
        const bbox = tooltipText.node().getBBox();
        tooltipRect.attr('x', bbox.x - 5).attr('y', bbox.y - 5)
          .attr('width', bbox.width + 10).attr('height', bbox.height + 10);
        
        // Position and show tooltip
        const [mouseX, mouseY] = d3.pointer(event, svg.node());
        tooltip.attr('transform', `translate(${mouseX - bbox.width/2},${mouseY - bbox.height - 10})`)
          .style('opacity', 1);
      })
      .on('mousemove', function(event, d) {
        // Update tooltip position as mouse moves
        const bbox = tooltipText.node().getBBox();
        const [mouseX, mouseY] = d3.pointer(event, svg.node());
        tooltip.attr('transform', `translate(${mouseX - bbox.width/2},${mouseY - bbox.height - 10})`);
      })
      .on('mouseleave', function() {
        d3.select(this).attr('opacity', 1);
        // Hide tooltip
        tooltip.style('opacity', 0);
      });

    // X axis with proper labels
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xAxisScale).ticks(6).tickFormat(d => {
        if (variable === 'price') return `$${(d/1000000).toFixed(1)}M`;
        if (variable === 'area') return `${Math.round(d/1000)}K sq ft`;
        if (variable === 'pricePerSqFt') return `$${Math.round(d)}`;
        return Math.round(d);
      }));

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