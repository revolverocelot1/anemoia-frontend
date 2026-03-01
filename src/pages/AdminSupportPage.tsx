import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabaseAuth } from '../context/SupabaseAuthContext';
import { supabase } from '../services/supabase';
import { motion } from 'framer-motion';

interface SupportMessage {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  subject: string;
  message: string;
  created_at: string;
}

const AdminSupportPage = () => {
  const { user, isAuthenticated, isLoading } = useSupabaseAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [error, setError] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<SupportMessage | null>(null);

  // Admin email addresses - you can expand this list
  const ADMIN_EMAILS = ['srushtiraj.patil20@vit.edu'];
  const isAdmin = user && ADMIN_EMAILS.includes(user.email || '');

  useEffect(() => {
    // Redirect to login if not authenticated after loading
    if (!isLoading && !isAuthenticated) {
      navigate('/login?redirect=/admin/support');
    } else if (!isLoading && isAuthenticated && !isAdmin) {
      // Redirect non-admin users to home
      navigate('/');
    }
  }, [isLoading, isAuthenticated, isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchSupportMessages();
    }
  }, [isAdmin]);

  const fetchSupportMessages = async () => {
    try {
      setLoadingMessages(true);
      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMessages(data || []);
    } catch (error: any) {
      console.error('Error fetching support messages:', error);
      setError('Failed to load support messages');
    } finally {
      setLoadingMessages(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Support Messages Admin
            </h1>
            <button
              onClick={fetchSupportMessages}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
          
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-400">
              Total Messages: <span className="text-white font-semibold">{messages.length}</span>
            </p>
          </div>
        </motion.div>

        {error && (
          <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {loadingMessages ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-400">Loading messages...</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-12 text-center">
            <p className="text-gray-400">No support messages yet.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-900 border border-gray-800 rounded-lg p-6 hover:border-gray-700 transition-colors cursor-pointer"
                onClick={() => setSelectedMessage(msg)}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold mb-1">{msg.subject}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <span>{msg.user_name}</span>
                      <span>•</span>
                      <span>{msg.user_email}</span>
                      <span>•</span>
                      <span>{formatDate(msg.created_at)}</span>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">#{msg.id.slice(0, 8)}</span>
                </div>
                <p className="text-gray-300 line-clamp-2">{msg.message}</p>
              </motion.div>
            ))}
          </div>
        )}

        {/* Message Detail Modal */}
        {selectedMessage && (
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedMessage(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gray-900 border border-gray-800 rounded-lg p-6 max-w-3xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">{selectedMessage.subject}</h2>
                  <div className="text-sm text-gray-400 space-y-1">
                    <p>From: {selectedMessage.user_name} ({selectedMessage.user_email})</p>
                    <p>Date: {formatDate(selectedMessage.created_at)}</p>
                    <p>ID: {selectedMessage.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedMessage(null)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="bg-black/50 rounded-lg p-4">
                <p className="whitespace-pre-wrap">{selectedMessage.message}</p>
              </div>
              
              <div className="mt-6 flex gap-3">
                <a
                  href={`mailto:${selectedMessage.user_email}?subject=Re: ${selectedMessage.subject}`}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Reply via Email
                </a>
                <button
                  onClick={() => setSelectedMessage(null)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSupportPage; 