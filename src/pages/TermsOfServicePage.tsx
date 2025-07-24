import React from 'react';
import { motion } from 'framer-motion';
import Header from '../components/Header';
import Footer from '../components/Footer';
import AnimatedPage from '../components/AnimatedPage';

const TermsOfServicePage: React.FC = () => {
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
              Terms of Service
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
              <h2 className="text-2xl font-bold text-white mb-4">1. Acceptance of Terms</h2>
              <div className="text-gray-300 space-y-4">
                <p>
                  By accessing and using Anemoia ("Service", "Platform", "Website"), you accept and agree to be bound by the terms and provision of this agreement. 
                  If you do not agree to abide by the above, please do not use this service.
                </p>
                <p>
                  These Terms of Service ("Terms") govern your use of our website located at anemoias.me (the "Service") operated by Anemoia ("us", "we", or "our").
                </p>
              </div>
            </motion.section>

            <motion.section variants={itemVariants} className="bg-gray-800/20 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/30">
              <h2 className="text-2xl font-bold text-white mb-4">2. Description of Service</h2>
              <div className="text-gray-300 space-y-4">
                <p>
                  Anemoia provides AI-powered image processing tools including but not limited to:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Depth map generation</li>
                  <li>Pose estimation and analysis</li>
                  <li>AI image upscaling and enhancement</li>
                  <li>Image comparison tools</li>
                  <li>Other AI-powered image processing capabilities</li>
                </ul>
                <p>
                  Most processing occurs locally in your browser, with some features requiring server-side processing for optimal results.
                </p>
              </div>
            </motion.section>

            <motion.section variants={itemVariants} className="bg-gray-800/20 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/30">
              <h2 className="text-2xl font-bold text-white mb-4">3. User Accounts and Registration</h2>
              <div className="text-gray-300 space-y-4">
                <p>
                  To access certain features of our Service, you may be required to create an account. You agree to:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Provide accurate, current, and complete information during registration</li>
                  <li>Maintain and promptly update your account information</li>
                  <li>Maintain the security of your account credentials</li>
                  <li>Accept responsibility for all activities under your account</li>
                  <li>Notify us immediately of any unauthorized use of your account</li>
                </ul>
                <p>
                  Each user is assigned a unique ANEMO ID for account identification and service personalization.
                </p>
              </div>
            </motion.section>

            <motion.section variants={itemVariants} className="bg-gray-800/20 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/30">
              <h2 className="text-2xl font-bold text-white mb-4">4. Acceptable Use Policy</h2>
              <div className="text-gray-300 space-y-4">
                <p>You agree not to use the Service to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Upload, process, or distribute illegal, harmful, or offensive content</li>
                  <li>Violate any intellectual property rights of others</li>
                  <li>Process images of individuals without proper consent</li>
                  <li>Attempt to reverse engineer or compromise our AI models</li>
                  <li>Use the Service for commercial purposes without explicit permission</li>
                  <li>Engage in any activity that could harm or disrupt the Service</li>
                  <li>Upload content containing viruses, malware, or malicious code</li>
                  <li>Violate any applicable laws or regulations</li>
                </ul>
              </div>
            </motion.section>

            <motion.section variants={itemVariants} className="bg-gray-800/20 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/30">
              <h2 className="text-2xl font-bold text-white mb-4">5. Intellectual Property Rights</h2>
              <div className="text-gray-300 space-y-4">
                <p>
                  <strong>Your Content:</strong> You retain ownership of images you upload to our Service. By uploading content, you grant us a limited license to process, display, and analyze your images solely for providing the requested services.
                </p>
                <p>
                  <strong>Our Content:</strong> The Service, including its original content, features, functionality, AI models, and underlying technology, is owned by Anemoia and is protected by international copyright, trademark, and other intellectual property laws.
                </p>
                <p>
                  <strong>AI Models:</strong> Our AI models are based on open-source technologies including Real-ESRGAN, Real-CUGAN, and other publicly available models, enhanced with our proprietary improvements.
                </p>
              </div>
            </motion.section>

            <motion.section variants={itemVariants} className="bg-gray-800/20 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/30">
              <h2 className="text-2xl font-bold text-white mb-4">6. Privacy and Data Protection</h2>
              <div className="text-gray-300 space-y-4">
                <p>
                  Your privacy is important to us. Our collection and use of personal information is governed by our Privacy Policy, which is incorporated into these Terms by reference.
                </p>
                <p>
                  Key privacy principles:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Images are processed locally when possible</li>
                  <li>Server-processed images are automatically deleted after processing</li>
                  <li>We do not use your images for training our models</li>
                  <li>Account data is securely stored and protected</li>
                </ul>
              </div>
            </motion.section>

            <motion.section variants={itemVariants} className="bg-gray-800/20 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/30">
              <h2 className="text-2xl font-bold text-white mb-4">7. Service Availability and Performance</h2>
              <div className="text-gray-300 space-y-4">
                <p>
                  We strive to provide reliable service but cannot guarantee:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Uninterrupted access to the Service</li>
                  <li>Error-free operation</li>
                  <li>Specific processing times or quality results</li>
                  <li>Compatibility with all devices or browsers</li>
                </ul>
                <p>
                  Processing performance may vary based on your device capabilities, internet connection, and image complexity.
                </p>
              </div>
            </motion.section>

            <motion.section variants={itemVariants} className="bg-gray-800/20 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/30">
              <h2 className="text-2xl font-bold text-white mb-4">8. Limitations of Liability</h2>
              <div className="text-gray-300 space-y-4">
                <p>
                  To the maximum extent permitted by law, Anemoia shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Loss of profits, data, use, goodwill, or other intangible losses</li>
                  <li>Damages resulting from unauthorized access to your account</li>
                  <li>Interruption or cessation of transmission to or from the Service</li>
                  <li>Damages arising from the use or inability to use the Service</li>
                </ul>
                <p>
                  In no event shall our total liability exceed the amount paid by you, if any, for using the Service.
                </p>
              </div>
            </motion.section>

            <motion.section variants={itemVariants} className="bg-gray-800/20 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/30">
              <h2 className="text-2xl font-bold text-white mb-4">9. Disclaimers</h2>
              <div className="text-gray-300 space-y-4">
                <p>
                  The Service is provided "as is" and "as available" without any warranties of any kind, either express or implied, including but not limited to:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Merchantability and fitness for a particular purpose</li>
                  <li>Non-infringement of third-party rights</li>
                  <li>Accuracy, reliability, or completeness of results</li>
                  <li>Security of data transmission or storage</li>
                </ul>
                <p>
                  AI processing results may vary and should not be relied upon for critical decisions without human verification.
                </p>
              </div>
            </motion.section>

            <motion.section variants={itemVariants} className="bg-gray-800/20 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/30">
              <h2 className="text-2xl font-bold text-white mb-4">10. Termination</h2>
              <div className="text-gray-300 space-y-4">
                <p>
                  We may terminate or suspend your account and access to the Service at our sole discretion, without prior notice, for any reason, including:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Violation of these Terms</li>
                  <li>Fraudulent or illegal activity</li>
                  <li>Extended periods of inactivity</li>
                  <li>Technical or security reasons</li>
                </ul>
                <p>
                  You may terminate your account at any time by contacting us. Upon termination, your right to use the Service will cease immediately.
                </p>
              </div>
            </motion.section>

            <motion.section variants={itemVariants} className="bg-gray-800/20 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/30">
              <h2 className="text-2xl font-bold text-white mb-4">11. Governing Law</h2>
              <div className="text-gray-300 space-y-4">
                <p>
                  These Terms shall be governed by and construed in accordance with the laws of your jurisdiction, without regard to conflict of law provisions.
                </p>
                <p>
                  Any disputes arising from these Terms or your use of the Service shall be resolved through binding arbitration or in the appropriate courts.
                </p>
              </div>
            </motion.section>

            <motion.section variants={itemVariants} className="bg-gray-800/20 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/30">
              <h2 className="text-2xl font-bold text-white mb-4">12. Changes to Terms</h2>
              <div className="text-gray-300 space-y-4">
                <p>
                  We reserve the right to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days notice prior to any new terms taking effect.
                </p>
                <p>
                  What constitutes a material change will be determined at our sole discretion. By continuing to access or use our Service after those revisions become effective, you agree to be bound by the revised terms.
                </p>
              </div>
            </motion.section>

            <motion.section variants={itemVariants} className="bg-gray-800/20 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/30">
              <h2 className="text-2xl font-bold text-white mb-4">13. Contact Information</h2>
              <div className="text-gray-300 space-y-4">
                <p>If you have any questions about these Terms of Service, please contact us:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Email: <a href="mailto:legal@anemoias.me" className="text-blue-400 hover:text-blue-300">legal@anemoias.me</a></li>
                  <li>Website: <a href="https://anemoias.me" className="text-blue-400 hover:text-blue-300">https://anemoias.me</a></li>
                  <li>Support: <a href="/support" className="text-blue-400 hover:text-blue-300">support@anemoias.me</a></li>
                </ul>
              </div>
            </motion.section>
          </div>

          {/* Footer Note */}
          <motion.div variants={itemVariants} className="text-center mt-12 p-6 bg-blue-500/10 border border-blue-500/20 rounded-xl">
            <p className="text-blue-300">
              By using Anemoia, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
            </p>
          </motion.div>
        </motion.div>

        <Footer />
      </div>
    </AnimatedPage>
  );
};

export default TermsOfServicePage; 