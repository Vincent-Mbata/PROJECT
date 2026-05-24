import React from 'react';
import { Search } from 'lucide-react';
import { layout, form, modal, buttons, colors } from '../styles/shared';
import { WARDS } from '../data/wards';

const FilterBar = ({ filters, setFilters, clearFilters, subCounties, projects }) => {
  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div style={layout.filterBar}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1 1 300px' }}>
        <label style={form.label}>Search Projects</label>
        <div style={form.searchWrapper}>
          {filters.search.length === 0 && (
            <Search size={16} style={{ position: 'absolute', left: '8px', color: colors.textSecondary, pointerEvents: 'none' }} />
          )}
          <input
            type="text"
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            placeholder="Search by title or description..."
            style={{
              ...form.searchInput,
              padding: filters.search.length > 0 ? '8px' : '8px 8px 8px 32px',
            }}
          />
        </div>
      </div>

      <div style={modal.fieldGroup}>
        <label style={form.label}>Sub-County</label>
        <select
          value={filters.subCounty}
          onChange={(e) => {
            updateFilter('subCounty', e.target.value);
            updateFilter('area', 'All');
          }}
          style={{ ...form.select, minWidth: '150px' }}
        >
          <option value="All">All Sub-Counties</option>
          {subCounties.map(sc => <option key={sc} value={sc}>{sc}</option>)}
        </select>
      </div>

      <div style={modal.fieldGroup}>
        <label style={form.label}>Ward Area</label>
        <select
          value={filters.area}
          onChange={(e) => updateFilter('area', e.target.value)}
          style={{ ...form.select, minWidth: '150px' }}
        >
          <option value="All">All Wards</option>
          {filters.subCounty !== 'All'
            ? WARDS.filter(w => w.subCounty === filters.subCounty).map(w => <option key={w.name} value={w.name}>{w.name}</option>)
            : filters.availableAreas.map(area => <option key={area} value={area}>{area}</option>)
          }
        </select>
      </div>

      <div style={modal.fieldGroup}>
        <label style={form.label}>Category</label>
        <select
          value={filters.category}
          onChange={(e) => updateFilter('category', e.target.value)}
          style={{ ...form.select, minWidth: '150px' }}
        >
          <option value="All">All Categories</option>
          <option value="Works">Works</option>
          <option value="Equipment">Equipment</option>
          <option value="Both Works and Equipment">Both</option>
        </select>
      </div>

      <div style={modal.fieldGroup}>
        <label style={form.label}>Status</label>
        <select
          value={filters.status}
          onChange={(e) => updateFilter('status', e.target.value)}
          style={{ ...form.select, minWidth: '150px' }}
        >
          <option value="All">All Statuses</option>
          <option value="Ongoing">Ongoing</option>
          <option value="Completed">Completed</option>
          <option value="On Hold">On Hold</option>
          <option value="Planning">Planning</option>
        </select>
      </div>

      <div style={modal.fieldGroup}>
        <label style={form.label}>Project Type</label>
        <select
          value={filters.type}
          onChange={(e) => updateFilter('type', e.target.value)}
          style={{ ...form.select, minWidth: '150px' }}
        >
          <option value="All">All Types</option>
          {filters.availableTypes.map(type => <option key={type} value={type}>{type}</option>)}
        </select>
      </div>

      <button
        onClick={clearFilters}
        style={{ ...buttons.ghost, marginTop: '20px' }}
        onMouseOver={(e) => { e.currentTarget.style.backgroundColor = colors.surfaceHover; e.currentTarget.style.color = colors.textPrimary; }}
        onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = colors.textSecondary; }}
      >
        Clear Filters
      </button>
    </div>
  );
};

export default FilterBar;
