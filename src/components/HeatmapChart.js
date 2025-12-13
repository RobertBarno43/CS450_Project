import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

const HeatmapChart = ({ data, width = 600, height = 400 }) => {
  const svgRef = useRef();
  const [viewMode, setViewMode] = useState('bedrooms'); // bedrooms, bathrooms, stories

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 60, right: 100, bottom: 60, left: 80 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Prepare data based on view mode
    let xDomain, yDomain, aggregatedData;
    
    if (viewMode === 'bedrooms') {
      // Bedrooms vs Bathrooms heatmap
      aggregatedData = d3.rollup(
        data,
        v => ({
          count: v.length,
          avgPrice: d3.mean(v, d => d.price),
          properties: v
        }),
        d => d.bedrooms,
        d => d.bathrooms
      );
      xDomain = [...new Set(data.map(d => d.bedrooms))].sort((a, b) => a - b);
      yDomain = [...new Set(data.map(d => d.bathrooms))].sort((a, b) => a - b);
    } else if (viewMode === 'bathrooms') {
      // Bathrooms vs Stories heatmap
      aggregatedData = d3.rollup(
        data,
        v => ({
          count: v.length,
          avgPrice: d3.mean(v, d => d.price),
          properties: v
        }),
        d => d.bathrooms,
        d => d.stories
      );
      xDomain = [...new Set(data.map(d => d.bathrooms))].sort((a, b) => a - b);
      yDomain = [...new Set(data.map(d => d.stories))].sort((a, b) => a - b);
    } else {
      // Stories vs Parking heatmap
      aggregatedData = d3.rollup(
        data,
        v => ({
          count: v.length,
          avgPrice: d3.mean(v, d => d.price),
          properties: v
        }),
        d => d.stories,
        d => Math.min(d.parking, 3) // Cap parking at 3+ for better visualization
      );
      xDomain = [...new Set(data.map(d => d.stories))].sort((a, b) => a - b);
      yDomain = [0, 1, 2, 3]; // 0, 1, 2, 3+ parking spaces
    }

    // Convert to flat array for visualization
    const heatmapData = [];
    for (let [x, yMap] of aggregatedData) {
      for (let [y, values] of yMap) {
        heatmapData.push({
          x, y,
          count: values.count,
          avgPrice: values.avgPrice,
          properties: values.properties
        });
      }
    }

    const xScale = d3.scaleBand()
      .domain(xDomain)
      .range([0, innerWidth])
      .padding(0.05);

    const yScale = d3.scaleBand()
      .domain(yDomain)
      .range([0, innerHeight])
      .padding(0.05);

    const colorScale = d3.scaleSequential(d3.interpolateYlOrRd)
      .domain([0, d3.max(heatmapData, d => d.avgPrice)]);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Add rectangles
    g.selectAll('rect')
      .data(heatmapData)
      .enter().append('rect')
      .attr('x', d => xScale(d.x))
      .attr('y', d => yScale(d.y))
      .attr('width', xScale.bandwidth())
      .attr('height', yScale.bandwidth())
      .attr('fill', d => colorScale(d.avgPrice))
      .attr('stroke', '#fff')
      .attr('stroke-width', 1)
      .on('mouseenter', function(event, d) {
        d3.select(this).attr('stroke-width', 3).attr('stroke', '#333');
        
        // Tooltip
        const tooltip = g.append('g').attr('class', 'tooltip');
        const rect = tooltip.append('rect')
          .attr('fill', 'black')
          .attr('opacity', 0.9)
          .attr('rx', 5)
          .style('pointer-events', 'none');
        
        const text = tooltip.append('text')
          .attr('fill', 'white')
          .attr('font-size', '12px')
          .attr('dy', '0.35em')
          .style('pointer-events', 'none');
        
        const labels = getLabelsForMode(viewMode, d.x, d.y);
        text.append('tspan').attr('x', 0).attr('dy', '0em').text(labels.title);
        text.append('tspan').attr('x', 0).attr('dy', '1.3em').text(`Properties: ${d.count}`);
        text.append('tspan').attr('x', 0).attr('dy', '1.3em').text(`Avg Price: $${(d.avgPrice/1000000).toFixed(1)}M`);
        
        const bbox = text.node().getBBox();
        rect.attr('x', bbox.x - 8).attr('y', bbox.y - 5)
          .attr('width', bbox.width + 16).attr('height', bbox.height + 10);
        
        // Position tooltip above mouse cursor
        const [mouseX, mouseY] = d3.pointer(event, g.node());
        tooltip.attr('transform', `translate(${mouseX - bbox.width/2},${mouseY - bbox.height - 15})`);
      })
      .on('mousemove', function(event, d) {
        const tooltip = g.select('.tooltip');
        if (!tooltip.empty()) {
          const bbox = tooltip.select('text').node().getBBox();
          const [mouseX, mouseY] = d3.pointer(event, g.node());
          tooltip.attr('transform', `translate(${mouseX - bbox.width/2},${mouseY - bbox.height - 15})`);
        }
      })
      .on('mouseleave', function() {
        d3.select(this).attr('stroke-width', 1).attr('stroke', '#fff');
        g.select('.tooltip').remove();
      });

    // Add text labels on cells
    g.selectAll('.cell-label')
      .data(heatmapData)
      .enter().append('text')
      .attr('class', 'cell-label')
      .attr('x', d => xScale(d.x) + xScale.bandwidth() / 2)
      .attr('y', d => yScale(d.y) + yScale.bandwidth() / 2)
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .attr('fill', d => d.avgPrice > (d3.max(heatmapData, d => d.avgPrice) * 0.6) ? 'white' : 'black')
      .text(d => d.count);

    // X axis
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale));

    // Y axis
    g.append('g')
      .call(d3.axisLeft(yScale));

    // Labels
    const labels = getAxisLabelsForMode(viewMode);
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left)
      .attr('x', 0 - (innerHeight / 2))
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .text(labels.yLabel);

    g.append('text')
      .attr('transform', `translate(${innerWidth / 2}, ${innerHeight + margin.bottom - 10})`)
      .style('text-anchor', 'middle')
      .text(labels.xLabel);

    // Color legend
    const legendHeight = 200;
    const legendWidth = 20;
    const legend = g.append('g')
      .attr('transform', `translate(${innerWidth + 20}, ${innerHeight/2 - legendHeight/2})`);

    const legendScale = d3.scaleLinear()
      .domain([0, d3.max(heatmapData, d => d.avgPrice)])
      .range([legendHeight, 0]);

    const legendAxis = d3.axisRight(legendScale)
      .tickFormat(d => `$${(d/1000000).toFixed(1)}M`)
      .ticks(5);

    // Create gradient
    const gradient = svg.append('defs')
      .append('linearGradient')
      .attr('id', 'legend-gradient')
      .attr('gradientUnits', 'userSpaceOnUse')
      .attr('x1', 0).attr('y1', legendHeight)
      .attr('x2', 0).attr('y2', 0);

    gradient.selectAll('stop')
      .data(colorScale.ticks().map((t, i, n) => ({ offset: `${100*i/n.length}%`, color: colorScale(t) })))
      .enter().append('stop')
      .attr('offset', d => d.offset)
      .attr('stop-color', d => d.color);

    legend.append('rect')
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .style('fill', 'url(#legend-gradient)');

    legend.append('g')
      .attr('transform', `translate(${legendWidth}, 0)`)
      .call(legendAxis);

  }, [data, width, height, viewMode]);

  const getLabelsForMode = (mode, x, y) => {
    if (mode === 'bedrooms') {
      return { title: `${x} bed, ${y} bath` };
    } else if (mode === 'bathrooms') {
      return { title: `${x} bath, ${y} ${y === 1 ? 'story' : 'stories'}` };
    } else {
      return { title: `${x} ${x === 1 ? 'story' : 'stories'}, ${y === 3 ? '3+' : y} parking` };
    }
  };

  const getAxisLabelsForMode = (mode) => {
    if (mode === 'bedrooms') {
      return { xLabel: 'Number of Bedrooms', yLabel: 'Number of Bathrooms' };
    } else if (mode === 'bathrooms') {
      return { xLabel: 'Number of Bathrooms', yLabel: 'Number of Stories' };
    } else {
      return { xLabel: 'Number of Stories', yLabel: 'Parking Spaces' };
    }
  };

  return (
    <div>
      <h3>Property Configuration Profitability Matrix</h3>
      <p className="chart-description">
        <strong>Renovation Strategy:</strong> Discover the most profitable property configurations before buying. 
        Red zones = high-value combinations to target • Yellow zones = configurations to avoid or modify. 
        Use this to plan renovations that maximize resale value.
      </p>
      
      <div className="chart-controls" style={{ marginBottom: '15px' }}>
        <label style={{ marginRight: '10px', fontWeight: 'bold' }}>View Configuration:</label>
        <input 
          type="radio" 
          id="bed-bath" 
          name="viewMode" 
          value="bedrooms"
          checked={viewMode === 'bedrooms'}
          onChange={() => setViewMode('bedrooms')}
        />
        <label htmlFor="bed-bath" style={{ marginRight: '15px', marginLeft: '5px' }}>Bedrooms vs Bathrooms</label>
        
        <input 
          type="radio" 
          id="bath-story" 
          name="viewMode" 
          value="bathrooms"
          checked={viewMode === 'bathrooms'}
          onChange={() => setViewMode('bathrooms')}
        />
        <label htmlFor="bath-story" style={{ marginRight: '15px', marginLeft: '5px' }}>Bathrooms vs Stories</label>
        
        <input 
          type="radio" 
          id="story-park" 
          name="viewMode" 
          value="stories"
          checked={viewMode === 'stories'}
          onChange={() => setViewMode('stories')}
        />
        <label htmlFor="story-park" style={{ marginLeft: '5px' }}>Stories vs Parking</label>
      </div>
      
      <svg ref={svgRef} width={width} height={height}></svg>
      <div className="chart-insights">
        <small>🏗️ <strong>Renovation Strategy:</strong> Target 2:1 or 3:2 bedroom-bathroom ratios for maximum value • 
        Multi-story properties with parking command premium • Avoid imbalanced configurations unless price reflects discount</small>
      </div>
    </div>
  );
};

export default HeatmapChart;