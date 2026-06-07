import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';

import Login      from './pages/Login';
import Layout     from './components/Layout';
import Dashboard  from './pages/Dashboard';
import Inventory  from './pages/Inventory';
import Attendance from './pages/Attendance';
import Employees  from './pages/Employees';
import Locations  from './pages/Locations';
import Reports    from './pages/Reports';

function PrivateRoute({ children }) {
  return localStorage.getItem('rm_token') ? children : <Navigate to="/login" replace />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index              element={<Dashboard />} />
          <Route path="inventory"   element={<Inventory />} />
          <Route path="attendance"  element={<Attendance />} />
          <Route path="employees"   element={<Employees />} />
          <Route path="locations"   element={<Locations />} />
          <Route path="reports"     element={<Reports />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
