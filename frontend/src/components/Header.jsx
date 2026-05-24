import React from 'react';
import { PlusCircle } from 'lucide-react';
import { layout, buttons, colors } from '../styles/shared';

const Header = ({ onAddClick }) => {
  return (
    <header style={layout.header}>
      <h1 style={{ fontWeight: 'bold', color: colors.textPrimary, margin: 0, fontSize: '24px' }}>
        Project Indexer
      </h1>
      <button
        onClick={onAddClick}
        style={buttons.primary}
        onMouseOver={(e) => { e.currentTarget.style.backgroundColor = colors.primaryHover; e.currentTarget.style.transform = 'translateY(-1px)'; }}
        onMouseOut={(e) => { e.currentTarget.style.backgroundColor = colors.primary; e.currentTarget.style.transform = 'translateY(0)'; }}
      >
        <PlusCircle size={18} />
        Add Project
      </button>
    </header>
  );
};

export default Header;
