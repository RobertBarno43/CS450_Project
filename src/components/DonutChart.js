import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { getColor } from '../constants/colors';

const DonutChart = ({ data, width = 1125, height = 1063 }) => {
  const svgRef = useRef();  const zoomRef = useRef();  const [analysisType, setAnalysisType] = useState('furnishingstatus');

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const radius = Math.min(width, height) / 2 - 120;
    const innerRadius = radius * 0.4;



    // Create fixed container for labels
    const fixedContainer = svg.append('g');
    
    // Create zoomable container for donut only
    const zoomContainer = svg.append('g')
      .attr('class', 'zoom-container');

    // Set up zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.75, 5]) // Limit zoom out to 75%, allow zoom in to 500%
      .translateExtent([[-width * 0.25, -height * 0.25], [width * 1.25, height * 1.25]]) // Stricter drag limits
      .on('zoom', (event) => {
        zoomContainer.attr('transform', event.transform);
      });

    // Apply zoom behavior to SVG
    svg.call(zoom)
      .on('dblclick.zoom', null); // Disable double-click to zoom
    
    // Store zoom reference for button controls
    zoomRef.current = zoom;

    // Dynamic data processing based on analysis type
    const processDataByType = (type) => {
      switch(type) {
        case 'furnishingstatus':
          return d3.rollup(data, v => v.length, d => d.furnishingstatus);
        case 'stories':
          return d3.rollup(data, v => v.length, d => `${d.stories} ${d.stories === 1 ? 'Story' : 'Stories'}`);
        case 'bedrooms':
          return d3.rollup(data, v => v.length, d => `${d.bedrooms} ${d.bedrooms === 1 ? 'Bedroom' : 'Bedrooms'}`);
        case 'location':
          return d3.rollup(data, v => v.length, d => d.prefarea ? 'Preferred Area' : 'Standard Area');
        default:
          return d3.rollup(data, v => v.length, d => d.furnishingstatus);
      }
    };

    const counts = processDataByType(analysisType);
    let chartData = Array.from(counts, ([status, count]) => ({ status, count }));
    
    // Order bedroom categories: 2, 1, 3, 6, 4, 5
    if (analysisType === 'bedrooms') {
      const bedroomOrder = ['2 Bedrooms', '1 Bedroom', '3 Bedrooms', '6 Bedrooms', '4 Bedrooms', '5 Bedrooms'];
      chartData = chartData.sort((a, b) => {
        const aIndex = bedroomOrder.indexOf(a.status);
        const bIndex = bedroomOrder.indexOf(b.status);
        return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
      });
    }

    const getColorForCategory = (status, type) => {
      if (type === 'furnishingstatus') return getColor('furnishingStatus', status);
      if (type === 'bedrooms') return getColor('bedrooms', parseInt(status.split(' ')[0]));
      if (type === 'stories') return getColor('stories', parseInt(status.split(' ')[0]));
      if (type === 'location') return getColor('location', status);
      return '#95A5A6';
    };

    const colorScale = d3.scaleOrdinal()
      .domain(chartData.map(d => d.status))
      .range(chartData.map(d => getColorForCategory(d.status, analysisType)));

    // Set minimum angle for small slices (0.15 radians ≈ 8.6 degrees)
    const minAngleRad = 0.15;
    
    // Create pie with padding to separate slices and make small ones more visible
    const pie = d3.pie()
      .value(d => d.count)
      .sort(null)
      .padAngle(0.02) // Add small padding between slices
      .startAngle(-Math.PI / 2)
      .endAngle(3 * Math.PI / 2);
    
    // Generate initial pie data
    const pieData = pie(chartData);
    
    // Adjust angles to enforce minimum slice size
    const adjustedPieData = pieData.map((d, i) => {
      const currentAngle = d.endAngle - d.startAngle;
      if (currentAngle < minAngleRad) {
        const diff = minAngleRad - currentAngle;
        return {
          ...d,
          endAngle: d.endAngle + diff / 2,
          startAngle: d.startAngle - diff / 2
        };
      }
      return d;
    });

    const arc = d3.arc()
      .innerRadius(innerRadius)
      .outerRadius(radius);

    const labelArc = d3.arc()
      .innerRadius(radius + 50)
      .outerRadius(radius + 50);

    // Zoomable donut group
    const donutGroup = zoomContainer.append('g')
      .attr('transform', `translate(${width / 2}, ${height / 2})`);

    const arcs = donutGroup.selectAll('.arc')
      .data(adjustedPieData)
      .enter().append('g')
      .attr('class', 'arc');

    // Add the arcs (zoomable)
    arcs.append('path')
      .attr('d', arc)
      .attr('fill', d => colorScale(d.data.status))
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        d3.select(this).style('opacity', 0.8).style('filter', 'brightness(1.1)');
        
        // Show center text
        donutGroup.selectAll('.center-text').remove();
        const centerText = donutGroup.append('g').attr('class', 'center-text');
        
        centerText.append('text')
          .attr('text-anchor', 'middle')
          .attr('dy', '-1em')
          .attr('font-size', '13px')
          .attr('font-weight', 'bold')
          .attr('fill', '#333')
          .text(d.data.status);
        
        centerText.append('text')
          .attr('text-anchor', 'middle')
          .attr('dy', '0.5em')
          .attr('font-size', '32px')
          .attr('font-weight', 'bold')
          .attr('fill', colorScale(d.data.status))
          .text(d.data.count);
        
        centerText.append('text')
          .attr('text-anchor', 'middle')
          .attr('dy', '2em')
          .attr('font-size', '14px')
          .attr('fill', '#666')
          .text(`${((d.data.count / data.length) * 100).toFixed(1)}%`);
      })
      .on('mouseout', function() {
        d3.select(this).style('opacity', 1).style('filter', 'brightness(1)');
        donutGroup.selectAll('.center-text').remove();
      });

    // Add percentage labels on arcs (zoomable - only for larger slices)
    donutGroup.selectAll('.percentage-label')
      .data(pie(chartData))
      .enter().append('text')
      .attr('class', 'percentage-label')
      .attr('transform', d => `translate(${arc.centroid(d)})`)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('fill', 'white')
      .attr('font-weight', 'bold')
      .style('text-shadow', '1px 1px 2px rgba(0,0,0,0.9)')
      .style('pointer-events', 'none')
      .text(d => {
        const percentage = ((d.data.count / data.length) * 100);
        return percentage > 10 ? `${percentage.toFixed(1)}%` : ''; // Only show on slices > 10%
      });
    
    // Fixed labels group
    const fixedLabelsGroup = fixedContainer.append('g')
      .attr('transform', `translate(${width / 2}, ${height / 2})`);

    // Add straight connecting lines from arc to labels (zoomable)
    donutGroup.selectAll('.label-line')
      .data(adjustedPieData)
      .enter().append('line')
      .attr('class', 'label-line')
      .attr('stroke', 'black')
      .attr('stroke-width', 1)
      .attr('opacity', 0.6)
      .attr('x1', d => arc.centroid(d)[0])
      .attr('y1', d => arc.centroid(d)[1])
      .attr('x2', d => labelArc.centroid(d)[0])
      .attr('y2', d => labelArc.centroid(d)[1]);

    // Add external labels
    donutGroup.selectAll('.external-label')
      .data(adjustedPieData)
      .enter().append('text')
      .attr('class', 'external-label')
      .attr('transform', d => `translate(${labelArc.centroid(d)})`)
      .attr('text-anchor', d => {
        const labelPos = labelArc.centroid(d);
        // If label is on right side (positive x), start text from line end
        // If label is on left side (negative x), end text at line end
        return labelPos[0] > 0 ? 'start' : 'end';
      })
      .attr('font-size', '12px')
      .attr('font-weight', '600')
      .attr('fill', '#444')
      .text(d => d.data.status);

    // Dynamic title based on analysis type
    const getTitleText = (type) => {
      switch(type) {
        case 'furnishingstatus': return 'Distribution by Furnishing Status';
        case 'stories': return 'Distribution by Stories';
        case 'bedrooms': return 'Distribution by Bedrooms';
        case 'location': return 'Preferred vs Standard Areas';
        default: return 'Market Distribution';
      }
    };

    fixedLabelsGroup.append('text')
      .attr('y', -height/2 + 15)
      .attr('text-anchor', 'middle')
      .attr('font-size', '16px')
      .attr('font-weight', 'bold')
      .attr('fill', '#333')
      .text(getTitleText(analysisType));

  }, [data, width, height, analysisType]);

  const getTitleByType = (type) => {
    switch(type) {
      case 'furnishingstatus': return 'Investment Readiness Spectrum';
      case 'stories': return 'Property Height Distribution';
      case 'bedrooms': return 'Bedroom Configuration Mix';
      case 'location': return 'Location Premium Analysis';
      default: return 'Market Analysis';
    }
  };

  const getDescriptionByType = (type) => {
    switch(type) {
      case 'furnishingstatus': return 'Analyze property readiness levels to identify quick rental opportunities vs. value-add renovation projects for maximum ROI.';
      case 'stories': return 'Property height affects both price and buyer preferences - analyze single vs multi-story trends.';
      case 'bedrooms': return 'Bedroom distribution shows market demand patterns and investment sweet spots.';
      case 'location': return 'Location preference analysis shows the premium commanded by preferred areas.'
      default: return 'Explore different aspects of the real estate market.';
    }
  };

  return (
    <div>
      <h3>Market Composition Analysis: {getTitleByType(analysisType)}</h3>
      <p className="chart-description">
        <strong>Market Insight:</strong> {getDescriptionByType(analysisType)}
      </p>
      
      {/* Interactive Controls */}
      <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '5px' }}>
        <label style={{ fontWeight: 'bold', marginRight: '10px' }}>Analyze by:</label>
        <div style={{ display: 'flex', gap: '15px', marginTop: '5px', flexWrap: 'wrap' }}>
          <label style={{ cursor: 'pointer' }}><input type="radio" name="analysis" value="furnishingstatus" checked={analysisType === 'furnishingstatus'} onChange={(e) => setAnalysisType(e.target.value)} /> Furnishing</label>
          <label style={{ cursor: 'pointer' }}><input type="radio" name="analysis" value="stories" checked={analysisType === 'stories'} onChange={(e) => setAnalysisType(e.target.value)} /> Stories</label>
          <label style={{ cursor: 'pointer' }}><input type="radio" name="analysis" value="bedrooms" checked={analysisType === 'bedrooms'} onChange={(e) => setAnalysisType(e.target.value)} /> Bedrooms</label>
          <label style={{ cursor: 'pointer' }}><input type="radio" name="analysis" value="location" checked={analysisType === 'location'} onChange={(e) => setAnalysisType(e.target.value)} /> Location</label>
        </div>
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
      
      <div className="chart-insights">
        <small>� <strong>Investment Strategy:</strong> 
        • Focus on property types with high demand • Unfurnished = renovation opportunity • Furnished = quick rental income<br/>
        🎛️ <strong>Controls:</strong> Drag to explore • Zoom for details • Switch categories to find your investment niche!</small>
      </div>
    </div>
  );
};

export default DonutChart;