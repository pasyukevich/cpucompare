import React, { useState } from 'react';
import FileUploader from './components/FileUploader';
import FlameGraphPanel from './components/FlameGraphPanel';
import ComparisonPanel from './components/ComparisonPanel';
import { ParsedProfile, parseCpuProfile, compareProfiles, ProfileComparison } from './utils/parseProfile';

export default function App() {
  const [leftProfile, setLeftProfile] = useState<ParsedProfile | null>(null);
  const [rightProfile, setRightProfile] = useState<ParsedProfile | null>(null);
  const [comparison, setComparison] = useState<ProfileComparison | null>(null);

  const handleUpload = async (file: File, side: 'left' | 'right') => {
    try {
      console.log(`Uploading ${side} profile: ${file.name} (${file.size} bytes)`);
      
      const text = await file.text();
      console.log(`Read file text, length: ${text.length}`);
      
      const json = JSON.parse(text);
      console.log(`Parsed JSON:`, {
        keys: Object.keys(json),
        samplesCount: json.samples?.length,
        stackFramesCount: Object.keys(json.stackFrames || {}).length,
        nodesCount: json.nodes?.length,
        hasTimeDeltas: !!json.timeDeltas
      });
      
      const parsed = parseCpuProfile(json);
      console.log(`Parsed profile for ${side}:`, {
        totalDuration: parsed.totalDuration,
        functionsCount: parsed.functions.length,
        flamegraphData: parsed.flamegraphData
      });
      
      if (side === 'left') {
        setLeftProfile(parsed);
        if (rightProfile) {
          console.log('Comparing profiles...');
          setComparison(compareProfiles(parsed, rightProfile));
        }
      } else {
        setRightProfile(parsed);
        if (leftProfile) {
          console.log('Comparing profiles...');
          setComparison(compareProfiles(leftProfile, parsed));
        }
      }
    } catch (error) {
      console.error(`Error uploading ${side} profile:`, error);
      alert(`Error uploading ${side} profile: ${error}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-3xl font-bold text-gray-800">CPU Profile Comparator</h1>
          <p className="text-gray-600 mt-1">Compare CPU profiles side-by-side • Parents at top, children at bottom</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        
        {/* Upload Section - Compact */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Upload Profiles</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <FileUploader onUpload={(file) => handleUpload(file, 'left')} label="Left Profile (Baseline)" />
              {leftProfile && (
                <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                  ✅ <strong>{leftProfile.totalDuration.toFixed(2)}ms</strong> • {leftProfile.functions.length} functions
                </div>
              )}
            </div>
            
            <div className="space-y-3">
              <FileUploader onUpload={(file) => handleUpload(file, 'right')} label="Right Profile (Comparison)" />
              {rightProfile && (
                <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                  ✅ <strong>{rightProfile.totalDuration.toFixed(2)}ms</strong> • {rightProfile.functions.length} functions
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Flame Graphs - Fixed Height Side by Side */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <FlameGraphPanel profile={leftProfile} title="Left Profile (Baseline)" />
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <FlameGraphPanel profile={rightProfile} title="Right Profile (Comparison)" />
          </div>
        </div>

        {/* Comparison Results */}
        {comparison && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <ComparisonPanel comparison={comparison} />
          </div>
        )}

        {/* Quick Help - Only show when no profiles loaded */}
        {!leftProfile && !rightProfile && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-800 mb-3">🚀 Getting Started</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-blue-700">
              <div>
                <h4 className="font-semibold mb-2">Supported Formats:</h4>
                <ul className="space-y-1">
                  <li>• Chrome DevTools CPU profiles (.cpuprofile)</li>
                  <li>• React Native/Hermes profiles</li>
                  <li>• V8 profiler output</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">How to Use:</h4>
                <ul className="space-y-1">
                  <li>• Upload your baseline profile on the left</li>
                  <li>• Upload comparison profile on the right</li>
                  <li>• Top = High-level functions, Bottom = Details</li>
                  <li>• Click segments to zoom, right-click to zoom out</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
