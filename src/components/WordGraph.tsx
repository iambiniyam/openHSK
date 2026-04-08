import { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Maximize2, X, Volume2, Search, Filter } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ttsService } from '@/services/ttsService';
import type { UnifiedEntry } from '@/services/unifiedDictionaryService';

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  pinyin?: string;
  definition?: string;
  type: 'center' | 'synonym' | 'antonym' | 'family' | 'related';
  level?: number;
  entry?: UnifiedEntry;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
  type: 'synonym' | 'antonym' | 'family' | 'related';
}

interface WordGraphProps {
  entry: UnifiedEntry;
  relatedEntries?: UnifiedEntry[];
  onNodeClick?: (entry: UnifiedEntry) => void;
  onNodeDoubleClick?: (entry: UnifiedEntry) => void;
}

export const WordGraph = ({ 
  entry, 
  relatedEntries = [], 
  onNodeClick,
  onNodeDoubleClick,
}: WordGraphProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedNodePosition, setSelectedNodePosition] = useState<{ left: number; top: number } | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Update dimensions based on container
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: Math.max(rect.width - 32, 400),
          height: Math.min(Math.max(rect.width * 0.6, 400), 600)
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Build graph data
  const buildGraphData = useCallback(() => {
    const nodes: GraphNode[] = [
      { 
        id: entry.id, 
        label: entry.hanzi, 
        pinyin: entry.pinyin,
        definition: entry.definitions.slice(0, 2).join(', '),
        type: 'center',
        level: entry.hskLevel,
        entry
      }
    ];
    const links: GraphLink[] = [];

    // Add synonym nodes
    entry.synonyms.slice(0, 5).forEach((syn, idx) => {
      const synEntry = relatedEntries.find(e => e.hanzi === syn.hanzi);
      const synId = `syn-${idx}`;
      nodes.push({
        id: synId,
        label: syn.hanzi,
        pinyin: syn.pinyin,
        definition: syn.definition,
        type: 'synonym',
        level: syn.hskLevel,
        entry: synEntry
      });
      links.push({
        source: entry.id,
        target: synId,
        type: 'synonym'
      });
    });

    // Add antonym nodes
    entry.antonyms.slice(0, 4).forEach((ant, idx) => {
      const antEntry = relatedEntries.find(e => e.hanzi === ant.hanzi);
      const antId = `ant-${idx}`;
      nodes.push({
        id: antId,
        label: ant.hanzi,
        pinyin: ant.pinyin,
        definition: ant.definition,
        type: 'antonym',
        level: ant.hskLevel,
        entry: antEntry
      });
      links.push({
        source: entry.id,
        target: antId,
        type: 'antonym'
      });
    });

    // Add word family nodes
    entry.wordFamily.slice(0, 5).forEach((word, idx) => {
      const wordEntry = relatedEntries.find(e => e.hanzi === word.hanzi);
      const wordId = `family-${idx}`;
      nodes.push({
        id: wordId,
        label: word.hanzi,
        pinyin: word.pinyin,
        definition: word.definition,
        type: 'family',
        level: word.hskLevel,
        entry: wordEntry
      });
      links.push({
        source: entry.id,
        target: wordId,
        type: 'family'
      });
    });

    // Add related entries with shared characters
    relatedEntries
      .filter(e => e.id !== entry.id)
      .slice(0, 8)
      .forEach((relEntry, idx) => {
        const relId = `related-${idx}`;
        if (!nodes.find(n => n.label === relEntry.hanzi)) {
          nodes.push({
            id: relId,
            label: relEntry.hanzi,
            pinyin: relEntry.pinyin,
            definition: relEntry.definitions?.[0],
            type: 'related',
            level: relEntry.hskLevel,
            entry: relEntry
          });
          links.push({
            source: entry.id,
            target: relId,
            type: 'related'
          });
        }
      });

    return { nodes, links };
  }, [entry, relatedEntries]);

  // Filter nodes based on selected filter
  const getFilteredNodes = useCallback((nodes: GraphNode[]) => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return nodes.filter((node) => {
      const matchesType = filterType === 'all' || node.type === 'center' || node.type === filterType;
      if (!matchesType) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return (
        node.label.toLowerCase().includes(normalizedSearch) ||
        node.pinyin?.toLowerCase().includes(normalizedSearch) ||
        node.definition?.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [filterType, searchTerm]);

  useEffect(() => {
    if (!svgRef.current) return;

    const { nodes: allNodes, links: allLinks } = buildGraphData();
    const nodes = getFilteredNodes(allNodes);
    const nodeIds = new Set(nodes.map(n => n.id));
    const links = allLinks.filter(l => 
      nodeIds.has(typeof l.source === 'string' ? l.source : l.source.id) &&
      nodeIds.has(typeof l.target === 'string' ? l.target : l.target.id)
    );

    // Clear previous graph
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current)
      .attr('width', dimensions.width)
      .attr('height', dimensions.height);

    // Add zoom behavior
    const g = svg.append('g');
    
    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    zoomBehaviorRef.current = zoomBehavior;

    svg.call(zoomBehavior);

    // Create force simulation
    const simulation = d3.forceSimulation<GraphNode>(nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(links)
        .id((d: d3.SimulationNodeDatum) => (d as GraphNode).id)
        .distance((d: d3.SimulationLinkDatum<GraphNode>) => {
          const link = d as GraphLink;
          switch (link.type) {
            case 'synonym': return 90;
            case 'antonym': return 90;
            case 'family': return 70;
            default: return 110;
          }
        })
      )
      .force('charge', d3.forceManyBody().strength((d: d3.SimulationNodeDatum) => 
        (d as GraphNode).type === 'center' ? -1000 : -400
      ))
      .force('center', d3.forceCenter(dimensions.width / 2, dimensions.height / 2))
      .force('collision', d3.forceCollide().radius((d: d3.SimulationNodeDatum) => 
        (d as GraphNode).type === 'center' ? 55 : 40
      ))
      .force('x', d3.forceX(dimensions.width / 2).strength(0.05))
      .force('y', d3.forceY(dimensions.height / 2).strength(0.05));

    // Create links with gradient colors
    const link = g.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', (d: GraphLink) => {
        switch (d.type) {
          case 'synonym': return '#22c55e';
          case 'antonym': return '#ef4444';
          case 'family': return '#3b82f6';
          default: return '#a855f7';
        }
      })
      .attr('stroke-width', (d: GraphLink) => d.type === 'family' ? 2.5 : 2)
      .attr('stroke-opacity', 0.6)
      .attr('stroke-dasharray', (d: GraphLink) => d.type === 'antonym' ? '5,5' : 'none');

    // Create node groups
    const node = g.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node cursor-pointer')
      .call(d3.drag<SVGGElement, GraphNode>()
        .on('start', (event: d3.D3DragEvent<SVGGElement, GraphNode, unknown>, d: GraphNode) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event: d3.D3DragEvent<SVGGElement, GraphNode, unknown>, d: GraphNode) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event: d3.D3DragEvent<SVGGElement, GraphNode, unknown>, d: GraphNode) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
      );

    // Add glow filter
    const defs = svg.append('defs');
    const filter = defs.append('filter')
      .attr('id', 'glow');
    filter.append('feGaussianBlur')
      .attr('stdDeviation', '3')
      .attr('result', 'coloredBlur');
    filter.append('feMerge')
      .append('feMergeNode')
      .attr('in', 'coloredBlur');
    filter.append('feMerge')
      .append('feMergeNode')
      .attr('in', 'SourceGraphic');

    // Add circles to nodes
    node.append('circle')
      .attr('r', (d: GraphNode) => d.type === 'center' ? 50 : 35)
      .attr('fill', (d: GraphNode) => {
        switch (d.type) {
          case 'center': return 'hsl(var(--primary))';
          case 'synonym': return '#dcfce7';
          case 'antonym': return '#fee2e2';
          case 'family': return '#dbeafe';
          default: return '#f3e8ff';
        }
      })
      .attr('stroke', (d: GraphNode) => {
        switch (d.type) {
          case 'center': return 'hsl(var(--primary))';
          case 'synonym': return '#22c55e';
          case 'antonym': return '#ef4444';
          case 'family': return '#3b82f6';
          default: return '#a855f7';
        }
      })
      .attr('stroke-width', 3)
      .style('filter', (d: GraphNode) => d.type === 'center' ? 'url(#glow)' : 'none');

    // Add labels (Chinese characters)
    node.append('text')
      .text((d: GraphNode) => d.label)
      .attr('text-anchor', 'middle')
      .attr('dy', (d: GraphNode) => d.type === 'center' ? 12 : 8)
      .attr('font-size', (d: GraphNode) => d.type === 'center' ? '32px' : '22px')
      .attr('font-weight', (d: GraphNode) => d.type === 'center' ? 'bold' : 'normal')
      .attr('fill', (d: GraphNode) => d.type === 'center' ? 'hsl(var(--primary-foreground))' : '#1f2937');

    // Add HSK level badge
    node.filter((d: GraphNode) => !!(d.level && (d.type === 'center' || d.entry)))
      .append('circle')
      .attr('r', (d: GraphNode) => d.type === 'center' ? 16 : 12)
      .attr('cx', (d: GraphNode) => d.type === 'center' ? 32 : 22)
      .attr('cy', (d: GraphNode) => d.type === 'center' ? -32 : -22)
      .attr('fill', (d: GraphNode) => {
        const colors = ['#dcfce7', '#dbeafe', '#fef3c7', '#fce7f3', '#e0e7ff', '#f3e8ff', '#fee2e2', '#ccfbf1', '#e9d5ff'];
        return colors[(d.level || 1) - 1] || '#e5e7eb';
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    node.filter((d: GraphNode) => !!(d.level && (d.type === 'center' || d.entry)))
      .append('text')
      .text((d: GraphNode) => d.level?.toString() || '')
      .attr('x', (d: GraphNode) => d.type === 'center' ? 32 : 22)
      .attr('y', (d: GraphNode) => d.type === 'center' ? -26 : -17)
      .attr('text-anchor', 'middle')
      .attr('font-size', (d: GraphNode) => d.type === 'center' ? '14px' : '11px')
      .attr('font-weight', 'bold')
      .attr('fill', '#374151');

    // Add type indicator badge
    node.filter((d: GraphNode) => d.type !== 'center')
      .append('rect')
      .attr('x', -22)
      .attr('y', (d: GraphNode) => d.type === 'center' ? 40 : 28)
      .attr('width', 44)
      .attr('height', 16)
      .attr('rx', 8)
      .attr('fill', (d: GraphNode) => {
        switch (d.type) {
          case 'synonym': return '#22c55e';
          case 'antonym': return '#ef4444';
          case 'family': return '#3b82f6';
          default: return '#a855f7';
        }
      });

    node.filter((d: GraphNode) => d.type !== 'center')
      .append('text')
      .text((d: GraphNode) => d.type === 'family' ? 'fam' : d.type)
      .attr('text-anchor', 'middle')
      .attr('y', (d: GraphNode) => d.type === 'center' ? 51 : 39)
      .attr('font-size', '9px')
      .attr('font-weight', 'bold')
      .attr('fill', '#fff');

    // Click handler
    node.on('click', (event: PointerEvent, d: GraphNode) => {
      event.stopPropagation();
      setSelectedNode(d);

      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setSelectedNodePosition({
          left: Math.min(Math.max(event.clientX - rect.left - 140, 10), dimensions.width - 290),
          top: Math.min(Math.max(event.clientY - rect.top - 100, 10), dimensions.height - 250),
        });
      } else {
        setSelectedNodePosition(null);
      }

      if (d.entry && onNodeClick) {
        onNodeClick(d.entry);
      }
    });

    // Double-click handler
    node.on('dblclick', (event: PointerEvent, d: GraphNode) => {
      event.stopPropagation();
      if (d.entry && onNodeDoubleClick) {
        onNodeDoubleClick(d.entry);
      }
    });

    // Hover handlers
    node.on('mouseenter', (_event: PointerEvent, d: GraphNode) => {
      setHoveredNode(d);
    });

    node.on('mouseleave', () => {
      setHoveredNode(null);
    });

    // Update positions on tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: d3.SimulationLinkDatum<GraphNode>) => ((d.source as GraphNode).x || 0))
        .attr('y1', (d: d3.SimulationLinkDatum<GraphNode>) => ((d.source as GraphNode).y || 0))
        .attr('x2', (d: d3.SimulationLinkDatum<GraphNode>) => ((d.target as GraphNode).x || 0))
        .attr('y2', (d: d3.SimulationLinkDatum<GraphNode>) => ((d.target as GraphNode).y || 0));

      node.attr('transform', (d: GraphNode) => `translate(${d.x || 0},${d.y || 0})`);
    });

    return () => {
      simulation.stop();
    };
  }, [entry, relatedEntries, dimensions, onNodeClick, onNodeDoubleClick, buildGraphData, getFilteredNodes]);

  // Click outside to close popup
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setSelectedNode(null);
        setSelectedNodePosition(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleZoomIn = () => {
    const zoomBehavior = zoomBehaviorRef.current;
    if (!svgRef.current || !zoomBehavior) return;
    const svg = d3.select(svgRef.current);
    svg.transition().call(zoomBehavior.scaleBy, 1.2);
  };

  const handleZoomOut = () => {
    const zoomBehavior = zoomBehaviorRef.current;
    if (!svgRef.current || !zoomBehavior) return;
    const svg = d3.select(svgRef.current);
    svg.transition().call(zoomBehavior.scaleBy, 0.8);
  };

  const handleReset = () => {
    const zoomBehavior = zoomBehaviorRef.current;
    if (!svgRef.current || !zoomBehavior) return;
    const svg = d3.select(svgRef.current);
    svg.transition().call(zoomBehavior.transform, d3.zoomIdentity);
    setSelectedNode(null);
    setSelectedNodePosition(null);
  };

  const speakWord = (word: string) => {
    ttsService.speak(word);
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <Button variant="secondary" size="icon" onClick={handleZoomIn} className="h-8 w-8">
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button variant="secondary" size="icon" onClick={handleZoomOut} className="h-8 w-8">
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button variant="secondary" size="icon" onClick={handleReset} className="h-8 w-8">
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>
        
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[140px] h-8">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="synonym">Synonyms</SelectItem>
            <SelectItem value="antonym">Antonyms</SelectItem>
            <SelectItem value="family">Word Family</SelectItem>
            <SelectItem value="related">Related</SelectItem>
          </SelectContent>
        </Select>
        
        <div className="relative flex-1 min-w-[150px] max-w-[250px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Find in graph..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-8 pl-8"
          />
        </div>
      </div>

      {/* Graph */}
      <svg
        ref={svgRef}
        className="w-full bg-gradient-to-br from-muted/30 to-muted/50 rounded-lg border cursor-grab active:cursor-grabbing"
        style={{ minHeight: dimensions.height }}
      />
      
      {/* Legend */}
      <div className="absolute top-14 left-3 bg-background/95 backdrop-blur rounded-lg p-3 text-xs space-y-2 border shadow-md max-w-[150px]">
        <div className="font-semibold mb-2 text-sm">Relationship Types</div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-primary shadow-sm"></div>
          <span>Main Word</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-100 border-2 border-green-500"></div>
          <span>Synonym</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-100 border-2 border-red-500"></div>
          <span>Antonym</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-100 border-2 border-blue-500"></div>
          <span>Word Family</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-purple-100 border-2 border-purple-500"></div>
          <span>Related</span>
        </div>
        <div className="mt-2 pt-2 border-t text-muted-foreground text-[10px]">
          <div>• Click: View details</div>
          <div>• Double-click: Open word</div>
          <div>• Drag: Rearrange</div>
          <div>• Scroll: Zoom</div>
        </div>
      </div>

      {/* Selected Node Popup */}
      {selectedNode && selectedNodePosition && (
        <Card className="absolute z-50 w-72 shadow-xl animate-in fade-in zoom-in-95 duration-200"
          style={{
            left: selectedNodePosition.left,
            top: selectedNodePosition.top
          }}
        >
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="text-4xl font-bold">{selectedNode.label}</div>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                setSelectedNode(null);
                setSelectedNodePosition(null);
              }}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            {selectedNode.pinyin && (
              <div className="text-lg text-primary font-medium">{selectedNode.pinyin}</div>
            )}
            
            {selectedNode.definition && (
              <div className="text-sm text-muted-foreground line-clamp-2">{selectedNode.definition}</div>
            )}
            
            <div className="flex items-center gap-2">
              {selectedNode.level && (
                <Badge variant="secondary">HSK {selectedNode.level}</Badge>
              )}
              {selectedNode.type !== 'center' && (
                <Badge 
                  variant="outline"
                  className={`
                    ${selectedNode.type === 'synonym' ? 'border-green-500 text-green-600' : ''}
                    ${selectedNode.type === 'antonym' ? 'border-red-500 text-red-600' : ''}
                    ${selectedNode.type === 'family' ? 'border-blue-500 text-blue-600' : ''}
                    ${selectedNode.type === 'related' ? 'border-purple-500 text-purple-600' : ''}
                  `}
                >
                  {selectedNode.type === 'family' ? 'family' : selectedNode.type}
                </Badge>
              )}
            </div>
            
            <div className="flex gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={() => speakWord(selectedNode.label)}>
                <Volume2 className="w-4 h-4 mr-1" /> Listen
              </Button>
              {selectedNode.entry && onNodeDoubleClick && (
                <Button size="sm" onClick={() => onNodeDoubleClick(selectedNode.entry!)}>
                  Open Word
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hover Tooltip */}
      {hoveredNode && !selectedNode && (
        <div className="absolute z-40 bg-background/95 backdrop-blur px-3 py-2 rounded-lg shadow-lg border text-sm pointer-events-none"
          style={{
            left: Math.min((hoveredNode.x || 0) + 50, dimensions.width - 150),
            top: Math.max((hoveredNode.y || 0) - 30, 10)
          }}
        >
          <div className="font-bold">{hoveredNode.label}</div>
          {hoveredNode.pinyin && <div className="text-primary text-xs">{hoveredNode.pinyin}</div>}
          {hoveredNode.type !== 'center' && (
            <div className="text-xs text-muted-foreground capitalize">{hoveredNode.type}</div>
          )}
        </div>
      )}
    </div>
  );
};

export default WordGraph;
