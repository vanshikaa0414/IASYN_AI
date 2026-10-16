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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Assigned Patients
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Patients under your clinical supervision. Access is strictly scoped to authorized assignments.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 text-xs text-blue-700 bg-blue-50 border border-blue-200 px-3.5 py-1.5 rounded-xl font-medium">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <span>Role-Based Access Active</span>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-xs">Loading patient registry...</div>
      ) : patients.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300 p-8">
          <Users className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h4 className="font-bold text-slate-800 text-sm">No patients currently assigned</h4>
          <p className="text-xs text-slate-500 mt-1">
            Run seed_demo.py to configure demo patient assignments.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {patients.map((patient) => (
            <div
              key={patient.id}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:border-blue-400 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-3.5 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                    {patient.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{patient.name}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Mail className="w-3.5 h-3.5" />
                      <span>{patient.email}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs mb-4">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Sessions</span>
                    <span className="font-bold text-slate-900">{patient.total_assessments}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Pending Review</span>
                    <span className={`font-bold ${patient.pending_reviews > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
                      {patient.pending_reviews}
                    </span>
                  </div>
                </div>

                {patient.latest_assessment_date && (
                  <p className="text-[11px] text-slate-400 mb-4">
                    Latest session: {new Date(patient.latest_assessment_date).toLocaleDateString()}
                  </p>
                )}
              </div>

              <Link
                to={`/doctor/assessments?patient_id=${patient.id}`}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
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
