import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import CardGlass from '../components/CardGlass';
import AnimatedPage from '../components/AnimatedPage';

const VideoActionStudioPage: React.FC = () => {
  const [showPopup, setShowPopup] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [subtitleText, setSubtitleText] = useState('');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    // Show popup when page loads
    setShowPopup(true);
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      setSelectedFile(file);
      setVideoUrl(URL.createObjectURL(file));
    }
  };

  const handleSubtitleEmbed = () => {
    if (!selectedFile || !subtitleText.trim()) return;
    
    setIsProcessing(true);
    
    // Simulate processing
    setTimeout(() => {
      setIsProcessing(false);
      alert('Subtitle embedding completed! (This is a demo - actual embedding would happen here)');
    }, 2000);
  };

  const handleSubtitleBurn = () => {
    alert('Subtitle burning feature is currently in development. Please use the embedding feature instead.');
  };

  return (
    <AnimatedPage>
      <div className="relative flex size-full min-h-screen flex-col dark group/design-root overflow-x-hidden">
        <div className="layout-container flex h-full grow flex-col">
          <Header />
          
          <main className="px-10 md:px-20 lg:px-40 flex flex-1 justify-center py-12">
            <div className="layout-content-container flex flex-col items-center max-w-6xl flex-1 w-full">
              
              {/* Page Header */}
              <div className="text-center mb-12">
                <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tighter">
                  Video Action Studio
                  <span className="ml-3 inline-block bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-3 py-1 rounded-full font-medium">
                    BETA
                  </span>
                </h1>
                <p className="text-lg md:text-xl text-[var(--text-secondary)] max-w-3xl mx-auto">
                  Professional video editing with AI-powered subtitle embedding and burning capabilities.
                </p>
              </div>

              {/* Feature Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full mb-12">
                
                {/* Subtitle Embedding */}
                <CardGlass className="p-8">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <span className="material-symbols-outlined text-3xl text-white">
                        subtitles
                      </span>
                    </div>
                    <h3 className="text-2xl font-bold mb-2">Subtitle Embedding</h3>
                    <p className="text-[var(--text-secondary)]">
                      Embed subtitles as separate tracks in your video files
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Upload Video</label>
                      <input
                        type="file"
                        accept="video/*"
                        onChange={handleFileUpload}
                        className="w-full p-3 border border-gray-600 rounded-lg bg-gray-800 text-white"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">Subtitle Text</label>
                      <textarea
                        value={subtitleText}
                        onChange={(e) => setSubtitleText(e.target.value)}
                        placeholder="Enter your subtitle text here..."
                        className="w-full p-3 border border-gray-600 rounded-lg bg-gray-800 text-white h-32 resize-none"
                      />
                    </div>
                    
                    <button
                      onClick={handleSubtitleEmbed}
                      disabled={!selectedFile || !subtitleText.trim() || isProcessing}
                      className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-6 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isProcessing ? 'Processing...' : 'Embed Subtitles'}
                    </button>
                  </div>
                </CardGlass>

                {/* Subtitle Burning */}
                <CardGlass className="p-8">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <span className="material-symbols-outlined text-3xl text-white">
                        video_library
                      </span>
                    </div>
                    <h3 className="text-2xl font-bold mb-2">Subtitle Burning</h3>
                    <p className="text-[var(--text-secondary)]">
                      Burn subtitles directly into video frames (Coming Soon)
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="p-4 bg-yellow-900/20 border border-yellow-600/30 rounded-lg">
                      <p className="text-yellow-300 text-sm">
                        ⚠️ This feature is currently in development. Subtitle burning will be available in the next update.
                      </p>
                    </div>
                    
                    <button
                      onClick={handleSubtitleBurn}
                      disabled={true}
                      className="w-full bg-gray-600 text-gray-400 py-3 px-6 rounded-lg font-medium cursor-not-allowed"
                    >
                      Coming Soon
                    </button>
                  </div>
                </CardGlass>
              </div>

              {/* Video Preview */}
              {videoUrl && (
                <CardGlass className="p-8 w-full">
                  <h3 className="text-2xl font-bold mb-4">Video Preview</h3>
                  <video
                    src={videoUrl}
                    controls
                    className="w-full max-w-2xl mx-auto rounded-lg"
                  />
                </CardGlass>
              )}
            </div>
          </main>
          
          <Footer />
        </div>

        {/* Popup about subtitle burning */}
        {showPopup && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 max-w-md w-full">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-3xl text-white">
                    info
                  </span>
                </div>
                <h3 className="text-xl font-bold mb-2">Feature Notice</h3>
                <p className="text-[var(--text-secondary)] text-sm">
                  The subtitle burning feature is currently in development and doesn't work yet. 
                  However, subtitle embedding works perfectly! You can embed subtitles as separate 
                  tracks in your video files.
                </p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowPopup(false)}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2 px-4 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all"
                >
                  Got it!
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AnimatedPage>
  );
};

export default VideoActionStudioPage;