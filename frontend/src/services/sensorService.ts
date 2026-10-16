import { api } from './api';
import { TrialSelectionItem, SensorDemoResponse, SensorDemoHistoryItem, MLStatus } from '../types/sensor';

export const sensorService = {
  getStatus: async (): Promise<MLStatus> => {
    return api.get<MLStatus>('/ml/status');
  },

  getAvailableTrials: async (): Promise<TrialSelectionItem[]> => {
    return api.get<TrialSelectionItem[]>('/ml/demo-trials');
  },

  runPrediction: async (trialId: string): Promise<SensorDemoResponse> => {
    return api.post<SensorDemoResponse>('/ml/predict-demo', { trial_id: trialId });
  },

  getDemoHistory: async (): Promise<SensorDemoHistoryItem[]> => {
    return api.get<SensorDemoHistoryItem[]>('/patient/sensor-demo/history');
  }
};
