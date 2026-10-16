import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { doctorService } from '../../services/doctorService';
import { AssignedPatient, PatientProgressData } from '../../types/assessment';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine
} from 'recharts';
import { CustomGlassTooltip } from '../../components/common/CustomGlassTooltip';
import {
  Activity,
  Users,
  TrendingUp,
  TrendingDown,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Info,
  ChevronRight,
  ShieldCheck,
  Stethoscope,
  ArrowRight
} from 'lucide-react';

export const PatientProgressPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [patients, setPatients] = useState<AssignedPatient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [progressData, setProgressData] = useState<PatientProgressData | null>(null);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load assigned patients
  useEffect(() => {
    doctorService
      .getAssignedPatients()
      .then((res) => {
        setPatients(res);
        if (res.length > 0) {
          const queryId = searchParams.get('patient_id');
          const initialId = queryId ? parseInt(queryId, 10) : res[0].id;
          const found = res.find((p) => p.id === initialId) ? initialId : res[0].id;
          setSelectedPatientId(found);
        }
      })
      .catch((err) => {
        console.error('Failed to load patients for progress:', err);
        setError('Failed to load assigned patients.');
      })
      .finally(() => setLoadingPatients(false));
  }, []);

  // Load progress when selected patient changes
  useEffect(() => {
    if (!selectedPatientId) return;
    setLoadingProgress(true);
    setError(null);
    doctorService
      .getPatientProgress(selectedPatientId)
      .then((data) => {
        setProgressData(data);
      })
      .catch((err) => {
        console.error('Failed to load progress data:', err);
        setError('Failed to load longitudinal progress for this patient.');
      })
      .finally(() => setLoadingProgress(false));
  }, [selectedPatientId]);

  const handlePatientChange = (patientId: number) => {
    setSelectedPatientId(patientId);
    setSearchParams({ patient_id: patientId.toString() });
  };

  if (loadingPatients) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center text-slate-400 text-xs">
        Loading patient progress directory...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-page-enter">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#A78BFA]/10 text-[#A78BFA] border border-[#A78BFA]/25 text-xs font-semibold uppercase tracking-wider mb-2">
            <TrendingUp className="w-3.5 h-3.5 text-[#A78BFA]" />
            Longitudinal Rehabilitation Progress
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Patient Adherence &amp; Movement Progress
          </h1>
          <p className="text-xs sm:text-sm text-[#85879C] mt-1">
            Track completed exercise sets, assessable movement pass rates, and knee kinematics across sessions.
          </p>
        </div>

        {/* Patient Switcher Dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-[#85879C] whitespace-nowrap">
            Selected Patient:
          </label>
          <select
            value={selectedPatientId || ''}
            onChange={(e) => handlePatientChange(parseInt(e.target.value, 10))}
            className="px-3.5 py-2 glass-elevated rounded-xl text-xs font-bold text-white shadow-md focus:ring-2 focus:ring-[#A78BFA] focus:outline-none"
          >
            {patients.map((p) => (
              <option key={p.id} value={p.id} className="bg-[#11131D] text-white">
                {p.name} ({p.email})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Clinical Disclaimer & Graph Rule Alert */}
      <div className="p-4 rounded-2xl glass-panel border-l-4 border-l-[#FBBF24] border-white/10 text-[#B7B8C8] text-xs flex items-start gap-3 shadow-lg">
        <Info className="w-5 h-5 text-[#FBBF24] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-white block">Important Clinical Interpretation Principles:</span>
          <ul className="list-disc list-inside space-y-0.5 text-[#B7B8C8]">
            <li><strong className="text-white">More sets do not automatically mean better rehabilitation.</strong> High volume with compensatory movement may be detrimental.</li>
            <li><strong className="text-white">Adherence and movement quality are strictly kept on separate charts.</strong> Completed set adherence measures compliance, whereas pass rate evaluates biomechanical criteria.</li>
            <li><strong className="text-white">A missed session is not a failed attempt.</strong> Missing measurement days are represented as gaps, not zero pass rate or zero knee angle.</li>
            <li>Adherence trends do not replace formal clinical assessment.</li>
          </ul>
        </div>
      </div>

      {loadingProgress ? (
        <div className="py-16 text-center text-[#85879C] text-xs glass-card">
          Loading longitudinal charts and timeline for selected patient...
        </div>
      ) : error ? (
        <div className="p-6 glass-card rounded-2xl border border-[#FB7185]/30 text-[#FB7185] text-xs text-center">
          {error}
        </div>
      ) : !progressData ? (
        <div className="text-center py-12 glass-card rounded-2xl border border-dashed border-white/10 p-8">
          <Activity className="w-10 h-10 text-[#85879C] mx-auto mb-3" />
          <h4 className="font-bold text-white text-sm">No longitudinal data on file</h4>
          <p className="text-xs text-[#85879C] mt-1">
            Complete seated knee extension sessions with this patient to populate progress curves.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Patient Adherence Pattern Banner */}
          <div className="glass-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-[#85879C] uppercase tracking-wider">Adherence Profile</span>
                {progressData.is_demo_patient && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#A78BFA]/10 text-[#A78BFA] border border-[#A78BFA]/20">
                    Demonstration Patient
                  </span>
                )}
              </div>
              <h2 className="text-xl font-black text-white">{progressData.patient_name}</h2>
              <p className="text-xs font-semibold text-[#A78BFA] mt-0.5">
                {progressData.adherence_pattern}
              </p>
            </div>

            <div className="flex items-center gap-6 glass-panel p-4 rounded-xl border border-white/8 text-xs">
              <div>
                <span className="text-[#85879C] block text-[10px] uppercase font-bold tracking-wider">Completed Sets</span>
                <span className="text-xl font-black text-white">{progressData.total_completed_sets}</span>
              </div>
              <div className="border-l border-white/10 pl-4">
                <span className="text-[#85879C] block text-[10px] uppercase font-bold tracking-wider">Planned Sets</span>
                <span className="text-xl font-black text-[#85879C]">{progressData.total_planned_sets}</span>
              </div>
              <div className="border-l border-white/10 pl-4">
                <span className="text-[#85879C] block text-[10px] uppercase font-bold tracking-wider">Overall Adherence</span>
                <span className="text-xl font-black text-[#34D399]">{Math.round(progressData.adherence_rate)}%</span>
              </div>
            </div>
          </div>

          {/* Longitudinal Graphs Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart A: Completed Sets Over Time */}
            <div className="glass-card p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Chart A: Completed Sets Over Time</h3>
                  <p className="text-[11px] text-[#85879C]">Scheduled vs completed rehabilitation sets per day</p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#A78BFA]/10 text-[#A78BFA] border border-[#A78BFA]/20">
                  Adherence Metric
                </span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={progressData.daily_timeline} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="violetBarGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#A78BFA" stopOpacity={1} />
                        <stop offset="100%" stopColor="#7C6CF5" stopOpacity={0.8} />
                      </linearGradient>
                      <linearGradient id="plannedBarGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4A4D65" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#2A2D3E" stopOpacity={0.65} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="day_label" tick={{ fontSize: 11, fill: '#85879C' }} stroke="rgba(255,255,255,0.1)" />
                    <YAxis allowDecimals={false} domain={[0, 'dataMax + 1']} tick={{ fontSize: 11, fill: '#85879C' }} stroke="rgba(255,255,255,0.1)" />
                    <Tooltip content={<CustomGlassTooltip unit=" sets" />} />
                    <Legend wrapperStyle={{ fontSize: 11, color: '#B7B8C8' }} />
                    <Bar
                      dataKey="completed_sets"
                      name="Completed Sets"
                      fill="url(#violetBarGrad)"
                      radius={[6, 6, 0, 0]}
                      isAnimationActive={true}
                      animationDuration={1000}
                      animationEasing="ease-out"
                    />
                    <Bar
                      dataKey="planned_sets"
                      name="Planned Target Sets"
                      fill="url(#plannedBarGrad)"
                      radius={[6, 6, 0, 0]}
                      isAnimationActive={true}
                      animationDuration={1000}
                      animationEasing="ease-out"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[11px] text-[#85879C] italic text-center">
                Reflects session adherence only; does not imply movement accuracy.
              </p>
            </div>

            {/* Chart B: Assessable Movement Pass Rate Over Time */}
            <div className="glass-card p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Chart B: Movement Criteria Pass Rate Over Time</h3>
                  <p className="text-[11px] text-[#85879C]">Passed / (Passed + Failed) × 100 per active day</p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#7DE8F0]/10 text-[#7DE8F0] border border-[#7DE8F0]/20">
                  Quality Metric
                </span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={progressData.daily_timeline} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="cyanAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#7DE8F0" stopOpacity={0.35} />
                        <stop offset="90%" stopColor="#7DE8F0" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="day_label" tick={{ fontSize: 11, fill: '#85879C' }} stroke="rgba(255,255,255,0.1)" />
                    <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11, fill: '#85879C' }} stroke="rgba(255,255,255,0.1)" />
                    <Tooltip content={<CustomGlassTooltip unit="%" />} />
                    <Legend wrapperStyle={{ fontSize: 11, color: '#B7B8C8' }} />
                    <ReferenceLine y={80} stroke="#34D399" strokeDasharray="3 3" label={{ value: 'Target 80%', fill: '#34D399', fontSize: 10 }} />
                    <Area
                      type="monotone"
                      dataKey="pass_rate"
                      name="Assessable Pass Rate (%)"
                      stroke="#7DE8F0"
                      strokeWidth={2.8}
                      fill="url(#cyanAreaGrad)"
                      connectNulls={false}
                      dot={{ r: 4, fill: '#7DE8F0', stroke: '#050509', strokeWidth: 1.5 }}
                      activeDot={{ r: 6, fill: '#7DE8F0', stroke: '#FFFFFF', strokeWidth: 2 }}
                      isAnimationActive={true}
                      animationDuration={1200}
                      animationEasing="ease-out"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[11px] text-[#85879C] italic text-center">
                Unassessable attempts are strictly excluded from the denominator. Missing days are shown as gaps.
              </p>
            </div>

            {/* Chart C: Passed and Failed Attempts Per Session */}
            <div className="glass-card p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Chart C: Passed vs Failed Attempts</h3>
                  <p className="text-[11px] text-[#85879C]">Attempt volume segmented by criteria outcome</p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#A78BFA]/10 text-[#A78BFA] border border-[#A78BFA]/20">
                  Volume Breakdown
                </span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={progressData.daily_timeline} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="emeraldBarGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#34D399" stopOpacity={1} />
                        <stop offset="100%" stopColor="#10B981" stopOpacity={0.8} />
                      </linearGradient>
                      <linearGradient id="roseBarGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#FB7185" stopOpacity={1} />
                        <stop offset="100%" stopColor="#F43F5E" stopOpacity={0.8} />
                      </linearGradient>
                      <linearGradient id="amberBarGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#FBBF24" stopOpacity={1} />
                        <stop offset="100%" stopColor="#F59E0B" stopOpacity={0.8} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="day_label" tick={{ fontSize: 11, fill: '#85879C' }} stroke="rgba(255,255,255,0.1)" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#85879C' }} stroke="rgba(255,255,255,0.1)" />
                    <Tooltip content={<CustomGlassTooltip unit=" attempts" />} />
                    <Legend wrapperStyle={{ fontSize: 11, color: '#B7B8C8' }} />
                    <Bar
                      dataKey="passed_attempts"
                      name="Passed Attempts"
                      fill="url(#emeraldBarGrad)"
                      stackId="a"
                      isAnimationActive={true}
                      animationDuration={1000}
                      animationEasing="ease-out"
                    />
                    <Bar
                      dataKey="failed_attempts"
                      name="Failed Attempts"
                      fill="url(#roseBarGrad)"
                      stackId="a"
                      isAnimationActive={true}
                      animationDuration={1000}
                      animationEasing="ease-out"
                    />
                    <Bar
                      dataKey="unassessable_attempts"
                      name="Unable to Assess"
                      fill="url(#amberBarGrad)"
                      stackId="a"
                      radius={[6, 6, 0, 0]}
                      isAnimationActive={true}
                      animationDuration={1000}
                      animationEasing="ease-out"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[11px] text-[#85879C] italic text-center">
                Total Attempts = Passed + Failed + Unable to Assess.
              </p>
            </div>

            {/* Chart D: Estimated Knee Range of Motion Over Time */}
            <div className="glass-card p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Chart D: Average Knee Range of Motion Over Time</h3>
                  <p className="text-[11px] text-[#85879C]">Measured sagittal knee excursion in active sessions</p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#A78BFA]/10 text-[#A78BFA] border border-[#A78BFA]/20">
                  Kinematic Trend
                </span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={progressData.daily_timeline} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="violetAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#A78BFA" stopOpacity={0.35} />
                        <stop offset="90%" stopColor="#A78BFA" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="day_label" tick={{ fontSize: 11, fill: '#85879C' }} stroke="rgba(255,255,255,0.1)" />
                    <YAxis domain={[40, 110]} unit="°" tick={{ fontSize: 11, fill: '#85879C' }} stroke="rgba(255,255,255,0.1)" />
                    <Tooltip content={<CustomGlassTooltip unit="°" />} />
                    <Legend wrapperStyle={{ fontSize: 11, color: '#B7B8C8' }} />
                    <ReferenceLine y={80} stroke="#A78BFA" strokeDasharray="3 3" label={{ value: 'Target 80° ROM', fill: '#A78BFA', fontSize: 10 }} />
                    <Area
                      type="monotone"
                      dataKey="avg_rom"
                      name="Average ROM (°)"
                      stroke="#A78BFA"
                      strokeWidth={2.8}
                      fill="url(#violetAreaGrad)"
                      connectNulls={false}
                      dot={{ r: 4, fill: '#A78BFA', stroke: '#050509', strokeWidth: 1.5 }}
                      activeDot={{ r: 6, fill: '#A78BFA', stroke: '#FFFFFF', strokeWidth: 2 }}
                      isAnimationActive={true}
                      animationDuration={1200}
                      animationEasing="ease-out"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[11px] text-[#85879C] italic text-center">
                Missing measurements are represented as data gaps, not zero range of motion.
              </p>
            </div>
          </div>

          {/* Daily Schedule Adherence Table */}
          <div className="glass-card shadow-xl overflow-hidden">
            <div className="p-5 border-b border-white/10 glass-panel flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-sm">Longitudinal Daily Exercise Record</h3>
                <p className="text-xs text-[#85879C]">Chronological adherence log and movement metrics</p>
              </div>
              <span className="text-xs font-semibold text-[#85879C]">
                {progressData.daily_timeline.length} Days Tracked
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0B0D16]/80 backdrop-blur-md text-[#85879C] font-semibold uppercase tracking-wider border-b border-white/10">
                  <tr>
                    <th className="py-3 px-4">Timeline</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Completed / Planned Sets</th>
                    <th className="py-3 px-4">Movement Pass Rate</th>
                    <th className="py-3 px-4">Passed / Failed Attempts</th>
                    <th className="py-3 px-4">Avg ROM</th>
                    <th className="py-3 px-4">Session Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {progressData.daily_timeline.map((item, idx) => (
                    <tr key={idx} className="hover:bg-white/5 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-white">{item.day_label}</td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-[#85879C]">{item.date}</td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-[#A78BFA]">{item.completed_sets}</span>
                        <span className="text-[#85879C]"> / {item.planned_sets} sets</span>
                      </td>
                      <td className="py-3.5 px-4">
                        {item.pass_rate !== null && item.pass_rate !== undefined ? (
                          <span className="font-bold text-[#7DE8F0]">{item.pass_rate}%</span>
                        ) : (
                          <span className="text-[#85879C] italic">N/A (No attempts)</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-[#34D399] font-bold">{item.passed_attempts} passed</span>
                        <span className="text-[#85879C]"> • </span>
                        <span className="text-[#FB7185] font-bold">{item.failed_attempts} failed</span>
                        {item.unassessable_attempts > 0 && (
                          <span className="text-[#FBBF24] text-[11px]"> ({item.unassessable_attempts} unassessable)</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-white">
                        {item.avg_rom !== null && item.avg_rom !== undefined ? `${item.avg_rom}°` : '—'}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-[#B7B8C8]">
                        {item.sessions_count} session{item.sessions_count !== 1 ? 's' : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Individual Recorded Sessions */}
          <div className="glass-card p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-sm">Individual Sessions Under Review</h3>
                <p className="text-xs text-[#85879C]">Click any session to open video playback, attempt segmentation, and doctor feedback</p>
              </div>
              <Link
                to={`/doctor/assessments?patient_id=${progressData.patient_id}`}
                className="text-xs font-semibold text-[#A78BFA] hover:text-white flex items-center gap-1 transition-colors"
              >
                <span>View Full List</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {progressData.sessions.slice(0, 6).map((s) => (
                <Link
                  key={s.id}
                  to={`/doctor/assessments/${s.id}`}
                  className="p-4 rounded-xl glass-panel border border-white/8 hover:border-[#A78BFA]/40 hover:shadow-xl transition-all flex flex-col justify-between group hover:-translate-y-0.5"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-white">{s.exercise_name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        s.review_status === 'Reviewed' ? 'bg-[#34D399]/10 text-[#34D399] border border-[#34D399]/20' : 'bg-[#FBBF24]/10 text-[#FBBF24] border border-[#FBBF24]/20'
                      }`}>
                        {s.review_status}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#85879C] mb-2">
                      {new Date(s.created_at).toLocaleDateString()} • Reps: {s.repetition_count} • ROM: {s.range_of_motion}°
                    </p>
                    {s.has_video && (
                      <span className="text-[10px] text-[#A78BFA] font-bold block mb-1">
                        Recorded Video Available
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-[#A78BFA] group-hover:translate-x-0.5 transition-transform flex items-center gap-1 mt-2">
                    Review Assessment <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
