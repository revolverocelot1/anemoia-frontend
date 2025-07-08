import { useEffect, useRef } from 'react';
import { useSubtitleStore } from '../stores/subtitle-store';

interface AutoSaveOptions {
  enabled?: boolean;
  interval?: number; // in seconds
  onSave?: () => void;
  onError?: (error: Error) => void;
}

export const useAutoSave = (options: AutoSaveOptions = {}) => {
  const {
    enabled = true,
    interval = 30, // Auto-save every 30 seconds by default
    onSave,
    onError
  } = options;
  
  const { currentProject, saveProject } = useSubtitleStore();
  const lastSaveRef = useRef<Date | null>(null);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastProjectStateRef = useRef<string>('');
  
  // Check if project has changed
  const hasProjectChanged = (): boolean => {
    if (!currentProject) return false;
    
    const currentState = JSON.stringify({
      tracks: currentProject.tracks,
      activeTrackId: currentProject.activeTrackId,
      videoDuration: currentProject.videoDuration
    });
    
    const hasChanged = currentState !== lastProjectStateRef.current;
    
    if (hasChanged) {
      lastProjectStateRef.current = currentState;
    }
    
    return hasChanged;
  };
  
  // Save to local storage
  const saveToLocalStorage = async () => {
    if (!currentProject) return;
    
    try {
      const projectData = {
        ...currentProject,
        updatedAt: new Date()
      };
      
      // Save to localStorage
      const key = `subtitle_project_${currentProject.id}`;
      localStorage.setItem(key, JSON.stringify(projectData));
      
      // Update last saved projects list
      const savedProjects = JSON.parse(localStorage.getItem('subtitle_projects') || '[]');
      const existingIndex = savedProjects.findIndex((p: any) => p.id === currentProject.id);
      
      const projectMeta = {
        id: currentProject.id,
        name: currentProject.name,
        updatedAt: projectData.updatedAt,
        videoDuration: currentProject.videoDuration,
        trackCount: currentProject.tracks.length,
        segmentCount: currentProject.tracks.reduce((sum, track) => sum + track.segments.length, 0)
      };
      
      if (existingIndex >= 0) {
        savedProjects[existingIndex] = projectMeta;
      } else {
        savedProjects.unshift(projectMeta);
      }
      
      // Keep only last 10 projects
      localStorage.setItem('subtitle_projects', JSON.stringify(savedProjects.slice(0, 10)));
      
      lastSaveRef.current = new Date();
      saveProject(); // Update store
      onSave?.();
      
      console.log('Auto-saved project:', currentProject.name);
    } catch (error) {
      console.error('Auto-save failed:', error);
      onError?.(error instanceof Error ? error : new Error('Auto-save failed'));
    }
  };
  
  // Perform auto-save
  const performAutoSave = () => {
    if (!enabled || !currentProject) return;
    
    if (hasProjectChanged()) {
      saveToLocalStorage();
    }
  };
  
  // Set up auto-save interval
  useEffect(() => {
    if (enabled && currentProject) {
      // Clear existing timer
      if (saveTimerRef.current) {
        clearInterval(saveTimerRef.current);
      }
      
      // Set up new timer
      saveTimerRef.current = setInterval(performAutoSave, interval * 1000);
      
      // Save on unmount
      return () => {
        if (saveTimerRef.current) {
          clearInterval(saveTimerRef.current);
        }
        
        // Final save before unmount
        if (hasProjectChanged()) {
          saveToLocalStorage();
        }
      };
    }
  }, [enabled, currentProject?.id, interval]);
  
  // Save on window unload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasProjectChanged()) {
        saveToLocalStorage();
        
        // Show confirmation if there are unsaved changes
        const timeSinceLastSave = lastSaveRef.current 
          ? (new Date().getTime() - lastSaveRef.current.getTime()) / 1000
          : Infinity;
          
        if (timeSinceLastSave < 5) {
          // Recently saved, no need to warn
          return;
        }
        
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);
  
  // Manual save function
  const save = async () => {
    await saveToLocalStorage();
  };
  
  // Load saved projects
  const loadSavedProjects = (): Array<{
    id: string;
    name: string;
    updatedAt: Date;
    videoDuration: number;
    trackCount: number;
    segmentCount: number;
  }> => {
    try {
      const savedProjects = JSON.parse(localStorage.getItem('subtitle_projects') || '[]');
      return savedProjects.map((p: any) => ({
        ...p,
        updatedAt: new Date(p.updatedAt)
      }));
    } catch {
      return [];
    }
  };
  
  // Load specific project
  const loadProject = (projectId: string): any | null => {
    try {
      const key = `subtitle_project_${projectId}`;
      const projectData = localStorage.getItem(key);
      
      if (projectData) {
        const parsed = JSON.parse(projectData);
        return {
          ...parsed,
          createdAt: new Date(parsed.createdAt),
          updatedAt: new Date(parsed.updatedAt),
          videoFile: null // Can't store File objects in localStorage
        };
      }
    } catch (error) {
      console.error('Failed to load project:', error);
    }
    
    return null;
  };
  
  // Delete saved project
  const deleteProject = (projectId: string) => {
    try {
      // Remove project data
      const key = `subtitle_project_${projectId}`;
      localStorage.removeItem(key);
      
      // Update projects list
      const savedProjects = JSON.parse(localStorage.getItem('subtitle_projects') || '[]');
      const filtered = savedProjects.filter((p: any) => p.id !== projectId);
      localStorage.setItem('subtitle_projects', JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };
  
  return {
    save,
    loadSavedProjects,
    loadProject,
    deleteProject,
    lastSaved: lastSaveRef.current,
    isAutoSaveEnabled: enabled
  };
};

export default useAutoSave; 