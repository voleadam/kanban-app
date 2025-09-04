import React, { useState, useEffect } from 'react';
import { Plus, Users, Calendar, ArrowRight, Folder } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

interface Project {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  is_owner?: boolean;
}

interface DashboardProps {
  onProjectSelect: (projectId: string, projectName: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onProjectSelect }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [inviteUserId, setInviteUserId] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadProjects();
      
      // Set up real-time subscription for projects
      const subscription = supabase
        .channel('projects-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'projects',
          },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              const newProject = payload.new as Project;
              // Only add if user is the owner
              if (newProject.owner_id === user?.id) {
                setProjects((current) => [...current, { ...newProject, is_owner: true }]);
              }
            } else if (payload.eventType === 'UPDATE') {
              const updatedProject = payload.new as Project;
              setProjects((current) =>
                current.map((project) =>
                  project.id === updatedProject.id 
                    ? { ...updatedProject, is_owner: project.is_owner }
                    : project
                )
              );
            } else if (payload.eventType === 'DELETE') {
              setProjects((current) =>
                current.filter((project) => project.id !== payload.old.id)
              );
            }
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user]);

  const loadProjects = async () => {
    try {
      // Get owned projects
      const { data: ownedProjects, error: ownedError } = await supabase
        .from('projects')
        .select('*')
        .eq('owner_id', user?.id);

      if (ownedError) throw ownedError;

      // Get shared projects
      const { data: sharedProjects, error: sharedError } = await supabase
        .from('project_members')
        .select(`
          project_id,
          projects:project_id (*)
        `)
        .eq('user_id', user?.id);

      if (sharedError) throw sharedError;

      const allProjects = [
        ...(ownedProjects || []).map(p => ({ ...p, is_owner: true })),
        ...(sharedProjects || []).map(sp => ({ 
          ...(sp.projects as any), 
          is_owner: false 
        })),
      ];

      setProjects(allProjects);
    } catch (error: any) {
      toast.error('Error loading projects');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    try {
      const { data, error } = await supabase
        .from('projects')
        .insert([
          {
            name: newProjectName,
            owner_id: user?.id,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      setNewProjectName('');
      setShowNewProjectModal(false);
      toast.success('Project created successfully!');
    } catch (error: any) {
      toast.error('Error creating project');
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteUserId.trim()) return;

    try {
      const { data, error } = await supabase.rpc('invite_user_to_project', {
        p_project_id: selectedProjectId,
        p_invited_user_id: inviteUserId,
      });

      if (error) throw error;

      setInviteUserId('');
      setShowInviteModal(false);
      toast.success('Invitation sent successfully!');
    } catch (error: any) {
      toast.error('Error sending invitation');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Projects</h1>
        <p className="text-gray-600">Manage and collaborate on your Kanban boards</p>
      </div>

      <div className="mb-6">
        <button
          onClick={() => setShowNewProjectModal(true)}
          className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-200 transition-all flex items-center space-x-2"
        >
          <Plus size={20} />
          <span>New Project</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <div
            key={project.id}
            className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-lg transition-shadow cursor-pointer group"
          >
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                {project.name}
              </h3>
              <div className="flex items-center space-x-2">
                {project.is_owner && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedProjectId(project.id);
                      setShowInviteModal(true);
                    }}
                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="Invite collaborators"
                  >
                    <Users size={18} />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
              <div className="flex items-center space-x-1">
                <Calendar size={14} />
                <span>{formatDate(project.created_at)}</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className={`w-2 h-2 rounded-full ${project.is_owner ? 'bg-green-500' : 'bg-blue-500'}`} />
                <span>{project.is_owner ? 'Owner' : 'Member'}</span>
              </div>
            </div>

            <button
              onClick={() => onProjectSelect(project.id, project.name)}
              className="w-full bg-gray-50 hover:bg-indigo-50 text-gray-700 hover:text-indigo-700 py-3 px-4 rounded-xl font-medium transition-colors flex items-center justify-center space-x-2 group"
            >
              <span>Open Project</span>
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        ))}
      </div>

      {projects.length === 0 && (
        <div className="text-center py-16">
          <div className="bg-gray-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
            <Folder className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No projects yet</h3>
          <p className="text-gray-600 mb-6">Create your first project to get started with collaborative Kanban boards</p>
          <button
            onClick={() => setShowNewProjectModal(true)}
            className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-200 transition-all"
          >
            Create First Project
          </button>
        </div>
      )}

      {/* New Project Modal */}
      {showNewProjectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Create New Project</h2>
            <form onSubmit={handleCreateProject}>
              <div className="mb-4">
                <label htmlFor="projectName" className="block text-sm font-medium text-gray-700 mb-2">
                  Project Name
                </label>
                <input
                  type="text"
                  id="projectName"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Enter project name"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewProjectModal(false);
                    setNewProjectName('');
                  }}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Invite Collaborator</h2>
            <form onSubmit={handleSendInvite}>
              <div className="mb-4">
                <label htmlFor="userId" className="block text-sm font-medium text-gray-700 mb-2">
                  User ID
                </label>
                <input
                  type="text"
                  id="userId"
                  value={inviteUserId}
                  onChange={(e) => setInviteUserId(e.target.value)}
                  placeholder="Enter user ID"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Users can find their ID in their profile page
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteUserId('');
                  }}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
                >
                  Send Invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};