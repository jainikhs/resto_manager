import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('rm_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('rm_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

// ── Convenience helpers ───────────────────────────────────────
export const authAPI = {
  login: (u, p) => api.post('/auth/login', { username: u, password: p }),
};

export const locationAPI = {
  list:    ()   => api.get('/locations'),
  summary: (id) => api.get(`/locations/${id}/summary`),
};

export const inventoryAPI = {
  list:        (params) => api.get('/inventory', { params }),
  categories:  ()       => api.get('/inventory/categories'),
  get:         (id)     => api.get(`/inventory/${id}`),
  create:      (data)   => api.post('/inventory', data),
  update:      (id, d)  => api.put(`/inventory/${id}`, d),
  delete:      (id)     => api.delete(`/inventory/${id}`),
  transaction: (id, d)  => api.post(`/inventory/${id}/transaction`, d),
  history:     (id)     => api.get(`/inventory/${id}/history`),
  monthlyReport:(params)=> api.get('/inventory/report/monthly', { params }),
};

export const employeeAPI = {
  list:   (params) => api.get('/employees', { params }),
  get:    (id)     => api.get(`/employees/${id}`),
  create: (data)   => api.post('/employees', data),
  update: (id, d)  => api.put(`/employees/${id}`, d),
  delete: (id)     => api.delete(`/employees/${id}`),
};

export const attendanceAPI = {
  list:           (params) => api.get('/attendance', { params }),
  todayWithEmps:  (params) => api.get('/attendance/today-with-employees', { params }),
  mark:           (data)   => api.post('/attendance', data),
  bulk:           (data)   => api.post('/attendance/bulk', data),
  monthly:        (params) => api.get('/attendance/monthly', { params }),
  calendar:       (empId, params) => api.get(`/attendance/calendar/${empId}`, { params }),
  report:         (params) => api.get('/attendance/report/summary', { params }),
};

export const dashboardAPI = {
  summary: (params) => api.get('/dashboard', { params }),
};
