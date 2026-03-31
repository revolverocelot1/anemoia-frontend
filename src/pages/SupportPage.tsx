import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabaseAuth } from '../context/SupabaseAuthContext';
import { supabase } from '../services/supabase';
import { motion, AnimatePresence } from 'framer-motion';

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

interface AdminResponse {
  id: string;
  message_id: string;
  admin_email: string;
  response: string;
  created_at: string;
}

const SupportPage = () => {
  const { user, isAuthenticated, isLoading } = useSupabaseAuth();
  const navigate = useNavigate();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [pastMessages, setPastMessages] = useState<SupportMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [expandedMessage, setExpandedMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login?redirect=/support');
    }
  }, [isLoading, isAuthenticated, navigate]);

  const fetchPastMessages = useCallback(async () => {
    if (!user) return;
    try {
      setLoadingMessages(true);
      // Fetch user's own messages
      const { data: messages, error: msgError } = await supabase
        .from('support_messages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (msgError) throw msgError;

      if (messages && messages.length > 0) {
        // Fetch admin responses for these messages
        const messageIds = messages.map((m: SupportMessage) => m.id);
        const { data: responses, error: resError } = await supabase
          .from('admin_responses')
          .select('*')
          .in('message_id', messageIds)
          .order('created_at', { ascending: true });

        if (resError) {
          // admin_responses table might not exist yet — that's ok
          console.warn('Could not fetch admin responses:', resError.message);
          setPastMessages(messages);
        } else {
          // Attach responses to their parent messages
          const messagesWithResponses = messages.map((msg: SupportMessage) => ({
            ...msg,
            admin_responses: (responses || []).filter((r: AdminResponse) => r.message_id === msg.id),
          }));
          setPastMessages(messagesWithResponses);
        }
      } else {
        setPastMessages([]);
      }
    } catch (error: any) {
      console.error('Error fetching past messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  }, [user]);

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchPastMessages();
    }
  }, [isAuthenticated, user, fetchPastMessages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setErrorMessage('You must be logged in to send support messages');
      setSubmitStatus('error');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      const { error } = await supabase
        .from('support_messages')
        .insert({
          user_id: user.id,
          user_email: user.email || '',
          user_name: user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          subject: subject.trim(),
          message: message.trim(),
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      setSubmitStatus('success');
      setSubject('');
      setMessage('');

      // Refresh past messages to include the new one
      fetchPastMessages();

      setTimeout(() => {
        setSubmitStatus('idle');
      }, 5000);
    } catch (error: any) {
      console.error('Error submitting support message:', error);
      setErrorMessage(error.message || 'Failed to send message. Please try again.');
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
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

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black text-white px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto"
      >
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
          Contact Support
        </h1>
        <p className="text-gray-400 mb-8">
          Need help? Send us a message and we'll get back to you as soon as possible.
          You can also email us directly at{' '}
          <a href="mailto:ocelotonly@yahoo.com" className="text-cyan-400 hover:text-cyan-300 underline transition-colors">
            ocelotonly@yahoo.com
          </a>
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="subject" className="block text-sm font-medium mb-2">
              Subject
            </label>
            <input
              type="text"
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              placeholder="Brief description of your issue"
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-cyan-500 transition-colors"
              maxLength={100}
            />
          </div>

          <div>
            <label htmlFor="message" className="block text-sm font-medium mb-2">
              Message
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              placeholder="Please describe your issue in detail..."
              rows={8}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-cyan-500 transition-colors resize-none"
              maxLength={1000}
            />
            <p className="text-xs text-gray-500 mt-1">
              {message.length}/1000 characters
            </p>
          </div>

          <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
            <p className="text-sm text-gray-400">
              <span className="font-medium">Logged in as:</span> {user?.email}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Your email address will be used for support correspondence only.
            </p>
          </div>

          {submitStatus === 'success' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-green-900/20 border border-green-500 rounded-lg p-4"
            >
              <p className="text-green-400">
                ✓ Your message has been sent successfully! We'll respond to your email within 24-48 hours.
              </p>
            </motion.div>
          )}

          {submitStatus === 'error' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-900/20 border border-red-500 rounded-lg p-4"
            >
              <p className="text-red-400">
                ✗ {errorMessage}
              </p>
            </motion.div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !subject.trim() || !message.trim()}
            className={`w-full py-3 px-6 rounded-lg font-medium transition-all ${
              isSubmitting || !subject.trim() || !message.trim()
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white'
            }`}
          >
            {isSubmitting ? 'Sending...' : 'Send Message'}
          </button>
        </form>

        {/* Past Messages Section */}
        <div className="mt-12 pt-8 border-t border-gray-800">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Your Past Messages</h2>
            <button
              onClick={fetchPastMessages}
              className="text-sm text-gray-400 hover:text-cyan-400 transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>

          {loadingMessages ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-500 text-sm">Loading your messages...</div>
            </div>
          ) : pastMessages.length === 0 ? (
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-8 text-center">
              <p className="text-gray-500 text-sm">You haven't sent any support messages yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {pastMessages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedMessage(expandedMessage === msg.id ? null : msg.id)}
                      className="w-full text-left p-4 hover:bg-gray-800/50 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm truncate">{msg.subject}</h3>
                          <p className="text-xs text-gray-500 mt-1">{formatDate(msg.created_at)}</p>
                        </div>
                        <div className="flex items-center gap-2 ml-3 shrink-0">
                          {msg.admin_responses && msg.admin_responses.length > 0 && (
                            <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full">
                              {msg.admin_responses.length} {msg.admin_responses.length === 1 ? 'reply' : 'replies'}
                            </span>
                          )}
                          <svg
                            className={`w-4 h-4 text-gray-500 transition-transform ${expandedMessage === msg.id ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </button>

                    <AnimatePresence>
                      {expandedMessage === msg.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 border-t border-gray-800">
                            {/* User's original message */}
                            <div className="mt-3 bg-black/40 rounded-lg p-3">
                              <p className="text-xs text-gray-500 mb-1 font-medium">Your message:</p>
                              <p className="text-sm text-gray-300 whitespace-pre-wrap">{msg.message}</p>
                            </div>

                            {/* Admin responses */}
                            {msg.admin_responses && msg.admin_responses.length > 0 ? (
                              <div className="mt-3 space-y-2">
                                {msg.admin_responses.map((resp) => (
                                  <div key={resp.id} className="bg-cyan-950/30 border border-cyan-900/40 rounded-lg p-3">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-xs font-medium text-cyan-400">Admin Reply</span>
                                      <span className="text-xs text-gray-500">{formatDate(resp.created_at)}</span>
                                    </div>
                                    <p className="text-sm text-gray-300 whitespace-pre-wrap">{resp.response}</p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="mt-3 text-xs text-gray-600 italic">No reply yet — we'll respond within 24-48 hours.</p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Contact Info & Common Questions */}
        <div className="mt-12 pt-8 border-t border-gray-800">
          <h2 className="text-xl font-semibold mb-4">Contact & Common Questions</h2>
          <div className="space-y-4 text-sm text-gray-400">
            <p>
              <strong className="text-white">Alternate Email:</strong>{' '}
              <a href="mailto:ocelotonly@yahoo.com" className="text-cyan-400 hover:text-cyan-300 underline transition-colors">
                ocelotonly@yahoo.com
              </a>
            </p>
            <p>
              <strong className="text-white">Response Time:</strong> We typically respond within 24-48 hours during business days.
            </p>
            <p>
              <strong className="text-white">Technical Issues:</strong> Please include browser version, error messages, and steps to reproduce the issue.
            </p>
            <p>
              <strong className="text-white">Feature Requests:</strong> We love hearing your ideas! Describe your use case and how it would help you.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SupportPage;