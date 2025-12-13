import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const FeaturePremiumChart = ({ data, width = 800, height = 500 }) => {
  const svgRef = useRef();

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 120, bottom: 60, left: 80 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Calculate feature premiums by comparing properties with/without features
    const calculateFeaturePremiums = () => {
      const features = [
        { key: 'airconditioning', name: 'Air Conditioning', color: '#ff6b6b' },
        { key: 'parking', name: 'Parking Available', color: '#4ecdc4' },
        { key: 'prefarea', name: 'Preferred Area', color: '#45b7d1' },
        { key: 'hotwaterheating', name: 'Hot Water Heating', color: '#96ceb4' },
        { key: 'guestroom', name: 'Guest Room', color: '#ffeaa7' },
        { key: 'basement', name: 'Basement', color: '#dda0dd' },
        { key: 'mainroad', name: 'Main Road Access', color: '#98d8c8' }
      ];

      const premiums = {};
      
      features.forEach(feature => {
        const withFeature = data.filter(d => d[feature.key] === true);
        const withoutFeature = data.filter(d => d[feature.key] === false);
        
        if (withFeature.length > 0 && withoutFeature.length > 0) {
          const avgWithFeature = d3.mean(withFeature, d => d.price);
          const avgWithoutFeature = d3.mean(withoutFeature, d => d.price);
          const premium = avgWithFeature - avgWithoutFeature;
          const premiumPercent = (premium / avgWithoutFeature) * 100;
          
          premiums[feature.key] = {
            ...feature,
            premium,
            premiumPercent,
            basePrice: avgWithoutFeature,
            withFeaturePrice: avgWithFeature,
            sampleSize: withFeature.length
          };
        }
      });

      return premiums;
    };

    const featurePremiums = calculateFeaturePremiums();
    const premiumData = Object.values(featurePremiums)
      .filter(d => d.premium > 0 && d.sampleSize >= 5) // Only show positive premiums with adequate sample size
      .sort((a, b) => b.premium - a.premium);

    if (premiumData.length === 0) return;

    // Scales
    const xScale = d3.scaleBand()
      .domain(premiumData.map(d => d.name))
      .range([0, innerWidth])
      .padding(0.2);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(premiumData, d => d.withFeaturePrice)])
      .range([innerHeight, 0]);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create stacked bars
    premiumData.forEach(feature => {
      const barGroup = g.append('g')
        .attr('class', 'feature-bar')
        .attr('transform', `translate(${xScale(feature.name)}, 0)`);

      // Base price bar (gray)
      barGroup.append('rect')
        .attr('y', yScale(feature.basePrice))
        .attr('width', xScale.bandwidth())
        .attr('height', innerHeight - yScale(feature.basePrice))
        .attr('fill', '#e0e0e0')
        .attr('stroke', '#ccc')
        .attr('stroke-width', 1);

      // Premium bar (colored)
      barGroup.append('rect')
        .attr('y', yScale(feature.withFeaturePrice))
        .attr('width', xScale.bandwidth())
        .attr('height', yScale(feature.basePrice) - yScale(feature.withFeaturePrice))
        .attr('fill', feature.color)
        .attr('opacity', 0.8);

      // Premium value label
      barGroup.append('text')
        .attr('x', xScale.bandwidth() / 2)
        .attr('y', yScale(feature.withFeaturePrice) - 5)
        .attr('text-anchor', 'middle')
        .attr('font-size', '11px')
        .attr('font-weight', 'bold')
        .attr('fill', feature.color)
        .text(`+$${Math.round(feature.premium / 1000)}K`);

      // Percentage increase label
      barGroup.append('text')
        .attr('x', xScale.bandwidth() / 2)
        .attr('y', yScale(feature.withFeaturePrice) - 18)
        .attr('text-anchor', 'middle')
        .attr('font-size', '9px')
        .attr('fill', '#666')
        .text(`(+${feature.premiumPercent.toFixed(1)}%)`);

      // Base price label
      barGroup.append('text')
        .attr('x', xScale.bandwidth() / 2)
        .attr('y', yScale(feature.basePrice / 2))
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .attr('fill', '#666')
        .text(`$${Math.round(feature.basePrice / 1000)}K`);

      // Tooltip on hover
      const tooltip = d3.select('body').append('div')
        .attr('class', 'tooltip-premium')
        .style('position', 'absolute')
        .style('background', 'rgba(0,0,0,0.8)')
        .style('color', 'white')
        .style('padding', '8px')
        .style('border-radius', '4px')
        .style('font-size', '12px')
        .style('pointer-events', 'none')
        .style('opacity', 0);

      barGroup
        .on('mouseover', function(event) {
          d3.select(this).selectAll('rect').attr('opacity', 1);
          tooltip.transition().duration(200).style('opacity', 1);
          tooltip.html(`
            <strong>${feature.name}</strong><br/>
            Base Price: $${feature.basePrice.toLocaleString()}<br/>
            With Feature: $${feature.withFeaturePrice.toLocaleString()}<br/>
            <strong>Premium: $${feature.premium.toLocaleString()} (+${feature.premiumPercent.toFixed(1)}%)</strong><br/>
            Sample Size: ${feature.sampleSize} properties
          `)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px');
        })
        .on('mouseout', function() {
          barGroup.selectAll('rect').attr('opacity', d => d === feature ? 0.8 : 0.8);
          tooltip.transition().duration(200).style('opacity', 0);
        })
        .on('mousemove', function(event) {
          tooltip.style('left', (event.pageX + 10) + 'px')
                 .style('top', (event.pageY - 10) + 'px');
        });
    });

    // Y axis
    g.append('g')
      .call(d3.axisLeft(yScale).tickFormat(d => `$${d/1000000}M`));

    // X axis
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale))
      .selectAll('text')
      .style('text-anchor', 'end')
      .attr('dx', '-.8em')
      .attr('dy', '.15em')
      .attr('transform', 'rotate(-45)')
      .style('font-size', '11px');

    // Y axis label
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left)
      .attr('x', 0 - (innerHeight / 2))
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .style('font-size', '12px')
      .text('Property Value');

    // Legend
    const legend = g.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${innerWidth + 20}, 20)`);

    legend.append('rect')
      .attr('width', 15)
      .attr('height', 15)
      .attr('fill', '#e0e0e0')
      .attr('stroke', '#ccc');

    legend.append('text')
      .attr('x', 20)
      .attr('y', 12)
      .style('font-size', '12px')
      .text('Base Property Value');

    legend.append('rect')
      .attr('y', 25)
      .attr('width', 15)
      .attr('height', 15)
      .attr('fill', '#ff6b6b')
      .attr('opacity', 0.8);

    legend.append('text')
      .attr('x', 20)
      .attr('y', 37)
      .style('font-size', '12px')
      .text('Feature Premium');

    // ROI insights box
    const maxPremium = d3.max(premiumData, d => d.premium);
    const bestFeature = premiumData[0];
    
    const insights = g.append('g')
      .attr('class', 'insights-box')
      .attr('transform', `translate(${innerWidth + 20}, 80)`);

    insights.append('rect')
      .attr('width', 90)
      .attr('height', 100)
      .attr('fill', '#f8f9fa')
      .attr('stroke', '#28a745')
      .attr('stroke-width', 2)
      .attr('rx', 5);

    insights.append('text')
      .attr('x', 45)
      .attr('y', 15)
      .attr('text-anchor', 'middle')
      .style('font-size', '11px')
      .style('font-weight', 'bold')
      .style('fill', '#28a745')
      .text('💡 BEST ROI');

    insights.append('text')
      .attr('x', 45)
      .attr('y', 35)
      .attr('text-anchor', 'middle')
      .style('font-size', '10px')
      .style('font-weight', 'bold')
      .text(bestFeature.name.split(' ')[0]);

    insights.append('text')
      .attr('x', 45)
      .attr('y', 50)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .style('fill', '#28a745')
      .text(`+$${Math.round(bestFeature.premium / 1000)}K`);

    insights.append('text')
      .attr('x', 45)
      .attr('y', 65)
      .attr('text-anchor', 'middle')
      .style('font-size', '10px')
      .style('fill', '#666')
      .text(`(${bestFeature.premiumPercent.toFixed(1)}% gain)`);

    insights.append('text')
      .attr('x', 45)
      .attr('y', 85)
      .attr('text-anchor', 'middle')
      .style('font-size', '9px')
      .style('fill', '#666')
      .text(`${bestFeature.sampleSize} properties`);

  }, [data, width, height]);

  return (
    <div>
      <h3>Investment Feature Calculator - ROI by Renovation</h3>
      <p className="chart-description">
        <strong>Investment Strategy:</strong> Calculate exact returns for each property improvement. 
        Gray bars show base property value, colored sections show premium gained by adding specific features.
        Focus on high-premium, low-cost renovations for maximum ROI.
      </p>
      <svg ref={svgRef} width={width} height={height}></svg>
      <div className="chart-insights">
        <small>💰 <strong>Renovation ROI Strategy:</strong> Target properties missing high-premium features • 
        AC installation = immediate value boost • Parking solutions = essential in urban markets • 
        Furnished properties = instant rental income potential</small>
      </div>
    </div>
  );
};

export default FeaturePremiumChart;