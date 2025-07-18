import React from 'react';

type Props = {
  onUpload: (file: File) => void;
  label: string;
};

export default function FileUploader({ onUpload, label }: Props) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type="file"
        accept=".cpuprofile,.json"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
        }}
      />
    </div>
  );
}