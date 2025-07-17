// Minimal subtitle store for compatibility

import { create } from 'zustand';
import type { SubtitleProject, SubtitleTrack, SubtitleSegment } from '../types/subtitle';

interface SubtitleState {
  projects: SubtitleProject[];
  currentProject: SubtitleProject | null;
  activeTrackId: string | null;
  selectedSegmentId: string | null;
  playbackTime: number;
  isPlaying: boolean;
  videoDuration: number;
  videoUrl: string | null;
}

interface SubtitleStore extends SubtitleState {
  createProject: (project: Partial<SubtitleProject>) => void;
  setActiveTrack: (trackId: string | null) => void;
  selectSegment: (segmentId: string | null) => void;
  setPlaybackTime: (time: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setVideoDuration: (duration: number) => void;
  setVideoUrl: (url: string | null) => void;
  addTrack: (track: SubtitleTrack) => void;
  updateTrack: (trackId: string, updates: Partial<SubtitleTrack>) => void;
  addSegment: (projectId: string, trackId: string, segment: SubtitleSegment) => void;
  updateSegment: (segmentId: string, updates: Partial<SubtitleSegment>) => void;
  deleteSegment: (segmentId: string) => void;
}

export const useSubtitleStore = create<SubtitleStore>((set) => ({
  // State
  projects: [],
  currentProject: null,
  activeTrackId: null,
  selectedSegmentId: null,
  playbackTime: 0,
  isPlaying: false,
  videoDuration: 0,
  videoUrl: null,

  // Actions
  createProject: (project) => {
    const newProject: SubtitleProject = {
      id: Date.now().toString(),
      name: 'New Project',
      createdAt: new Date(),
      updatedAt: new Date(),
      videoDuration: 0,
      tracks: [],
      ...project,
    };
    set((state) => ({
      projects: [...state.projects, newProject],
      currentProject: newProject,
    }));
  },

  setActiveTrack: (trackId) => set({ activeTrackId: trackId }),
  selectSegment: (segmentId) => set({ selectedSegmentId: segmentId }),
  setPlaybackTime: (time) => set({ playbackTime: time }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setVideoDuration: (duration) => set({ videoDuration: duration }),
  setVideoUrl: (url) => set({ videoUrl: url }),

  addTrack: (track) => {
    set((state) => {
      if (!state.currentProject) return state;
      return {
        currentProject: {
          ...state.currentProject,
          tracks: [...state.currentProject.tracks, track],
        },
      };
    });
  },

  updateTrack: (trackId, updates) => {
    set((state) => {
      if (!state.currentProject) return state;
      return {
        currentProject: {
          ...state.currentProject,
          tracks: state.currentProject.tracks.map((track) =>
            track.id === trackId ? { ...track, ...updates } : track
          ),
        },
      };
    });
  },

  addSegment: (projectId, trackId, segment) => {
    set((state) => {
      if (!state.currentProject || state.currentProject.id !== projectId) return state;
      return {
        currentProject: {
          ...state.currentProject,
          tracks: state.currentProject.tracks.map((track) =>
            track.id === trackId
              ? { ...track, segments: [...track.segments, segment].sort((a, b) => a.startTime - b.startTime) }
              : track
          ),
        },
      };
    });
  },

  updateSegment: (segmentId, updates) => {
    set((state) => {
      if (!state.currentProject) return state;
      return {
        currentProject: {
          ...state.currentProject,
          tracks: state.currentProject.tracks.map((track) => ({
            ...track,
            segments: track.segments.map((segment) =>
              segment.id === segmentId ? { ...segment, ...updates } : segment
            ),
          })),
        },
      };
    });
  },

  deleteSegment: (segmentId) => {
    set((state) => {
      if (!state.currentProject) return state;
      return {
        currentProject: {
          ...state.currentProject,
          tracks: state.currentProject.tracks.map((track) => ({
            ...track,
            segments: track.segments.filter((segment) => segment.id !== segmentId),
          })),
        },
      };
    });
  },
})); 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 