import axios from 'axios';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || error.message || 'An error occurred';
    console.error('API Error:', message);
    return Promise.reject(error);
  }
);

// ──── Settings ────
export const getSettings = () => api.get('/settings').then(r => r.data);
export const updateSettings = (data) => api.put('/settings', data).then(r => r.data);

// ──── Dashboard ────
export const getDashboard = (date) => api.get('/dashboard', { params: date ? { date } : {} }).then(r => r.data);

// ──── Charter ────
export const getCharter = () => api.get('/charter').then(r => r.data);
export const updateCharter = (data) => api.put('/charter', data).then(r => r.data);

// ──── Plan ────
export const getPlan = () => api.get('/plan').then(r => r.data);
export const updatePlan = (data) => api.put('/plan', data).then(r => r.data);

// ──── Team ────
export const getTeam = () => api.get('/team').then(r => r.data);
export const createTeamMember = (data) => api.post('/team', data).then(r => r.data);
export const updateTeamMember = (id, data) => api.put(`/team/${id}`, data).then(r => r.data);
export const deleteTeamMember = (id) => api.delete(`/team/${id}`).then(r => r.data);

// ──── Stakeholders ────
export const getStakeholders = () => api.get('/stakeholders').then(r => r.data);
export const createStakeholder = (data) => api.post('/stakeholders', data).then(r => r.data);
export const updateStakeholder = (id, data) => api.put(`/stakeholders/${id}`, data).then(r => r.data);
export const deleteStakeholder = (id) => api.delete(`/stakeholders/${id}`).then(r => r.data);

// ──── Requirements ────
export const getRequirements = (status) => api.get('/requirements', { params: { status } }).then(r => r.data);
export const createRequirement = (data) => api.post('/requirements', data).then(r => r.data);
export const updateRequirement = (id, data) => api.put(`/requirements/${id}`, data).then(r => r.data);
export const approveRequirement = (id) => api.put(`/requirements/${id}/approve`).then(r => r.data);
export const rejectRequirement = (id) => api.put(`/requirements/${id}/reject`).then(r => r.data);
export const deleteRequirement = (id) => api.delete(`/requirements/${id}`).then(r => r.data);

// ──── WBS ────
export const getWBS = () => api.get('/wbs').then(r => r.data);
export const createWBSItem = (data) => api.post('/wbs', data).then(r => r.data);
export const updateWBSItem = (id, data) => api.put(`/wbs/${id}`, data).then(r => r.data);
export const deleteWBSItem = (id) => api.delete(`/wbs/${id}`).then(r => r.data);

// ──── Change Requests ────
export const getChangeRequests = () => api.get('/change-requests').then(r => r.data);
export const getChangeRequest = (id) => api.get(`/change-requests/${id}`).then(r => r.data);
export const createChangeRequest = (data) => api.post('/change-requests', data).then(r => r.data);
export const approveChangeRequest = (id, data) => api.put(`/change-requests/${id}/approve`, data).then(r => r.data);
export const rejectChangeRequest = (id, data) => api.put(`/change-requests/${id}/reject`, data).then(r => r.data);

// ──── Activities ────
export const getActivities = () => api.get('/activities').then(r => r.data);
export const getActivity = (id) => api.get(`/activities/${id}`).then(r => r.data);
export const createActivity = (data) => api.post('/activities', data).then(r => r.data);
export const updateActivity = (id, data) => api.put(`/activities/${id}`, data).then(r => r.data);
export const deleteActivity = (id) => api.delete(`/activities/${id}`).then(r => r.data);

// ──── Dependencies ────
export const getDependencies = () => api.get('/dependencies').then(r => r.data);
export const createDependency = (data) => api.post('/dependencies', data).then(r => r.data);
export const deleteDependency = (id) => api.delete(`/dependencies/${id}`).then(r => r.data);

// ──── Schedule / CPM ────
export const getCPMSchedule = () => api.get('/schedule/cpm').then(r => r.data);
export const getDelayAnalysis = () => api.get('/schedule/delays').then(r => r.data);

// ──── Resources ────
export const getResourceWorkload = () => api.get('/resources/workload').then(r => r.data);

// ──── Expenses ────
export const getExpenses = (activityId) => api.get('/expenses', { params: { activity_id: activityId } }).then(r => r.data);
export const createExpense = (data) => api.post('/expenses', data).then(r => r.data);
export const deleteExpense = (id) => api.delete(`/expenses/${id}`).then(r => r.data);

// ──── EVM ────
export const getEVM = (date) => api.get('/evm', { params: { date } }).then(r => r.data);
export const getEVMTrend = () => api.get('/evm/trend').then(r => r.data);
export const getEVMSnapshots = () => api.get('/evm/snapshots').then(r => r.data);
export const createEVMSnapshot = () => api.post('/evm/snapshot').then(r => r.data);

// ──── Milestones ────
export const getMilestones = () => api.get('/milestones').then(r => r.data);
export const createMilestone = (data) => api.post('/milestones', data).then(r => r.data);
export const updateMilestone = (id, data) => api.put(`/milestones/${id}`, data).then(r => r.data);
export const deleteMilestone = (id) => api.delete(`/milestones/${id}`).then(r => r.data);

// ──── Responsibilities ────
export const getResponsibilities = () => api.get('/responsibilities').then(r => r.data);
export const createResponsibility = (data) => api.post('/responsibilities', data).then(r => r.data);
export const deleteResponsibility = (id) => api.delete(`/responsibilities/${id}`).then(r => r.data);

// ──── Defects ────
export const getDefects = (filters) => api.get('/defects', { params: filters }).then(r => r.data);
export const createDefect = (data) => api.post('/defects', data).then(r => r.data);
export const updateDefect = (id, data) => api.put(`/defects/${id}`, data).then(r => r.data);
export const deleteDefect = (id) => api.delete(`/defects/${id}`).then(r => r.data);

// ──── Checklists ────
export const getChecklists = () => api.get('/checklists').then(r => r.data);
export const createChecklist = (data) => api.post('/checklists', data).then(r => r.data);
export const recordInspection = (checklistId, itemId, data) => api.post(`/checklists/${checklistId}/items/${itemId}/inspect`, data).then(r => r.data);

// ──── Risks ────
export const getRisks = () => api.get('/risks').then(r => r.data);
export const createRisk = (data) => api.post('/risks', data).then(r => r.data);
export const updateRisk = (id, data) => api.put(`/risks/${id}`, data).then(r => r.data);
export const deleteRisk = (id) => api.delete(`/risks/${id}`).then(r => r.data);

// ──── PDPC ────
export const getPDPC = () => api.get('/pdpc').then(r => r.data);
export const createPDPCItem = (data) => api.post('/pdpc', data).then(r => r.data);
export const updatePDPCItem = (id, data) => api.put(`/pdpc/${id}`, data).then(r => r.data);
export const deletePDPCItem = (id) => api.delete(`/pdpc/${id}`).then(r => r.data);

// ──── Closure ────
export const getClosure = () => api.get('/closure').then(r => r.data);
export const updateClosure = (data) => api.put('/closure', data).then(r => r.data);

// ──── Audit Log ────
export const getAuditLog = (entityType) => api.get('/audit-log', { params: { entity_type: entityType } }).then(r => r.data);

// ──── Reset ────
export const resetDatabase = () => api.post('/reset').then(r => r.data);

export default api;
