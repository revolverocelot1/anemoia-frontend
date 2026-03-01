import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabaseAuth } from '../context/SupabaseAuthContext';
import { supabase } from '../services/supabase';
import { motion } from 'framer-motion';

const SupportPage = () => {
  const { user, isAuthenticated, isLoading } = useSupabaseAuth();
  const navigate = useNavigate();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    // Redirect to login if not authenticated after loading
    if (!isLoading && !isAuthenticated) {
      navigate('/login?redirect=/support');
    }
  }, [isLoading, isAuthenticated, navigate]);

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
      // Direct database insert instead of Edge Function
      const { data, error } = await supabase
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

      // Success
      setSubmitStatus('success');
      setSubject('');
      setMessage('');
      
      // Reset success message after 5 seconds
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
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

        <div className="mt-12 pt-8 border-t border-gray-800">
          <h2 className="text-xl font-semibold mb-4">Common Questions</h2>
          <div className="space-y-4 text-sm text-gray-400">
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