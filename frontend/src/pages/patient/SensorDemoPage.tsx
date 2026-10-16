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
import { CustomGlassTooltip } from '../../components/common/CustomGlassTooltip';
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#A78BFA]/10 border border-[#A78BFA]/20 text-[#A78BFA]">
              KneE-PAD Dataset • 1D-CNN
            </span>
            <span className="text-xs text-[#85879C]">•</span>
            <span className="text-xs font-semibold text-[#85879C]">Supervised AI Demonstration</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            KneE-PAD Sensor AI Demonstration
          </h1>
        </div>

        {/* Model Status Pill */}
        {status && (
          <div className="flex items-center gap-3 bg-[#11131D] border border-white/10 p-2.5 px-4 rounded-full shadow-lg text-xs">
            <div className="flex items-center gap-1.5 font-bold text-white">
              <Cpu className="w-4 h-4 text-[#A78BFA]" />
              <span>{status.model_version}</span>
            </div>
            <span className="text-[#85879C]/40">|</span>
            <span className="text-[#34D399] font-semibold">Test Acc: {status.test_accuracy}%</span>
            <span className="text-[#85879C]/40">|</span>
            <span className="text-[#7DE8F0] font-semibold">Macro F1: {status.macro_f1}%</span>
          </div>
        )}
      </div>

      {/* MANDATORY NOTICE BANNER */}
      <div className="glass-panel border-l-4 border-l-[#FBBF24] border-white/10 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 text-[#B7B8C8] shadow-xl">
        <ShieldAlert className="w-5 h-5 text-[#FBBF24] shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed">
          <p className="font-extrabold text-[#FBBF24] uppercase tracking-wide mb-1 text-[11px]">
            Technical Machine Learning Distinction
          </p>
          <p className="font-medium text-white">
            "This demonstration analyzes previously recorded EMG and IMU sensor data from the KneE-PAD dataset. It does not measure your current movement."
          </p>
          <p className="text-[11px] text-[#85879C] mt-1">
            Live patient tracking is performed separately using MediaPipe Pose on webcam frames. Sensor recordings are from 8 Delsys Trigno Avanti wireless sensors on knee rehabilitation volunteers.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl glass-panel border border-[#FB7185]/30 text-[#FB7185] text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-[#FB7185] shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Trial Selection & Execution Card */}
      <div className="glass-card p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1">
            <label className="block text-xs font-bold text-[#85879C] uppercase tracking-wider mb-2">
              Select Recorded KneE-PAD Knee-Extension Trial:
            </label>
            <select
              value={selectedTrialId}
              onChange={(e) => setSelectedTrialId(e.target.value)}
              className="w-full glass-panel border border-white/10 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-[#A78BFA] transition-all"
            >
              {trials.map((t) => (
                <option key={t.trial_id} value={t.trial_id} className="bg-[#11131D] text-white">
                  {t.subject_name} • {t.trial_name} — Expected: {t.ground_truth_label} ({t.duration_seconds}s)
                </option>
              ))}
            </select>
          </div>

          <div className="self-end sm:self-auto">
            <button
              onClick={handleRunAnalysis}
              disabled={predicting || !selectedTrialId}
              className="btn-pill-primary w-full sm:w-auto inline-flex items-center justify-center gap-2 text-xs sm:text-sm disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{predicting ? 'Classifying Signals...' : 'Run AI Analysis'}</span>
            </button>
          </div>
        </div>

        {selectedTrial && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 glass-panel p-3.5 rounded-xl border border-white/8 text-xs">
            <div>
              <span className="text-[#85879C] block text-[10px] uppercase font-bold tracking-wider">Subject</span>
              <span className="font-bold text-white">{selectedTrial.subject_name}</span>
            </div>
            <div>
              <span className="text-[#85879C] block text-[10px] uppercase font-bold tracking-wider">Duration</span>
              <span className="font-bold text-white">{selectedTrial.duration_seconds} seconds</span>
            </div>
            <div>
              <span className="text-[#85879C] block text-[10px] uppercase font-bold tracking-wider">EMG Signals</span>
              <span className="font-semibold text-[#B7B8C8]">8 Channels @ 1259.26 Hz</span>
            </div>
            <div>
              <span className="text-[#85879C] block text-[10px] uppercase font-bold tracking-wider">IMU Signals</span>
              <span className="font-semibold text-[#B7B8C8]">48 Channels @ 148.15 Hz</span>
            </div>
          </div>
        )}
      </div>

      {/* Prediction Output Results */}
      {prediction && (
        <div className="space-y-6 animate-page-enter">
          {/* Classification Outcome Card */}
          <div className="glass-card p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#A78BFA] block mb-1">
                  1D-CNN Inference Classification Result
                </span>
                <div className="flex items-center gap-3">
                  <h3 className="text-2xl font-black text-white">{prediction.predicted_label}</h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    prediction.predicted_label === prediction.ground_truth_label
                      ? 'bg-[#34D399]/15 text-[#34D399] border border-[#34D399]/30'
                      : 'bg-[#FBBF24]/15 text-[#FBBF24] border border-[#FBBF24]/30'
                  }`}>
                    {prediction.predicted_label === prediction.ground_truth_label ? 'Matches Dataset Label' : 'Deviation'}
                  </span>
                </div>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-xs text-[#85879C] block font-medium">Model Confidence</span>
                <span className="text-3xl font-black text-[#A78BFA]">
                  {Math.round(prediction.confidence * 100)}%
                </span>
              </div>
            </div>

            {/* Explanation & Ground Truth Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="glass-panel p-4 rounded-xl border border-white/8 text-xs">
                <span className="font-bold text-white block mb-1">Biomechanical Category Explanation:</span>
                <p className="text-[#B7B8C8] leading-relaxed">{prediction.category_explanation}</p>
              </div>

              <div className="glass-panel p-4 rounded-xl border border-white/8 text-xs flex flex-col justify-between">
                <div>
                  <span className="font-bold text-white block mb-1">KneE-PAD Dataset Ground Truth:</span>
                  <p className="font-semibold text-[#7DE8F0]">{prediction.ground_truth_label} (Class #{prediction.ground_truth_class_id})</p>
                </div>
                <div className="mt-2 text-[11px] text-[#85879C]">
                  Model Version: {prediction.model_version} • Evaluated via PyTorch Conv1D
                </div>
              </div>
            </div>

            {/* Probability Distribution */}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#B7B8C8] block mb-2">
                Class Probability Distribution
              </span>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={probData} layout="vertical" margin={{ left: 10, right: 30, top: 10, bottom: 10 }}>
                    <defs>
                      <linearGradient id="probVioletGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#A78BFA" />
                        <stop offset="100%" stopColor="#7C6CF5" />
                      </linearGradient>
                      <linearGradient id="probDarkGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#3A3D52" />
                        <stop offset="100%" stopColor="#25283A" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.06)" />
                    <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 11, fill: '#85879C' }} stroke="rgba(255,255,255,0.1)" />
                    <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 11, fontWeight: 500, fill: '#B7B8C8' }} stroke="rgba(255,255,255,0.1)" />
                    <Tooltip content={<CustomGlassTooltip unit="%" />} />
                    <Bar
                      dataKey="prob"
                      radius={[0, 8, 8, 0]}
                      isAnimationActive={true}
                      animationDuration={1000}
                      animationEasing="ease-out"
                    >
                      {probData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.fullName === prediction.predicted_label ? 'url(#probVioletGrad)' : 'url(#probDarkGrad)'}
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
            <div className="glass-card p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">Recorded Surface EMG Signals</h4>
                  <p className="text-[11px] text-[#85879C]">Quadriceps (Rectus Femoris) &amp; Hamstrings (mV)</p>
                </div>
                <span className="text-[10px] font-bold bg-[#A78BFA]/10 text-[#A78BFA] border border-[#A78BFA]/20 px-2.5 py-0.5 rounded-full">1259 Hz Raw</span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={prediction.emg_preview.data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="time" unit="s" tick={{ fontSize: 10, fill: '#85879C' }} stroke="rgba(255,255,255,0.1)" />
                    <YAxis tick={{ fontSize: 10, fill: '#85879C' }} stroke="rgba(255,255,255,0.1)" />
                    <Tooltip content={<CustomGlassTooltip unit=" mV" />} />
                    <Legend wrapperStyle={{ fontSize: 11, color: '#B7B8C8', paddingTop: 6 }} />
                    <Line
                      type="monotone"
                      dataKey="quadriceps_rf"
                      name="Rectus Femoris"
                      stroke="#7DE8F0"
                      dot={false}
                      strokeWidth={1.8}
                      isAnimationActive={true}
                      animationDuration={1000}
                      animationEasing="ease-out"
                    />
                    <Line
                      type="monotone"
                      dataKey="hamstrings"
                      name="Hamstrings"
                      stroke="#FB7185"
                      dot={false}
                      strokeWidth={1.8}
                      isAnimationActive={true}
                      animationDuration={1000}
                      animationEasing="ease-out"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* IMU Signal Chart */}
            <div className="glass-card p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">Recorded IMU Kinematic Signals</h4>
                  <p className="text-[11px] text-[#85879C]">Tri-axial Accelerometer (G) &amp; Gyroscope (deg/s)</p>
                </div>
                <span className="text-[10px] font-bold bg-[#7DE8F0]/10 text-[#7DE8F0] border border-[#7DE8F0]/20 px-2.5 py-0.5 rounded-full">148 Hz Raw</span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={prediction.imu_preview.data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="time" unit="s" tick={{ fontSize: 10, fill: '#85879C' }} stroke="rgba(255,255,255,0.1)" />
                    <YAxis tick={{ fontSize: 10, fill: '#85879C' }} stroke="rgba(255,255,255,0.1)" />
                    <Tooltip content={<CustomGlassTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11, color: '#B7B8C8', paddingTop: 6 }} />
                    <Line
                      type="monotone"
                      dataKey="acc_x"
                      name="Acc X"
                      stroke="#A78BFA"
                      dot={false}
                      strokeWidth={1.8}
                      isAnimationActive={true}
                      animationDuration={1000}
                      animationEasing="ease-out"
                    />
                    <Line
                      type="monotone"
                      dataKey="acc_y"
                      name="Acc Y"
                      stroke="#34D399"
                      dot={false}
                      strokeWidth={1.8}
                      isAnimationActive={true}
                      animationDuration={1000}
                      animationEasing="ease-out"
                    />
                    <Line
                      type="monotone"
                      dataKey="acc_z"
                      name="Acc Z"
                      stroke="#FBBF24"
                      dot={false}
                      strokeWidth={1.8}
                      isAnimationActive={true}
                      animationDuration={1000}
                      animationEasing="ease-out"
                    />
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
