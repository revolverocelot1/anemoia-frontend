import React from 'react';
import { motion } from 'framer-motion';
import Header from '../components/Header';
import Footer from '../components/Footer';
import AnimatedPage from '../components/AnimatedPage';

const PrivacyPolicyPage: React.FC = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <AnimatedPage>
      <div className="min-h-screen bg-gray-950 text-white">
        <Header />
        
        <motion.div 
          className="max-w-4xl mx-auto px-4 py-12"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Privacy Policy
            </h1>
            <p className="text-lg text-gray-400">
              Last updated: {new Date().toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </motion.div>

          {/* Content */}
          <div className="space-y-8">
            <motion.section variants={itemVariants} className="bg-gray-800/20 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/30">
              <h2 className="text-2xl font-bold text-white mb-4">1. Information We Collect</h2>
              <div className="text-gray-300 space-y-4">
                <p>
                  When you use Anemoia, we may collect the following types of information:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Account Information:</strong> When you sign in with Google, we collect your name, email address, and profile picture as provided by Google.</li>
                  <li><strong>Usage Data:</strong> Information about how you use our services, including the types of AI tools you access and general usage patterns.</li>
                  <li><strong>Images:</strong> Images you upload for processing are temporarily stored only during the processing session and are automatically deleted afterward.</li>
                  <li><strong>Technical Data:</strong> Browser type, IP address, device information, and other technical data necessary for service delivery.</li>
                </ul>
              </div>
            </motion.section>

            <motion.section variants={itemVariants} className="bg-gray-800/20 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/30">
              <h2 className="text-2xl font-bold text-white mb-4">2. How We Use Your Information</h2>
              <div className="text-gray-300 space-y-4">
                <p>We use the collected information to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Provide and maintain our AI image processing services</li>
                  <li>Authenticate and manage your account</li>
                  <li>Process your images using our AI models</li>
                  <li>Improve our services and develop new features</li>
                  <li>Communicate with you about service updates</li>
                  <li>Ensure security and prevent abuse</li>
                </ul>
              </div>
            </motion.section>

            <motion.section variants={itemVariants} className="bg-gray-800/20 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/30">
              <h2 className="text-2xl font-bold text-white mb-4">3. Image Processing and Storage</h2>
              <div className="text-gray-300 space-y-4">
                <p>
                  <strong>Local Processing:</strong> Most image processing happens directly in your browser using advanced AI models. Your images are not uploaded to our servers during this process.
                </p>
                <p>
                  <strong>Temporary Storage:</strong> When server-side processing is required, images are temporarily stored in secure, encrypted storage and are automatically deleted within 24 hours or immediately after processing completion.
                </p>
                <p>
                  <strong>No Long-term Storage:</strong> We do not permanently store your uploaded images or use them for any purpose other than providing the requested processing service.
                </p>
              </div>
            </motion.section>

            <motion.section variants={itemVariants} className="bg-gray-800/20 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/30">
              <h2 className="text-2xl font-bold text-white mb-4">4. Data Sharing and Third Parties</h2>
              <div className="text-gray-300 space-y-4">
                <p>We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Google OAuth:</strong> We use Google's authentication service, which is governed by Google's Privacy Policy</li>
                  <li><strong>Legal Requirements:</strong> When required by law or to protect our rights and users' safety</li>
                  <li><strong>Service Providers:</strong> With trusted service providers who assist in operating our website, subject to strict confidentiality agreements</li>
                </ul>
              </div>
            </motion.section>

            <motion.section variants={itemVariants} className="bg-gray-800/20 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/30">
              <h2 className="text-2xl font-bold text-white mb-4">5. Data Security</h2>
              <div className="text-gray-300 space-y-4">
                <p>We implement industry-standard security measures to protect your information:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Encryption in transit and at rest</li>
                  <li>Secure authentication protocols</li>
                  <li>Regular security audits and updates</li>
                  <li>Limited access controls for our systems</li>
                  <li>Automatic deletion of temporary data</li>
                </ul>
              </div>
            </motion.section>

            <motion.section variants={itemVariants} className="bg-gray-800/20 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/30">
              <h2 className="text-2xl font-bold text-white mb-4">6. Your Rights and Choices</h2>
              <div className="text-gray-300 space-y-4">
                <p>You have the following rights regarding your personal information:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Access:</strong> Request access to your personal information</li>
                  <li><strong>Correction:</strong> Request correction of inaccurate information</li>
                  <li><strong>Deletion:</strong> Request deletion of your account and associated data</li>
                  <li><strong>Portability:</strong> Request export of your data in a machine-readable format</li>
                  <li><strong>Withdrawal:</strong> Withdraw consent for data processing at any time</li>
                </ul>
                <p className="mt-4">
                  To exercise these rights, please contact us at <a href="mailto:privacy@anemoias.me" className="text-blue-400 hover:text-blue-300">privacy@anemoias.me</a>
                </p>
              </div>
            </motion.section>

            <motion.section variants={itemVariants} className="bg-gray-800/20 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/30">
              <h2 className="text-2xl font-bold text-white mb-4">7. Cookies and Tracking</h2>
              <div className="text-gray-300 space-y-4">
                <p>We use essential cookies and local storage to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Maintain your login session</li>
                  <li>Remember your preferences</li>
                  <li>Ensure proper functionality of our services</li>
                </ul>
                <p>We do not use tracking cookies for advertising purposes.</p>
              </div>
            </motion.section>

            <motion.section variants={itemVariants} className="bg-gray-800/20 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/30">
              <h2 className="text-2xl font-bold text-white mb-4">8. International Data Transfers</h2>
              <div className="text-gray-300 space-y-4">
                <p>
                  Our services are provided globally. Your information may be transferred to and processed in countries other than your own. 
                  We ensure appropriate safeguards are in place to protect your information in accordance with this privacy policy.
                </p>
              </div>
            </motion.section>

            <motion.section variants={itemVariants} className="bg-gray-800/20 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/30">
              <h2 className="text-2xl font-bold text-white mb-4">9. Children's Privacy</h2>
              <div className="text-gray-300 space-y-4">
                <p>
                  Our services are not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. 
                  If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately.
                </p>
              </div>
            </motion.section>

            <motion.section variants={itemVariants} className="bg-gray-800/20 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/30">
              <h2 className="text-2xl font-bold text-white mb-4">10. Changes to This Policy</h2>
              <div className="text-gray-300 space-y-4">
                <p>
                  We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "last updated" date. 
                  We encourage you to review this policy periodically.
                </p>
              </div>
            </motion.section>

            <motion.section variants={itemVariants} className="bg-gray-800/20 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/30">
              <h2 className="text-2xl font-bold text-white mb-4">11. Contact Us</h2>
              <div className="text-gray-300 space-y-4">
                <p>If you have any questions about this privacy policy or our data practices, please contact us:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Email: <a href="mailto:privacy@anemoias.me" className="text-blue-400 hover:text-blue-300">privacy@anemoias.me</a></li>
                  <li>Website: <a href="https://anemoias.me" className="text-blue-400 hover:text-blue-300">https://anemoias.me</a></li>
                </ul>
              </div>
            </motion.section>
          </div>

          {/* Footer Note */}
          <motion.div variants={itemVariants} className="text-center mt-12 p-6 bg-blue-500/10 border border-blue-500/20 rounded-xl">
            <p className="text-blue-300">
              This privacy policy is designed to be transparent and comprehensive. We are committed to protecting your privacy and handling your data responsibly.
            </p>
          </motion.div>
        </motion.div>

        <Footer />
      </div>
    </AnimatedPage>
  );
};

export default PrivacyPolicyPage; 