import React, { useEffect, useRef } from 'react';
import { ParsedProfile } from '../utils/parseProfile';
import * as d3 from 'd3';
import { flamegraph } from 'd3-flame-graph';
import 'd3-flame-graph/dist/d3-flamegraph.css';

type Props = {
  profile: ParsedProfile | null;
  title: string;
};

export default function FlameGraphPanel({ profile, title }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (profile && containerRef.current) {
      console.log(`Rendering flame graph for ${title}:`, {
        totalDuration: profile.totalDuration,
        functionsCount: profile.functions.length,
        flamegraphData: profile.flamegraphData
      });

      const containerWidth = containerRef.current.clientWidth || 800;
      
      const flame = flamegraph()
        .width(containerWidth)
        .cellHeight(20)
        .transitionDuration(750)
        .minFrameSize(1)
        .title('')
        .tooltip(true)
        .sort(true)
        .inverted(true); // TRUE = Parents at top, children at bottom

      console.log('profile.flamegraphData', profile.flamegraphData);
      console.log('profile.functions', profile.functions);
      console.log('flame', flame);

      // Clear previous content
      d3.select(containerRef.current).selectAll('*').remove();
      
      // Render flame graph
      try {
        if (!profile.flamegraphData || (!profile.flamegraphData.children && profile.flamegraphData.value === 0)) {
          throw new Error('No flame graph data or all values are zero');
        }

        d3.select(containerRef.current)
          .datum(profile.flamegraphData)
          .call(flame);

        console.log(`Successfully rendered flame graph for ${title}`);
        
        // Add custom CSS to improve readability
        d3.select(containerRef.current)
          .selectAll('.d3-flame-graph rect')
          .style('stroke', '#fff')
          .style('stroke-width', '0.5px');
          
      } catch (error) {
        console.error('Error rendering flame graph:', error);
        d3.select(containerRef.current)
          .html(`
            <div class="text-red-500 p-4 border border-red-300 rounded bg-red-50">
              <h4 class="font-semibold">Error rendering flame graph</h4>
              <p class="text-sm mt-2">${error}</p>
              <details class="mt-2 text-xs">
                <summary class="cursor-pointer">Debug Info</summary>
                <pre class="mt-2 bg-gray-100 p-2 rounded text-black">${JSON.stringify({
                  totalDuration: profile.totalDuration,
                  functionsCount: profile.functions.length,
                  sampleFunctions: profile.functions.slice(0, 3).map(f => ({
                    name: f.name,
                    selfTime: f.selfTime,
                    totalTime: f.totalTime
                  })),
                  flamegraphStructure: {
                    name: profile.flamegraphData?.name,
                    value: profile.flamegraphData?.value,
                    childrenCount: profile.flamegraphData?.children?.length || 0
                  }
                }, null, 2)}</pre>
              </details>
            </div>
          `);
      }
    }
  }, [profile, title]);

  if (!profile) {
    return (
      <div className="h-[600px] flex items-center justify-center bg-gray-50 rounded border-2 border-dashed border-gray-300">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">{title}</h2>
          <p className="text-gray-500">No profile loaded</p>
          <p className="text-xs text-gray-400 mt-2">Upload a .cpuprofile file to view the flame graph</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-700">{title}</h2>
        <div className="text-sm text-gray-500">
          {profile.totalDuration.toFixed(2)}ms • {profile.functions.length} functions
        </div>
      </div>
      
      {/* Instructions */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start space-x-2">
          <div className="text-blue-600 mt-0.5">ℹ️</div>
          <div className="text-sm text-blue-800">
            <p className="font-medium">How to navigate:</p>
            <p>• <strong>Top sections</strong> = High-level parent functions</p>
            <p>• <strong>Bottom sections</strong> = Detailed child calls</p>
            <p>• <strong>Click</strong> on any segment to zoom in • <strong>Right-click</strong> to zoom out</p>
          </div>
        </div>
      </div>
      
      {/* Fixed Size Flame Graph Container with Scroll */}
      <div className="bg-white border rounded-lg">
        <div className="h-[600px] overflow-auto">
          <div className="p-4">
            <div 
              ref={containerRef} 
              className="flame-graph-container"
              style={{ minHeight: '500px', width: '100%' }}
            />
          </div>
        </div>
      </div>
      
      {/* Debug Information - Collapsible */}
      <details className="mt-4">
        <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
          📊 Profile Details & Top Functions
        </summary>
        <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm max-h-64 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">Profile Statistics</h4>
              <p>Total Duration: {profile.totalDuration.toFixed(2)}ms</p>
              <p>Total Functions: {profile.functions.length}</p>
              <p>Root Function: {profile.flamegraphData?.name || 'Unknown'}</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">Top Functions by Self Time</h4>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {profile.functions
                  .sort((a, b) => (b.selfTime || 0) - (a.selfTime || 0))
                  .slice(0, 8)
                  .map((func, i) => (
                    <div key={i} className="text-xs">
                      <span className="font-mono text-blue-600">
                        {((func.selfTime || 0) / 1000).toFixed(2)}ms
                      </span>
                      <span className="ml-2 text-gray-600">
                        {func.name.length > 60 ? func.name.slice(0, 60) + '...' : func.name}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </details>
    </div>
  );
}
