import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import {
  SubtitleProject,
  SubtitleTrack,
  SubtitleSegment,
  SubtitleStyle,
  SubtitlePosition,
  DEFAULT_SUBTITLE_STYLE,
  DEFAULT_SUBTITLE_POSITION
} from '../types/subtitle';

interface SubtitleState {
  // Current project
  currentProject: SubtitleProject | null;
  
  // UI state
  selectedSegmentIds: string[];
  playbackTime: number;
  isPlaying: boolean;
  zoomLevel: number;
  scrollPosition: number;
  
  // Model state
  selectedModel: string;
  isTranscribing: boolean;
  transcriptionProgress: number;
  
  // Actions
  createProject: (name: string, videoUrl?: string, videoFile?: File) => void;
  loadProject: (project: SubtitleProject) => void;
  saveProject: () => void;
  
  // Track management
  addTrack: (name: string, language: string) => void;
  deleteTrack: (trackId: string) => void;
  setActiveTrack: (trackId: string) => void;
  updateTrackStyle: (trackId: string, style: Partial<SubtitleStyle>) => void;
  updateTrackPosition: (trackId: string, position: Partial<SubtitlePosition>) => void;
  
  // Segment management
  addSegment: (trackId: string, segment: Omit<SubtitleSegment, 'id'>) => void;
  updateSegment: (trackId: string, segmentId: string, updates: Partial<SubtitleSegment>) => void;
  deleteSegment: (trackId: string, segmentId: string) => void;
  splitSegment: (trackId: string, segmentId: string, splitTime: number) => void;
  mergeSegments: (trackId: string, segmentIds: string[]) => void;
  
  // Selection
  selectSegment: (segmentId: string, multi?: boolean) => void;
  clearSelection: () => void;
  
  // Playback
  setPlaybackTime: (time: number) => void;
  setIsPlaying: (playing: boolean) => void;
  
  // View
  setZoomLevel: (zoom: number) => void;
  setScrollPosition: (position: number) => void;
  
  // Transcription
  setSelectedModel: (model: string) => void;
  setTranscriptionProgress: (progress: number) => void;
  setIsTranscribing: (transcribing: boolean) => void;
  
  // Import/Export
  importSegments: (trackId: string, segments: SubtitleSegment[]) => void;
  getSegmentsInTimeRange: (startTime: number, endTime: number) => SubtitleSegment[];
}

export const useSubtitleStore = create<SubtitleState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        currentProject: null,
        selectedSegmentIds: [],
        playbackTime: 0,
        isPlaying: false,
        zoomLevel: 1,
        scrollPosition: 0,
        selectedModel: 'whisper-base',
        isTranscribing: false,
        transcriptionProgress: 0,
        
        // Project actions
        createProject: (name, videoUrl, videoFile) => {
          const project: SubtitleProject = {
            id: uuidv4(),
            name,
            videoUrl,
            videoFile,
            videoDuration: 0,
            tracks: [],
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          set({ currentProject: project });
        },
        
        loadProject: (project) => {
          set({ currentProject: project });
        },
        
        saveProject: () => {
          const { currentProject } = get();
          if (currentProject) {
            currentProject.updatedAt = new Date();
            set({ currentProject: { ...currentProject } });
          }
        },
        
        // Track management
        addTrack: (name, language) => {
          const { currentProject } = get();
          if (!currentProject) return;
          
          const track: SubtitleTrack = {
            id: uuidv4(),
            name,
            language,
            segments: [],
            style: { ...DEFAULT_SUBTITLE_STYLE },
            position: { ...DEFAULT_SUBTITLE_POSITION },
            visible: true,
            locked: false
          };
          
          currentProject.tracks.push(track);
          if (!currentProject.activeTrackId) {
            currentProject.activeTrackId = track.id;
          }
          
          set({ currentProject: { ...currentProject } });
        },
        
        deleteTrack: (trackId) => {
          const { currentProject } = get();
          if (!currentProject) return;
          
          currentProject.tracks = currentProject.tracks.filter(t => t.id !== trackId);
          if (currentProject.activeTrackId === trackId) {
            currentProject.activeTrackId = currentProject.tracks[0]?.id;
          }
          
          set({ currentProject: { ...currentProject } });
        },
        
        setActiveTrack: (trackId) => {
          const { currentProject } = get();
          if (!currentProject) return;
          
          currentProject.activeTrackId = trackId;
          set({ currentProject: { ...currentProject } });
        },
        
        updateTrackStyle: (trackId, style) => {
          const { currentProject } = get();
          if (!currentProject) return;
          
          const track = currentProject.tracks.find(t => t.id === trackId);
          if (track) {
            track.style = { ...track.style, ...style };
            set({ currentProject: { ...currentProject } });
          }
        },
        
        updateTrackPosition: (trackId, position) => {
          const { currentProject } = get();
          if (!currentProject) return;
          
          const track = currentProject.tracks.find(t => t.id === trackId);
          if (track) {
            track.position = { ...track.position, ...position };
            set({ currentProject: { ...currentProject } });
          }
        },
        
        // Segment management
        addSegment: (trackId, segment) => {
          const { currentProject } = get();
          if (!currentProject) return;
          
          const track = currentProject.tracks.find(t => t.id === trackId);
          if (track) {
            const newSegment: SubtitleSegment = {
              ...segment,
              id: uuidv4()
            };
            track.segments.push(newSegment);
            track.segments.sort((a, b) => a.startTime - b.startTime);
            set({ currentProject: { ...currentProject } });
          }
        },
        
        updateSegment: (trackId, segmentId, updates) => {
          const { currentProject } = get();
          if (!currentProject) return;
          
          const track = currentProject.tracks.find(t => t.id === trackId);
          if (track) {
            const segment = track.segments.find(s => s.id === segmentId);
            if (segment) {
              Object.assign(segment, updates);
              track.segments.sort((a, b) => a.startTime - b.startTime);
              set({ currentProject: { ...currentProject } });
            }
          }
        },
        
        deleteSegment: (trackId, segmentId) => {
          const { currentProject } = get();
          if (!currentProject) return;
          
          const track = currentProject.tracks.find(t => t.id === trackId);
          if (track) {
            track.segments = track.segments.filter(s => s.id !== segmentId);
            set({ currentProject: { ...currentProject } });
          }
        },
        
        splitSegment: (trackId, segmentId, splitTime) => {
          const { currentProject } = get();
          if (!currentProject) return;
          
          const track = currentProject.tracks.find(t => t.id === trackId);
          if (track) {
            const segmentIndex = track.segments.findIndex(s => s.id === segmentId);
            if (segmentIndex !== -1) {
              const segment = track.segments[segmentIndex];
              if (splitTime > segment.startTime && splitTime < segment.endTime) {
                const newSegment: SubtitleSegment = {
                  id: uuidv4(),
                  text: segment.text,
                  startTime: splitTime,
                  endTime: segment.endTime,
                  speaker: segment.speaker,
                  confidence: segment.confidence
                };
                segment.endTime = splitTime;
                track.segments.splice(segmentIndex + 1, 0, newSegment);
                set({ currentProject: { ...currentProject } });
              }
            }
          }
        },
        
        mergeSegments: (trackId, segmentIds) => {
          const { currentProject } = get();
          if (!currentProject || segmentIds.length < 2) return;
          
          const track = currentProject.tracks.find(t => t.id === trackId);
          if (track) {
            const segments = segmentIds
              .map(id => track.segments.find(s => s.id === id))
              .filter(Boolean) as SubtitleSegment[];
            
            if (segments.length >= 2) {
              segments.sort((a, b) => a.startTime - b.startTime);
              const mergedText = segments.map(s => s.text).join(' ');
              const mergedSegment: SubtitleSegment = {
                id: segments[0].id,
                text: mergedText,
                startTime: segments[0].startTime,
                endTime: segments[segments.length - 1].endTime,
                speaker: segments[0].speaker,
                confidence: Math.min(...segments.map(s => s.confidence || 1))
              };
              
              // Remove all segments except the first
              track.segments = track.segments.filter(
                s => !segmentIds.includes(s.id) || s.id === segments[0].id
              );
              
              // Update the first segment
              const index = track.segments.findIndex(s => s.id === segments[0].id);
              if (index !== -1) {
                track.segments[index] = mergedSegment;
              }
              
              set({ currentProject: { ...currentProject } });
            }
          }
        },
        
        // Selection
        selectSegment: (segmentId, multi = false) => {
          const { selectedSegmentIds } = get();
          if (multi) {
            if (selectedSegmentIds.includes(segmentId)) {
              set({ selectedSegmentIds: selectedSegmentIds.filter(id => id !== segmentId) });
            } else {
              set({ selectedSegmentIds: [...selectedSegmentIds, segmentId] });
            }
          } else {
            set({ selectedSegmentIds: [segmentId] });
          }
        },
        
        clearSelection: () => {
          set({ selectedSegmentIds: [] });
        },
        
        // Playback
        setPlaybackTime: (time) => {
          set({ playbackTime: time });
        },
        
        setIsPlaying: (playing) => {
          set({ isPlaying: playing });
        },
        
        // View
        setZoomLevel: (zoom) => {
          set({ zoomLevel: Math.max(0.1, Math.min(10, zoom)) });
        },
        
        setScrollPosition: (position) => {
          set({ scrollPosition: position });
        },
        
        // Transcription
        setSelectedModel: (model) => {
          set({ selectedModel: model });
        },
        
        setTranscriptionProgress: (progress) => {
          set({ transcriptionProgress: progress });
        },
        
        setIsTranscribing: (transcribing) => {
          set({ isTranscribing: transcribing });
        },
        
        // Import/Export
        importSegments: (trackId, segments) => {
          const { currentProject } = get();
          if (!currentProject) return;
          
          const track = currentProject.tracks.find(t => t.id === trackId);
          if (track) {
            track.segments = segments;
            track.segments.sort((a, b) => a.startTime - b.startTime);
            set({ currentProject: { ...currentProject } });
          }
        },
        
        getSegmentsInTimeRange: (startTime, endTime) => {
          const { currentProject } = get();
          if (!currentProject) return [];
          
          const segments: SubtitleSegment[] = [];
          currentProject.tracks.forEach(track => {
            if (track.visible) {
              track.segments.forEach(segment => {
                if (
                  (segment.startTime >= startTime && segment.startTime <= endTime) ||
                  (segment.endTime >= startTime && segment.endTime <= endTime) ||
                  (segment.startTime <= startTime && segment.endTime >= endTime)
                ) {
                  segments.push(segment);
                }
              });
            }
          });
          
          return segments;
        }
      }),
      {
        name: 'subtitle-storage',
        partialize: (state) => ({
          currentProject: state.currentProject,
          selectedModel: state.selectedModel
        })
      }
    )
  )
); 