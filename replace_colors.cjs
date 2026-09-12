const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

const replacements = [
  { from: /bg-\[\#0a0a0a\]/g, to: 'bg-slate-100' },
  { from: /bg-\[\#111111\]/g, to: 'bg-white' },
  { from: /bg-\[\#1a1a1a\]/g, to: 'bg-slate-50' },
  { from: /bg-\[\#1f1f1f\]/g, to: 'bg-slate-50' },
  { from: /border-\[\#2a2a2a\]/g, to: 'border-slate-200' },
  { from: /border-\[\#333333\]/g, to: 'border-slate-200' },
  { from: /border-\[\#444444\]/g, to: 'border-slate-300' },
  { from: /text-\[\#cccccc\]/g, to: 'text-slate-700' },
  { from: /text-\[\#aaaaaa\]/g, to: 'text-slate-600' },
  { from: /text-\[\#888888\]/g, to: 'text-slate-500' },
  { from: /text-gray-300/g, to: 'text-slate-700' },
  { from: /text-gray-500/g, to: 'text-slate-500' },
  { from: /text-white/g, to: 'text-slate-800' },
  { from: /bg-\[\#24d38b\]/g, to: 'bg-blue-600' },
  { from: /text-\[\#24d38b\]/g, to: 'text-blue-600' },
  { from: /border-\[\#24d38b\]/g, to: 'border-blue-500' },
  { from: /ring-\[\#24d38b\]/g, to: 'ring-blue-500' },
  { from: /hover:bg-\[\#1fb879\]/g, to: 'hover:bg-blue-700' },
  { from: /hover:bg-\[\#222222\]/g, to: 'hover:bg-slate-100' },
  { from: /hover:text-white/g, to: 'hover:text-slate-900' },
  { from: /hover:text-\[\#cccccc\]/g, to: 'hover:text-slate-800' },
  { from: /fill-black/g, to: 'fill-white' },
];

replacements.forEach(r => {
  content = content.replace(r.from, r.to);
});

// Manual correction: The 'text-black' class was changed manually in some spots, so let's fix it globally inside green/blue buttons
content = content.replace(/bg-blue-600 text-black/g, 'bg-blue-600 text-white');
content = content.replace(/bg-blue-600 hover:bg-blue-700 text-black/g, 'bg-blue-600 hover:bg-blue-700 text-white');

fs.writeFileSync('src/App.tsx', content);
console.log('Colors replaced successfully!');
