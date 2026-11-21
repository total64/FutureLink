import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth'
import Discover from './pages/Discover'
import Login from './pages/Login'
import Register from './pages/Register'
import OpportunityDetail from './pages/OpportunityDetail'
import ProfileSetup from './pages/ProfileSetup'
import Portfolio from './pages/Portfolio'
import Saved from './pages/Saved'
import { OrgApplications, OrgOpportunities, OrgOverview, OrgTalent } from './pages/OrgHome'
import Publish from './pages/Publish'
import Dashboard from './pages/Dashboard'
import { AdminActivity, AdminActivityDetail, AdminContent, AdminDashboard, AdminOrganizations } from './pages/AdminHome'
import { homeFor } from './lib/roles'
import Welcome from './pages/Welcome'

function Guard({ roles, children }) {
  const { user, ready } = useAuth()
  if (!ready) return <p className="p-8">Loading…</p>
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />
  return children
}

function HomeRedirect() {
  const { user, ready } = useAuth()
  if (!ready) return <p className="p-8">Loading…</p>
  if (!user) return <Welcome />
  return <Navigate to={homeFor(user.role)} replace />
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
      <Route path="/profile" element={<Guard roles={['SEEKER', 'ADMIN']}><ProfileSetup /></Guard>} />
      <Route path="/portfolio" element={<Guard roles={['SEEKER', 'ADMIN']}><Portfolio /></Guard>} />
      <Route path="/saved" element={<Guard roles={['SEEKER', 'ADMIN']}><Saved /></Guard>} />
      <Route path="/applications" element={<Guard roles={['SEEKER', 'ADMIN']}><Saved mode="applications" /></Guard>} />
      <Route path="/org" element={<Guard roles={['PROVIDER']}><OrgOverview /></Guard>} />
      <Route path="/org/opportunities" element={<Guard roles={['PROVIDER']}><OrgOpportunities /></Guard>} />
      <Route path="/org/applications" element={<Guard roles={['PROVIDER']}><OrgApplications /></Guard>} />
      <Route path="/org/talent" element={<Guard roles={['PROVIDER']}><OrgTalent /></Guard>} />
      <Route path="/org/publish" element={<Guard roles={['PROVIDER']}><Publish /></Guard>} />
      <Route path="/admin" element={<Guard roles={['ADMIN']}><AdminDashboard /></Guard>} />
      <Route path="/admin/organizations" element={<Guard roles={['ADMIN']}><AdminOrganizations /></Guard>} />
      <Route path="/admin/activity" element={<Guard roles={['ADMIN']}><AdminActivity /></Guard>} />
      <Route path="/admin/activity/:id" element={<Guard roles={['ADMIN']}><AdminActivityDetail /></Guard>} />
      <Route path="/admin/content" element={<Guard roles={['ADMIN']}><AdminContent /></Guard>} />
      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  )
}
