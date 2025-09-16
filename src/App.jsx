import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Search,
  Trash2,
  Settings,
  Utensils,
  AlertCircle,
  Edit3,
  Save,
  X,
  Scale,
  Activity,
  Download,
  Upload,
  LogOut,
  User,
  Eye,
  EyeOff
} from 'lucide-react';
import './App.css';

/**
 * App.jsx (arreglado)
 * - UI completa + autenticacion + reseteo diario a las 00:00
 * - Limpia caracteres raros, pequenos arreglos de logica y robustez SSR
 */

const API_BASE = '/api';

const STORAGE_KEYS = {
  SEARCH_HISTORY: 'searchHistory',
  LAST_DAY_CHECK: 'lastDayCheck',
  AUTH_TOKEN: 'auth_token'
};

const foodGroups = {
  carbohidratos: { name: 'Carbohidratos', icon: 'C', defaultGrams: 30 },
  proteinas: { name: 'Proteinas', icon: 'P', defaultGrams: 100 },
  protegrasa: { name: 'Protegrasa', icon: 'PG', defaultGrams: 30 },
  grasas: { name: 'Grasas', icon: 'G', defaultGrams: 10 },
  frutas: { name: 'Frutas', icon: 'F', defaultGrams: 150 },
  lacteos: { name: 'Lacteos', icon: 'L', defaultGrams: 250 }
};

// --- Helpers seguros para SSR ---
const hasWindow = typeof window !== 'undefined';
const ls = hasWindow ? window.localStorage : null;

// Auth helpers
const getAuthToken = () => (ls ? ls.getItem(STORAGE_KEYS.AUTH_TOKEN) : null);
const setAuthToken = (token) => { if (ls) ls.setItem(STORAGE_KEYS.AUTH_TOKEN, token); };
const removeAuthToken = () => { if (ls) ls.removeItem(STORAGE_KEYS.AUTH_TOKEN); };
const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken() || ''}` });

// Storage helpers
const saveToStorage = (key, data) => { try { ls?.setItem(key, JSON.stringify(data)); } catch {/* ignore */} };
const loadFromStorage = (key, def = []) => { try { const v = ls?.getItem(key); return v ? JSON.parse(v) : def; } catch { return def; } };

export default function App() {
  // -------------------- Auth --------------------
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [showLogin, setShowLogin] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({ email: '', password: '', confirmPassword: '' });

  // -------------------- App State --------------------
  const [backendStatus, setBackendStatus] = useState('checking');
  const [error, setError] = useState('');

  const [showSetup, setShowSetup] = useState(false);
  const [mealCount, setMealCount] = useState(3);
  const [mealNames, setMealNames] = useState(['Desayuno', 'Almuerzo', 'Cena']);
  const [portionDistribution, setPortionDistribution] = useState({});
  const [isEditingMeal, setIsEditingMeal] = useState(-1);
  const [tempMealName, setTempMealName] = useState('');

  const [personalFoods, setPersonalFoods] = useState({});
  const [showPersonalFoods, setShowPersonalFoods] = useState(false);
  const [currentMeal, setCurrentMeal] = useState(0);
  const [consumedFoods, setConsumedFoods] = useState({});

  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchHistory, setSearchHistory] = useState(loadFromStorage(STORAGE_KEYS.SEARCH_HISTORY, []));

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedFood, setSelectedFood] = useState(null);
  const [portionGrams, setPortionGrams] = useState(100);
  const [showEditConsumption, setShowEditConsumption] = useState(false);
  const [editingConsumption, setEditingConsumption] = useState(null);
  const [newConsumedGrams, setNewConsumedGrams] = useState(100);

  // Header extras
  const [midnightCountdown, setMidnightCountdown] = useState('');
  const importInputRefMain = useRef(null);
  const importInputRefSetup = useRef(null);

  useEffect(() => {
    const boot = async () => {
      checkBackendHealth();
      const token = getAuthToken();
      if (!token) return;
      try {
        const me = await fetch(`${API_BASE}/auth/me`, { headers: authHeaders() });
        if (me.ok) {
          const userData = await me.json();
          setUser(userData);
          setIsAuthenticated(true);
          await loadUserData();
        } else {
          removeAuthToken();
        }
      } catch { removeAuthToken(); }
    };
    boot();
  }, []);

  // Health
  async function checkBackendHealth() {
    try {
      const r = await fetch(`${API_BASE}/health`);
      await r.json().catch(() => null);
      if (r.ok) { setBackendStatus('connected'); setError(''); } else { setBackendStatus('error'); setError('Error de servidor'); }
    } catch { setBackendStatus('offline'); setError('Servidor offline'); }
  }

  // Load & Save user data
  async function loadUserData() {
    try {
      const pr = await fetch(`${API_BASE}/user/profile`, { headers: authHeaders() });
      if (pr.ok) {
        const profile = await pr.json();
        setMealNames(profile.meal_names || ['Desayuno', 'Almuerzo', 'Cena']);
        setMealCount(profile.meal_count || 3);
        setPortionDistribution(profile.portion_distribution || {});
        setPersonalFoods(profile.personal_foods || {});
      }
      const today = new Date().toISOString().split('T')[0];
      const cr = await fetch(`${API_BASE}/user/consumed-foods/${today}`, { headers: authHeaders() });
      if (cr.ok) {
        const data = await cr.json();
        setConsumedFoods(data.consumed_foods || {});
      }
      if (Object.keys(portionDistribution).length === 0) initializePortionDistribution(mealCount);
      if (Object.keys(consumedFoods).length === 0) initializeConsumedFoods(mealCount);
    } catch (e) { console.error('loadUserData', e); }
  }

  async function saveUserProfile(partial) {
    try {
      const payload = {
        meal_names: mealNames,
        meal_count: mealCount,
        portion_distribution: portionDistribution,
        personal_foods: personalFoods,
        ...(partial || {})
      };
      const r = await fetch(`${API_BASE}/user/profile`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(payload) });
      if (!r.ok) throw new Error('Error guardando perfil');
    } catch (e) { console.error(e); }
  }

  async function saveConsumed(consumed) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const r = await fetch(`${API_BASE}/user/consumed-foods`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ date: today, consumed_foods: consumed }) });
      if (!r.ok) throw new Error('Error guardando consumidos');
    } catch (e) { console.error(e); }
  }

  useEffect(() => { if (isAuthenticated && user) saveUserProfile(); }, [isAuthenticated, user, mealNames, mealCount, portionDistribution, personalFoods]);
  useEffect(() => { if (isAuthenticated && user && Object.keys(consumedFoods).length > 0) saveConsumed(consumedFoods); }, [isAuthenticated, user, consumedFoods]);

  // Reset diario
  useEffect(() => {
    if (!isAuthenticated) return;
    const checkNewDay = () => {
      const today = new Date().toDateString();
      const last = ls?.getItem(STORAGE_KEYS.LAST_DAY_CHECK);
      if (last && last !== today) {
        const consumed = {}; for (let i = 0; i < mealCount; i++) { consumed[i] = {}; Object.keys(foodGroups).forEach((g) => (consumed[i][g] = [])); }
        setConsumedFoods(consumed);
      }
      ls?.setItem(STORAGE_KEYS.LAST_DAY_CHECK, today);
    };
    checkNewDay();
    const id = setInterval(checkNewDay, 60000);
    return () => clearInterval(id);
  }, [isAuthenticated, mealCount]);

  // Countdown header
  function formatCountdown(ms) {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const h = String(Math.floor(totalSec / 3600)).padStart(2, '0');
    const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
    const s = String(totalSec % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const midnight = new Date(now); midnight.setHours(24, 0, 0, 0);
      setMidnightCountdown(formatCountdown(midnight - now));
    };
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, []);

  // Utils
  function initializePortionDistribution(count = mealCount) { const d = {}; Object.keys(foodGroups).forEach((g) => (d[g] = Array(count).fill(0))); setPortionDistribution(d); }
  function initializeConsumedFoods(count = mealCount) { const c = {}; for (let i = 0; i < count; i++) { c[i] = {}; Object.keys(foodGroups).forEach((g) => (c[i][g] = [])); } setConsumedFoods(c); }
  function exportData() { const today = new Date().toDateString(); const dump = { mealConfig: { mealNames, mealCount }, portionDistribution, personalFoods, consumedFoods, searchHistory, exportDate: today, version: '2.0' }; const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `portion-tracker-backup-${today.replace(/\s/g, '-')}.json`; a.click(); URL.revokeObjectURL(url); }
  function importData(file) { const reader = new FileReader(); reader.onload = (e) => { try { const data = JSON.parse(e.target.result); if (data.mealConfig) { setMealNames(data.mealConfig.mealNames || mealNames); setMealCount(data.mealConfig.mealCount || mealCount); } if (data.portionDistribution) setPortionDistribution(data.portionDistribution); if (data.personalFoods) setPersonalFoods(data.personalFoods); alert('Datos importados'); } catch (err) { alert('Error al importar: ' + err.message); } }; reader.readAsText(file); }
  function resetTodayData() { if (!window.confirm('?Seguro que quieres reiniciar los datos de hoy?')) return; const consumed = {}; for (let i = 0; i < mealCount; i++) { consumed[i] = {}; Object.keys(foodGroups).forEach((g) => (consumed[i][g] = [])); } setConsumedFoods(consumed); setCurrentMeal(0); }

  // Search
  useEffect(() => { const t = setTimeout(() => { if (searchTerm.trim().length >= 2) searchFoodsAPI(searchTerm.trim()); else { setSearchResults([]); setIsSearching(false); } }, 500); return () => clearTimeout(t); }, [searchTerm, backendStatus]);
  function toNum(v) { if (v == null) return null; const n = parseFloat(String(v).replace(',', '.')); return Number.isNaN(n) ? null : Math.round(n * 10) / 10; }
  function normalizeFoods(data) { let list = []; if (Array.isArray(data)) list = data; else if (Array.isArray(data?.foods)) list = data.foods; else if (Array.isArray(data?.results)) list = data.results; else if (Array.isArray(data?.foods?.food)) list = data.foods.food; else if (data?.foods?.food) list = [data.foods.food]; return list.map((f, idx) => ({ id: `fs_${f.id ?? f.food_id ?? f.foodId ?? f.code ?? idx}`, name: f.name ?? f.food_name ?? f.description ?? `Alimento ${idx + 1}`, calories: toNum(f.calories ?? f.kcal ?? f.energy_kcal), protein: toNum(f.protein ?? f.proteins ?? f.protein_g), carbs: toNum(f.carbs ?? f.carbohydrates ?? f.carbs_g), fat: toNum(f.fat ?? f.fats ?? f.fat_g), brand: f.brand ?? f.brand_name ?? '', type: 'API', description: f.description ?? '', isFromAPI: true })); }
  async function searchFoodsAPI(term) { if (backendStatus !== 'connected') { setError('Backend no conectado'); return; } setIsSearching(true); setError(''); try { let r = await fetch(`${API_BASE}/search`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: term, maxResults: 15 }) }); if (!r.ok && (r.status === 404 || r.status === 405)) r = await fetch(`${API_BASE}/test-search/${encodeURIComponent(term)}`); if (r.ok) { const data = await r.json(); const processed = normalizeFoods(data); setSearchResults(processed); const newHistory = [{ term, timestamp: Date.now(), resultCount: processed.length }, ...searchHistory.filter((h) => h.term !== term)].slice(0, 10); setSearchHistory(newHistory); saveToStorage(STORAGE_KEYS.SEARCH_HISTORY, newHistory); } else { setSearchResults([]); setError(`Error en busqueda: ${r.status}`); } } catch (e) { setSearchResults([]); setError(`Error de conexion: ${e.message}`); } finally { setIsSearching(false); } }
  async function getFoodDetails(foodId) { if (backendStatus !== 'connected' || !foodId.startsWith('fs_')) return null; try { const clean = foodId.replace('fs_', ''); let r = await fetch(`${API_BASE}/food/${clean}`); if (r.status === 404 || r.status === 405) r = await fetch(`${API_BASE}/food/${clean}`, { method: 'POST' }); if (r.ok) return r.json(); } catch {} return null; }

  // Foods / portions
  function addMeal() { const nc = mealCount + 1; setMealCount(nc); setMealNames([...mealNames, `Comida ${nc}`]); setPortionDistribution((prev) => { const nd = { ...prev }; Object.keys(foodGroups).forEach((g) => { nd[g] = [...(nd[g] || []), 0]; }); return nd; }); }
  function removeMeal(index) { if (mealCount <= 1) return; setMealNames(mealNames.filter((_, i) => i !== index)); setMealCount(mealCount - 1); const newDist = { ...portionDistribution }; Object.keys(newDist).forEach((g) => newDist[g].splice(index, 1)); setPortionDistribution(newDist); const newConsumed = { ...consumedFoods }; delete newConsumed[index]; const reindexed = {}; Object.keys(newConsumed).sort((a,b)=>a-b).forEach((k) => { const i = parseInt(k,10); reindexed[i < index ? i : i - 1] = newConsumed[k]; }); setConsumedFoods(reindexed); if (currentMeal >= mealCount - 1) setCurrentMeal(Math.max(0, mealCount - 2)); }
  function startEditingMeal(index) { setIsEditingMeal(index); setTempMealName(mealNames[index]); }
  function saveMealName() { const names = [...mealNames]; names[isEditingMeal] = tempMealName || `Comida ${isEditingMeal + 1}`; setMealNames(names); setIsEditingMeal(-1); setTempMealName(''); }
  function updatePortionDistribution(group, mealIndex, value) { const nd = { ...portionDistribution }; if (!nd[group]) nd[group] = Array(mealCount).fill(0); nd[group][mealIndex] = Math.max(0, parseInt(value) || 0); setPortionDistribution(nd); }
  function addFoodToCurrent(food) { const newConsumed = { ...consumedFoods }; if (!newConsumed[currentMeal][food.group]) newConsumed[currentMeal][food.group] = []; newConsumed[currentMeal][food.group].push({ id: Date.now(), ...food, timestamp: new Date().toLocaleTimeString() }); setConsumedFoods(newConsumed); }
  async function handleFoodSelect(food) { const existing = personalFoods[food.id]; if (existing) { addFoodToCurrent(existing); } else { if (food.isFromAPI && (!food.calories || !food.protein)) { const details = await getFoodDetails(food.id); if (details && details.food) food = { ...food, ...details.food }; } setSelectedFood(food); setPortionGrams(foodGroups.carbohidratos.defaultGrams); setShowCategoryModal(true); } setSearchTerm(''); setSearchResults([]); }
  function assignFoodCategory(category) { if (!selectedFood) return; const categorized = { ...selectedFood, group: category, gramsPerPortion: portionGrams, standardPortionGrams: portionGrams, calories: selectedFood.calories || 100, protein: selectedFood.protein || 0, carbs: selectedFood.carbs || 0, fat: selectedFood.fat || 0, fiber: selectedFood.fiber || 0 }; const newPF = { ...personalFoods, [selectedFood.id]: categorized }; setPersonalFoods(newPF); addFoodToCurrent(categorized); setShowCategoryModal(false); setSelectedFood(null); }
  function startEditingConsumption(food, mealIndex, groupName) { setEditingConsumption({ food, mealIndex, groupName }); setNewConsumedGrams(food.actualGrams || food.gramsPerPortion || food.standardPortionGrams); setShowEditConsumption(true); }
  function saveEditedConsumption() { if (!editingConsumption) return; const { food, mealIndex, groupName } = editingConsumption; const newConsumed = { ...consumedFoods }; const idx = newConsumed[mealIndex][groupName].findIndex((f) => f.id === food.id); if (idx !== -1) { newConsumed[mealIndex][groupName][idx] = { ...food, actualGrams: newConsumedGrams, gramsPerPortion: newConsumedGrams }; } setConsumedFoods(newConsumed); setShowEditConsumption(false); setEditingConsumption(null); }
  function removeFood(mealIndex, group, foodId) { const newConsumed = { ...consumedFoods }; newConsumed[mealIndex][group] = newConsumed[mealIndex][group].filter((f) => f.id !== foodId); setConsumedFoods(newConsumed); }

  function getRemainingPortions(mealIndex, group) { const planned = portionDistribution[group]?.[mealIndex] || 0; let consumed = 0; if (consumedFoods[mealIndex]?.[group]) { consumedFoods[mealIndex][group].forEach((f) => { const actual = f.actualGrams || f.gramsPerPortion; const standard = f.standardPortionGrams || f.gramsPerPortion; consumed += actual / standard; }); } return Math.max(0, planned - consumed); }
  function getTotalConsumedPortions(group) { let total = 0; Object.values(consumedFoods).forEach((meal) => { if (meal[group]) { meal[group].forEach((f) => { const a = f.actualGrams || f.gramsPerPortion; const s = f.standardPortionGrams || f.gramsPerPortion; total += a / s; }); } }); return Math.round(total * 10) / 10; }
  function getTotalPlannedPortions(group) { return portionDistribution[group]?.reduce((s, p) => s + p, 0) || 0; }
  function getMealCalories(mealIndex) { let total = 0; Object.values(consumedFoods[mealIndex] || {}).forEach((foods) => { foods.forEach((f) => { const grams = (f.actualGrams ?? f.gramsPerPortion ?? 100); const calories = (f.calories || 0) * grams / 100; total += calories; }); }); return Math.round(total); }
  function getDailyCalories() { let t = 0; for (let i = 0; i < mealCount; i++) t += getMealCalories(i); return t; }

  // Auth actions
  async function handleLogin(e) { e.preventDefault(); setAuthLoading(true); setAuthError(''); try { const r = await fetch(`${API_BASE}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(loginData) }); const data = await r.json(); if (r.ok) { setAuthToken(data.token); setUser(data.user); setIsAuthenticated(true); setLoginData({ email: '', password: '' }); await loadUserData(); setShowSetup(true); } else { setAuthError(data.error || 'Error en el inicio de sesion'); } } catch { setAuthError('Error de conexion con el servidor'); } finally { setAuthLoading(false); } }
  async function handleRegister(e) { e.preventDefault(); setAuthLoading(true); setAuthError(''); if (registerData.password !== registerData.confirmPassword) { setAuthError('Las contrasenas no coinciden'); setAuthLoading(false); return; } if (registerData.password.length < 6) { setAuthError('La contrasena debe tener al menos 6 caracteres'); setAuthLoading(false); return; } try { const r = await fetch(`${API_BASE}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: registerData.email, password: registerData.password }) }); const data = await r.json(); if (r.ok) { setAuthToken(data.token); setUser(data.user); setIsAuthenticated(true); setRegisterData({ email: '', password: '', confirmPassword: '' }); await loadUserData(); setShowSetup(true); } else { setAuthError(data.error || 'Error en el registro'); } } catch { setAuthError('Error de conexion con el servidor'); } finally { setAuthLoading(false); } }
  function handleLogout() { removeAuthToken(); setUser(null); setIsAuthenticated(false); setShowLogin(true); setPersonalFoods({}); setConsumedFoods({}); setPortionDistribution({}); setMealNames(['Desayuno', 'Almuerzo', 'Cena']); setMealCount(3); setCurrentMeal(0); }

  // -------------------- UI: Auth --------------------
  if (!isAuthenticated) {
    return (
      <div className="auth-wrap">
        <div className="auth-card">
          <div className="auth-head">
            <h1>Control de Porciones</h1>
            <p>Gestiona tu alimentacion de forma inteligente</p>
          </div>
          {authError && <div className="error-banner">{authError}</div>}
          <div className="auth-tabs">
            <button onClick={() => setShowLogin(true)} className={showLogin ? 'active' : ''}>Iniciar sesion</button>
            <button onClick={() => setShowLogin(false)} className={!showLogin ? 'active' : ''}>Registrarse</button>
          </div>
          {showLogin ? (
            <form onSubmit={handleLogin}>
              <label>Email</label>
              <input type="email" value={loginData.email} onChange={(e) => setLoginData({ ...loginData, email: e.target.value })} placeholder="tu@email.com" required />
              <label>Contrasena</label>
              <div className="password-field">
                <input type={showPassword ? 'text' : 'password'} value={loginData.password} onChange={(e) => setLoginData({ ...loginData, password: e.target.value })} placeholder="Minimo 6 caracteres" required />
                <button type="button" onClick={() => setShowPassword(v => !v)}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
              </div>
              <button type="submit" disabled={authLoading} className="btn-primary">{authLoading ? 'Entrando¡K' : 'Entrar'}</button>
            </form>
          ) : (
            <form onSubmit={handleRegister}>
              <label>Email</label>
              <input type="email" value={registerData.email} onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })} placeholder="tu@email.com" required />
              <label>Contrasena</label>
              <div className="password-field">
                <input type={showPassword ? 'text' : 'password'} value={registerData.password} onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })} placeholder="Minimo 6 caracteres" required />
                <button type="button" onClick={() => setShowPassword(v => !v)}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
              </div>
              <label>Confirmar contrasena</label>
              <input type="password" value={registerData.confirmPassword} onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })} placeholder="Repite tu contrasena" required />
              <button type="submit" disabled={authLoading} className="btn-success">{authLoading ? 'Registrando¡K' : 'Crear cuenta'}</button>
            </form>
          )}
          <div className="muted small" style={{ textAlign: 'center', marginTop: 12 }}>{backendStatus === 'connected' ? 'Conectado a la base de datos' : 'Verificando conexion¡K'}</div>
        </div>
      </div>
    );
  }

  // -------------------- UI: Setup --------------------
  if (showSetup) {
    return (
      <div className="app">
        <div className="header">
          <div className="header-top">
            <div className="brand"><h1>Configuracion de Plan</h1></div>
            <div className="header-actions">
              <span className="pill"><User size={14} style={{ marginRight: 6 }} />{user?.email}</span>
              <button onClick={handleLogout} className="header-btn" title="Salir"><LogOut size={18} /></button>
            </div>
          </div>
          <div className="header-stats"><div className="muted">Personaliza tus comidas y porciones</div></div>
        </div>

        <div className="setup-content">
          <div className="setup-section">
            <div className="section-header">
              <h3>Tus Comidas</h3>
              <button onClick={addMeal} className="add-meal-btn">+ Anadir</button>
            </div>
            {mealNames.map((meal, index) => (
              <div key={index} className="meal-config">
                {isEditingMeal === index ? (
                  <div className="editing-meal">
                    <input value={tempMealName} onChange={(e) => setTempMealName(e.target.value)} className="meal-name-input" placeholder="Nombre de la comida" />
                    <button onClick={saveMealName} className="save-btn"><Save size={16} /></button>
                    <button onClick={() => { setIsEditingMeal(-1); setTempMealName(''); }} className="cancel-btn"><X size={16} /></button>
                  </div>
                ) : (
                  <div className="meal-display">
                    <span className="meal-name">{meal}</span>
                    <button onClick={() => startEditingMeal(index)} className="edit-btn"><Edit3 size={16} /></button>
                    {mealCount > 1 && (<button onClick={() => removeMeal(index)} className="remove-btn"><X size={16} /></button>)}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="setup-section">
            <h3>Porciones por Comida</h3>
            <div className="portion-table">
              <div className="table-header" style={{ gridTemplateColumns: `1fr repeat(${mealCount}, 60px)` }}>
                <div>Grupo</div>
                {mealNames.map((m, i) => (<div key={i}>{m.length > 6 ? m.slice(0, 6) + '¡K' : m}</div>))}
              </div>
              {Object.keys(foodGroups).map((g) => (
                <div key={g} className="table-row" style={{ gridTemplateColumns: `1fr repeat(${mealCount}, 60px)` }}>
                  <div className="group-cell"><span className="group-icon">{foodGroups[g].icon}</span><span className="group-name">{foodGroups[g].name}</span></div>
                  {Array.from({ length: mealCount }, (_, i) => (
                    <input key={i} type="number" min={0} value={portionDistribution[g]?.[i] ?? 0} onChange={(e) => updatePortionDistribution(g, i, e.target.value)} className="portion-input" />
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="setup-section">
            <div className="section-header">
              <h3>Datos</h3>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={exportData} className="btn-success"><Download size={16} /> Exportar</button>
                <button onClick={() => importInputRefSetup.current?.click()} className="btn-primary"><Upload size={16} /> Importar</button>
                <input ref={importInputRefSetup} type="file" accept=".json" onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])} style={{ display: 'none' }} />
                <button onClick={resetTodayData} className="btn-danger">Reiniciar Hoy</button>
              </div>
            </div>
          </div>

          <button onClick={() => { initializeConsumedFoods(mealCount); setShowSetup(false); }} className="start-tracking-btn">Comenzar Seguimiento</button>
        </div>
      </div>
    );
  }

  // -------------------- UI principal --------------------
  const connectionBadge = backendStatus === 'connected'
    ? { text: 'Sincronizado', color: '#22c55e' }
    : backendStatus === 'offline'
    ? { text: 'Sin conexion', color: '#f59e0b' }
    : { text: 'Conectando¡K', color: '#6b7280' };

  return (
    <div className="app">
      {/* Modales */}
      {showEditConsumption && editingConsumption && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Editar cantidad consumida</h3>
            <p className="muted" style={{ marginBottom: 12 }}><strong>{editingConsumption.food.name}</strong></p>
            <label>Gramos consumidos</label>
            <input type="number" value={newConsumedGrams} onChange={(e) => setNewConsumedGrams(Math.max(1, parseInt(e.target.value) || 1))} min={1} />
            <div className="modal-actions">
              <button onClick={saveEditedConsumption} className="btn-primary">Guardar</button>
              <button onClick={() => setShowEditConsumption(false)} className="cancel-btn-modal">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {showCategoryModal && selectedFood && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Categorizar alimento</h3>
            <p className="muted" style={{ marginBottom: 12 }}><strong>{selectedFood.name}</strong> {selectedFood.brand && <span>¡P {selectedFood.brand}</span>}</p>
            <label><Scale size={16} style={{ marginRight: 6 }} />Gramos por porcion</label>
            <input type="number" value={portionGrams} onChange={(e) => setPortionGrams(Math.max(1, parseInt(e.target.value) || 1))} min={1} step={5} />
            <div className="categories">
              {Object.keys(foodGroups).map((g) => (
                <button key={g} onClick={() => assignFoodCategory(g)} className="category-btn">
                  <span className="category-icon">{foodGroups[g].icon}</span>{foodGroups[g].name}
                </button>
              ))}
            </div>
            <button onClick={() => { setShowCategoryModal(false); setSelectedFood(null); }} className="cancel-btn-modal">Cerrar</button>
          </div>
        </div>
      )}

      {/* Header completo */}
      <div className="header">
        <div className="header-top">
          <div className="brand">
            <h1>Control de Porciones</h1>
            <div className="muted small">{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}</div>
          </div>
          <div className="header-actions">
            <span className="pill"><span className="dot" style={{ backgroundColor: connectionBadge.color }} />{connectionBadge.text}</span>
            <span className="pill"><User size={14} style={{ marginRight: 6 }} />{user?.email}</span>
            <span className="pill" title="Tiempo hasta el reseteo diario">? {midnightCountdown}</span>
            <button onClick={() => setShowSetup(true)} className="header-btn" title="Configuracion"><Settings size={18} /></button>
            <button onClick={exportData} className="header-btn" title="Exportar"><Download size={18} /></button>
            <button onClick={() => importInputRefMain.current?.click()} className="header-btn" title="Importar"><Upload size={18} /></button>
            <input ref={importInputRefMain} type="file" accept=".json" onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])} style={{ display: 'none' }} />
            <button onClick={handleLogout} className="header-btn" title="Salir"><LogOut size={18} /></button>
          </div>
        </div>
        <div className="header-stats">
          <div className="stat"><Activity size={14} style={{ marginRight: 6 }} />Hoy: {getDailyCalories()} kcal</div>
          <div className="stat">{mealNames[currentMeal]}: {getMealCalories(currentMeal)} kcal</div>
        </div>
        <div className="meal-tabs">
          {mealNames.map((meal, i) => (
            <button key={i} onClick={() => setCurrentMeal(i)} className={`meal-tab ${currentMeal === i ? 'active' : ''}`}>
              {meal.length > 10 ? meal.slice(0, 10) + '¡K' : meal}
            </button>
          ))}
        </div>
        {error && <div className="error-message"><AlertCircle size={16} style={{ marginRight: 6 }} />{error}{backendStatus === 'offline' && (<button onClick={checkBackendHealth} className="btn-primary" style={{ marginLeft: 8, padding: '2px 8px', fontSize: 12 }}>Reconectar</button>)}</div>}
      </div>

      {/* Buscador + contenido */}
      <div className="content">
        <div className="search-bar">
          <div className="search-input-wrap">
            <Search size={16} className="search-icon" />
            <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar alimento¡K" className="search-input" />
            {isSearching && <div className="search-loading">Buscando¡K</div>}
          </div>
          <button className="secondary-btn" onClick={() => setShowPersonalFoods(true)} title="Mis alimentos"><Utensils size={16} /></button>
        </div>

        {searchHistory.length > 0 && (
          <div className="search-history">
            <h4>Ultimas busquedas</h4>
            <div className="chips">
              {searchHistory.slice(0, 6).map((h, idx) => (<button key={idx} className="chip" onClick={() => setSearchTerm(h.term)}>{h.term} ({h.resultCount})</button>))}
            </div>
          </div>
        )}

        {searchResults.length > 0 && (
          <div className="results">
            {searchResults.map((f) => (
              <div key={f.id} className="result-item" onClick={() => handleFoodSelect(f)}>
                <div className="result-title"><strong>{f.name}</strong> {f.brand && <span className="muted">¡P {f.brand}</span>}</div>
                <div className="result-macros muted">{[f.calories && `${f.calories} kcal`, f.protein && `${f.protein}P`, f.carbs && `${f.carbs}C`, f.fat && `${f.fat}G`].filter(Boolean).join(' ¡P ')}</div>
              </div>
            ))}
          </div>
        )}

        {/* Panel de comida actual */}
        <div className="meal-panel">
          <div className="meal-panel-head">
            <div className="meal-title">{mealNames[currentMeal]}</div>
            <div className="muted">Calorias: {getMealCalories(currentMeal)} kcal</div>
          </div>
          <div className="meal-grid">
            {Object.keys(foodGroups).map((g) => (
              <div key={g} className="group-card">
                <div className="group-card-head">
                  <div className="group-head-left"><span className="group-chip">{foodGroups[g].icon}</span><strong>{foodGroups[g].name}</strong></div>
                  <span className="muted">Quedan: {getRemainingPortions(currentMeal, g)} / {portionDistribution[g]?.[currentMeal] || 0}</span>
                </div>
                <div>
                  {(consumedFoods[currentMeal]?.[g] || []).map((item) => (
                    <div key={item.id} className="food-row">
                      <div>
                        <div className="food-name">{item.name}</div>
                        <div className="muted">{item.actualGrams ?? item.gramsPerPortion} g</div>
                      </div>
                      <div className="row-actions">
                        <button onClick={() => startEditingConsumption(item, currentMeal, g)} className="icon-btn" title="Editar gramos"><Edit3 size={14} /></button>
                        <button onClick={() => removeFood(currentMeal, g, item.id)} className="icon-btn danger" title="Eliminar"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Resumen */}
        <div className="summary-grid">
          {Object.keys(foodGroups).map((g) => (
            <div key={g} className="summary-card">
              <div className="summary-title">{foodGroups[g].name}</div>
              <div className="muted">Plan: {getTotalPlannedPortions(g)} ¡P Consumido: {getTotalConsumedPortions(g)}</div>
            </div>
          ))}
          <div className="summary-card">
            <div className="summary-title">Calorias diarias</div>
            <div>{getDailyCalories()} kcal</div>
          </div>
        </div>

        <div className="info">
          <div className="muted">
            ¡E <strong>Busca alimentos</strong> y <strong>categorizalos</strong> la primera vez (define gramos por porcion).<br />
            ¡E El <strong>plan</strong> (comidas y porciones a ingerir) se guarda en tu cuenta y es editable.<br />
            ¡E Las <strong>porciones consumidas</strong> se guardan por fecha y <strong>se reinician cada dia a las 00:00</strong>.
          </div>
        </div>
      </div>

      {/* Biblioteca de alimentos */}
      {showPersonalFoods && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 640 }}>
            <h3>Mis Alimentos</h3>
            {Object.keys(personalFoods).length === 0 ? (
              <div className="empty-personal-foods">
                <p>No tienes alimentos guardados.</p>
                <p>Busca y categoriza para crear tu biblioteca.</p>
              </div>
            ) : (
              <div className="personal-foods-list">
                {Object.values(personalFoods).map((pf) => (
                  <div key={pf.id} className="pf-row">
                    <div>
                      <div className="food-name">{pf.name}</div>
                      <div className="muted">{pf.group} ¡P {pf.standardPortionGrams || pf.gramsPerPortion} g</div>
                    </div>
                    <div className="row-actions">
                      <button className="icon-btn" onClick={() => { addFoodToCurrent(pf); setShowPersonalFoods(false); }}>Anadir</button>
                      <button className="icon-btn danger" onClick={() => { const copy = { ...personalFoods }; delete copy[pf.id]; setPersonalFoods(copy); }}>Eliminar</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button className="cancel-btn-modal" onClick={() => setShowPersonalFoods(false)}>Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}
