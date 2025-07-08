import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSubtitleStore } from '../../stores/subtitle-store';
import type { SubtitleSegment } from '../../types/subtitle';

interface SubtitleSegmentEditorProps {
  trackId: string;
  segment: SubtitleSegment;
  onClose?: () => void;
}

export const SubtitleSegmentEditor: React.FC<SubtitleSegmentEditorProps> = ({
  trackId,
  segment,
  onClose
}) => {
  const [text, setText] = useState(segment.text);
  const [startTime, setStartTime] = useState(segment.startTime);
  const [endTime, setEndTime] = useState(segment.endTime);
  const [isEditing, setIsEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const { updateSegment, deleteSegment, splitSegment, currentProject } = useSubtitleStore();
  
  const track = currentProject?.tracks.find(t => t.id === trackId);
  const videoDuration = currentProject?.videoDuration || 0;
  
  // Auto-focus textarea when editing
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);
  
  // Save changes
  const handleSave = () => {
    updateSegment(trackId, segment.id, {
      text: text.trim(),
      startTime: Math.max(0, Math.min(videoDuration, startTime)),
      endTime: Math.max(startTime + 0.1, Math.min(videoDuration, endTime))
    });
    setIsEditing(false);
  };
  
  // Cancel editing
  const handleCancel = () => {
    setText(segment.text);
    setStartTime(segment.startTime);
    setEndTime(segment.endTime);
    setIsEditing(false);
  };
  
  // Delete segment
  const handleDelete = () => {
    if (window.confirm('Delete this subtitle segment?')) {
      deleteSegment(trackId, segment.id);
      onClose?.();
    }
  };
  
  // Split segment at current playback time
  const handleSplit = () => {
    const playbackTime = useSubtitleStore.getState().playbackTime;
    if (playbackTime > segment.startTime && playbackTime < segment.endTime) {
      splitSegment(trackId, segment.id, playbackTime);
    }
  };
  
  // Format time for display
  const formatTimeInput = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(2);
    return `${mins}:${secs.padStart(5, '0')}`;
  };
  
  // Parse time from input
  const parseTimeInput = (value: string): number => {
    const parts = value.split(':');
    if (parts.length === 2) {
      const mins = parseInt(parts[0]) || 0;
      const secs = parseFloat(parts[1]) || 0;
      return mins * 60 + secs;
    }
    return parseFloat(value) || 0;
  };
  
  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };
  
  if (!track) return null;
  
  return (
    <motion.div
      className="bg-gray-800 rounded-lg shadow-xl overflow-hidden"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
    >
      {/* Header */}
      <div className="bg-gray-900 px-4 py-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-200">
          Edit Subtitle - {track.name}
        </h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <span className="material-symbols-outlined text-sm">close</span>
        </button>
      </div>
      
      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Text editor */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Subtitle Text
          </label>
          {isEditing ? (
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
              rows={3}
              placeholder="Enter subtitle text..."
            />
          ) : (
            <div
              onClick={() => setIsEditing(true)}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 min-h-[4rem] cursor-text hover:bg-gray-600 transition-colors"
            >
              {segment.text || <span className="text-gray-500 italic">Click to edit text...</span>}
            </div>
          )}
        </div>
        
        {/* Timing controls */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Start Time
            </label>
            <input
              type="text"
              value={formatTimeInput(startTime)}
              onChange={(e) => setStartTime(parseTimeInput(e.target.value))}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 outline-none focus:ring-2 focus:ring-cyan-500 font-mono text-sm"
              pattern="\d+:\d{2}\.\d{2}"
              placeholder="0:00.00"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              End Time
            </label>
            <input
              type="text"
              value={formatTimeInput(endTime)}
              onChange={(e) => setEndTime(parseTimeInput(e.target.value))}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 outline-none focus:ring-2 focus:ring-cyan-500 font-mono text-sm"
              pattern="\d+:\d{2}\.\d{2}"
              placeholder="0:00.00"
            />
          </div>
        </div>
        
        {/* Duration display */}
        <div className="text-sm text-gray-400">
          Duration: {formatTimeInput(endTime - startTime)}
          {segment.confidence && (
            <span className="ml-4">
              Confidence: {(segment.confidence * 100).toFixed(1)}%
            </span>
          )}
        </div>
        
        {/* Action buttons */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <motion.button
              onClick={handleDelete}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Delete
            </motion.button>
            
            {useSubtitleStore.getState().playbackTime > segment.startTime &&
             useSubtitleStore.getState().playbackTime < segment.endTime && (
              <motion.button
                onClick={handleSplit}
                className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="Split at current playback position"
              >
                Split Here
              </motion.button>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {(isEditing || startTime !== segment.startTime || endTime !== segment.endTime) && (
              <>
                <motion.button
                  onClick={handleCancel}
                  className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Cancel
                </motion.button>
                
                <motion.button
                  onClick={handleSave}
                  className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-sm transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Save
                </motion.button>
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Keyboard shortcuts hint */}
      <div className="bg-gray-900 px-4 py-2 text-xs text-gray-500 border-t border-gray-700">
        <span className="mr-4">Ctrl+Enter: Save</span>
        <span>Esc: Cancel</span>
      </div>
    </motion.div>
  );
};

export default SubtitleSegmentEditor; 