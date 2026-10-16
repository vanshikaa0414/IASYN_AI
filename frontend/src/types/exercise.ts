export interface Exercise {
  id: string;
  name: string;
  category: string;
  targetMuscles: string[];
  startingPosition: string;
  instructions: string[];
  precautions: string[];
  hasLiveAssessment: boolean;
  videoUrl?: string;
  youtubeId?: string;
  youtubeUrl?: string;
  thumbnailPlaceholderColor: string;
  imageUrl?: string;
  recommendedReps: string;
}
