import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';

const ImageChatLanding = () => {
  const [messageIndex, setMessageIndex] = useState(0);
  const [sparklePositions, setSparklePositions] = useState<Array<{x: number, y: number, delay: number}>>([]);

  const demoMessages = [
    { type: 'user', text: 'What\'s in this image? 📸' },
    { type: 'ai', text: 'I can see a beautiful sunset over mountains! 🌄✨' },
    { type: 'user', text: 'Describe the colors!' },
    { type: 'ai', text: 'Warm oranges and purples blending perfectly! 🎨' },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % demoMessages.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setSparklePositions(
      Array.from({ length: 30 }, () => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 3,
      }))
    );
  }, []);

  useEffect(() => {
    document.title = 'AI Image Chat - Talk to Your Images with Gemini | Anemoia';
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-orange-50 to-yellow-50 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Sparkles */}
        {sparklePositions.map((pos, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            animate={{
              scale: [0, 1.5, 0],
              opacity: [0, 1, 0],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: pos.delay,
            }}
          >
            <div className="w-3 h-3 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full" 
                 style={{ boxShadow: '0 0 20px rgba(251, 146, 60, 0.6)' }} />
          </motion.div>
        ))}

        {/* Gradient Orbs */}
        <motion.div
          className="absolute top-20 right-20 w-96 h-96 bg-gradient-to-br from-rose-300/40 to-pink-300/40 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], x: [0, 50, 0], y: [0, -30, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-20 left-20 w-96 h-96 bg-gradient-to-br from-orange-300/40 to-yellow-300/40 rounded-full blur-3xl"
          animate={{ scale: [1, 1.3, 1], x: [0, -50, 0], y: [0, 30, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-8"
        >
          <Link to="/" className="inline-flex items-center gap-2 text-rose-600 hover:text-orange-500 transition-colors group">
            <motion.span 
              className="material-symbols-outlined text-2xl"
              whileHover={{ x: -5 }}
            >
              arrow_back
            </motion.span>
            <span className="font-bold text-lg">Back to Tools</span>
          </Link>
        </motion.header>

        {/* Hero Section */}
        <section className="px-8 py-12 max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            {/* Chat Bubble Animation */}
            <div className="relative w-56 h-56 mx-auto mb-12">
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <div className="relative">
                  {/* Main Chat Bubble */}
                  <div className="w-40 h-40 bg-gradient-to-br from-rose-400 via-orange-400 to-yellow-400 rounded-3xl flex items-center justify-center shadow-2xl">
                    <span className="text-7xl">💬</span>
                  </div>
                  
                  {/* Image Icon */}
                  <motion.div
                    className="absolute -top-8 -right-8 w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-xl"
                    animate={{ rotate: [0, -10, 10, -10, 0], scale: [1, 1.1, 1] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                    <span className="text-4xl">🖼️</span>
                  </motion.div>
                  
                  {/* AI Sparkle */}
                  <motion.div
                    className="absolute -bottom-6 -left-6 w-16 h-16 bg-gradient-to-br from-pink-400 to-rose-500 rounded-full flex items-center justify-center shadow-xl"
                    animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <span className="text-3xl">✨</span>
                  </motion.div>
                </div>
              </motion.div>

              {/* Orbiting Icons */}
              {['🤖', '🎨', '📸', '💡'].map((emoji, i) => (
                <motion.div
                  key={i}
                  className="absolute"
                  style={{
                    top: '50%',
                    left: '50%',
                  }}
                  animate={{
                    rotate: [i * 90, i * 90 + 360],
                  }}
                  transition={{
                    duration: 8,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                >
                  <div 
                    className="text-3xl"
                    style={{
                      transform: 'translate(-50%, -50%) translateY(-120px)',
                    }}
                  >
                    {emoji}
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.h1 
              className="text-6xl md:text-9xl font-black mb-6 leading-tight"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.8 }}
            >
              <span className="block bg-gradient-to-r from-rose-500 via-orange-500 to-yellow-500 bg-clip-text text-transparent drop-shadow-lg">
                Image Chat
              </span>
              <span className="block text-3xl md:text-5xl mt-4 font-bold bg-gradient-to-r from-orange-600 to-rose-600 bg-clip-text text-transparent">
                Talk to Your Images 💬
              </span>
            </motion.h1>
            
            <motion.p 
              className="text-xl md:text-2xl text-gray-700 mb-12 max-w-3xl mx-auto leading-relaxed font-medium"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              Chat with <span className="text-rose-600 font-bold">Google Gemini AI</span> about your images! 
              Upload multiple photos and have natural conversations about what's inside. 
              <span className="text-orange-600 font-bold"> Powered by cutting-edge multimodal AI!</span>
            </motion.p>

            {/* Demo Chat Animation */}
            <motion.div 
              className="max-w-md mx-auto bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border-4 border-white p-6 mb-12"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 }}
            >
              <div className="flex gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="space-y-3 min-h-[200px]">
                {demoMessages.slice(0, messageIndex + 1).map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: msg.type === 'user' ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`px-4 py-2 rounded-2xl max-w-[80%] ${
                      msg.type === 'user' 
                        ? 'bg-gradient-to-r from-rose-500 to-orange-500 text-white' 
                        : 'bg-gradient-to-r from-yellow-400 to-orange-400 text-white'
                    }`}>
                      <p className="font-medium">{msg.text}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* CTA Button */}
            <Link to="/image-chat">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative group px-16 py-8 overflow-hidden rounded-full shadow-2xl"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-rose-500 via-orange-500 to-yellow-500 animate-gradient-x" />
                <motion.div 
                  className="absolute inset-0 bg-gradient-to-r from-rose-400 via-orange-400 to-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity"
                />
                <span className="relative z-10 text-white font-black text-3xl flex items-center gap-4 drop-shadow-lg">
                  <span className="text-4xl">💬</span>
                  Start Chatting
                  <span className="text-4xl">✨</span>
                </span>
              </motion.button>
            </Link>
            
            <motion.p 
              className="text-gray-600 text-sm mt-6 font-medium"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              🚀 Powered by Google Gemini • Multi-Image Support • Natural Conversations 🚀
            </motion.p>
          </motion.div>
        </section>

        {/* Features */}
        <section className="px-8 py-16 max-w-7xl mx-auto">
          <motion.h2 
            className="text-5xl md:text-6xl font-black text-center mb-16 bg-gradient-to-r from-rose-600 via-orange-600 to-yellow-600 bg-clip-text text-transparent"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            ✨ Amazing Features ✨
          </motion.h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { emoji: '📚', title: 'Multi-Image Chat', desc: 'Upload up to 10 images at once and discuss them together in one conversation!', gradient: 'from-rose-400 to-pink-500', bg: 'from-rose-50 to-pink-50' },
              { emoji: '🧠', title: 'Context Memory', desc: 'Gemini remembers your entire conversation for intelligent follow-up questions!', gradient: 'from-orange-400 to-amber-500', bg: 'from-orange-50 to-amber-50' },
              { emoji: '🎨', title: 'Image Analysis', desc: 'Detailed descriptions, object detection, color analysis, and visual understanding!', gradient: 'from-yellow-400 to-orange-500', bg: 'from-yellow-50 to-orange-50' },
              { emoji: '⚡', title: 'Lightning Fast', desc: 'Get instant AI responses powered by Google\'s latest multimodal Gemini models!', gradient: 'from-cyan-400 to-teal-500', bg: 'from-cyan-50 to-teal-50' },
              { emoji: '🔧', title: 'Advanced Settings', desc: 'Fine-tune temperature, topP, and topK parameters for customized AI behavior!', gradient: 'from-purple-400 to-violet-500', bg: 'from-purple-50 to-violet-50' },
              { emoji: '💾', title: 'Conversation Export', desc: 'Save your chat history and share insights with team members easily!', gradient: 'from-green-400 to-emerald-500', bg: 'from-green-50 to-emerald-50' },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -10, scale: 1.02 }}
                className="relative group cursor-pointer"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.bg} rounded-3xl blur-xl group-hover:blur-2xl transition-all`} />
                <div className={`relative bg-gradient-to-br ${feature.bg} rounded-3xl p-8 shadow-xl border-4 border-white`}>
                  <div className={`w-20 h-20 bg-gradient-to-br ${feature.gradient} rounded-2xl flex items-center justify-center mb-6 shadow-lg`}>
                    <span className="text-5xl">{feature.emoji}</span>
                  </div>
                  <h3 className={`text-2xl font-black mb-3 bg-gradient-to-r ${feature.gradient} bg-clip-text text-transparent`}>
                    {feature.title}
                  </h3>
                  <p className="text-gray-700 leading-relaxed font-medium">{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Use Cases */}
        <section className="px-8 py-16 max-w-6xl mx-auto">
          <motion.h2 
            className="text-4xl md:text-5xl font-black text-center mb-12 bg-gradient-to-r from-orange-600 to-rose-600 bg-clip-text text-transparent"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            Perfect For
          </motion.h2>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              { icon: '🎨', title: 'Designers & Artists', desc: 'Get instant feedback on designs, color schemes, and visual compositions', color: 'from-pink-400 to-rose-500' },
              { icon: '📸', title: 'Photographers', desc: 'Analyze lighting, composition, and technical aspects of your photos', color: 'from-orange-400 to-amber-500' },
              { icon: '🏪', title: 'E-commerce', desc: 'Generate product descriptions and identify items in product photos', color: 'from-yellow-400 to-orange-500' },
              { icon: '🏥', title: 'Medical & Research', desc: 'Discuss medical images, research data visualizations, and scientific imagery', color: 'from-teal-400 to-cyan-500' },
              { icon: '🏗️', title: 'Architecture', desc: 'Review building designs, floor plans, and architectural drawings with AI', color: 'from-indigo-400 to-purple-500' },
              { icon: '📚', title: 'Education', desc: 'Teach and learn with visual aids - perfect for homework help and tutoring', color: 'from-green-400 to-emerald-500' },
            ].map((useCase, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`relative bg-gradient-to-br ${useCase.color} p-6 rounded-2xl shadow-2xl text-white`}
              >
                <div className="flex items-start gap-4">
                  <span className="text-5xl">{useCase.icon}</span>
                  <div>
                    <h3 className="text-2xl font-bold mb-2">{useCase.title}</h3>
                    <p className="text-white/90 leading-relaxed">{useCase.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-8 py-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto"
          >
            <h2 className="text-5xl md:text-7xl font-black mb-6 bg-gradient-to-r from-rose-500 via-orange-500 to-yellow-500 bg-clip-text text-transparent">
              Start Chatting with Your Images! 🎨✨
            </h2>
            <p className="text-xl text-gray-700 mb-8 font-medium">
              Experience the magic of AI-powered visual conversations with Google Gemini!
            </p>
            <Link to="/image-chat">
              <motion.button
                whileHover={{ scale: 1.1, rotate: [0, -2, 2, -2, 0] }}
                whileTap={{ scale: 0.9 }}
                className="px-16 py-8 bg-gradient-to-r from-rose-500 via-orange-500 to-yellow-500 text-white font-black text-3xl rounded-full shadow-2xl"
              >
                <span className="flex items-center gap-4">
                  <span>🚀</span>
                  Launch Image Chat
                  <span>💬</span>
                </span>
              </motion.button>
            </Link>
          </motion.div>
        </section>
      </div>

      {/* Custom Styles */}
      <style>{`
        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradient-x 3s ease infinite;
        }
      `}</style>
    </div>
  );
};

export default ImageChatLanding;

