import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Layouts
import Layout from './components/Layout'; // Use this as anonymous global wrapper if needed, but let's separate them
import StudentLayout from './layouts/StudentLayout';
import HiringLayout from './layouts/HiringLayout';
import AssessmentLayout from './layouts/AssessmentLayout';

// Public Pages
import Landing from './pages/Landing';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';

// Protected Generic Pages
import Profile from './pages/Profile';

// Hiring Pages
import HiringDashboard from './pages/dashboards/HiringDashboard';
import MyJobs from './pages/hiring/MyJobs';
import CreateJob from './pages/hiring/CreateJob';
import JobDetails from './pages/hiring/JobDetails';
import ApplicantReview from './pages/hiring/ApplicantReview';
import AssessmentBuilder from './pages/hiring/AssessmentBuilder';

// Student / Public Pages
import PublicJobs from './pages/PublicJobs';
import StudentApplications from './pages/student/StudentApplications';
import AssessmentEngine from './pages/student/AssessmentEngine';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes - Using Layout to keep original Navbar for Landing Page*/}
          <Route path="/" element={<Layout />}>
            <Route index element={<Landing />} />
            <Route path="login" element={<Login />} />
            <Route path="signup" element={<Signup />} />
          </Route>

          {/* Hiring Routes */}
          <Route element={<ProtectedRoute allowedRole="hiring" />}>
            <Route element={<HiringLayout />}>
              <Route path="/hiring-dashboard" element={<HiringDashboard />} />
              <Route path="/hiring-jobs" element={<HiringDashboard />} />
              <Route path="/hiring-jobs/create" element={<CreateJob />} />
              <Route path="/hiring-jobs/:jobId" element={<JobDetails />} />
              <Route path="/hiring-jobs/:jobId/review" element={<ApplicantReview />} />
              <Route path="/hiring-jobs/:jobId/assessment-builder" element={<AssessmentBuilder />} />
            </Route>
          </Route>

          {/* Student Layout for Public Discovery */}
          <Route element={<StudentLayout />}>
             {/* Unprotected Route to view jobs publicly */}
             <Route path="jobs" element={<PublicJobs />} />
             
             {/* Protected Student Portal operations */}
             <Route element={<ProtectedRoute allowedRole="student" />}>
               <Route path="student-applications" element={<StudentApplications />} />
               <Route path="profile" element={<Profile />} />
             </Route>
          </Route>

          {/* Assessment Environment (Locked Route) */}
          <Route element={<AssessmentLayout />}>
             <Route path="assessment/:token" element={<AssessmentEngine />} />
          </Route>
          
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
