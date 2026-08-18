import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabaseAuth } from '../context/SupabaseAuthContext';
import { supabase } from '../services/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { ADMIN_EMAILS, isUserAdmin } from '../constants/admin';

interface AdminResponse {
  id: string;
  message_id: string;
  admin_email: string;
  response: string;
  created_at: string;
}

interface SupportMessage {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  subject: string;
  message: string;
  created_at: string;
  admin_responses?: AdminResponse[];
}

const AdminSupportPage = () => {
  const { user, isAuthenticated, isLoading } = useSupabaseAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [error, setError] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<SupportMessage | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);

  // Admin check
  const isAdmin = isUserAdmin(user?.email);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login?redirect=/admin/support');
    } else if (!isLoading && isAuthenticated && !isAdmin) {
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

      const msgs = data || [];

      // Fetch all admin responses
      if (msgs.length > 0) {
        const messageIds = msgs.map((m: SupportMessage) => m.id);
        const { data: responses, error: resError } = await supabase
          .from('admin_responses')
          .select('*')
          .in('message_id', messageIds)
          .order('created_at', { ascending: true });

        if (!resError && responses) {
          const msgsWithResponses = msgs.map((msg: SupportMessage) => ({
            ...msg,
            admin_responses: responses.filter((r: AdminResponse) => r.message_id === msg.id),
          }));
          setMessages(msgsWithResponses);
        } else {
          setMessages(msgs);
        }
      } else {
        setMessages([]);
      }
    } catch (error: any) {
      console.error('Error fetching support messages:', error);
      setError('Failed to load support messages');
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleReply = async (messageId: string) => {
    if (!replyText.trim() || !user?.email) return;

    setIsReplying(true);
    try {
      const { error } = await supabase
        .from('admin_responses')
        .insert({
          message_id: messageId,
          admin_email: user.email,
          response: replyText.trim(),
        });

      if (error) throw error;

      setReplyText('');
      // Refresh messages to show the new response
      fetchSupportMessages();
      // Update selected message if open
      if (selectedMessage && selectedMessage.id === messageId) {
        const updated = messages.find((m) => m.id === messageId);
        if (updated) setSelectedMessage({ ...updated });
      }
    } catch (error: any) {
      console.error('Error sending reply:', error);
      setError('Failed to send reply: ' + error.message);
    } finally {
      setIsReplying(false);
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
    return null;
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
            <button onClick={() => setError('')} className="text-xs text-red-500 underline mt-1">Dismiss</button>
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
                onClick={() => {
                  setSelectedMessage(msg);
                  setReplyText('');
                }}
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
                  <div className="flex items-center gap-2">
                    {msg.admin_responses && msg.admin_responses.length > 0 && (
                      <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                        Replied ({msg.admin_responses.length})
                      </span>
                    )}
                    <span className="text-xs text-gray-500">#{msg.id.slice(0, 8)}</span>
                  </div>
                </div>
                <p className="text-gray-300 line-clamp-2">{msg.message}</p>
              </motion.div>
            ))}
          </div>
        )}

        {/* Message Detail Modal */}
        <AnimatePresence>
          {selectedMessage && (
            <div
              className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
              onClick={() => setSelectedMessage(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-gray-900 border border-gray-800 rounded-lg p-6 max-w-3xl w-full max-h-[85vh] overflow-y-auto"
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
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
                
                {/* Original message */}
                <div className="bg-black/50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-2 font-medium">User's Message:</p>
                  <p className="whitespace-pre-wrap">{selectedMessage.message}</p>
                </div>

                {/* Previous admin responses */}
                {selectedMessage.admin_responses && selectedMessage.admin_responses.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs text-gray-500 font-medium">Previous Replies:</p>
                    {selectedMessage.admin_responses.map((resp) => (
                      <div key={resp.id} className="bg-cyan-950/30 border border-cyan-900/40 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-cyan-400">{resp.admin_email}</span>
                          <span className="text-xs text-gray-500">{formatDate(resp.created_at)}</span>
                        </div>
                        <p className="text-sm text-gray-300 whitespace-pre-wrap">{resp.response}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply box */}
                <div className="mt-6 border-t border-gray-800 pt-4">
                  <label className="text-sm font-medium text-gray-300 mb-2 block">Reply to this message:</label>
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your reply here..."
                    rows={4}
                    className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-lg focus:outline-none focus:border-cyan-500 transition-colors resize-none text-sm"
                    maxLength={2000}
                  />
                  <p className="text-xs text-gray-600 mt-1">{replyText.length}/2000 characters</p>
                </div>
                
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={() => handleReply(selectedMessage.id)}
                    disabled={isReplying || !replyText.trim()}
                    className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                      isReplying || !replyText.trim()
                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        : 'bg-cyan-600 hover:bg-cyan-700 text-white'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    {isReplying ? 'Sending...' : 'Send Reply'}
                  </button>
                  <a
                    href={`mailto:${selectedMessage.user_email}?subject=Re: ${selectedMessage.subject}`}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2"
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
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AdminSupportPage;