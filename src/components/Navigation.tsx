import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { LogOut, User, Folder, Home } from 'lucide-react';
import toast from 'react-hot-toast';

interface NavigationProps {
  currentView: 'dashboard' | 'profile' | 'project';
  onViewChange: (view: 'dashboard' | 'profile') => void;
  projectName?: string;
}

export const Navigation: React.FC<NavigationProps> = ({ currentView, onViewChange, projectName }) => {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error('Error signing out');
    } else {
      toast.success('Signed out successfully');
    }
  };

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 w-10 h-10 rounded-xl flex items-center justify-center">
              <div className="grid grid-cols-3 gap-0.5">
                {[...Array(9)].map((_, i) => (
                  <div key={i} className="w-1 h-1 bg-white rounded-sm" />
                ))}
              </div>
            </div>
            <h1 className="text-xl font-bold text-gray-900">KanbanFlow</h1>
          </div>

          <div className="flex items-center space-x-1">
            {currentView === 'project' ? (
              <button
                onClick={() => onViewChange('dashboard')}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <Home size={16} />
                <span className="text-sm">Dashboard</span>
              </button>
            ) : (
              <>
                <button
                  onClick={() => onViewChange('dashboard')}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    currentView === 'dashboard'
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Folder size={16} />
                  <span>Projects</span>
                </button>
                <button
                  onClick={() => onViewChange('profile')}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    currentView === 'profile'
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <User size={16} />
                  <span>Profile</span>
                </button>
              </>
            )}
          </div>

          {projectName && (
            <div className="text-gray-400">
              <span>/</span>
              <span className="ml-2 text-gray-700 font-medium">{projectName}</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-600">
            {user?.user_metadata?.name || user?.email}
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center space-x-2 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <LogOut size={16} />
            <span className="text-sm">Sign Out</span>
          </button>
        </div>
      </div>
    </nav>
  );
};