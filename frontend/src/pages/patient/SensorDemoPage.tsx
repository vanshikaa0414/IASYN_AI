import React, { useState, useEffect } from 'react';
import { sensorService } from '../../services/sensorService';
import { TrialSelectionItem, SensorDemoResponse, MLStatus } from '../../types/sensor';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { 
  Cpu, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  Play, 
  Sparkles, 
  Info, 
  ShieldAlert, 
  Layers, 
  Database,
  ArrowRight
} from 'lucide-react';

export const SensorDemoPage: React.FC = () => {
  const [status, setStatus] = useState<MLStatus | null>(null);
  const [trials, setTrials] = useState<TrialSelectionItem[]>([]);
  const [selectedTrialId, setSelectedTrialId] = useState<string>('');
  const [prediction, setPrediction] = useState<SensorDemoResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [predicting, setPredicting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      sensorService.getStatus(),
      sensorService.getAvailableTrials()
    ])
      .then(([statusRes, trialsRes]) => {
        setStatus(statusRes);
        setTrials(trialsRes);
        if (trialsRes.length > 0) {
          setSelectedTrialId(trialsRes[0].trial_id);
        }
      })
      .catch((err) => {
        console.error('Failed to load sensor demo data:', err);
        setError('Failed to connect to the Machine Learning backend.');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleRunAnalysis = async () => {
    if (!selectedTrialId) return;
    setPredicting(true);
    setError(null);
    try {
      const res = await sensorService.runPrediction(selectedTrialId);
      setPrediction(res);
    } catch (err: any) {
      setError(err?.message || 'Inference execution failed.');
    } finally {
      setPredicting(false);
    }
  };

  const selectedTrial = trials.find((t) => t.trial_id === selectedTrialId);

  // Transform probability distribution for bar chart
  const probData = prediction
    ? Object.entries(prediction.probabilities).map(([name, prob]) => ({
        name: name.replace('Seated Knee Extension', '').replace('Wrong:', '').trim(),
        fullName: name,
        prob: Math.round(prob * 100),
      }))
    : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-sky-100 text-sky-800">
              KneE-PAD Dataset • 1D-CNN
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-semibold text-slate-500">Supervised AI Demonstration</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            KneE-PAD Sensor AI Demonstration
          </h1>
        </div>

        {/* Model Status Pill */}
        {status && (
          <div className="flex items-center gap-3 bg-white border border-slate-200 p-2.5 px-4 rounded-xl shadow-xs text-xs">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <Cpu className="w-4 h-4 text-sky-600" />
              <span>{status.model_version}</span>
            </div>
            <span className="text-slate-300">|</span>
            <span className="text-emerald-700 font-semibold">Test Acc: {status.test_accuracy}%</span>
            <span className="text-slate-300">|</span>
            <span className="text-sky-700 font-semibold">Macro F1: {status.macro_f1}%</span>
          </div>
        )}
      </div>

      {/* MANDATORY NOTICE BANNER */}
      <div className="bg-amber-50 border-2 border-amber-300/80 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 text-amber-900 shadow-xs">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed">
          <p className="font-extrabold text-amber-950 uppercase tracking-wide mb-1 text-[11px]">
            Technical Machine Learning Distinction
          </p>
          <p className="font-medium">
            "This demonstration analyzes previously recorded EMG and IMU sensor data from the KneE-PAD dataset. It does not measure your current movement."
          </p>
          <p className="text-[11px] text-amber-800/90 mt-1">
            Live patient tracking is performed separately using MediaPipe Pose on webcam frames. Sensor recordings are from 8 Delsys Trigno Avanti wireless sensors on knee rehabilitation volunteers.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Trial Selection & Execution Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Select Recorded KneE-PAD Knee-Extension Trial:
            </label>
            <select
              value={selectedTrialId}
              onChange={(e) => setSelectedTrialId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all"
            >
              {trials.map((t) => (
                <option key={t.trial_id} value={t.trial_id}>
                  {t.subject_name} • {t.trial_name} — Expected: {t.ground_truth_label} ({t.duration_seconds}s)
                </option>
              ))}
            </select>
          </div>

          <div className="self-end sm:self-auto">
            <button
              onClick={handleRunAnalysis}
              disabled={predicting || !selectedTrialId}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-sky-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>{predicting ? 'Classifying Signals...' : 'Run AI Analysis'}</span>
            </button>
          </div>
        </div>

        {selectedTrial && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Subject</span>
              <span className="font-bold text-slate-800">{selectedTrial.subject_name}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Duration</span>
              <span className="font-bold text-slate-800">{selectedTrial.duration_seconds} seconds</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">EMG Signals</span>
              <span className="font-semibold text-slate-700">8 Channels @ 1259.26 Hz</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">IMU Signals</span>
              <span className="font-semibold text-slate-700">48 Channels @ 148.15 Hz</span>
            </div>
          </div>
        )}
      </div>

      {/* Prediction Output Results */}
      {prediction && (
        <div className="space-y-6 animate-in fade-in zoom-in-98 duration-200">
          {/* Classification Outcome Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-sky-600 block mb-1">
                  1D-CNN Inference Classification Result
                </span>
                <div className="flex items-center gap-3">
                  <h3 className="text-2xl font-black text-slate-900">{prediction.predicted_label}</h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    prediction.predicted_label === prediction.ground_truth_label
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {prediction.predicted_label === prediction.ground_truth_label ? 'Matches Dataset Label' : 'Deviation'}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-400 block font-medium">Model Confidence</span>
                <span className="text-3xl font-black text-sky-700">
                  {Math.round(prediction.confidence * 100)}%
                </span>
              </div>
            </div>

            {/* Explanation & Ground Truth Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <span className="font-bold text-slate-700 block mb-1">Biomechanical Category Explanation:</span>
                <p className="text-slate-600 leading-relaxed">{prediction.category_explanation}</p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs flex flex-col justify-between">
                <div>
                  <span className="font-bold text-slate-700 block mb-1">KneE-PAD Dataset Ground Truth:</span>
                  <p className="font-semibold text-slate-900">{prediction.ground_truth_label} (Class #{prediction.ground_truth_class_id})</p>
                </div>
                <div className="mt-2 text-[11px] text-slate-400">
                  Model Version: {prediction.model_version} • Evaluated via PyTorch Conv1D
                </div>
              </div>
            </div>

            {/* Probability Distribution */}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-2">
                Class Probability Distribution
              </span>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={probData} layout="vertical" margin={{ left: 10, right: 30, top: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 11, fontWeight: 500 }} />
                    <Tooltip formatter={(value: any) => [`${value}%`, 'Probability']} />
                    <Bar dataKey="prob" radius={[0, 8, 8, 0]}>
                      {probData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.fullName === prediction.predicted_label ? '#0284c7' : '#cbd5e1'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Real Sensor Signals Visualizations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* EMG Signal Chart */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Recorded Surface EMG Signals</h4>
                  <p className="text-[11px] text-slate-500">Quadriceps (Rectus Femoris) &amp; Hamstrings (mV)</p>
                </div>
                <span className="text-[10px] font-bold bg-teal-50 text-teal-800 px-2 py-0.5 rounded">1259 Hz Raw</span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={prediction.emg_preview.data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="time" unit="s" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="quadriceps_rf" name="Rectus Femoris" stroke="#0d9488" dot={false} strokeWidth={1.5} />
                    <Line type="monotone" dataKey="hamstrings" name="Hamstrings" stroke="#f43f5e" dot={false} strokeWidth={1.5} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* IMU Signal Chart */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Recorded IMU Kinematic Signals</h4>
                  <p className="text-[11px] text-slate-500">Tri-axial Accelerometer (G) &amp; Gyroscope (deg/s)</p>
                </div>
                <span className="text-[10px] font-bold bg-sky-50 text-sky-800 px-2 py-0.5 rounded">148 Hz Raw</span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={prediction.imu_preview.data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="time" unit="s" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="acc_x" name="Acc X" stroke="#0284c7" dot={false} strokeWidth={1.5} />
                    <Line type="monotone" dataKey="acc_y" name="Acc Y" stroke="#10b981" dot={false} strokeWidth={1.5} />
                    <Line type="monotone" dataKey="acc_z" name="Acc Z" stroke="#8b5cf6" dot={false} strokeWidth={1.5} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
