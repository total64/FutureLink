import { Navigate, Route, Routes } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from './auth'
import { api } from './lib/api'
import Discover from './pages/Discover'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import OpportunityDetail from './pages/OpportunityDetail'
import ProfileSetup from './pages/ProfileSetup'
import Portfolio from './pages/Portfolio'
import PublicPortfolio from './pages/PublicPortfolio'
import Saved from './pages/Saved'
import { OrgApplications, OrgOpportunities, OrgOverview } from './pages/OrgHome'
import OrgProfile from './pages/OrgProfile'
import OrgPlans from './pages/OrgPlans'
import OrgPromote from './pages/OrgPromote'
import Publish from './pages/Publish'
import Dashboard from './pages/Dashboard'
import { AdminActivity, AdminActivityDetail, AdminContent, AdminDashboard, AdminOrganizations, AdminPayments } from './pages/AdminHome'
import { homeFor } from './lib/roles'
import Welcome from './pages/Welcome'

function Guard({ roles, children }) {
  const { user, ready } = useAuth()
  if (!ready) return <p className="p-8">Loading…</p>
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(user)} replace />
  return children
}

function OrgGate({ children }) {
  const query = useQuery({ queryKey: ['org-me'], queryFn: () => api('/org/me') })
  if (query.isLoading) return <p className="p-8">Loading…</p>
  if (query.error) return <p className="p-8 text-red-700">{query.error.message}</p>
  const org = query.data
  if (!org?.profileSubmitted || org.verificationStatus !== 'APPROVED') {
    return <Navigate to="/org/profile" replace />
  }
  return children
}
function HomeRedirect() {
  const { user, ready } = useAuth()
  if (!ready) return <p className="p-8">Loading…</p>
  if (!user) return <Welcome />
  return <Navigate to={homeFor(user)} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/dashboard" element={<Guard roles={['SEEKER']}><Dashboard /></Guard>} />
      <Route path="/discover" element={<Discover />} />
      <Route path="/opportunities/:id" element={<OpportunityDetail />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/profile" element={<Guard roles={['SEEKER', 'ADMIN']}><ProfileSetup /></Guard>} />
      <Route path="/portfolio" element={<Guard roles={['SEEKER', 'ADMIN']}><Portfolio /></Guard>} />
      <Route path="/portfolio/:slug" element={<PublicPortfolio />} />
      <Route path="/saved" element={<Guard roles={['SEEKER', 'ADMIN']}><Saved /></Guard>} />
      <Route path="/applications" element={<Guard roles={['SEEKER', 'ADMIN']}><Saved mode="applications" /></Guard>} />
      <Route path="/org" element={<Guard roles={['PROVIDER']}><OrgGate><OrgOverview /></OrgGate></Guard>} />
      <Route path="/org/profile" element={<Guard roles={['PROVIDER']}><OrgProfile /></Guard>} />
      <Route path="/org/opportunities" element={<Guard roles={['PROVIDER']}><OrgGate><OrgOpportunities /></OrgGate></Guard>} />
      <Route path="/org/applications" element={<Guard roles={['PROVIDER']}><OrgGate><OrgApplications /></OrgGate></Guard>} />
      <Route path="/org/plans" element={<Guard roles={['PROVIDER']}><OrgGate><OrgPlans /></OrgGate></Guard>} />
      <Route path="/org/promote" element={<Guard roles={['PROVIDER']}><OrgGate><OrgPromote /></OrgGate></Guard>} />
      <Route path="/org/publish" element={<Guard roles={['PROVIDER']}><OrgGate><Publish /></OrgGate></Guard>} />
      <Route path="/admin" element={<Guard roles={['ADMIN']}><AdminDashboard /></Guard>} />
      <Route path="/admin/organizations" element={<Guard roles={['ADMIN']}><AdminOrganizations /></Guard>} />
      <Route path="/admin/activity" element={<Guard roles={['ADMIN']}><AdminActivity /></Guard>} />
      <Route path="/admin/activity/:id" element={<Guard roles={['ADMIN']}><AdminActivityDetail /></Guard>} />
      <Route path="/admin/content" element={<Guard roles={['ADMIN']}><AdminContent /></Guard>} />
      <Route path="/admin/payments" element={<Guard roles={['ADMIN']}><AdminPayments /></Guard>} />
      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  )
}
