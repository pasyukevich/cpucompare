import React from 'react';
import { ProfileComparison } from '../utils/parseProfile';

type Props = {
  comparison: ProfileComparison;
};

export default function ComparisonPanel({ comparison }: Props) {
  const formatTime = (ms: number) => `${ms.toFixed(2)}ms`;
  const formatDiff = (diff: number) => {
    const sign = diff > 0 ? '+' : '';
    return `${sign}${formatTime(diff)}`;
  };

  const getDiffColor = (diff: number) => {
    if (diff > 0) return 'text-red-600'; // Slower/worse
    if (diff < 0) return 'text-green-600'; // Faster/better
    return 'text-gray-600'; // No change
  };

  const getDiffBgColor = (diff: number) => {
    if (diff > 0) return 'bg-red-50'; // Slower/worse
    if (diff < 0) return 'bg-green-50'; // Faster/better
    return 'bg-gray-50'; // No change
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'added': return 'bg-blue-100 text-blue-800';
      case 'removed': return 'bg-red-100 text-red-800';
      case 'changed': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Profile Comparison</h2>
      
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-gray-50 rounded">
          <h3 className="font-semibold text-gray-700">Total Duration</h3>
          <p className="text-sm text-gray-600">
            Left: {formatTime(comparison.leftTotalDuration)}
          </p>
          <p className="text-sm text-gray-600">
            Right: {formatTime(comparison.rightTotalDuration)}
          </p>
          <p className={`text-sm font-medium ${getDiffColor(comparison.totalDurationDiff)}`}>
            Difference: {formatDiff(comparison.totalDurationDiff)}
          </p>
        </div>
        
        <div className="p-4 bg-gray-50 rounded">
          <h3 className="font-semibold text-gray-700">Function Changes</h3>
          <p className="text-sm text-gray-600">
            Total: {comparison.differences.length}
          </p>
          <p className="text-sm text-blue-600">
            Added: {comparison.differences.filter(d => d.type === 'added').length}
          </p>
          <p className="text-sm text-red-600">
            Removed: {comparison.differences.filter(d => d.type === 'removed').length}
          </p>
          <p className="text-sm text-yellow-600">
            Changed: {comparison.differences.filter(d => d.type === 'changed').length}
          </p>
        </div>
        
        <div className="p-4 bg-gray-50 rounded">
          <h3 className="font-semibold text-gray-700">Performance Impact</h3>
          <p className={`text-sm font-medium ${getDiffColor(comparison.totalDurationDiff)}`}>
            {comparison.totalDurationDiff > 0 ? 'Slower' : comparison.totalDurationDiff < 0 ? 'Faster' : 'No change'}
          </p>
          <p className="text-sm text-gray-600">
            {comparison.totalDurationDiff !== 0 && 
              `${Math.abs(comparison.totalDurationDiff / comparison.leftTotalDuration * 100).toFixed(1)}%`
            }
          </p>
        </div>
      </div>

      {/* Detailed Differences */}
      <div>
        <h3 className="text-lg font-semibold mb-4 text-gray-800">Function Details</h3>
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-2 text-left">Function</th>
                <th className="px-4 py-2 text-left">Type</th>
                <th className="px-4 py-2 text-right">Left (ms)</th>
                <th className="px-4 py-2 text-right">Right (ms)</th>
                <th className="px-4 py-2 text-right">Difference</th>
              </tr>
            </thead>
            <tbody>
              {comparison.differences.slice(0, 50).map((diff, index) => (
                <tr key={index} className={getDiffBgColor(diff.selfTimeDiff)}>
                  <td className="px-4 py-2 truncate max-w-xs" title={diff.name}>
                    {diff.name}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 rounded text-xs ${getTypeColor(diff.type)}`}>
                      {diff.type}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    {diff.leftSelfTime > 0 ? formatTime(diff.leftSelfTime) : '-'}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {diff.rightSelfTime > 0 ? formatTime(diff.rightSelfTime) : '-'}
                  </td>
                  <td className={`px-4 py-2 text-right font-medium ${getDiffColor(diff.selfTimeDiff)}`}>
                    {formatDiff(diff.selfTimeDiff)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {comparison.differences.length > 50 && (
            <div className="text-center py-4 text-sm text-gray-500">
              Showing top 50 differences out of {comparison.differences.length} total
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 
