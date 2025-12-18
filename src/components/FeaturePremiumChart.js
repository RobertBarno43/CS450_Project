import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { getColor } from '../constants/colors';

// Dynamic dropdown component
const DropdownSelector = ({ selectedFeature, setSelectedFeature, premiumData }) => {

  return (
    <div style={{ marginBottom: '15px' }}>
      <label style={{ marginRight: '10px', fontWeight: 'bold' }}>Feature ROI Details:</label>
      <select 
        value={selectedFeature} 
        onChange={(e) => setSelectedFeature(parseInt(e.target.value))}
        style={{ padding: '5px', borderRadius: '4px', border: '1px solid #ccc' }}
      >
        {premiumData.map((feature, index) => (
          <option key={index} value={index}>
            {feature.name} - {feature.premiumPercent.toFixed(1)}% ROI
          </option>
        ))}
      </select>
    </div>
  );
};

const FeaturePremiumChart = ({ data, width = 2000, height = 500 }) => {
  const svgRef = useRef();
  const [selectedFeature, setSelectedFeature] = useState(0); // Index of selected feature

  // Calculate feature premiums by comparing properties with/without features
  const calculateFeaturePremiums = () => {
      const features = [
        { key: 'airconditioning', name: 'Air Conditioning', color: getColor('featurePremium', 'airconditioning') },
        { key: 'parking', name: 'Parking Available', color: getColor('featurePremium', 'parking') },
        { key: 'prefarea', name: 'Preferred Area', color: getColor('featurePremium', 'prefarea') },
        { key: 'hotwaterheating', name: 'Hot Water Heating', color: getColor('featurePremium', 'hotwaterheating') },
        { key: 'guestroom', name: 'Guest Room', color: getColor('featurePremium', 'guestroom') },
        { key: 'basement', name: 'Basement', color: getColor('featurePremium', 'basement') },
        { key: 'mainroad', name: 'Main Road Access', color: getColor('featurePremium', 'mainroad') }
      ];

      const premiums = {};
      
      features.forEach(feature => {
        const withFeature = data.filter(d => d[feature.key] === true);
        const withoutFeature = data.filter(d => d[feature.key] === false);
        
        if (withFeature.length > 0 && withoutFeature.length > 0) {
          // Calculate price per square foot for size-normalized comparison
          const pricePerSqFtWith = d3.median(withFeature, d => d.price / d.area);
          const pricePerSqFtWithout = d3.median(withoutFeature, d => d.price / d.area);
          const premiumPerSqFt = pricePerSqFtWith - pricePerSqFtWithout;
          const premiumPercent = (premiumPerSqFt / pricePerSqFtWithout) * 100;
          
          // Calculate typical house size for display purposes
          const avgHouseSize = d3.median(data, d => d.area);
          const premium = premiumPerSqFt * avgHouseSize;
          const basePrice = pricePerSqFtWithout * avgHouseSize;
          const withFeaturePrice = pricePerSqFtWith * avgHouseSize;
          
          premiums[feature.key] = {
            ...feature,
            premium,
            premiumPercent,
            basePrice,
            withFeaturePrice,
            premiumPerSqFt,
            pricePerSqFtWith,
            pricePerSqFtWithout,
            sampleSize: withFeature.length,
            avgHouseSize
          };
        }
      });

      return premiums;
    };

  const featurePremiums = calculateFeaturePremiums();
  const premiumData = Object.values(featurePremiums)
    .filter(d => d.premium > 0 && d.sampleSize >= 5) // Only show positive premiums with adequate sample size
    .sort((a, b) => b.premium - a.premium);

  useEffect(() => {
    if (premiumData.length === 0) return;
    
    // Define displayFeature at the top so it can be used throughout
    const displayFeature = premiumData[selectedFeature] || premiumData[0];
    const isBestROI = selectedFeature === 0;
    
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 250, bottom: 60, left: 110 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Scales
    const xScale = d3.scaleLinear()
      .domain([0, d3.max(premiumData, d => d.withFeaturePrice)])
      .range([0, innerWidth]);

    const yScale = d3.scaleBand()
      .domain(premiumData.map(d => d.name))
      .range([0, innerHeight])
      .padding(0.2);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create horizontal stacked bars
    premiumData.forEach(feature => {
      const barGroup = g.append('g')
        .attr('class', 'feature-bar')
        .attr('transform', `translate(0, ${yScale(feature.name)})`);

      // Base price bar (gray) - first segment
      barGroup.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', xScale(feature.basePrice))
        .attr('height', yScale.bandwidth())
        .attr('fill', '#e0e0e0')
        .attr('stroke', '#ccc')
        .attr('stroke-width', 1);

      // Premium segment (colored) - second segment  
      barGroup.append('rect')
        .attr('x', xScale(feature.basePrice))
        .attr('y', 0)
        .attr('width', xScale(feature.premium))
        .attr('height', yScale.bandwidth())
        .attr('fill', feature.color)
        .attr('opacity', 0.8);

      // Premium value label with per-sqft info
      barGroup.append('text')
        .attr('x', xScale(feature.withFeaturePrice) + 5)
        .attr('y', yScale.bandwidth() / 2 - 5)
        .attr('text-anchor', 'start')
        .attr('font-size', '11px')
        .attr('font-weight', 'bold')
        .attr('fill', feature.color)
        .attr('dy', '0.35em')
        .text(`+$${Math.round(feature.premium / 1000)}K (+${feature.premiumPercent.toFixed(1)}%)`);

      // Per square foot premium label
      barGroup.append('text')
        .attr('x', xScale(feature.withFeaturePrice) + 5)
        .attr('y', yScale.bandwidth() / 2 + 8)
        .attr('text-anchor', 'start')
        .attr('font-size', '9px')
        .attr('font-weight', 'normal')
        .attr('fill', feature.color)
        .attr('dy', '0.35em')
        .text(`(+$${Math.round(feature.premiumPerSqFt)}/sqft)`);

      // Base price label
      barGroup.append('text')
        .attr('x', xScale(feature.basePrice) / 2)
        .attr('y', yScale.bandwidth() / 2)
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .attr('fill', '#666')
        .attr('dy', '0.35em')
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
            <strong>Size-Normalized Analysis:</strong><br/>
            Base Price/sqft: $${Math.round(feature.pricePerSqFtWithout)}<br/>
            With Feature/sqft: $${Math.round(feature.pricePerSqFtWith)}<br/>
            <strong>Premium: +$${Math.round(feature.premiumPerSqFt)}/sqft (+${feature.premiumPercent.toFixed(1)}%)</strong><br/>
            Typical ${Math.round(feature.avgHouseSize)}sqft house: +$${Math.round(feature.premium / 1000)}K<br/>
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

    // Y axis (features)
    g.append('g')
      .call(d3.axisLeft(yScale));

    // X axis (price values)
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).tickFormat(d => `$${d/1000000}M`));

    // Y axis label
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left)
      .attr('x', 0 - (innerHeight / 2))
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .style('font-size', '12px')
      .text('Premium Features');

    // X axis label  
    g.append('text')
      .attr('transform', `translate(${innerWidth / 2}, ${innerHeight + margin.bottom - 10})`)
      .style('text-anchor', 'middle')
      .style('font-size', '12px')
      .text('Property Value');

    // Legend
    const legend = g.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${innerWidth + 120}, 20)`);

    // Legend background
    legend.append('rect')
      .attr('x', -5)
      .attr('y', -5)
      .attr('width', 140)
      .attr('height', 65)
      .attr('fill', '#f8f9fa')
      .attr('stroke', '#dee2e6')
      .attr('stroke-width', 1)
      .attr('rx', 5);

    // Legend title
    legend.append('text')
      .attr('x', 65)
      .attr('y', 12)
      .attr('text-anchor', 'middle')
      .style('font-size', '11px')
      .style('font-weight', 'bold')
      .style('fill', '#333')
      .text('Chart Legend');

    legend.append('rect')
      .attr('x', 5)
      .attr('y', 20)
      .attr('width', 12)
      .attr('height', 12)
      .attr('fill', '#e0e0e0')
      .attr('stroke', '#ccc');

    legend.append('text')
      .attr('x', 22)
      .attr('y', 30)
      .style('font-size', '10px')
      .text('Base Property Value');

    legend.append('rect')
      .attr('x', 5)
      .attr('y', 40)
      .attr('width', 12)
      .attr('height', 12)
      .attr('fill', displayFeature.color)
      .attr('opacity', 0.8);

    legend.append('text')
      .attr('x', 22)
      .attr('y', 50)
      .style('font-size', '10px')
      .text('Feature Premium');

    // ROI insights box
    const insights = g.append('g')
      .attr('class', 'insights-box')
      .attr('transform', `translate(${innerWidth + 120}, 105)`);

    insights.append('rect')
      .attr('width', 120)
      .attr('height', 100)
      .attr('fill', '#f8f9fa')
      .attr('stroke', displayFeature.color)
      .attr('stroke-width', 3)
      .attr('rx', 5);

    insights.append('text')
      .attr('x', 60)
      .attr('y', 15)
      .attr('text-anchor', 'middle')
      .style('font-size', '11px')
      .style('font-weight', 'bold')
      .style('fill', displayFeature.color)
      .text(isBestROI ? '💡 BEST VALUE' : '📊 FEATURE VALUE');

    insights.append('text')
      .attr('x', 60)
      .attr('y', 35)
      .attr('text-anchor', 'middle')
      .style('font-size', '10px')
      .style('font-weight', 'bold')
      .text(displayFeature.name.split(' ')[0]);

    insights.append('text')
      .attr('x', 60)
      .attr('y', 45)
      .attr('text-anchor', 'middle')
      .style('font-size', '11px')
      .style('font-weight', 'bold')
      .style('fill', displayFeature.color)
      .text(`+$${Math.round(displayFeature.premiumPerSqFt)}/sqft`);

    insights.append('text')
      .attr('x', 60)
      .attr('y', 58)
      .attr('text-anchor', 'middle')
      .style('font-size', '10px')
      .style('fill', '#666')
      .text(`(${displayFeature.premiumPercent.toFixed(1)}% gain)`);

    insights.append('text')
      .attr('x', 60)
      .attr('y', 72)
      .attr('text-anchor', 'middle')
      .style('font-size', '9px')
      .style('fill', '#666')
      .text(`≈ +$${Math.round(displayFeature.premium / 1000)}K total`);

    insights.append('text')
      .attr('x', 60)
      .attr('y', 85)
      .attr('text-anchor', 'middle')
      .style('font-size', '9px')
      .style('fill', '#666')
      .text(`${displayFeature.sampleSize} properties`);

    // ROI calculation explanation below the ROI box
    const roiExplanation = g.append('g')
      .attr('class', 'roi-explanation')
      .attr('transform', `translate(${innerWidth + 120}, 230)`);

    roiExplanation.append('text')
      .attr('x', 0)
      .attr('y', 15)
      .style('font-size', '10px')
      .style('font-weight', 'bold')
      .style('fill', displayFeature.color)
      .text('ROI Calculation:');

    roiExplanation.append('text')
      .attr('x', 0)
      .attr('y', 30)
      .style('font-size', '9px')
      .style('fill', '#666')
      .text('Premium ÷ Base Price × 100');

    roiExplanation.append('text')
      .attr('x', 0)
      .attr('y', 43)
      .style('font-size', '9px')
      .style('fill', '#666')
      .text('= Value increase %');

  }, [data, width, height, selectedFeature]);

  return (
    <div>
      <h3>Premium Feature Evaluation by Square Foot</h3>
      <p className="chart-description">
        <strong>Size-Normalized ROI Analysis:</strong> Compares price per square foot to eliminate house size bias. 
        Shows true feature premiums independent of property size. Gray bars show base value, colored sections show 
        actual feature premiums. Focus on high $/sqft premiums for reliable renovation ROI.
      </p>
      
      <DropdownSelector selectedFeature={selectedFeature} setSelectedFeature={setSelectedFeature} premiumData={premiumData} />
      
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