export type ParsedProfile = {
  flamegraphData: any;
  totalDuration: number;
  functions: FunctionData[];
};

export type FunctionData = {
  id: string;
  name: string;
  selfTime: number;
  totalTime: number;
  category: string;
  parent?: string;
  children: string[];
};

export function parseCpuProfile(json: any): ParsedProfile {
  // Handle Chrome Trace Event format (Hermes/React Native profiler)
  if (json.samples && json.stackFrames) {
    return parseTraceEventProfile(json);
  }
  
  // Handle Chrome DevTools CPU profile format
  if (json.nodes && json.samples && json.timeDeltas) {
    return parseV8Profile(json);
  }
  
  // Handle other formats if needed
  return {
    flamegraphData: json,
    totalDuration: 0,
    functions: []
  };
}

function parseTraceEventProfile(profile: any): ParsedProfile {
  const samples = profile.samples || [];
  const stackFrames = profile.stackFrames || {};
  
  console.log(`Parsing trace profile with ${samples.length} samples and ${Object.keys(stackFrames).length} stack frames`);
  
  // Build function map from stack frames
  const functionMap = new Map<string, FunctionData>();
  
  // Parse stack frames
  Object.entries(stackFrames).forEach(([frameId, frame]: [string, any]) => {
    const functionName = frame.name || '(anonymous)';
    const category = frame.category || 'Unknown';
    
    functionMap.set(frameId, {
      id: frameId,
      name: functionName,
      selfTime: 0,
      totalTime: 0,
      category,
      parent: frame.parent ? frame.parent.toString() : undefined,
      children: []
    });
  });
  
  // Build parent-child relationships
  functionMap.forEach((func, id) => {
    if (func.parent && functionMap.has(func.parent)) {
      const parent = functionMap.get(func.parent)!;
      parent.children.push(id);
    }
  });
  
  // Calculate timing information from samples
  let totalDuration = 0;
  let firstTimestamp = Infinity;
  let lastTimestamp = 0;
  
  // Calculate time span from samples
  samples.forEach((sample: any) => {
    const timestamp = parseInt(sample.ts);
    firstTimestamp = Math.min(firstTimestamp, timestamp);
    lastTimestamp = Math.max(lastTimestamp, timestamp);
  });
  
  totalDuration = lastTimestamp - firstTimestamp;
  const averageSampleInterval = samples.length > 1 ? totalDuration / (samples.length - 1) : totalDuration;
  
  console.log(`Time calculation: total=${totalDuration}μs, avgInterval=${averageSampleInterval}μs, samples=${samples.length}`);
  
  // Count samples for each stack frame (self time)
  const sampleCounts = new Map<string, number>();
  
  samples.forEach((sample: any) => {
    const frameId = sample.sf?.toString();
    const weight = parseInt(sample.weight) || 1;
    
    if (frameId && functionMap.has(frameId)) {
      sampleCounts.set(frameId, (sampleCounts.get(frameId) || 0) + weight);
    }
  });
  
  // Calculate self time for each frame
  functionMap.forEach((func, frameId) => {
    const samples = sampleCounts.get(frameId) || 0;
    func.selfTime = samples * averageSampleInterval;
  });
  
  // Calculate total time (self time + children time) using bottom-up approach
  const visited = new Set<string>();
  
  function calculateTotalTime(frameId: string): number {
    if (visited.has(frameId)) {
      return functionMap.get(frameId)?.totalTime || 0;
    }
    
    visited.add(frameId);
    const func = functionMap.get(frameId);
    if (!func) return 0;
    
    // Total time = self time + sum of children's total time
    let totalTime = func.selfTime;
    for (const childId of func.children) {
      totalTime += calculateTotalTime(childId);
    }
    
    func.totalTime = totalTime;
    return totalTime;
  }
  
  // Calculate total time for all root frames
  functionMap.forEach((func, frameId) => {
    if (!func.parent || !functionMap.has(func.parent)) {
      calculateTotalTime(frameId);
    }
  });
  
  // Log some debug info
  const topFunctions = Array.from(functionMap.values())
    .sort((a, b) => b.selfTime - a.selfTime)
    .slice(0, 5);
    
  console.log('Top functions by self time:', topFunctions.map(f => ({
    name: f.name.slice(0, 50),
    selfTime: f.selfTime / 1000,
    totalTime: f.totalTime / 1000
  })));
  
  // Convert to flame graph format
  const flamegraphData = buildFlameGraphFromTraceData(functionMap);
  
  console.log(`Parsed profile: ${totalDuration}μs total, ${functionMap.size} functions`);
  
  return {
    flamegraphData,
    totalDuration: totalDuration / 1000, // Convert microseconds to milliseconds
    functions: Array.from(functionMap.values())
  };
}

function buildFlameGraphFromTraceData(functionMap: Map<string, FunctionData>): any {
  // Find root frames (frames with no parent or parent doesn't exist)
  const rootFrames = Array.from(functionMap.values()).filter(
    func => !func.parent || !functionMap.has(func.parent)
  );
  
  console.log(`Found ${rootFrames.length} root frames`);
  
  if (rootFrames.length === 0) {
    return { name: 'Root', value: 0, children: [] };
  }
  
  // Build tree structure
  function buildNode(frameId: string): any {
    const func = functionMap.get(frameId);
    if (!func) {
      return { name: 'Unknown', value: 0, children: [] };
    }
    
    const children = func.children
      .map(buildNode)
      .filter(child => child.value > 0 || child.children.length > 0) // Include nodes with time or children
      .sort((a, b) => b.value - a.value); // Sort children by value (largest first)
    
    // Clean up function name for display
    let displayName = func.name;
    if (displayName.includes('http://localhost:')) {
      const parts = displayName.split('(');
      if (parts.length > 1) {
        const urlPart = parts[1];
        const filename = urlPart.split('/').pop()?.split(':')[0] || 'unknown';
        displayName = `${parts[0].trim()} (${filename})`;
      }
    }
    
    // For flame graphs, use total time to show the full hierarchy
    // This ensures high-level functions appear prominently at the top
    const value = Math.max(0, func.totalTime / 1000); // Convert microseconds to milliseconds
    
    return {
      name: displayName,
      value,
      children
    };
  }
  
  // Build all root nodes and sort by total time
  const rootNodes = rootFrames
    .map(frame => buildNode(frame.id))
    .filter(child => child.value > 0 || child.children.length > 0)
    .sort((a, b) => b.value - a.value); // Sort by value (largest first)
  
  // If single root, return it directly
  if (rootNodes.length === 1) {
    const result = rootNodes[0];
    console.log('Single root flame graph:', { 
      name: result.name, 
      value: result.value, 
      childrenCount: result.children.length 
    });
    return result;
  }
  
  // Multiple roots - find the largest one as main root
  if (rootNodes.length > 0) {
    // If there's a clear main root (much larger than others), use it
    const mainRoot = rootNodes[0];
    const secondLargest = rootNodes[1]?.value || 0;
    
    if (mainRoot.value > secondLargest * 2) {
      console.log('Using main root:', { 
        name: mainRoot.name, 
        value: mainRoot.value, 
        childrenCount: mainRoot.children.length 
      });
      return mainRoot;
    }
  }
  
  // Multiple significant roots, create artificial root
  const result = {
    name: 'Profile Root',
    value: 0,
    children: rootNodes
  };
  
  console.log('Multi-root flame graph:', { childrenCount: result.children.length });
  return result;
}

function parseV8Profile(profile: any): ParsedProfile {
  const nodes = profile.nodes || [];
  const samples = profile.samples || [];
  const timeDeltas = profile.timeDeltas || [];
  const startTime = profile.startTime || 0;
  const endTime = profile.endTime || 0;
  
  // Build function map
  const functionMap = new Map<number, FunctionData>();
  
  // Parse nodes
  nodes.forEach((node: any, index: number) => {
    const callFrame = node.callFrame || {};
    const functionName = callFrame.functionName || '(anonymous)';
    const scriptId = callFrame.scriptId || '';
    const url = callFrame.url || '';
    const lineNumber = callFrame.lineNumber || 0;
    const columnNumber = callFrame.columnNumber || 0;
    
    let displayName = functionName;
    if (url) {
      const urlParts = url.split('/');
      const filename = urlParts[urlParts.length - 1];
      displayName = `${functionName} (${filename}:${lineNumber}:${columnNumber})`;
    }
    
    functionMap.set(node.id, {
      id: node.id.toString(),
      name: displayName,
      selfTime: 0,
      totalTime: 0,
      category: 'JavaScript',
      children: node.children || []
    });
  });
  
  // Calculate timing information from samples
  let totalDuration = 0;
  samples.forEach((nodeId: number, index: number) => {
    const timeDelta = timeDeltas[index] || 0;
    totalDuration += timeDelta;
    
    const func = functionMap.get(nodeId);
    if (func) {
      func.selfTime += timeDelta;
      func.totalTime += timeDelta;
    }
  });
  
  // Convert to flame graph format
  const flamegraphData = buildFlameGraphData(functionMap, nodes);
  
  return {
    flamegraphData,
    totalDuration,
    functions: Array.from(functionMap.values())
  };
}

function buildFlameGraphData(functionMap: Map<number, FunctionData>, nodes: any[]): any {
  // Find root nodes (nodes with no parent)
  const rootNodes = nodes.filter(node => 
    !nodes.some(other => other.children && other.children.includes(node.id))
  );
  
  if (rootNodes.length === 0) {
    return { name: 'Root', value: 0, children: [] };
  }
  
  // Build tree structure
  function buildNode(nodeId: number): any {
    const func = functionMap.get(nodeId);
    if (!func) {
      return { name: 'Unknown', value: 0, children: [] };
    }
    
    const node = nodes.find(n => n.id === nodeId);
    const children = (node?.children || []).map(buildNode);
    
    return {
      name: func.name,
      value: func.selfTime,
      children
    };
  }
  
  // If single root, return it directly
  if (rootNodes.length === 1) {
    return buildNode(rootNodes[0].id);
  }
  
  // Multiple roots, create artificial root
  return {
    name: 'Root',
    value: 0,
    children: rootNodes.map(node => buildNode(node.id))
  };
}

export function compareProfiles(left: ParsedProfile, right: ParsedProfile): ProfileComparison {
  const leftFunctions = new Map(left.functions.map(f => [f.name, f]));
  const rightFunctions = new Map(right.functions.map(f => [f.name, f]));
  
  const differences: FunctionDifference[] = [];
  
  // Compare functions that exist in both profiles
  for (const [name, leftFunc] of leftFunctions) {
    const rightFunc = rightFunctions.get(name);
    if (rightFunc) {
      const selfTimeDiff = rightFunc.selfTime - leftFunc.selfTime;
      const totalTimeDiff = rightFunc.totalTime - leftFunc.totalTime;
      
      if (Math.abs(selfTimeDiff) > 0.01 || Math.abs(totalTimeDiff) > 0.01) {
        differences.push({
          name,
          type: 'changed',
          leftSelfTime: leftFunc.selfTime / 1000, // Convert to ms
          rightSelfTime: rightFunc.selfTime / 1000,
          leftTotalTime: leftFunc.totalTime / 1000,
          rightTotalTime: rightFunc.totalTime / 1000,
          selfTimeDiff: selfTimeDiff / 1000,
          totalTimeDiff: totalTimeDiff / 1000
        });
      }
    } else {
      differences.push({
        name,
        type: 'removed',
        leftSelfTime: leftFunc.selfTime / 1000,
        rightSelfTime: 0,
        leftTotalTime: leftFunc.totalTime / 1000,
        rightTotalTime: 0,
        selfTimeDiff: -leftFunc.selfTime / 1000,
        totalTimeDiff: -leftFunc.totalTime / 1000
      });
    }
  }
  
  // Functions that only exist in the right profile
  for (const [name, rightFunc] of rightFunctions) {
    if (!leftFunctions.has(name)) {
      differences.push({
        name,
        type: 'added',
        leftSelfTime: 0,
        rightSelfTime: rightFunc.selfTime / 1000,
        leftTotalTime: 0,
        rightTotalTime: rightFunc.totalTime / 1000,
        selfTimeDiff: rightFunc.selfTime / 1000,
        totalTimeDiff: rightFunc.totalTime / 1000
      });
    }
  }
  
  // Sort by impact (absolute self time difference)
  differences.sort((a, b) => Math.abs(b.selfTimeDiff) - Math.abs(a.selfTimeDiff));
  
  return {
    leftTotalDuration: left.totalDuration,
    rightTotalDuration: right.totalDuration,
    totalDurationDiff: right.totalDuration - left.totalDuration,
    differences
  };
}

export type ProfileComparison = {
  leftTotalDuration: number;
  rightTotalDuration: number;
  totalDurationDiff: number;
  differences: FunctionDifference[];
};

export type FunctionDifference = {
  name: string;
  type: 'added' | 'removed' | 'changed';
  leftSelfTime: number;
  rightSelfTime: number;
  leftTotalTime: number;
  rightTotalTime: number;
  selfTimeDiff: number;
  totalTimeDiff: number;
};
