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
  Info,
  Download
} from 'lucide-react';

export const PatientReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'webcam' | 'feedback' | 'sensor'>('webcam');
  const [assessments, setAssessments] = useState<WebcamAssessment[]>([]);
  const [demoHistory, setDemoHistory] = useState<SensorDemoHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    // Check url search params for initial tab
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam === 'feedback') {
      setActiveTab('feedback');
    }

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

  const assessmentsWithFeedback = assessments.filter((a) => !!a.feedback);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-page-enter">
      {/* Page Title */}
      <div className="border-b border-white/10 pb-5">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="badge-violet">Rehabilitation Records</span>
          <span className="text-white/20 text-xs">•</span>
          <span className="text-xs font-semibold text-[#B7B8C8]">Kinematic Telemetry & Clinical Review</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Patient Movement Reports &amp; History
        </h1>
        <p className="text-xs sm:text-sm text-[#85879C] mt-1">
          Review your objective webcam joint angle assessments, physiotherapist clinical feedback, and KneE-PAD sensor demonstration history.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 gap-2">
        <button
          onClick={() => setActiveTab('webcam')}
          className={`py-3 px-5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 rounded-t-xl ${
            activeTab === 'webcam'
              ? 'border-[#A78BFA] text-white bg-[#171925]'
              : 'border-transparent text-[#85879C] hover:text-white'
          }`}
        >
          <Camera className="w-4 h-4 text-[#A78BFA]" />
          <span>My Webcam Assessments ({assessments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('feedback')}
          className={`py-3 px-5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 rounded-t-xl ${
            activeTab === 'feedback'
              ? 'border-[#7DE8F0] text-white bg-[#171925]'
              : 'border-transparent text-[#85879C] hover:text-white'
          }`}
        >
          <Stethoscope className="w-4 h-4 text-[#7DE8F0]" />
          <span>Doctor Feedback ({assessmentsWithFeedback.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('sensor')}
          className={`py-3 px-5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 rounded-t-xl ${
            activeTab === 'sensor'
              ? 'border-[#A78BFA] text-white bg-[#171925]'
              : 'border-transparent text-[#85879C] hover:text-white'
          }`}
        >
          <Cpu className="w-4 h-4 text-[#A78BFA]" />
          <span>Sensor AI Demo History ({demoHistory.length})</span>
        </button>
      </div>

      {/* Tab 1: My Webcam Assessments */}
      {activeTab === 'webcam' && (
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12 text-[#85879C] text-xs">Loading assessments...</div>
          ) : assessments.length === 0 ? (
            <div className="text-center py-12 card-surface rounded-2xl border border-dashed border-white/10 p-8">
              <Camera className="w-10 h-10 text-[#85879C] mx-auto mb-3" />
              <h4 className="font-bold text-white text-sm">No webcam assessments on file</h4>
              <p className="text-xs text-[#85879C] mt-1">
                Completed live webcam sessions will appear here with kinematics, attempts, and doctor notes.
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
                    className="card-surface overflow-hidden transition-all"
                  >
                    {/* Header Row */}
                    <div
                      onClick={() => toggleExpand(a.id)}
                      className="p-5 cursor-pointer hover:bg-[#171925]/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="flex items-start sm:items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-[#171925] text-[#A78BFA] border border-white/10 flex items-center justify-center shrink-0 font-bold">
                          {a.repetition_count}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-bold text-white text-sm">{a.exercise_name}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              a.assessment_status === 'Meets configured criteria'
                                ? 'bg-[#34D399]/20 text-[#34D399] border border-[#34D399]/30'
                                : 'bg-[#FBBF24]/20 text-[#FBBF24] border border-[#FBBF24]/30'
                            }`}>
                              {a.assessment_status}
                            </span>
                            {a.has_video && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#A78BFA]/20 text-[#A78BFA] border border-[#A78BFA]/30">
                                Video Saved
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-[#85879C]">
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
                            <span>Pass Rate: {a.movement_pass_rate !== null && a.movement_pass_rate !== undefined ? `${Math.round(a.movement_pass_rate)}%` : 'N/A'}</span>
                            <span>•</span>
                            <span>ROM: {a.range_of_motion}°</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 self-end md:self-auto">
                        {a.feedback ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#A78BFA]/20 text-[#A78BFA] border border-[#A78BFA]/30">
                            <Stethoscope className="w-3.5 h-3.5" />
                            Doctor Reviewed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/5 text-[#85879C] border border-white/10">
                            <Clock className="w-3.5 h-3.5" />
                            Pending Review
                          </span>
                        )}

                        <button className="text-[#85879C] hover:text-white">
                          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    {/* Expanded Detail Panel */}
                    {isExpanded && (
                      <div className="p-6 bg-[#0B0D16] border-t border-white/10 space-y-5 animate-in fade-in duration-150">
                        {/* Video Player */}
                        {a.has_video ? (
                          <div className="bg-[#050509] rounded-2xl overflow-hidden border border-white/10 shadow-xl max-w-xl mx-auto">
                            <video
                              controls
                              playsInline
                              src={assessmentService.getVideoStreamUrl(a.id)}
                              className="w-full max-h-[300px] object-contain mx-auto bg-black"
                            >
                              Your browser does not support authenticated video playback.
                            </video>
                            <div className="p-2.5 bg-[#11131D] text-[#85879C] text-[11px] flex flex-wrap items-center justify-between gap-2 border-t border-white/5">
                              <span className="flex items-center gap-1.5 text-[#34D399]">
                                <ShieldCheck className="w-3.5 h-3.5" /> Private Recorded Session Video
                              </span>
                              <div className="flex items-center gap-3">
                                <span>{Math.round((a.video_file_size || 0) / 1024)} KB</span>
                                <a
                                  href={assessmentService.getVideoStreamUrl(a.id)}
                                  download={`IASYN_Knee_Extension_Assessment_${a.id}.webm`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn-pill-primary text-[11px] !py-1 !px-3 inline-flex items-center gap-1"
                                  title="Download video to your device"
                                >
                                  <Download className="w-3 h-3" />
                                  <span>Download</span>
                                </a>
                              </div>
                            </div>
                          </div>
                        ) : a.is_demo ? (
                          <div className="p-4 bg-[#11131D] rounded-xl border border-dashed border-white/10 text-center text-xs text-[#85879C] font-medium">
                            No recording — demonstration data.
                          </div>
                        ) : (
                          <div className="p-4 bg-[#11131D] rounded-xl border border-dashed border-white/10 text-center text-xs text-[#85879C] font-medium">
                            Video unavailable — metrics-only assessment.
                          </div>
                        )}

                        {/* Attempt-Level Metrics Breakdown */}
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                          <div className="bg-[#11131D] p-3 rounded-xl border border-white/5 text-xs">
                            <span className="text-[#85879C] block">Total Attempts</span>
                            <span className="font-extrabold text-white text-base">
                              {a.total_attempts ?? a.repetition_count}
                            </span>
                          </div>
                          <div className="bg-[#34D399]/10 p-3 rounded-xl border border-[#34D399]/20 text-xs">
                            <span className="text-[#34D399] block">Passed</span>
                            <span className="font-extrabold text-[#34D399] text-base">
                              {a.passed_attempts ?? a.repetition_count}
                            </span>
                          </div>
                          <div className="bg-[#FB7185]/10 p-3 rounded-xl border border-[#FB7185]/20 text-xs">
                            <span className="text-[#FB7185] block">Failed</span>
                            <span className="font-extrabold text-[#FB7185] text-base">
                              {a.failed_attempts ?? 0}
                            </span>
                          </div>
                          <div className="bg-[#FBBF24]/10 p-3 rounded-xl border border-[#FBBF24]/20 text-xs">
                            <span className="text-[#FBBF24] block">Unassessable</span>
                            <span className="font-extrabold text-[#FBBF24] text-base">
                              {a.unassessable_attempts ?? 0}
                            </span>
                          </div>
                          <div className="bg-[#A78BFA]/10 p-3 rounded-xl border border-[#A78BFA]/20 text-xs">
                            <span className="text-[#A78BFA] block">Pass Rate</span>
                            <span className="font-extrabold text-[#A78BFA] text-base">
                              {a.movement_pass_rate !== null && a.movement_pass_rate !== undefined
                                ? `${Math.round(a.movement_pass_rate)}%`
                                : 'N/A'}
                            </span>
                          </div>
                        </div>

                        {/* Kinematic Angles Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="bg-[#11131D] p-3 rounded-xl border border-white/5 text-xs">
                            <span className="text-[#85879C] block">Terminal Extension</span>
                            <span className="font-extrabold text-white text-base">{a.max_knee_angle}°</span>
                          </div>
                          <div className="bg-[#11131D] p-3 rounded-xl border border-white/5 text-xs">
                            <span className="text-[#85879C] block">Resting Flexion</span>
                            <span className="font-extrabold text-white text-base">{a.min_knee_angle}°</span>
                          </div>
                          <div className="bg-[#11131D] p-3 rounded-xl border border-white/5 text-xs">
                            <span className="text-[#85879C] block">Range of Motion</span>
                            <span className="font-extrabold text-[#A78BFA] text-base">{a.range_of_motion}°</span>
                          </div>
                          <div className="bg-[#11131D] p-3 rounded-xl border border-white/5 text-xs">
                            <span className="text-[#85879C] block">Tracking Quality</span>
                            <span className="font-bold text-white text-xs mt-1 block">{a.tracking_quality}</span>
                          </div>
                        </div>

                        {/* Movement Observations */}
                        <div>
                          <h5 className="text-xs font-bold uppercase tracking-wider text-[#B7B8C8] mb-2">
                            Movement Observations:
                          </h5>
                          <ul className="space-y-1.5 text-xs text-[#85879C]">
                            {observations.map((obs, idx) => (
                              <li key={idx} className="flex items-start gap-2 bg-[#11131D] p-2.5 rounded-xl border border-white/5">
                                <span className="text-[#A78BFA] font-bold shrink-0">•</span>
                                <span>{obs}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Doctor Written Feedback */}
                        {a.feedback ? (
                          <div className="card-surface border-[#A78BFA]/30 p-5">
                            <div className="flex items-center gap-2 text-[#A78BFA] font-bold text-xs mb-2">
                              <Stethoscope className="w-4 h-4" />
                              <span>Clinical Feedback from {a.feedback.doctor_name || 'Physiotherapist'}</span>
                              <span className="text-[#85879C] font-normal">
                                ({new Date(a.feedback.created_at).toLocaleDateString()})
                              </span>
                            </div>
                            <p className="text-xs text-[#B7B8C8] bg-[#0B0D16] p-3.5 rounded-xl border border-white/5 leading-relaxed italic">
                              "{a.feedback.feedback_text}"
                            </p>
                          </div>
                        ) : (
                          <div className="bg-[#11131D] p-4 rounded-xl border border-dashed border-white/10 text-xs text-[#85879C] flex items-center gap-2">
                            <Clock className="w-4 h-4 shrink-0" />
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

      {/* Tab: Doctor Feedback Dedicated View */}
      {activeTab === 'feedback' && (
        <div className="space-y-4">
          {assessmentsWithFeedback.length === 0 ? (
            <div className="text-center py-12 card-surface rounded-2xl border border-dashed border-white/10 p-8">
              <Stethoscope className="w-10 h-10 text-[#85879C] mx-auto mb-3" />
              <h4 className="font-bold text-white text-sm">No Doctor Feedback Available Yet</h4>
              <p className="text-xs text-[#85879C] mt-1">
                Your assigned physiotherapist reviews your recorded movements and provides clinical recommendations here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {assessmentsWithFeedback.map((a) => (
                <div key={a.id} className="card-surface border-[#A78BFA]/30 p-6 space-y-3">
                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <div>
                      <span className="font-bold text-white text-sm">{a.exercise_name}</span>
                      <span className="text-xs text-[#85879C] ml-2">
                        Session: {new Date(a.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#A78BFA]/20 text-[#A78BFA] border border-[#A78BFA]/30">
                      <Stethoscope className="w-3.5 h-3.5" />
                      {a.feedback?.doctor_name || 'Physiotherapist'}
                    </span>
                  </div>

                  <div className="bg-[#0B0D16] p-4 rounded-xl border border-white/5 text-xs text-[#B7B8C8] leading-relaxed italic">
                    "{a.feedback?.feedback_text}"
                  </div>

                  <div className="flex items-center gap-4 text-xs text-[#85879C] pt-1">
                    <span>Pass Rate: {a.movement_pass_rate !== null && a.movement_pass_rate !== undefined ? `${Math.round(a.movement_pass_rate)}%` : 'N/A'}</span>
                    <span>•</span>
                    <span>Reps: {a.repetition_count}</span>
                    <span>•</span>
                    <span>ROM: {a.range_of_motion}°</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Sensor AI Demo History */}
      {activeTab === 'sensor' && (
        <div className="space-y-4">
          <div className="card-surface p-4 text-xs text-[#B7B8C8] flex items-start gap-3">
            <Info className="w-4 h-4 text-[#A78BFA] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-white block">Dataset Demonstration Log:</span>
              <span>
                These entries reflect recorded EMG &amp; IMU sensor files from the KneE-PAD dataset passed through the trained 1D Convolutional Neural Network. They do not represent live patient movement.
              </span>
            </div>
          </div>

          {demoHistory.length === 0 ? (
            <div className="text-center py-12 card-surface rounded-2xl border border-dashed border-white/10 p-8">
              <Cpu className="w-10 h-10 text-[#85879C] mx-auto mb-3" />
              <h4 className="font-bold text-white text-sm">No sensor trials analyzed yet</h4>
              <p className="text-xs text-[#85879C] mt-1">
                Open the Sensor AI Demo page to classify recorded sensor trials using the 1D-CNN.
              </p>
            </div>
          ) : (
            <div className="card-surface overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0B0D16] text-[#85879C] font-semibold uppercase tracking-wider border-b border-white/10">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Dataset Trial ID</th>
                    <th className="py-3 px-4">Predicted Category</th>
                    <th className="py-3 px-4">Dataset Ground Truth</th>
                    <th className="py-3 px-4">Confidence</th>
                    <th className="py-3 px-4">Model Version</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {demoHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-[#171925]/40 transition-colors">
                      <td className="py-3.5 px-4 font-medium text-white">
                        {new Date(item.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-[#85879C]">
                        {item.dataset_trial_id}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-white">
                        {item.predicted_label}
                      </td>
                      <td className="py-3.5 px-4 text-[#B7B8C8]">
                        {item.ground_truth_label}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-[#A78BFA]">
                        {Math.round(item.confidence * 100)}%
                      </td>
                      <td className="py-3.5 px-4 text-[#85879C] text-[11px]">
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
