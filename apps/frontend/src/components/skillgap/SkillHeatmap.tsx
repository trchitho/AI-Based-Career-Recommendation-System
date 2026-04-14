import React, { useEffect, useRef, useState } from 'react';
import { HeatmapData } from '../../types/skillGap';
import './SkillHeatmap.css';

interface SkillHeatmapProps {
  data: HeatmapData;
}

const SkillHeatmap: React.FC<SkillHeatmapProps> = ({ data }) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [selectedNode, setSelectedNode] = useState<any>(null);

  useEffect(() => {
    if (!canvasRef.current || !data || !data.nodes || !data.links) return;

    // Simple force-directed layout simulation
    const width = canvasRef.current.clientWidth;
    const height = 600;

    // Position nodes
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 3;

    const positionedNodes = data.nodes.map((node, index) => {
      if (node.type === 'career') {
        return { ...node, x: centerX, y: centerY };
      }

      const angle = (index / (data.nodes.length - 1)) * 2 * Math.PI;
      const distance = radius + (node.importance || 0.5) * 50;

      return {
        ...node,
        x: centerX + Math.cos(angle) * distance,
        y: centerY + Math.sin(angle) * distance,
      };
    });

    // Render (simplified - in production use D3.js or React Flow)
    const container = canvasRef.current;
    container.innerHTML = '';

    // Create SVG
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', width.toString());
    svg.setAttribute('height', height.toString());
    svg.style.width = '100%';
    svg.style.height = '600px';

    // Draw links
    data.links.forEach(link => {
      const sourceNode = positionedNodes.find(n => n.id === link.source);
      const targetNode = positionedNodes.find(n => n.id === link.target);

      if (sourceNode && targetNode) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', sourceNode.x.toString());
        line.setAttribute('y1', sourceNode.y.toString());
        line.setAttribute('x2', targetNode.x.toString());
        line.setAttribute('y2', targetNode.y.toString());
        line.setAttribute('stroke', '#cbd5e1');
        line.setAttribute('stroke-width', (link.strength * 3).toString());
        
        if (link.style === 'dashed') {
          line.setAttribute('stroke-dasharray', '5,5');
        } else if (link.style === 'dotted') {
          line.setAttribute('stroke-dasharray', '2,2');
        }

        svg.appendChild(line);
      }
    });

    // Draw nodes
    positionedNodes.forEach(node => {
      const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      group.setAttribute('transform', `translate(${node.x}, ${node.y})`);
      group.style.cursor = 'pointer';

      // Circle
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      const nodeSize = node.type === 'career' ? 40 : 25;
      circle.setAttribute('r', nodeSize.toString());
      circle.setAttribute('fill', node.color);
      circle.setAttribute('stroke', 'white');
      circle.setAttribute('stroke-width', '3');

      // Text
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dy', (nodeSize + 20).toString());
      text.setAttribute('fill', '#1f2937');
      text.setAttribute('font-size', '12');
      text.setAttribute('font-weight', '600');
      text.textContent = node.name;

      group.appendChild(circle);
      group.appendChild(text);

      // Add hover effect
      group.addEventListener('mouseenter', () => {
        circle.setAttribute('stroke-width', '5');
        setSelectedNode(node);
      });

      group.addEventListener('mouseleave', () => {
        circle.setAttribute('stroke-width', '3');
      });

      svg.appendChild(group);
    });

    container.appendChild(svg);
  }, [data]);

  return (
    <div className="skill-heatmap">
      <div className="heatmap-header">
        <h3>🗺️ Skill Gap Heatmap</h3>
        <div className="match-score">
          <span className="score-label">Match Score:</span>
          <span className="score-value">{data.match_percentage?.toFixed(1) || '0.0'}%</span>
        </div>
      </div>

      <div className="heatmap-legend">
        {data.legend && Object.entries(data.legend).map(([key, value]) => (
          <div key={key} className="legend-item">
            <span
              className="legend-color"
              style={{ backgroundColor: value.color }}
            ></span>
            <span className="legend-label">{value.label}</span>
          </div>
        ))}
      </div>

      <div ref={canvasRef} className="heatmap-canvas"></div>

      {selectedNode && (
        <div className="node-tooltip">
          <h4>{selectedNode.name}</h4>
          <p className="node-category">{selectedNode.category}</p>
          {selectedNode.importance && (
            <p className="node-importance">
              Importance: {(selectedNode.importance * 100).toFixed(0)}%
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default SkillHeatmap;
