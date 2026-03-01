import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { 
  SubtitleProject, 
  SubtitleTrack, 
  SubtitleSegment, 
  SubtitleStyle
} from '../types/subtitle';
import { DEFAULT_SUBTITLE_STYLE } from '../types/subtitle';

interface SubtitleState {
  // Projects
  projects: SubtitleProject[];
  currentProjectId: string | null;
  currentProject: SubtitleProject | null;
  
  // Video
  videoFile: File | null;
  videoUrl: string | null;
  videoDuration: number;
  videoWidth: number;
  videoHeight: number;
  
  // Playback
  playbackTime: number;
  playbackRate: number;
  isPlaying: boolean;
  volume: number;
  
  // Selection
  selectedSegmentIds: string[];
  selectedSegmentId: string | null;
  activeTrackId: string | null;
  
  // UI State
  zoomLevel: number;
  scrollPosition: number;
  showWaveform: boolean;
  showTimestamps: boolean;
  snapToGrid: boolean;
  gridSize: number;
  
  // Transcription
  isTranscribing: boolean;
  selectedModel: string;
  transcriptionLanguage: string;
  
  // Styling
  subtitleStyle: SubtitleStyle;
  
  // Auto-save
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
  autoSaveEnabled: boolean;
  autoSaveInterval: number;
  
  // History
  history: any[];
  historyIndex: number;
  maxHistorySize: number;
  
  // Actions - Project Management
  createProject: (options: { name: string; videoUrl?: string; videoName?: string }) => void;
  loadProject: (projectId: string) => void;
  saveProject: () => void;
  deleteProject: (projectId: string) => void;
  
  // Actions - Video
  setVideoFile: (file: File | null) => void;
  setVideoUrl: (url: string | null) => void;
  setVideoDuration: (duration: number) => void;
  setVideoSize: (width: number, height: number) => void;
  
  // Actions - Playback
  setPlaybackTime: (time: number) => void;
  setPlaybackRate: (rate: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setVolume: (volume: number) => void;
  seekTo: (time: number) => void;
  skipForward: (seconds: number) => void;
  skipBackward: (seconds: number) => void;
  
  // Actions - Tracks
  addTrack: (track: Partial<SubtitleTrack>) => void;
  updateTrack: (trackId: string, updates: Partial<SubtitleTrack>) => void;
  deleteTrack: (trackId: string) => void;
  setActiveTrack: (trackId: string) => void;
  
  // Actions - Segments
  addSegment: (trackId: string, segment: Partial<SubtitleSegment>) => void;
  addSegments: (trackId: string, segments: SubtitleSegment[]) => void;
  updateSegment: (trackId: string, segmentId: string, updates: Partial<SubtitleSegment>) => void;
  deleteSegment: (trackId: string, segmentId: string) => void;
  deleteSelectedSegments: () => void;
  
  // Actions - Selection
  selectSegment: (segmentId: string, multi?: boolean) => void;
  selectAllSegments: () => void;
  clearSelection: () => void;
  
  // Actions - Segment Operations
  splitSegment: (trackId: string, segmentId: string, time: number) => void;
  mergeSegments: (trackId: string, segmentIds: string[]) => void;
  shiftSegments: (trackId: string, segmentIds: string[], deltaTime: number) => void;
  
  // Actions - UI
  setZoomLevel: (level: number) => void;
  setScrollPosition: (position: number) => void;
  toggleWaveform: () => void;
  toggleTimestamps: () => void;
  toggleSnapToGrid: () => void;
  setGridSize: (size: number) => void;
  
  // Actions - Transcription
  setIsTranscribing: (transcribing: boolean) => void;
  setSelectedModel: (model: string) => void;
  setTranscriptionLanguage: (language: string) => void;
  
  // Actions - Styling
  updateStyle: (style: Partial<SubtitleStyle>) => void;
  setSubtitleStyle: (style: Partial<SubtitleStyle>) => void;
  applyStyleToSelected: (style: Partial<SubtitleStyle>) => void;
  
  // Actions - History
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;
}

const useSubtitleStore = create<SubtitleState>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial state
  projects: [],
        currentProjectId: null,
  currentProject: null,
        videoFile: null,
        videoUrl: null,
        videoDuration: 0,
        videoWidth: 1920,
        videoHeight: 1080,
  playbackTime: 0,
        playbackRate: 1,
  isPlaying: false,
        volume: 1,
        selectedSegmentIds: [],
        selectedSegmentId: null,
        activeTrackId: null,
        zoomLevel: 1,
        scrollPosition: 0,
        showWaveform: false,
        showTimestamps: true,
        snapToGrid: true,
        gridSize: 0.1,
        isTranscribing: false,
        selectedModel: 'whisper-base',
        transcriptionLanguage: 'auto',
        subtitleStyle: DEFAULT_SUBTITLE_STYLE,
        lastSaved: null,
        hasUnsavedChanges: false,
        autoSaveEnabled: true,
        autoSaveInterval: 30000,
        history: [],
        historyIndex: -1,
        maxHistorySize: 50,

        // Project Management
        createProject: (options) => set((state) => {
          const project: SubtitleProject = {
            id: `project-${Date.now()}`,
            name: options.name,
            videoUrl: options.videoUrl || null,
            videoFile: null,
  videoDuration: 0,
            videoWidth: 1920,
            videoHeight: 1080,
            tracks: [],
            activeTrackId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
            style: DEFAULT_SUBTITLE_STYLE
          };
          
          state.projects.push(project);
          state.currentProjectId = project.id;
          state.currentProject = project;
          state.hasUnsavedChanges = true;
          
          // Create default track
          const defaultTrack: SubtitleTrack = {
            id: `track-${Date.now()}`,
            name: 'Default Track',
            language: 'en',
            segments: [],
            isVisible: true,
            isLocked: false,
            style: DEFAULT_SUBTITLE_STYLE
          };
          
          project.tracks.push(defaultTrack);
          project.activeTrackId = defaultTrack.id;
          state.activeTrackId = defaultTrack.id;
        }),

        loadProject: (projectId) => set((state) => {
          const project = state.projects.find(p => p.id === projectId);
          if (project) {
            state.currentProjectId = project.id;
            state.currentProject = project;
            state.activeTrackId = project.activeTrackId;
            state.videoUrl = project.videoUrl || null;
            state.videoDuration = project.videoDuration;
            state.videoWidth = project.videoWidth;
            state.videoHeight = project.videoHeight;
          }
        }),

        saveProject: () => set((state) => {
          if (state.currentProject) {
            state.currentProject.updatedAt = new Date();
            state.lastSaved = new Date();
            state.hasUnsavedChanges = false;
          }
        }),

        deleteProject: (projectId) => set((state) => {
          state.projects = state.projects.filter(p => p.id !== projectId);
          if (state.currentProjectId === projectId) {
            state.currentProjectId = null;
            state.currentProject = null;
          }
        }),

        // Video
        setVideoFile: (file) => set((state) => {
          state.videoFile = file;
          if (file && state.currentProject) {
            state.currentProject.videoFile = file;
            state.hasUnsavedChanges = true;
          }
        }),

        setVideoUrl: (url) => set((state) => {
          state.videoUrl = url;
          if (state.currentProject) {
            state.currentProject.videoUrl = url;
            state.hasUnsavedChanges = true;
          }
        }),

        setVideoDuration: (duration) => set((state) => {
          state.videoDuration = duration;
          if (state.currentProject) {
            state.currentProject.videoDuration = duration;
          }
        }),

        setVideoSize: (width, height) => set((state) => {
          state.videoWidth = width;
          state.videoHeight = height;
          if (state.currentProject) {
            state.currentProject.videoWidth = width;
            state.currentProject.videoHeight = height;
          }
        }),

        // Playback
        setPlaybackTime: (time) => set((state) => {
          state.playbackTime = time;
        }),

        setPlaybackRate: (rate) => set((state) => {
          state.playbackRate = rate;
        }),

        setIsPlaying: (playing) => set((state) => {
          state.isPlaying = playing;
        }),

        setVolume: (volume) => set((state) => {
          state.volume = volume;
        }),

        seekTo: (time) => set((state) => {
          state.playbackTime = time;
        }),

        skipForward: (seconds) => set((state) => {
          state.playbackTime = Math.min(state.playbackTime + seconds, state.videoDuration);
        }),

        skipBackward: (seconds) => set((state) => {
          state.playbackTime = Math.max(state.playbackTime - seconds, 0);
        }),

        // Tracks
        addTrack: (track) => set((state) => {
          if (!state.currentProject) return;
          
          const newTrack: SubtitleTrack = {
            id: `track-${Date.now()}`,
            name: track.name || 'New Track',
            language: track.language || 'en',
            segments: [],
            isVisible: true,
            isLocked: false,
            style: track.style || DEFAULT_SUBTITLE_STYLE,
            ...track
          };
          
          state.currentProject.tracks.push(newTrack);
          state.hasUnsavedChanges = true;
          
          if (!state.activeTrackId) {
            state.activeTrackId = newTrack.id;
            state.currentProject.activeTrackId = newTrack.id;
          }
        }),

        updateTrack: (trackId, updates) => set((state) => {
          if (!state.currentProject) return;
          
          const track = state.currentProject.tracks.find(t => t.id === trackId);
          if (track) {
            Object.assign(track, updates);
            state.hasUnsavedChanges = true;
          }
        }),

        deleteTrack: (trackId) => set((state) => {
          if (!state.currentProject) return;
          
          state.currentProject.tracks = state.currentProject.tracks.filter(t => t.id !== trackId);
          
          if (state.activeTrackId === trackId) {
            state.activeTrackId = state.currentProject.tracks[0]?.id || null;
            state.currentProject.activeTrackId = state.activeTrackId;
          }
          
          state.hasUnsavedChanges = true;
        }),

        setActiveTrack: (trackId) => set((state) => {
          state.activeTrackId = trackId;
          if (state.currentProject) {
            state.currentProject.activeTrackId = trackId;
            state.hasUnsavedChanges = true;
          }
        }),

        // Segments
        addSegment: (trackId, segment) => set((state) => {
          if (!state.currentProject) return;
          
          const track = state.currentProject.tracks.find(t => t.id === trackId);
          if (track) {
            const newSegment: SubtitleSegment = {
              id: `segment-${Date.now()}`,
              text: segment.text || '',
              startTime: segment.startTime || state.playbackTime,
              endTime: segment.endTime || state.playbackTime + 2,
              ...segment
            };
            
            track.segments.push(newSegment);
            track.segments.sort((a, b) => a.startTime - b.startTime);
            state.hasUnsavedChanges = true;
          }
        }),

        addSegments: (trackId, segments) => set((state) => {
          if (!state.currentProject) return;
          
          const track = state.currentProject.tracks.find(t => t.id === trackId);
          if (track) {
            track.segments.push(...segments);
            track.segments.sort((a, b) => a.startTime - b.startTime);
            state.hasUnsavedChanges = true;
          }
        }),

        updateSegment: (trackId, segmentId, updates) => set((state) => {
          if (!state.currentProject) return;
          
          const track = state.currentProject.tracks.find(t => t.id === trackId);
          if (track) {
            const segment = track.segments.find(s => s.id === segmentId);
            if (segment) {
              Object.assign(segment, updates);
              track.segments.sort((a, b) => a.startTime - b.startTime);
              state.hasUnsavedChanges = true;
            }
          }
        }),

        deleteSegment: (trackId, segmentId) => set((state) => {
          if (!state.currentProject) return;
          
          const track = state.currentProject.tracks.find(t => t.id === trackId);
          if (track) {
            track.segments = track.segments.filter(s => s.id !== segmentId);
            state.hasUnsavedChanges = true;
          }
        }),

        deleteSelectedSegments: () => set((state) => {
          if (!state.currentProject || !state.activeTrackId) return;
          
          const track = state.currentProject.tracks.find(t => t.id === state.activeTrackId);
          if (track) {
            track.segments = track.segments.filter(s => !state.selectedSegmentIds.includes(s.id));
            state.selectedSegmentIds = [];
            state.selectedSegmentId = null;
            state.hasUnsavedChanges = true;
          }
        }),

        // Selection
        selectSegment: (segmentId, multi = false) => set((state) => {
          if (multi) {
            if (state.selectedSegmentIds.includes(segmentId)) {
              state.selectedSegmentIds = state.selectedSegmentIds.filter(id => id !== segmentId);
            } else {
              state.selectedSegmentIds.push(segmentId);
            }
          } else {
            state.selectedSegmentIds = [segmentId];
          }
          state.selectedSegmentId = segmentId;
        }),

        selectAllSegments: () => set((state) => {
          if (!state.currentProject || !state.activeTrackId) return;
          
          const track = state.currentProject.tracks.find(t => t.id === state.activeTrackId);
          if (track) {
            state.selectedSegmentIds = track.segments.map(s => s.id);
            state.selectedSegmentId = track.segments[track.segments.length - 1]?.id || null;
          }
        }),

        clearSelection: () => set((state) => {
          state.selectedSegmentIds = [];
          state.selectedSegmentId = null;
        }),

        // Segment Operations
        splitSegment: (trackId, segmentId, time) => set((state) => {
          if (!state.currentProject) return;
          
          const track = state.currentProject.tracks.find(t => t.id === trackId);
          if (track) {
            const segment = track.segments.find(s => s.id === segmentId);
            if (segment && time > segment.startTime && time < segment.endTime) {
              const newSegment: SubtitleSegment = {
                id: `segment-${Date.now()}`,
                text: segment.text,
                startTime: time,
                endTime: segment.endTime,
                style: segment.style
              };
              
              segment.endTime = time;
              track.segments.push(newSegment);
              track.segments.sort((a, b) => a.startTime - b.startTime);
              state.hasUnsavedChanges = true;
            }
          }
        }),

        mergeSegments: (trackId, segmentIds) => set((state) => {
          if (!state.currentProject || segmentIds.length < 2) return;
          
          const track = state.currentProject.tracks.find(t => t.id === trackId);
          if (track) {
            const segments = segmentIds
              .map(id => track.segments.find(s => s.id === id))
              .filter(Boolean) as SubtitleSegment[];
            
            if (segments.length >= 2) {
              segments.sort((a, b) => a.startTime - b.startTime);
              
              const mergedSegment: SubtitleSegment = {
                id: segments[0].id,
                text: segments.map(s => s.text).join(' '),
                startTime: segments[0].startTime,
                endTime: segments[segments.length - 1].endTime,
                style: segments[0].style
              };
              
              // Remove all segments except the first
              track.segments = track.segments.filter(s => !segmentIds.includes(s.id) || s.id === mergedSegment.id);
              
              // Update the first segment
              const index = track.segments.findIndex(s => s.id === mergedSegment.id);
              if (index !== -1) {
                track.segments[index] = mergedSegment;
              }
              
              state.hasUnsavedChanges = true;
            }
          }
        }),

        shiftSegments: (trackId, segmentIds, deltaTime) => set((state) => {
          if (!state.currentProject) return;
          
          const track = state.currentProject.tracks.find(t => t.id === trackId);
          if (track) {
            segmentIds.forEach(id => {
              const segment = track.segments.find(s => s.id === id);
              if (segment) {
                segment.startTime = Math.max(0, segment.startTime + deltaTime);
                segment.endTime = Math.max(segment.startTime + 0.1, segment.endTime + deltaTime);
              }
            });
            
            track.segments.sort((a, b) => a.startTime - b.startTime);
            state.hasUnsavedChanges = true;
          }
        }),

        // UI
        setZoomLevel: (level) => set((state) => {
          state.zoomLevel = Math.max(0.1, Math.min(10, level));
        }),

        setScrollPosition: (position) => set((state) => {
          state.scrollPosition = position;
        }),

        toggleWaveform: () => set((state) => {
          state.showWaveform = !state.showWaveform;
        }),

        toggleTimestamps: () => set((state) => {
          state.showTimestamps = !state.showTimestamps;
        }),

        toggleSnapToGrid: () => set((state) => {
          state.snapToGrid = !state.snapToGrid;
        }),

        setGridSize: (size) => set((state) => {
          state.gridSize = size;
        }),

        // Transcription
        setIsTranscribing: (transcribing) => set((state) => {
          state.isTranscribing = transcribing;
        }),

        setSelectedModel: (model) => set((state) => {
          state.selectedModel = model;
        }),

        setTranscriptionLanguage: (language) => set((state) => {
          state.transcriptionLanguage = language;
        }),

        // Styling
        updateStyle: (style) => set((state) => {
          state.subtitleStyle = { ...state.subtitleStyle, ...style };
          if (state.currentProject) {
            state.currentProject.style = state.subtitleStyle;
            state.hasUnsavedChanges = true;
          }
        }),

        setSubtitleStyle: (style) => set((state) => {
          state.subtitleStyle = { ...state.subtitleStyle, ...style };
        }),

        applyStyleToSelected: (style) => set((state) => {
          if (!state.currentProject || !state.activeTrackId) return;
          
          const track = state.currentProject.tracks.find(t => t.id === state.activeTrackId);
          if (track) {
            state.selectedSegmentIds.forEach(id => {
              const segment = track.segments.find(s => s.id === id);
              if (segment) {
                segment.style = { ...segment.style, ...style };
              }
            });
            state.hasUnsavedChanges = true;
          }
        }),

        // History
        undo: () => set((state) => {
          if (state.historyIndex > 0) {
            state.historyIndex--;
            // Implement undo logic
          }
        }),

        redo: () => set((state) => {
          if (state.historyIndex < state.history.length - 1) {
            state.historyIndex++;
            // Implement redo logic
          }
        }),

        clearHistory: () => set((state) => {
          state.history = [];
          state.historyIndex = -1;
        }),
      })),
      {
        name: 'subtitle-store',
        partialize: (state) => ({
          projects: state.projects,
          currentProjectId: state.currentProjectId,
          autoSaveEnabled: state.autoSaveEnabled,
          autoSaveInterval: state.autoSaveInterval,
          selectedModel: state.selectedModel,
          transcriptionLanguage: state.transcriptionLanguage,
          subtitleStyle: state.subtitleStyle,
        }),
      }
    )
  )
);

export { useSubtitleStore }; 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 