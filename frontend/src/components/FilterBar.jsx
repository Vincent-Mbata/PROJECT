import React from 'react';
import { SearchIcon } from './Icons';
import { layout, form, modal, buttons, colors, type } from '../styles/shared';
import { WARDS } from '../data/wards';

const FilterBar = ({ filters, setFilters, clearFilters, subCounties, projects, activeFilterCount }) => {
    const updateFilter = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    return (
        <div style={layout.filterBar}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1 1 300px' }}>
                <label style={form.input ? { ...type.sm, color: colors.textSecondary, fontWeight: 500 } : undefined}>
                    Search Projects
                </label>
                <div style={form.searchWrapper}>
                    <SearchIcon size={16} style={{
                        position: 'absolute', left: '10px',
                        color: colors.textMuted, pointerEvents: 'none',
                    }} />
                    <input
                        type="text"
                        value={filters.search}
                        onChange={(e) => updateFilter('search', e.target.value)}
                        placeholder="Search by title or description..."
                        aria-label="Search projects"
                        style={form.searchInput}
                    />
                </div>
            </div>

            <div style={modal.fieldGroup}>
                <label style={modal.label}>Sub-County</label>
                <select
                    value={filters.subCounty}
                    onChange={(e) => {
                        updateFilter('subCounty', e.target.value);
                        updateFilter('area', 'All');
                    }}
                    aria-label="Filter by sub-county"
                    style={{ ...form.select, minWidth: '150px' }}
                >
                    <option value="All">All Sub-Counties</option>
                    {subCounties.map(sc => <option key={sc} value={sc}>{sc}</option>)}
                </select>
            </div>

            <div style={modal.fieldGroup}>
                <label style={modal.label}>Ward Area</label>
                <select
                    value={filters.area}
                    onChange={(e) => updateFilter('area', e.target.value)}
                    aria-label="Filter by ward area"
                    style={{ ...form.select, minWidth: '150px' }}
                >
                    <option value="All">All Wards</option>
                    {filters.subCounty !== 'All'
                        ? WARDS
                            .filter(w => w.subCounty === filters.subCounty)
                            .map(w => <option key={w.name} value={w.name}>{w.name}</option>)
                        : filters.availableAreas.map(area => <option key={area} value={area}>{area}</option>)
                    }
                </select>
            </div>

            <div style={modal.fieldGroup}>
                <label style={modal.label}>Category</label>
                <select
                    value={filters.category}
                    onChange={(e) => updateFilter('category', e.target.value)}
                    aria-label="Filter by category"
                    style={{ ...form.select, minWidth: '130px' }}
                >
                    <option value="All">All Categories</option>
                    <option value="Works">Works</option>
                    <option value="Equipment">Equipment</option>
                    <option value="Both Works and Equipment">Both</option>
                </select>
            </div>

            <div style={modal.fieldGroup}>
                <label style={modal.label}>Status</label>
                <select
                    value={filters.status}
                    onChange={(e) => updateFilter('status', e.target.value)}
                    aria-label="Filter by status"
                    style={{ ...form.select, minWidth: '130px' }}
                >
                    <option value="All">All Statuses</option>
                    <option value="Ongoing">Ongoing</option>
                    <option value="Completed">Completed</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Planning">Planning</option>
                </select>
            </div>

            <div style={modal.fieldGroup}>
                <label style={modal.label}>Project Type</label>
                <select
                    value={filters.type}
                    onChange={(e) => updateFilter('type', e.target.value)}
                    aria-label="Filter by project type"
                    style={{ ...form.select, minWidth: '130px' }}
                >
                    <option value="All">All Types</option>
                    {filters.availableTypes.map(type => <option key={type} value={type}>{type}</option>)}
                </select>
            </div>

            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                justifyContent: 'flex-end',
                marginBottom: activeFilterCount > 0 ? '0' : '0',
            }}>
                <label style={{ ...type.sm, color: 'transparent' }}> </label>
                <button
                    onClick={clearFilters}
                    disabled={activeFilterCount === 0}
                    style={{
                        ...buttons.ghost,
                        opacity: activeFilterCount > 0 ? 1 : 0.4,
                        cursor: activeFilterCount > 0 ? 'pointer' : 'not-allowed',
                    }}
                    aria-label={`Clear all filters${activeFilterCount > 0 ? ` (${activeFilterCount} active)` : ''}`}
                >
                    Clear {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
                </button>
            </div>
        </div>
    );
};

export default FilterBar;
