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
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">CPU Profile Comparator</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <FileUploader onUpload={(file) => handleUpload(file, 'left')} label="Upload Left Profile" />
          {leftProfile && (
            <div className="mt-4 p-4 bg-gray-50 rounded">
              <h3 className="font-semibold text-gray-700">Profile Statistics</h3>
              <p className="text-sm text-gray-600">Total Duration: {leftProfile.totalDuration.toFixed(2)}ms</p>
              <p className="text-sm text-gray-600">Functions: {leftProfile.functions.length}</p>
            </div>
          )}
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-6">
          <FileUploader onUpload={(file) => handleUpload(file, 'right')} label="Upload Right Profile" />
          {rightProfile && (
            <div className="mt-4 p-4 bg-gray-50 rounded">
              <h3 className="font-semibold text-gray-700">Profile Statistics</h3>
              <p className="text-sm text-gray-600">Total Duration: {rightProfile.totalDuration.toFixed(2)}ms</p>
              <p className="text-sm text-gray-600">Functions: {rightProfile.functions.length}</p>
            </div>
          )}
        </div>
      </div>

      {comparison && (
        <div className="mb-8">
          <ComparisonPanel comparison={comparison} />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <FlameGraphPanel profile={leftProfile} title="Left Profile" />
        </div>
        <div className="bg-white rounded-lg shadow-lg p-6">
          <FlameGraphPanel profile={rightProfile} title="Right Profile" />
        </div>
      </div>
    </div>
  );
}
