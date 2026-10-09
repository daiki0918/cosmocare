import CustomerHomes from './pages/customer/CustomerHomes.jsx'
import CustomerLogin from './pages/customer/CustomerLogin.jsx'
import AdminDashboard from './pages/admin/AdminDashboard.jsx'
import LoginPage from './pages/admin/LoginPage.jsx'
import StaffDashboard from './pages/staff/StaffDashboard.jsx'
import StaffLogin from './pages/staff/StaffLogin.jsx'

const authStorageKeys = ['admin-session', 'staff-session', 'chapel-session', 'cosmocare-token', 'cosmocare-user']

function App() {
  authStorageKeys.forEach((key) => {
    const existingValue = localStorage.getItem(key)
    const sessionValue = sessionStorage.getItem(key)
    if (!existingValue && sessionValue) localStorage.setItem(key, sessionValue)
  })
  const path = window.location.pathname

  if (path === '/admin/dashboard') {
    return localStorage.getItem('admin-session') ? <AdminDashboard /> : <LoginPage />
  }

  if (path === '/admin/login' || path === '/login') {
    if (localStorage.getItem('admin-session')) {
      return <AdminDashboard />
    }
    return <LoginPage />
  }

  if (path === '/staff/login') {
    if (localStorage.getItem('staff-session')) {
      return <StaffDashboard />
    }
    return <StaffLogin />
  }

  if (path === '/staff/dashboard') {
    return localStorage.getItem('staff-session') ? <StaffDashboard /> : <StaffLogin />
  }

  if (!localStorage.getItem('chapel-session')) {
    return <CustomerLogin />
  }

  return <CustomerHomes />
}

export default App
