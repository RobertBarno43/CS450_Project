import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { getColor } from '../constants/colors';

const ScatterPlot = ({ data, width = 600, height = 400 }) => {
  const svgRef = useRef();
  const zoomRef = useRef();
  const [colorBy, setColorBy] = useState('bedrooms');

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 20, bottom: 40, left: 70 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const xExtent = d3.extent(data, d => d.area);
    const yExtent = d3.extent(data, d => d.price);
    
    // Add 5% padding to create space between data points and axes
    const xPadding = (xExtent[1] - xExtent[0]) * 0.05;
    const yPadding = (yExtent[1] - yExtent[0]) * 0.05;

    const xScale = d3.scaleLinear()
      .domain([Math.max(0, xExtent[0] - xPadding), xExtent[1] + xPadding])
      .range([0, innerWidth]);

    const yScale = d3.scaleLinear()
      .domain([Math.max(0, yExtent[0] - yPadding), yExtent[1] + yPadding])
      .range([innerHeight, 0]);

    // Dynamic color mapping function
    const getColorValue = (d, colorBy) => {
      switch(colorBy) {
        case 'bedrooms': return d.bedrooms;
        case 'bathrooms': return d.bathrooms;
        case 'stories': return d.stories;
        case 'furnishingstatus': return d.furnishingstatus;
        case 'airconditioning': return d.airconditioning ? 'With AC' : 'No AC';
        case 'parking': return d.parking ? 'With Parking' : 'No Parking';
        default: return d.bedrooms;
      }
    };

    const getColorForScatter = (value, colorBy) => {
      switch(colorBy) {
        case 'bedrooms': return getColor('bedrooms', value);
        case 'bathrooms': return getColor('bathrooms', value);
        case 'stories': return getColor('stories', value);
        case 'furnishingstatus': return getColor('furnishingStatus', value);
        case 'airconditioning': return getColor('airConditioning', value);
        case 'parking': return getColor('parking', value);
        default: return '#95A5A6';
      }
    };

    const colorScale = d3.scaleOrdinal()
      .domain([...new Set(data.map(d => getColorValue(d, colorBy)))])
      .range([...new Set(data.map(d => getColorValue(d, colorBy)))].map(value => getColorForScatter(value, colorBy)));

    // Create zoomable container for data points
    const zoomContainer = svg.append('g')
      .attr('class', 'zoom-container')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create fixed container for axes and labels
    const fixedContainer = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Set up zoom behavior with more generous panning limits
    const zoom = d3.zoom()
      .scaleExtent([0.5, 5]) // Allow zoom from 50% to 500%
      .translateExtent([[-innerWidth * 0.5, -innerHeight * 0.5], [innerWidth * 2, innerHeight * 2]]) // Allow generous panning
      .on('zoom', (event) => {
        const { transform } = event;
        
        // Update zoomable container
        zoomContainer.attr('transform', `translate(${margin.left},${margin.top}) ${transform}`);
        
        // Update scales based on zoom transform
        const newXScale = transform.rescaleX(xScale);
        const newYScale = transform.rescaleY(yScale);
        
        // Constrain scales to prevent negative values
        const constrainedXScale = newXScale.copy().domain([Math.max(0, newXScale.domain()[0]), newXScale.domain()[1]]);
        const constrainedYScale = newYScale.copy().domain([Math.max(0, newYScale.domain()[0]), newYScale.domain()[1]]);
        
        // Update axes with constrained scales
        fixedContainer.select('.x-axis')
          .call(d3.axisBottom(constrainedXScale));
          
        fixedContainer.select('.y-axis')
          .call(d3.axisLeft(constrainedYScale).tickFormat(d => `$${(d/1000000).toFixed(1)}M`));
      });

    // Apply zoom behavior to SVG
    svg.call(zoom);
    
    // Store zoom reference for button controls
    zoomRef.current = zoom;

    // Add dots to zoomable container
    zoomContainer.selectAll('circle')
      .data(data)
      .enter().append('circle')
      .attr('cx', d => xScale(d.area))
      .attr('cy', d => yScale(d.price))
      .attr('r', 4)
      .attr('fill', d => colorScale(getColorValue(d, colorBy)))
      .attr('opacity', 0.7)
      .on('mouseover', function(event, d) {
        d3.select(this).attr('r', 6).attr('opacity', 1);
        
        // Tooltip
        const tooltip = zoomContainer.append('g').attr('class', 'tooltip');
        const rect = tooltip.append('rect')
          .attr('fill', 'black')
          .attr('opacity', 0.8)
          .attr('rx', 3);
        
        const text = tooltip.append('text')
          .attr('fill', 'white')
          .attr('font-size', '12px')
          .attr('dy', '0.35em');
        
        text.append('tspan').attr('x', 0).attr('dy', '0em').text(`Area: ${d.area} sq ft`);
        text.append('tspan').attr('x', 0).attr('dy', '1.2em').text(`Price: $${d.price.toLocaleString()}`);
        text.append('tspan').attr('x', 0).attr('dy', '1.2em').text(`Bedrooms: ${d.bedrooms}`);
        
        const bbox = text.node().getBBox();
        rect.attr('x', bbox.x - 5).attr('y', bbox.y - 5)
          .attr('width', bbox.width + 10).attr('height', bbox.height + 10);
        
        tooltip.attr('transform', `translate(${xScale(d.area) + 10},${yScale(d.price) - 10})`);
      })
      .on('mouseout', function() {
        d3.select(this).attr('r', 4).attr('opacity', 0.7);
        zoomContainer.select('.tooltip').remove();
      });

    // Add white background rectangles for axis areas to hide data points during zoom/pan
    // X axis background
    fixedContainer.append('rect')
      .attr('x', -margin.left)
      .attr('y', innerHeight)
      .attr('width', width)
      .attr('height', margin.bottom+15)
      .attr('fill', 'white');

    // Y axis background  
    fixedContainer.append('rect')
      .attr('x', -margin.left)
      .attr('y', -margin.top)
      .attr('width', margin.left)
      .attr('height', height)
      .attr('fill', 'white');

    // Fixed axes and labels (with class names for updating)
    // X axis
    fixedContainer.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale));

    // Y axis
    fixedContainer.append('g')
      .attr('class', 'y-axis')
      .call(d3.axisLeft(yScale).tickFormat(d => `$${(d/1000000).toFixed(1)}M`));

    // Labels
    fixedContainer.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left)
      .attr('x', 0 - (innerHeight / 2))
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .text('Price (Millions)');

    fixedContainer.append('text')
      .attr('transform', `translate(${innerWidth / 2}, ${innerHeight + margin.bottom - 5})`)
      .style('text-anchor', 'middle')
      .text('Area (sq ft)');

    // Legend (fixed)
    const legendData = [...new Set(data.map(d => getColorValue(d, colorBy)))].sort();
    const legend = fixedContainer.selectAll('.legend')
      .data(legendData)
      .enter().append('g')
      .attr('class', 'legend')
      .attr('transform', (d, i) => `translate(${innerWidth - 100}, ${i * 20})`);

    legend.append('circle')
      .attr('r', 4)
      .attr('fill', d => colorScale(d));

    legend.append('text')
      .attr('x', 10)
      .attr('dy', '0.35em')
      .text(d => d);

  }, [data, width, height, colorBy]);

  return (
    <div>
      <h3>Investment Opportunity Analyzer</h3>
      <p className="chart-description">
        <strong>Investor Insight:</strong> Identify undervalued properties with high resale potential. 
        Look for outliers below the price trend line - these represent potential bargains. 
        Properties with premium features (AC, parking) in good locations often offer the best flip opportunities.
      </p>
      
      {/* Color Control Dropdown */}
      <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '5px' }}>
        <label style={{ fontWeight: 'bold', marginRight: '10px' }}>Analyze Properties by:</label>
        <select 
          value={colorBy} 
          onChange={(e) => setColorBy(e.target.value)} 
          style={{ padding: '5px 10px', fontSize: '14px', borderRadius: '3px', border: '1px solid #ddd' }}
        >
          <option value="bedrooms">Bedroom Count (Family Appeal)</option>
          <option value="bathrooms">Bathroom Count (Convenience Factor)</option>
          <option value="stories">Story Count (Property Type)</option>
          <option value="furnishingstatus">Furnishing Status (Move-in Ready)</option>
          <option value="airconditioning">Air Conditioning (Premium Feature)</option>
          <option value="parking">Parking Availability (Essential Amenity)</option>
        </select>
      </div>
      
      <div style={{ position: 'relative' }}>
        <svg ref={svgRef} width={width} height={height} style={{ border: '1px solid #ddd', borderRadius: '5px' }}></svg>
        
        {/* Zoom Controls */}
        <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <button 
            onClick={() => {
              const svg = d3.select(svgRef.current);
              if (zoomRef.current) {
                svg.transition().duration(300).call(
                  zoomRef.current.scaleBy, 1.5
                );
              }
            }}
            style={{ padding: '5px 8px', border: 'none', borderRadius: '3px', background: '#007bff', color: 'white', cursor: 'pointer', fontSize: '12px' }}
          >
            🔍+
          </button>
          <button 
            onClick={() => {
              const svg = d3.select(svgRef.current);
              if (zoomRef.current) {
                svg.transition().duration(300).call(
                  zoomRef.current.scaleBy, 1/1.5
                );
              }
            }}
            style={{ padding: '5px 8px', border: 'none', borderRadius: '3px', background: '#007bff', color: 'white', cursor: 'pointer', fontSize: '12px' }}
          >
            🔍-
          </button>
          <button 
            onClick={() => {
              const svg = d3.select(svgRef.current);
              if (zoomRef.current) {
                svg.transition().duration(500).call(
                  zoomRef.current.transform, d3.zoomIdentity
                );
              }
            }}
            style={{ padding: '5px 8px', border: 'none', borderRadius: '3px', background: '#6c757d', color: 'white', cursor: 'pointer', fontSize: '10px' }}
          >
            Reset
          </button>
        </div>
      </div>
      
      <div style={{ fontSize: '12px', marginTop: '10px', color: '#666', backgroundColor: '#f8f9fa', padding: '10px', borderRadius: '5px' }}>
        <strong>🏠 Investment Strategy:</strong> Properties below the trend line = potential bargains • 
        Properties with AC/parking in good areas = premium resale value • 
        <strong>📊 Controls:</strong> Zoom to examine price clusters • Drag to explore different market segments
      </div>
    </div>
  );
};

export default ScatterPlot;