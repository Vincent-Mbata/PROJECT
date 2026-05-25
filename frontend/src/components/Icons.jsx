// Shared inline SVG icons — replaces lucide-react to avoid Vite ESM resolution issues
import React from 'react';

const svgProps = (size) => ({
  width: size, height: size, viewBox: '0 0 24 24',
  fill: 'none', stroke: 'currentColor', strokeWidth: 2,
  strokeLinecap: 'round', strokeLinejoin: 'round',
  style: { display: 'inline-block', verticalAlign: 'middle' },
});

export const PlusCircleIcon = ({ size = 18 }) => (
  <svg {...svgProps(size)}>
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
  </svg>
);

export const XIcon = ({ size = 18 }) => (
  <svg {...svgProps(size)}>
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export const SearchIcon = ({ size = 18 }) => (
  <svg {...svgProps(size)}>
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

export const Edit2Icon = ({ size = 18 }) => (
  <svg {...svgProps(size)}>
    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
  </svg>
);

export const Trash2Icon = ({ size = 18 }) => (
  <svg {...svgProps(size)}>
    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

export const EyeIcon = ({ size = 18 }) => (
  <svg {...svgProps(size)}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
  </svg>
);
