import axios from 'axios';
const API = axios.create({ baseURL: 'http://localhost:8000' });

export const initDemo = () => API.get('/demo-mode');
export const runDemoFull = () => API.post('/demo-run-full');
export const uploadModel = (formData) => API.post('/upload-model', formData);
export const uploadNewData = (formData) => API.post('/upload-new-data', formData);
export const simulateDrift = (shift, numFeatures) => {
  const fd = new FormData();
  fd.append('shift_amount', shift);
  fd.append('num_features', numFeatures);
  return API.post('/simulate-drift', fd);
};
export const detectDrift = (delta = 0.002) => {
  const fd = new FormData();
  fd.append('adwin_delta', delta);
  return API.post('/detect-drift', fd);
};
export const runShap = () => API.post('/shap-analysis');
export const runAdapt = () => API.post('/adapt');
export const classifyDriftType = (payload) => API.post('/api/drift/classify-type', payload);
export const runFeatureGuidedRetrain = (payload) => API.post('/api/retrain/feature-guided', payload);
export const getEvents = (type) => API.get('/events', { params: { event_type: type } });
export const getStatus = () => API.get('/status');
export const getSettings = () => API.get('/settings');
export const saveSettings = (s) => {
  const fd = new FormData();
  Object.entries(s).forEach(([k, v]) => fd.append(k, v));
  return API.post('/settings', fd);
};
export const downloadCSV = () => window.open('http://localhost:8000/download-report-csv');
export const downloadPDF = () => window.open('http://localhost:8000/download-report-pdf');
