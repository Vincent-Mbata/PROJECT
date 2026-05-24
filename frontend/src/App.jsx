import React, { useState, useEffect, Component } from 'react';
import axios from 'axios';
import Header from './components/Header';
import FilterBar from './components/FilterBar';
import ProjectCard from './components/ProjectCard';
import AddProjectModal from './components/AddProjectModal';
import ProjectDetailModal from './components/ProjectDetailModal';
import { useToast } from './components/Toast';
import { colors, buttons, subCountyHeading } from './styles/shared';
import { SUB_COUNTIES } from './data/wards';

// Error boundary to catch render errors
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
          <h2>Something went wrong</h2>
          <p style={{ color: colors.textSecondary, marginTop: '12px' }}>
            {this.state.error?.message || 'Unknown error'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{ ...buttons.primary, marginTop: '20px' }}
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
    try {
      const response = await axios.get(`${API_BASE_URL}/projects`);
      const data = Array.isArray(response.data) ? response.data : (response.data.data || []);
      setProjects(data);

      const areas = [...new Set(data.map(p => p.ward_area).filter(Boolean))].sort();
      const types = [...new Set(data.map(p => p.project_type).filter(Boolean))].sort();

      setFilters(prev => ({
        ...prev,
        availableAreas: areas,
        availableTypes: types,
      }));
    } catch (error) {
      console.error('Error fetching projects:', error);
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
      console.error('Error saving project:', error);
      addToast(error.response?.data?.error || 'Failed to save project.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProject = async (id) => {
    if (!window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return;
    }
    try {
      await axios.delete(`${API_BASE_URL}/projects/${id}`);
      addToast('Project deleted successfully!', 'success');
      await fetchProjects();
    } catch (error) {
      console.error('Error deleting project:', error);
      addToast('Failed to delete project.', 'error');
    }
  };

  const clearFilters = () => {
    setFilters(prev => ({
      ...prev,
      search: '',
      subCounty: 'All',
      area: 'All',
      status: 'All',
      type: 'All',
      category: 'All',
    }));
  };

  const filteredProjects = projects.filter(p => {
    const searchMatch = !filters.search ||
      p.title.toLowerCase().includes(filters.search.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(filters.search.toLowerCase()));

    const subCountyMatch = filters.subCounty === 'All' || p.sub_county === filters.subCounty;
    const areaMatch = filters.area === 'All' || p.ward_area === filters.area;
    const statusMatch = filters.status === 'All' || p.status === filters.status;
    const typeMatch = filters.type === 'All' || p.project_type === filters.type;
    const categoryMatch = filters.category === 'All' || p.category === filters.category;

    return searchMatch && subCountyMatch && areaMatch && statusMatch && typeMatch && categoryMatch;
  });

  const groupedProjects = filteredProjects.reduce((acc, p) => {
    const key = p.sub_county || 'Other';
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  return (
    <div style={{ minHeight: '100vh' }}>
      <Header onAddClick={() => { setEditingProject(null); setIsModalOpen(true); }} />

      <FilterBar
        subCounties={SUB_COUNTIES}
        filters={filters}
        setFilters={setFilters}
        clearFilters={clearFilters}
        projects={projects}
      />

      <main style={{
        padding: '0 24px 24px 24px',
        maxWidth: '1400px',
        margin: '0 auto',
      }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: colors.textSecondary }}>
            Loading projects...
          </div>
        ) : Object.keys(groupedProjects).length > 0 ? (
          Object.entries(groupedProjects).map(([subCounty, projectsInGroup]) => (
            <div key={subCounty} style={{ marginBottom: '40px' }}>
              <h2 style={{
                ...subCountyHeading,
                fontSize: '18px',
                cursor: 'default',
                transition: 'color 0.2s ease, border-left-color 0.2s ease, padding-left 0.2s ease',
              }}
                onMouseOver={(e) => { e.currentTarget.style.color = colors.primaryHover; e.currentTarget.style.borderLeftColor = colors.primaryHover; e.currentTarget.style.paddingLeft = '16px'; }}
                onMouseOut={(e) => { e.currentTarget.style.color = colors.primary; e.currentTarget.style.borderLeftColor = colors.primary; e.currentTarget.style.paddingLeft = '12px'; }}
              >
                {subCounty}
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
                    onEdit={() => {
                      setEditingProject(project);
                      setIsModalOpen(true);
                    }}
                    onDelete={() => handleDeleteProject(project.id)}
                    onView={() => setViewingProject(project)}
                  />
                ))}
              </div>
            </div>
          ))
        ) : (
          <div style={{ textAlign: 'center', padding: '60px', color: colors.textSecondary }}>
            No projects found matching the filters.
          </div>
        )}
      </main>

      <AddProjectModal
        subCounties={SUB_COUNTIES}
        isOpen={isModalOpen}
        editingProject={editingProject}
        onClose={() => {
          setIsModalOpen(false);
          setEditingProject(null);
        }}
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
