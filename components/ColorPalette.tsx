import React from 'react';

interface ColorPaletteProps {
  colors: Record<string, string>;
}

export const ColorPalette: React.FC<ColorPaletteProps> = ({ colors }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Object.entries(colors).map(([name, hex]) => (
        <div key={name} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <div className="h-24" style={{ backgroundColor: hex }}></div>
          <div className="p-3 bg-white dark:bg-gray-800">
            <p className="font-semibold capitalize text-gray-800 dark:text-gray-100">{name}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-mono uppercase">{hex}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
