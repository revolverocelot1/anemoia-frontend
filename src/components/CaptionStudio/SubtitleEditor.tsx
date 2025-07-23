import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit3, Trash2, Check, X, Clock, Type } from 'lucide-react';
import { SubtitleSegment } from '../../types/caption-studio';

interface SubtitleEditorProps {
  subtitles: SubtitleSegment[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onUpdate: (id: string, updates: Partial<SubtitleSegment>) => void;
  onDelete: (id: string) => void;
  className?: string;
}

const SubtitleEditor: React.FC<SubtitleEditorProps> = ({
  subtitles,
  selectedId,
  onSelect,
  onUpdate,
  onDelete,
  className = ''
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [editText]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const millis = Math.floor((seconds % 1) * 1000);
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`;
  };

  const parseTime = (timeStr: string): number | null => {
    const parts = timeStr.split(':');
    if (parts.length < 2) return null;
    
    let hours = 0;
    let minutes = 0;
    let seconds = 0;
    
    if (parts.length === 3) {
      hours = parseInt(parts[0]) || 0;
      minutes = parseInt(parts[1]) || 0;
      seconds = parseFloat(parts[2]) || 0;
    } else {
      minutes = parseInt(parts[0]) || 0;
      seconds = parseFloat(parts[1]) || 0;
    }
    
    return hours * 3600 + minutes * 60 + seconds;
  };

  const startEdit = (subtitle: SubtitleSegment) => {
    setEditingId(subtitle.id);
    setEditText(subtitle.text);
    setEditStartTime(formatTime(subtitle.startTime));
    setEditEndTime(formatTime(subtitle.endTime));
  };

  const saveEdit = () => {
    if (!editingId) return;
    
    const startTime = parseTime(editStartTime);
    const endTime = parseTime(editEndTime);
    
    if (startTime === null || endTime === null || startTime >= endTime) {
      // Invalid times
      cancelEdit();
      return;
    }
    
    onUpdate(editingId, {
      text: editText.trim(),
      startTime,
      endTime
    });
    
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
    setEditStartTime('');
    setEditEndTime('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      saveEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <AnimatePresence>
        {subtitles.map((subtitle) => (
          <motion.div
            key={subtitle.id}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`bg-gray-800 rounded-lg p-4 cursor-pointer transition-all ${
              selectedId === subtitle.id ? 'ring-2 ring-purple-500' : ''
            } ${editingId === subtitle.id ? 'ring-2 ring-blue-500' : ''}`}
            onClick={() => editingId !== subtitle.id && onSelect(subtitle.id)}
          >
            {editingId === subtitle.id ? (
              // Edit mode
              <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                {/* Time inputs */}
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={editStartTime}
                    onChange={(e) => setEditStartTime(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="px-2 py-1 bg-gray-700 text-white rounded text-sm w-24"
                    placeholder="00:00.000"
                  />
                  <span className="text-gray-400">→</span>
                  <input
                    type="text"
                    value={editEndTime}
                    onChange={(e) => setEditEndTime(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="px-2 py-1 bg-gray-700 text-white rounded text-sm w-24"
                    placeholder="00:00.000"
                  />
                </div>
                
                {/* Text input */}
                <div className="flex items-start gap-2">
                  <Type className="w-4 h-4 text-gray-400 mt-1" />
                  <textarea
                    ref={textareaRef}
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1 px-2 py-1 bg-gray-700 text-white rounded resize-none overflow-hidden"
                    placeholder="Subtitle text..."
                    rows={1}
                  />
                </div>
                
                {/* Action buttons */}
                <div className="flex justify-end gap-2">
                  <button
                    onClick={saveEdit}
                    className="p-1 text-green-500 hover:text-green-400 transition-colors"
                    title="Save (Ctrl+Enter)"
                  >
                    <Check className="w-5 h-5" />
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="p-1 text-red-500 hover:text-red-400 transition-colors"
                    title="Cancel (Esc)"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ) : (
              // View mode
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Clock className="w-4 h-4" />
                    <span>{formatTime(subtitle.startTime)} → {formatTime(subtitle.endTime)}</span>
                    <span className="text-gray-600">
                      ({(subtitle.endTime - subtitle.startTime).toFixed(1)}s)
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startEdit(subtitle);
                      }}
                      className="p-1 text-gray-400 hover:text-white transition-colors"
                      title="Edit"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(subtitle.id);
                      }}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <p className="text-white whitespace-pre-wrap">
                  {subtitle.text || <span className="text-gray-500 italic">Empty subtitle</span>}
                </p>
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default SubtitleEditor; 