import CustomerHomes from './pages/customer/CustomerHomes.jsx'
import CustomerLogin from './pages/customer/CustomerLogin.jsx'
import AdminDashboard from './pages/admin/AdminDashboard.jsx'
import LoginPage from './pages/admin/LoginPage.jsx'
import StaffDashboard from './pages/staff/StaffDashboard.jsx'
import StaffLogin from './pages/staff/StaffLogin.jsx'

function App() {
  const path = window.location.pathname

  if (path === '/admin/dashboard') {
    return sessionStorage.getItem('admin-session') ? <AdminDashboard /> : <LoginPage />
  }

  if (path === '/admin/login' || path === '/login') {
    if (sessionStorage.getItem('admin-session')) {
      return <AdminDashboard />
    }
    return <LoginPage />
  }

  if (path === '/staff/login') {
    return <StaffLogin />
  }

  if (path === '/staff/dashboard') {
    return sessionStorage.getItem('staff-session') ? <StaffDashboard /> : <StaffLogin />
  }

  if (!sessionStorage.getItem('chapel-session')) {
    return <CustomerLogin />
  }

  return <CustomerHomes />
}

export default App
