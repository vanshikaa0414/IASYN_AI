import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { doctorService } from '../../services/doctorService';
import { AssignedPatient } from '../../types/assessment';
import { Users, Mail, Activity, Clock, ChevronRight, ShieldCheck, User as UserIcon } from 'lucide-react';

export const DoctorPatientsPage: React.FC = () => {
  const [patients, setPatients] = useState<AssignedPatient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    doctorService
      .getAssignedPatients()
      .then((res) => setPatients(res))
      .catch((err) => console.error('Failed to load assigned patients:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Assigned Patients
          </h1>
          <p className="text-xs sm:text-sm text-[#85879C] mt-1">
            Patients under your clinical supervision. Access is strictly scoped to authorized assignments.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 text-xs text-[#A78BFA] bg-[#A78BFA]/10 border border-[#A78BFA]/20 px-3.5 py-1.5 rounded-full font-medium">
          <ShieldCheck className="w-4 h-4 text-[#A78BFA]" />
          <span>Role-Based Access Active</span>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-[#85879C] text-xs">Loading patient registry...</div>
      ) : patients.length === 0 ? (
        <div className="text-center py-12 bg-[#11131D] rounded-2xl border border-dashed border-white/10 p-8">
          <Users className="w-10 h-10 text-[#85879C] mx-auto mb-3" />
          <h4 className="font-bold text-white text-sm">No patients currently assigned</h4>
          <p className="text-xs text-[#85879C] mt-1">
            Run seed_demo.py to configure demo patient assignments.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {patients.map((patient) => (
            <div
              key={patient.id}
              className="bg-[#11131D] rounded-2xl border border-white/10 p-6 shadow-xl hover:border-[#A78BFA]/40 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-3.5 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#7C6CF5] to-[#A78BFA] text-white flex items-center justify-center font-bold text-lg shadow-md">
                    {patient.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">{patient.name}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-[#85879C]">
                      <Mail className="w-3.5 h-3.5" />
                      <span>{patient.email}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-[#0B0D16] p-3 rounded-xl border border-white/5 text-xs mb-4">
                  <div>
                    <span className="text-[#85879C] block text-[10px] uppercase font-bold tracking-wider">Total Sessions</span>
                    <span className="font-bold text-white text-sm">{patient.total_assessments}</span>
                  </div>
                  <div>
                    <span className="text-[#85879C] block text-[10px] uppercase font-bold tracking-wider">Pending Review</span>
                    <span className={`font-bold text-sm ${patient.pending_reviews > 0 ? 'text-[#FBBF24]' : 'text-[#34D399]'}`}>
                      {patient.pending_reviews}
                    </span>
                  </div>
                </div>

                {patient.latest_assessment_date && (
                  <p className="text-[11px] text-[#85879C] mb-4">
                    Latest session: {new Date(patient.latest_assessment_date).toLocaleDateString()}
                  </p>
                )}
              </div>

              <Link
                to={`/doctor/assessments?patient_id=${patient.id}`}
                className="w-full py-2.5 px-4 rounded-full bg-[#171925] hover:bg-[#A78BFA]/10 border border-white/10 hover:border-[#A78BFA]/30 text-white hover:text-[#A78BFA] font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <span>View Patient Assessments</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
