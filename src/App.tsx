import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './hooks/useAuth';
import { AuthForm } from './components/AuthForm';
import { Navigation } from './components/Navigation';
import { Dashboard } from './components/Dashboard';
import { Profile } from './components/Profile';
import { KanbanBoard } from './components/KanbanBoard';

function App() {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState<'dashboard' | 'profile' | 'project'>('dashboard');
  const [selectedProject, setSelectedProject] = useState<{id: string; name: string} | null>(null);

  const handleProjectSelect = (projectId: string, projectName: string) => {
    setSelectedProject({ id: projectId, name: projectName });
    setCurrentView('project');
  };

  const handleViewChange = (view: 'dashboard' | 'profile') => {
    setCurrentView(view);
    if (view !== 'project') {
      setSelectedProject(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <AuthForm />
        <Toaster 
          position="bottom-left"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
          }}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation 
        currentView={currentView} 
        onViewChange={handleViewChange}
        projectName={selectedProject?.name}
      />
      
      <main>
        {currentView === 'dashboard' && (
          <Dashboard onProjectSelect={handleProjectSelect} />
        )}
        {currentView === 'profile' && <Profile />}
        {currentView === 'project' && selectedProject && (
          <KanbanBoard projectId={selectedProject.id} />
        )}
      </main>

      <Toaster 
        position="bottom-left"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />
    </div>
  );
}

export default App;