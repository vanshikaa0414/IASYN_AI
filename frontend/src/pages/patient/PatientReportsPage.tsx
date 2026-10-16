import React, { useState, useEffect } from 'react';
import { assessmentService } from '../../services/assessmentService';
import { sensorService } from '../../services/sensorService';
import { WebcamAssessment } from '../../types/assessment';
import { SensorDemoHistoryItem } from '../../types/sensor';
import { 
  Camera, 
  Cpu, 
  FileText, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Stethoscope, 
  ChevronDown, 
  ChevronUp, 
  ShieldCheck, 
  AlertCircle,
  Activity,
  Info
} from 'lucide-react';

export const PatientReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'webcam' | 'sensor'>('webcam');
  const [assessments, setAssessments] = useState<WebcamAssessment[]>([]);
  const [demoHistory, setDemoHistory] = useState<SensorDemoHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      assessmentService.getPatientAssessments(),
      sensorService.getDemoHistory()
    ])
      .then(([aRes, sRes]) => {
        setAssessments(aRes);
        setDemoHistory(sRes);
      })
      .catch((err) => console.error('Failed to load reports:', err))
      .finally(() => setLoading(false));
  }, []);

  const toggleExpand = (id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Title */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Patient Movement Reports &amp; History
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Review your objective webcam joint angle assessments, physiotherapist clinical feedback, and KneE-PAD sensor demonstration history.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('webcam')}
          className={`py-3 px-5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'webcam'
              ? 'border-teal-600 text-teal-700 bg-teal-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>My Webcam Assessments ({assessments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('sensor')}
          className={`py-3 px-5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'sensor'
              ? 'border-sky-600 text-sky-700 bg-sky-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>Sensor AI Demo History ({demoHistory.length})</span>
        </button>
      </div>

      {/* Tab 1: My Webcam Assessments */}
      {activeTab === 'webcam' && (
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12 text-slate-400 text-xs">Loading assessments...</div>
          ) : assessments.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300 p-8">
              <Camera className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <h4 className="font-bold text-slate-800 text-sm">No webcam assessments on file</h4>
              <p className="text-xs text-slate-500 mt-1">
                Completed live webcam sessions will appear here with kinematics and doctor notes.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {assessments.map((a) => {
                const observations: string[] = (() => {
                  try {
                    return JSON.parse(a.observations_json);
                  } catch {
                    return [];
                  }
                })();

                const isExpanded = expandedId === a.id;

                return (
                  <div
                    key={a.id}
                    className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition-all"
                  >
                    {/* Header Row */}
                    <div
                      onClick={() => toggleExpand(a.id)}
                      className="p-5 cursor-pointer hover:bg-slate-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="flex items-start sm:items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 border border-teal-100 font-bold">
                          {a.repetition_count}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-bold text-slate-900 text-sm">{a.exercise_name}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              a.assessment_status === 'Meets configured criteria'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {a.assessment_status}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {new Date(a.created_at).toLocaleString(undefined, {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })}
                            </span>
                            <span>•</span>
                            <span>Duration: {a.duration_seconds}s</span>
                            <span>•</span>
                            <span>ROM: {a.range_of_motion}°</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 self-end md:self-auto">
                        {a.feedback ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-800 border border-teal-200">
                            <Stethoscope className="w-3.5 h-3.5" />
                            Doctor Reviewed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                            <Clock className="w-3.5 h-3.5" />
                            Pending Review
                          </span>
                        )}

                        <button className="text-slate-400 hover:text-slate-600">
                          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    {/* Expanded Detail Panel */}
                    {isExpanded && (
                      <div className="p-6 bg-slate-50 border-t border-slate-200 space-y-5 animate-in fade-in duration-150">
                        {/* Kinematic Angles Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs">
                            <span className="text-slate-500 block">Terminal Extension</span>
                            <span className="font-extrabold text-slate-900 text-base">{a.max_knee_angle}°</span>
                          </div>
                          <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs">
                            <span className="text-slate-500 block">Resting Flexion</span>
                            <span className="font-extrabold text-slate-900 text-base">{a.min_knee_angle}°</span>
                          </div>
                          <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs">
                            <span className="text-slate-500 block">Range of Motion</span>
                            <span className="font-extrabold text-teal-700 text-base">{a.range_of_motion}°</span>
                          </div>
                          <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs">
                            <span className="text-slate-500 block">Tracking Quality</span>
                            <span className="font-bold text-slate-800 text-xs mt-1 block">{a.tracking_quality}</span>
                          </div>
                        </div>

                        {/* Movement Observations */}
                        <div>
                          <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                            Algorithmically Identified Movement Observations:
                          </h5>
                          <ul className="space-y-1.5 text-xs text-slate-600">
                            {observations.map((obs, idx) => (
                              <li key={idx} className="flex items-start gap-2 bg-white p-2.5 rounded-xl border border-slate-200">
                                <span className="text-teal-600 font-bold shrink-0">•</span>
                                <span>{obs}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Doctor Written Feedback */}
                        {a.feedback ? (
                          <div className="bg-white rounded-2xl border border-teal-200 p-5 shadow-xs">
                            <div className="flex items-center gap-2 text-teal-800 font-bold text-xs mb-2">
                              <Stethoscope className="w-4 h-4 text-teal-600" />
                              <span>Clinical Feedback from {a.feedback.doctor_name || 'Physiotherapist'}</span>
                              <span className="text-slate-400 font-normal">
                                ({new Date(a.feedback.created_at).toLocaleDateString()})
                              </span>
                            </div>
                            <p className="text-xs text-slate-700 bg-teal-50/50 p-3.5 rounded-xl border border-teal-100 leading-relaxed italic">
                              "{a.feedback.feedback_text}"
                            </p>
                          </div>
                        ) : (
                          <div className="bg-white p-4 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                            <span>Awaiting clinical review from your assigned physiotherapist.</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Sensor AI Demo History */}
      {activeTab === 'sensor' && (
        <div className="space-y-4">
          <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 text-xs text-sky-900 flex items-start gap-3">
            <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Dataset Demonstration Log:</span>
              <span>
                These entries reflect recorded EMG &amp; IMU sensor files from the KneE-PAD dataset passed through the trained 1D Convolutional Neural Network. They do not represent live patient movement.
              </span>
            </div>
          </div>

          {demoHistory.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300 p-8">
              <Cpu className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <h4 className="font-bold text-slate-800 text-sm">No sensor trials analyzed yet</h4>
              <p className="text-xs text-slate-500 mt-1">
                Open the Sensor AI Demo page to classify recorded sensor trials using the 1D-CNN.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Dataset Trial ID</th>
                    <th className="py-3 px-4">Predicted Category</th>
                    <th className="py-3 px-4">Dataset Ground Truth</th>
                    <th className="py-3 px-4">Confidence</th>
                    <th className="py-3 px-4">Model Version</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {demoHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="py-3.5 px-4 font-medium text-slate-800">
                        {new Date(item.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-700">
                        {item.dataset_trial_id}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {item.predicted_label}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {item.ground_truth_label}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-sky-700">
                        {Math.round(item.confidence * 100)}%
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                        {item.model_version}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
