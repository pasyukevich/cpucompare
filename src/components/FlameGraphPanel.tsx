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

      const flame = flamegraph()
        .width(containerRef.current.clientWidth || 600)
        .cellHeight(18)
        .transitionDuration(750)
        .minFrameSize(1)
        .title('')
        .tooltip(true)
        .sort(true)
        .inverted(false);

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
      <div className="h-64 flex items-center justify-center bg-gray-50 rounded border-2 border-dashed border-gray-300">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">{title}</h2>
          <p className="text-gray-500">No profile loaded</p>
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
      
      <div className="bg-white border rounded-lg p-4">
        <div 
          ref={containerRef} 
          className="flame-graph-container"
          style={{ minHeight: '300px' }}
        />
      </div>
      
      <div className="mt-4 text-xs text-gray-500">
        <p>Click on segments to zoom in, right-click to zoom out</p>
        <details className="mt-2">
          <summary className="cursor-pointer">Debug Information</summary>
          <div className="mt-2 p-2 bg-gray-100 rounded text-black">
            <p>Total Duration: {profile.totalDuration.toFixed(2)}ms</p>
            <p>Functions: {profile.functions.length}</p>
            <p>Top functions by self time:</p>
            <ul className="ml-4 text-xs">
              {profile.functions
                .sort((a, b) => (b.selfTime || 0) - (a.selfTime || 0))
                .slice(0, 5)
                .map((func, i) => (
                  <li key={i}>
                    {func.name.slice(0, 50)}... - {((func.selfTime || 0) / 1000).toFixed(2)}ms
                  </li>
                ))}
            </ul>
          </div>
        </details>
      </div>
    </div>
  );
}
