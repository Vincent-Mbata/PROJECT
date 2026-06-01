import React, { useState, useEffect, Component } from 'react';
import axios from 'axios';
import Header from './components/Header';
import FilterBar from './components/FilterBar';
import ProjectCard from './components/ProjectCard';
import AddProjectModal from './components/AddProjectModal';
import ProjectDetailModal from './components/ProjectDetailModal';
import { useToast } from './components/Toast';
import { colors, buttons, subCountyHeading, type, emptyState } from './styles/shared';
import { SUB_COUNTIES } from './data/wards';

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, info) {
        console.error('ErrorBoundary caught:', error, info);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '40px', textAlign: 'center', color: colors.textPrimary }}>
                    <h2 style={{ ...type.lg, marginBottom: '12px' }}>Something went wrong</h2>
                    <p style={{ color: colors.textSecondary, marginBottom: '20px', ...type.base }}>
                        {this.state.error?.message || 'An unexpected error occurred.'}
                    </p>
                    <button
                        onClick={() => this.setState({ hasError: false, error: null })}
                        style={buttons.primary}
                    >
                        Try Again
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

function App() {
    const { addToast } = useToast();
    const [projects, setProjects] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingProject, setEditingProject] = useState(null);
    const [viewingProject, setViewingProject] = useState(null);
    const [filters, setFilters] = useState({
        search: '',
        subCounty: 'All',
        area: 'All',
        status: 'All',
        type: 'All',
        category: 'All',
        availableAreas: [],
        availableTypes: [],
    });

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        setIsLoading(true);
        setHasError(false);
        try {
            const response = await axios.get(`${API_BASE_URL}/projects`);
            const data = Array.isArray(response.data) ? response.data : (response.data.data || []);
            setProjects(data);
            const areas = [...new Set(data.map(p => p.ward_area).filter(Boolean))].sort();
            const types = [...new Set(data.map(p => p.project_type).filter(Boolean))].sort();
            setFilters(prev => ({ ...prev, availableAreas: areas, availableTypes: types }));
        } catch (error) {
            console.error('Error fetching projects:', error);
            setHasError(true);
            addToast('Failed to fetch projects from server.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveProject = async (data) => {
        setIsSaving(true);
        try {
            const formData = new FormData();
            Object.entries(data).forEach(([key, value]) => {
                if (key === 'files') {
                    data.files.forEach(file => formData.append('photos', file));
                } else {
                    formData.append(key, value);
                }
            });
            if (editingProject) {
                await axios.put(`${API_BASE_URL}/projects/${editingProject.id}`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                addToast('Project updated successfully!', 'success');
            } else {
                await axios.post(`${API_BASE_URL}/projects`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                addToast('Project created successfully!', 'success');
            }
            await fetchProjects();
            setIsModalOpen(false);
            setEditingProject(null);
        } catch (error) {
            addToast(error.response?.data?.error || 'Failed to save project.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteProject = async (id) => {
        if (!window.confirm('Delete this project? This cannot be undone.')) return;
        try {
            await axios.delete(`${API_BASE_URL}/projects/${id}`);
            addToast('Project deleted successfully!', 'success');
            await fetchProjects();
        } catch (error) {
            addToast('Failed to delete project.', 'error');
        }
    };

    const clearFilters = () => {
        setFilters(prev => ({
            ...prev, search: '', subCounty: 'All', area: 'All',
            status: 'All', type: 'All', category: 'All'
        }));
    };

    const filteredProjects = projects.filter(p => {
        const searchLower = filters.search.toLowerCase();
        const searchMatch = !filters.search ||
            (p.title && p.title.toLowerCase().includes(searchLower)) ||
            (p.description && p.description.toLowerCase().includes(searchLower));
        return searchMatch &&
            (filters.subCounty === 'All' || p.sub_county === filters.subCounty) &&
            (filters.area === 'All' || p.ward_area === filters.area) &&
            (filters.status === 'All' || p.status === filters.status) &&
            (filters.type === 'All' || p.project_type === filters.type) &&
            (filters.category === 'All' || p.category === filters.category);
    });

    const groupedProjects = filteredProjects.reduce((acc, p) => {
        const key = p.sub_county || 'Other';
        if (!acc[key]) acc[key] = [];
        acc[key].push(p);
        return acc;
    }, {});

    const activeFilterCount = [
        filters.search, filters.subCounty !== 'All' ? filters.subCounty : '',
        filters.area !== 'All' ? filters.area : '',
        filters.status !== 'All' ? filters.status : '',
        filters.type !== 'All' ? filters.type : '',
        filters.category !== 'All' ? filters.category : '',
    ].filter(Boolean).length;

    return (
        <div style={{ minHeight: '100vh', backgroundColor: colors.bg }}>
            <Header onAddClick={() => { setEditingProject(null); setIsModalOpen(true); }} />
            <FilterBar
                subCounties={SUB_COUNTIES}
                filters={filters}
                setFilters={setFilters}
                clearFilters={clearFilters}
                projects={projects}
                activeFilterCount={activeFilterCount}
            />
            <main style={{ padding: '0 24px 48px 24px', maxWidth: '1400px', margin: '0 auto' }}>
                {isLoading ? (
                    <div style={{ ...emptyState, padding: '80px 20px' }}>
                        <div style={{ ...type.base, color: colors.textSecondary }}>
                            Loading projects...
                        </div>
                    </div>
                ) : hasError ? (
                    <div style={{ ...emptyState, padding: '80px 20px' }}>
                        <div style={{ ...type.base, color: colors.danger, marginBottom: '16px' }}>
                            Failed to load projects. Please check your connection.
                        </div>
                        <button onClick={fetchProjects} style={buttons.primary}>
                            Retry
                        </button>
                    </div>
                ) : Object.keys(groupedProjects).length > 0 ? (
                    Object.entries(groupedProjects).map(([subCounty, projectsInGroup]) => (
                        <div key={subCounty} style={{ marginBottom: '40px' }}>
                            <h2 style={subCountyHeading}>
                                {subCounty}
                                <span style={{ ...type.sm, color: colors.textMuted, fontWeight: 400, marginLeft: '8px' }}>
                                    ({projectsInGroup.length} project{projectsInGroup.length !== 1 ? 's' : ''})
                                </span>
                            </h2>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                                gap: '20px',
                            }}>
                                {projectsInGroup.map(project => (
                                    <ProjectCard
                                        key={project.id}
                                        project={project}
                                        onEdit={() => { setEditingProject(project); setIsModalOpen(true); }}
                                        onDelete={() => handleDeleteProject(project.id)}
                                        onView={() => setViewingProject(project)}
                                    />
                                ))}
                            </div>
                        </div>
                    ))
                ) : (
                    <div style={{ ...emptyState, padding: '80px 20px' }}>
                        <div style={{ ...type.lg, color: colors.textPrimary, marginBottom: '8px' }}>
                            {projects.length === 0 ? 'No projects yet' : 'No matching projects'}
                        </div>
                        <div style={{ ...type.base, color: colors.textSecondary, marginBottom: '24px' }}>
                            {projects.length === 0
                                ? 'Get started by adding your first project.'
                                : `No projects match your current filters.${activeFilterCount > 0 ? ' Try clearing some filters.' : ''}`}
                        </div>
                        {projects.length === 0 ? (
                            <button
                                onClick={() => { setEditingProject(null); setIsModalOpen(true); }}
                                style={buttons.primary}
                            >
                                Add Your First Project
                            </button>
                        ) : activeFilterCount > 0 ? (
                            <button onClick={clearFilters} style={buttons.secondary}>
                                Clear All Filters
                            </button>
                        ) : null}
                    </div>
                )}
            </main>
            <AddProjectModal
                subCounties={SUB_COUNTIES}
                isOpen={isModalOpen}
                editingProject={editingProject}
                onClose={() => { setIsModalOpen(false); setEditingProject(null); }}
                onSave={handleSaveProject}
                loading={isSaving}
            />
            <ProjectDetailModal
                isOpen={!!viewingProject}
                project={viewingProject}
                onClose={() => setViewingProject(null)}
                onCoverUpdate={(photoUrl) => {
                    setProjects(prev => prev.map(p =>
                        p.id === viewingProject?.id ? { ...p, cover_photo: photoUrl } : p
                    ));
                }}
            />
        </div>
    );
}

export default App;
