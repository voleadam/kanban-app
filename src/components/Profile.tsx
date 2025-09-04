import React, { useState, useEffect } from 'react';
import { Copy, Check, Mail, Calendar, UserCheck } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface Invitation {
  id: string;
  project_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  projects: {
    name: string;
    owner_id: string;
  };
}

export const Profile: React.FC = () => {
  const { user } = useAuth();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadInvitations();
  }, []);

  const loadInvitations = async () => {
    try {
      const { data, error } = await supabase
        .from('invitations')
        .select(`
          *,
          projects:project_id (name, owner_id)
        `)
        .eq('invited_user_id', user?.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvitations(data || []);
    } catch (error: any) {
      toast.error('Error loading invitations');
    } finally {
      setLoading(false);
    }
  };

  const copyUserId = async () => {
    if (user?.id) {
      await navigator.clipboard.writeText(user.id);
      setCopied(true);
      toast.success('User ID copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleInvitation = async (invitationId: string, status: 'accepted' | 'declined') => {
    try {
      const { error } = await supabase
        .from('invitations')
        .update({ status })
        .eq('id', invitationId);

      if (error) throw error;

      setInvitations(invitations.filter(inv => inv.id !== invitationId));
      toast.success(status === 'accepted' ? 'Invitation accepted!' : 'Invitation declined');
    } catch (error: any) {
      toast.error('Error updating invitation');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Profile</h1>
          <p className="text-gray-600">Manage your account and invitations</p>
        </div>

        {/* User Info */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Account Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-xl">
              <div className="bg-indigo-100 p-2 rounded-lg">
                <UserCheck className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <div className="text-sm text-gray-600">Name</div>
                <div className="font-medium text-gray-900">
                  {user?.user_metadata?.name || 'Not provided'}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-xl">
              <div className="bg-green-100 p-2 rounded-lg">
                <Mail className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-sm text-gray-600">Email</div>
                <div className="font-medium text-gray-900">{user?.email}</div>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-xl">
              <div className="bg-blue-100 p-2 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-sm text-gray-600">Member Since</div>
                <div className="font-medium text-gray-900">
                  {user?.created_at ? formatDate(user.created_at) : 'Unknown'}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-indigo-50 rounded-xl">
              <div className="flex-1">
                <div className="text-sm text-gray-600 mb-1">Your User ID</div>
                <div className="font-mono text-sm text-gray-900 bg-white px-3 py-2 rounded-lg border break-all">
                  {user?.id}
                </div>
              </div>
              <button
                onClick={copyUserId}
                className="ml-3 p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                title="Copy User ID"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            Share your User ID with others so they can invite you to collaborate on their projects.
          </p>
        </div>

        {/* Invitations */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Pending Invitations ({invitations.length})
          </h2>
          
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : invitations.length > 0 ? (
            <div className="space-y-4">
              {invitations.map((invitation) => (
                <div key={invitation.id} className="border border-gray-200 rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {(invitation.projects as any)?.name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Invited on {formatDate(invitation.created_at)}
                      </p>
                    </div>
                    <div className="flex space-x-3">
                      <button
                        onClick={() => handleInvitation(invitation.id, 'declined')}
                        className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                      >
                        Decline
                      </button>
                      <button
                        onClick={() => handleInvitation(invitation.id, 'accepted')}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                      >
                        Accept
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No pending invitations</h3>
              <p className="text-gray-600">
                When others invite you to collaborate on projects, they'll appear here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};