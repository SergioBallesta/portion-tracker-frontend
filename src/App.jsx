import React, { useState, useEffect } from 'react';
import { Plus, Search, Trash2, Settings, Utensils, AlertCircle, Clock, Target, Edit3, Save, X, Scale, Activity, BarChart3, LogIn, LogOut, UserPlus, User } from 'lucide-react';
import './App.css';

const PortionTracker = () => {
  // ESTADOS DE AUTENTICACIÓN
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ email: '', password: '', confirmPassword: '' });
  const [authLoading, setAuthLoading] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  // ESTADOS PRINCIPALES
  const [showEditConsumption, setShowEditConsumption] = useState(false);
  const [editingConsumption, setEditingConsumption] = useState(null);
  const [newConsumedGrams, setNewConsumedGrams] = useState(100);
  const [showEditFood, setShowEditFood] = useState(false);
  const [editingFood, setEditingFood] = useState(null);
  const [newStandardGrams, setNewStandardGrams] = useState(100);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [backendStatus, setBackendStatus] = useState('checking');
  const [error, setError] = useState('');
  const [showSetup, setShowSetup] = useState(false); // Cambiado a false por defecto
  const [currentMeal, setCurrentMeal] = useState(0);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedFood, setSelectedFood] = useState(null);
  const [portionGrams, setPortionGrams] = useState(100);
  const [showStats, setShowStats] = useState(false);
  const [personalFoods, setPersonalFoods] = useState({});
  const [showPersonalFoods, setShowPersonalFoods] = useState(false);
  const [mealCount, setMealCount] = useState(3);
  const [mealNames, setMealNames] = useState(['Desayuno', 'Almuerzo', 'Cena']);
  const [portionDistribution, setPortionDistribution] = useState({});
  const [isEditingMeal, setIsEditingMeal] = useState(-1);
  const [tempMealName, setTempMealName] = useState('');
  const [consumedFoods, setConsumedFoods] = useState({});
  const [searchHistory, setSearchHistory] = useState([]);

  // URL del backend
  const API_BASE = "/api";

  // Grupos de alimentos
  const foodGroups = {
    carbohidratos: { name: 'Carbohidratos', color: 'bg-blue-100 border-blue-300 text-blue-800', icon: 'C', defaultGrams: 30 },
    proteinas: { name: 'Proteinas', color: 'bg-indigo-100 border-indigo-300 text-indigo-800', icon: 'P', defaultGrams: 100 },  
    protegrasa: { name: 'Protegrasa', color: 'bg-purple-100 border-purple-300 text-purple-800', icon: 'PG', defaultGrams: 30 },
    grasas: { name: 'Grasas', color: 'bg-cyan-100 border-cyan-300 text-cyan-800', icon: 'G', defaultGrams: 10 },
    frutas: { name: 'Frutas', color: 'bg-sky-100 border-sky-300 text-sky-800', icon: 'F', defaultGrams: 150 },
    lacteos: { name: 'Lacteos', color: 'bg-teal-100 border-teal-300 text-teal-800', icon: 'L', defaultGrams: 250 }
  };

  // FUNCIONES DE PERSISTENCIA LOCAL
  const saveToStorage = (key, data) => {
    try {
      if (!isAuthenticated) {
        localStorage.setItem(key, JSON.stringify(data));
      }
    } catch (error) {
      console.error('Error guardando en localStorage:', error);
    }
  };

  const loadFromStorage = (key, defaultValue = null) => {
    try {
      if (!isAuthenticated) {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : defaultValue;
      }
      return defaultValue;
    } catch (error) {
      console.error('Error cargando de localStorage:', error);
      return defaultValue;
    }
  };

  // FUNCIONES DE AUTENTICACIÓN
  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setIsAuthenticated(false);
        setIsLoadingAuth(false);
        loadLocalData();
        return;
      }

      const response = await fetch(`${API_BASE}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setIsAuthenticated(true);
        await loadUserData();
      } else {
        localStorage.removeItem('authToken');
        setIsAuthenticated(false);
        loadLocalData();
      }
    } catch (error) {
      console.error('Error verificando autenticación:', error);
      setIsAuthenticated(false);
      loadLocalData();
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const loadLocalData = () => {
    const savedConfig = loadFromStorage('mealConfig');
    if (savedConfig) {
      setMealNames(savedConfig.mealNames || ['Desayuno', 'Almuerzo', 'Cena']);
      setMealCount(savedConfig.mealCount || 3);
    }

    const savedPersonalFoods = loadFromStorage('personalFoods', {});
    setPersonalFoods(savedPersonalFoods);

    const savedPortionDistribution = loadFromStorage('portionDistribution');
    if (savedPortionDistribution) {
      setPortionDistribution(savedPortionDistribution);
    }

    const today = new Date().toDateString();
    const savedConsumedFoods = loadFromStorage(`consumedFoods_${today}`, {});
    setConsumedFoods(savedConsumedFoods);

    const savedCurrentMeal = loadFromStorage('currentMeal', 0);
    setCurrentMeal(savedCurrentMeal);

    const savedSearchHistory = loadFromStorage('searchHistory', []);
    setSearchHistory(savedSearchHistory);

    // Si no hay configuración, mostrar setup
    if (!savedConfig || Object.keys(savedPortionDistribution || {}).length === 0) {
      setShowSetup(true);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setError('');

    try {
      if (authMode === 'register' && authForm.password !== authForm.confirmPassword) {
        setError('Las contraseñas no coinciden');
        setAuthLoading(false);
        return;
      }

      const endpoint = authMode === 'login' ? '/auth/login' : '/auth/register';
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: authForm.email,
          password: authForm.password
        })
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('authToken', data.token);
        setUser(data.user);
        setIsAuthenticated(true);
        setShowAuth(false);
        setAuthForm({ email: '', password: '', confirmPassword: '' });
        
        if (authMode === 'login') {
          await loadUserData();
        } else {
          await saveUserProfile();
        }
        
        // Solo mostrar setup si es usuario nuevo sin configuración
        if (authMode === 'register' || Object.keys(portionDistribution).length === 0) {
          setShowSetup(true);
        }
      } else {
        setError(data.error || 'Error en autenticación');
      }
    } catch (error) {
      console.error('Error en autenticación:', error);
      setError('Error de conexión');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    setUser(null);
    setIsAuthenticated(false);
    
    // Cargar datos locales
    loadLocalData();
  };

  const loadUserData = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const profileResponse = await fetch(`${API_BASE}/user/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (profileResponse.ok) {
        const profile = await profileResponse.json();
        setMealNames(profile.meal_names || ['Desayuno', 'Almuerzo', 'Cena']);
        setMealCount(profile.meal_count || 3);
        setPortionDistribution(profile.portion_distribution || {});
        setPersonalFoods(profile.personal_foods || {});
      }

      const today = new Date().toISOString().split('T')[0];
      const consumedResponse = await fetch(`${API_BASE}/user/consumed-foods/${today}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (consumedResponse.ok) {
        const consumedData = await consumedResponse.json();
        setConsumedFoods(consumedData.consumed_foods || {});
      }

    } catch (error) {
      console.error('Error cargando datos de usuario:', error);
    }
  };

  const saveUserProfile = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token || !isAuthenticated) return;

      await fetch(`${API_BASE}/user/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          meal_names: mealNames,
          meal_count: mealCount,
          portion_distribution: portionDistribution,
          personal_foods: personalFoods
        })
      });
    } catch (error) {
      console.error('Error guardando perfil:', error);
    }
  };

  const saveConsumedFoods = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token || !isAuthenticated) return;

      const today = new Date().toISOString().split('T')[0];
      await fetch(`${API_BASE}/user/consumed-foods`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          date: today,
          consumed_foods: consumedFoods
        })
      });
    } catch (error) {
      console.error('Error guardando alimentos consumidos:', error);
    }
  };

  // CARGAR DATOS INICIALES
  useEffect(() => {
    checkAuthStatus();
    checkBackendHealth();
  }, []);

  // GUARDAR CAMBIOS AUTOMÁTICAMENTE
  useEffect(() => {
    if (isAuthenticated) {
      saveUserProfile();
    } else {
      const config = { mealNames, mealCount };
      saveToStorage('mealConfig', config);
    }
  }, [mealNames, mealCount, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      saveUserProfile();
    } else {
      saveToStorage('portionDistribution', portionDistribution);
    }
  }, [portionDistribution, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      saveUserProfile();
    }
  }, [personalFoods, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      saveConsumedFoods();
    } else {
      const today = new Date().toDateString();
      saveToStorage(`consumedFoods_${today}`, consumedFoods);
    }
  }, [consumedFoods, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      saveToStorage('currentMeal', currentMeal);
    }
  }, [currentMeal, isAuthenticated]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm.length >= 2) {
        searchFoodsAPI(searchTerm);
      } else {
        setSearchResults([]);
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, backendStatus]);

  useEffect(() => {
    if (Object.keys(portionDistribution).length === 0) {
      initializePortionDistribution();
    }
    if (Object.keys(consumedFoods).length === 0) {
      initializeConsumedFoods();
    }
  }, [mealCount]);

  // RESTO DE FUNCIONES (mantener las mismas del código anterior)
  const checkBackendHealth = async () => {
    try {
      setError('Conectando con servidor...');
      const response = await fetch(`${API_BASE}/health`);
      const data = await response.json();

      if (response.ok) {
        setBackendStatus('connected');
        setError('');
      } else {
        setBackendStatus('error');
        setError('Error de servidor');
      }
    } catch (err) {
      setBackendStatus('offline');
      setError('Servidor offline - usando modo demo');
    }
  };

  const searchFoodsAPI = async (term) => {
    if (!term || term.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setError('');

    const toNum = (v) => {
      if (v == null) return null;
      const n = parseFloat(String(v).replace(',', '.'));
      return Number.isNaN(n) ? null : Math.round(n * 10) / 10;
    };

    const normalizeFoods = (data) => {
      let list = [];
      if (Array.isArray(data)) list = data;
      else if (Array.isArray(data?.foods)) list = data.foods;
      else if (Array.isArray(data?.results)) list = data.results;
      else if (Array.isArray(data?.foods?.food)) list = data.foods.food;
      else if (data?.foods?.food) list = [data.foods.food];

      return list.map((f, idx) => {
        const idRaw = f.id ?? f.food_id ?? f.foodId ?? f.code ?? idx;
        const name = f.name ?? f.food_name ?? f.description ?? `Alimento ${idx + 1}`;
        return {
          id: `fs_${idRaw}`,
          name,
          calories: toNum(f.calories ?? f.kcal ?? f.energy_kcal),
          protein: toNum(f.protein ?? f.proteins ?? f.protein_g),
          carbs: toNum(f.carbs ?? f.carbohydrates ?? f.carbs_g),
          fat: toNum(f.fat ?? f.fats ?? f.fat_g),
          brand: f.brand ?? f.brand_name ?? '',
          type: 'API',
          description: f.description ?? '',
          isFromAPI: true
        };
      });
    };

    try {
      if (backendStatus === 'connected') {
        let res = await fetch(`${API_BASE}/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: term, maxResults: 15 })
        });

        if (res.status === 404 || res.status === 405) {
          res = await fetch(`${API_BASE}/test-search/${encodeURIComponent(term)}`);
        }

        if (res.ok) {
          const data = await res.json();
          const processed = normalizeFoods(data);
          setSearchResults(processed);
        } else {
          setSearchResults([]);
          setError(`Error en búsqueda: ${res.status}`);
        }
      } else {
        setSearchResults([]);
        setError('Backend no conectado');
      }
    } catch (err) {
      setSearchResults([]);
      setError(`Error de conexión: ${err.message}`);
    } finally {
      setIsSearching(false);
    }
  };

  const initializePortionDistribution = () => {
    const distribution = {};
    Object.keys(foodGroups).forEach(group => {
      distribution[group] = Array(mealCount).fill(0);
    });
    setPortionDistribution(distribution);
  };

  const initializeConsumedFoods = () => {
    const consumed = {};
    for (let i = 0; i < mealCount; i++) {
      consumed[i] = {};
      Object.keys(foodGroups).forEach(group => {
        consumed[i][group] = [];
      });
    }
    setConsumedFoods(consumed);
  };

  const handleFoodSelect = async (food) => {
    const existingFood = personalFoods[food.id];
    if (existingFood) {
      addFood(existingFood);
    } else {
      setSelectedFood(food);
      setPortionGrams(foodGroups.carbohidratos.defaultGrams);
      setShowCategoryModal(true);
    }
    setSearchTerm('');
    setSearchResults([]);
  };

  const assignFoodCategory = (category) => {
    if (selectedFood) {
      const categorizedFood = {
        ...selectedFood,
        group: category,
        gramsPerPortion: portionGrams,
        standardPortionGrams: portionGrams,
        calories: selectedFood.calories || 100,
        protein: selectedFood.protein || 0,
        carbs: selectedFood.carbs || 0,
        fat: selectedFood.fat || 0,
        fiber: selectedFood.fiber || 0
      };
      
      const newPersonalFoods = {
        ...personalFoods,
        [selectedFood.id]: categorizedFood
      };
      setPersonalFoods(newPersonalFoods);
      
      addFood(categorizedFood);
      setShowCategoryModal(false);
      setSelectedFood(null);
    }
  };

  const addFood = (food) => {
    const newConsumed = { ...consumedFoods };
    if (!newConsumed[currentMeal][food.group]) {
      newConsumed[currentMeal][food.group] = [];
    }
    
    newConsumed[currentMeal][food.group].push({
      id: Date.now(),
      ...food,
      timestamp: new Date().toLocaleTimeString()
    });
    
    setConsumedFoods(newConsumed);
  };

  const removeFood = (mealIndex, group, foodId) => {
    const newConsumed = { ...consumedFoods };
    newConsumed[mealIndex][group] = newConsumed[mealIndex][group].filter(food => food.id !== foodId);
    setConsumedFoods(newConsumed);
  };

  const addMeal = () => {
    const newCount = mealCount + 1;
    setMealCount(newCount);
    setMealNames([...mealNames, `Comida ${newCount}`]);
  };

  const updatePortionDistribution = (group, mealIndex, value) => {
    const newDist = { ...portionDistribution };
    newDist[group][mealIndex] = Math.max(0, parseInt(value) || 0);
    setPortionDistribution(newDist);
  };

  const getDailyCalories = () => {
    let totalCalories = 0;
    for (let i = 0; i < mealCount; i++) {
      Object.values(consumedFoods[i] || {}).forEach(foods => {
        foods.forEach(food => {
          const calories = (food.calories || 0) * (food.gramsPerPortion || 100) / 100;
          totalCalories += calories;
        });
      });
    }
    return Math.round(totalCalories);
  };

  const getMealCalories = (mealIndex) => {
    let totalCalories = 0;
    Object.values(consumedFoods[mealIndex] || {}).forEach(foods => {
      foods.forEach(food => {
        const calories = (food.calories || 0) * (food.gramsPerPortion || 100) / 100;
        totalCalories += calories;
      });
    });
    return Math.round(totalCalories);
  };

  const getConnectionStatus = () => {
    switch (backendStatus) {
      case 'connected':
        return { text: 'FatSecret API', color: '#22c55e' };
      case 'offline':
        return { text: 'Modo Demo', color: '#f59e0b' };
      default:
        return { text: 'Conectando...', color: '#6b7280' };
    }
  };

  const connectionStatus = getConnectionStatus();

  // COMPONENTE DE AUTENTICACIÓN CORREGIDO
  const AuthModal = () => (
    <div className="modal-overlay" style={{ zIndex: 1000 }}>
      <div className="modal" style={{ maxWidth: '400px' }}>
        <h3>{authMode === 'login' ? 'Iniciar Sesión' : 'Registrarse'}</h3>
        
        <form onSubmit={handleAuth} style={{ width: '100%' }}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
              Email:
            </label>
            <input
              type="email"
              value={authForm.email}
              onChange={(e) => setAuthForm(prev => ({...prev, email: e.target.value}))}
              style={{ 
                width: '100%', 
                padding: '10px', 
                border: '1px solid #d1d5db', 
                borderRadius: '6px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
              required
              autoComplete="email"
            />
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
              Contraseña:
            </label>
            <input
              type="password"
              value={authForm.password}
              onChange={(e) => setAuthForm(prev => ({...prev, password: e.target.value}))}
              style={{ 
                width: '100%', 
                padding: '10px', 
                border: '1px solid #d1d5db', 
                borderRadius: '6px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
              required
              minLength="6"
              autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>
          
          {authMode === 'register' && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                Confirmar Contraseña:
              </label>
              <input
                type="password"
                value={authForm.confirmPassword}
                onChange={(e) => setAuthForm(prev => ({...prev, confirmPassword: e.target.value}))}
                style={{ 
                  width: '100%', 
                  padding: '10px', 
                  border: '1px solid #d1d5db', 
                  borderRadius: '6px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
                required
                minLength="6"
                autoComplete="new-password"
              />
            </div>
          )}

          {error && (
            <div style={{ 
              marginBottom: '16px', 
              padding: '8px', 
              backgroundColor: '#fef2f2', 
              border: '1px solid #fecaca', 
              borderRadius: '6px',
              color: '#dc2626',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}
          
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <button 
              type="submit" 
              disabled={authLoading}
              style={{ 
                flex: 1, 
                background: authLoading ? '#9ca3af' : '#2563eb', 
                color: 'white', 
                border: 'none', 
                padding: '10px', 
                borderRadius: '6px',
                fontSize: '14px',
                cursor: authLoading ? 'not-allowed' : 'pointer'
              }}
            >
              {authLoading ? 'Procesando...' : (authMode === 'login' ? 'Iniciar Sesión' : 'Registrarse')}
            </button>
            <button 
              type="button"
              onClick={() => {
                setShowAuth(false);
                setError('');
                setAuthForm({ email: '', password: '', confirmPassword: '' });
              }}
              style={{
                background: '#6b7280',
                color: 'white',
                border: 'none',
                padding: '10px 16px',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              Cancelar
            </button>
          </div>
        </form>
        
        <div style={{ textAlign: 'center', fontSize: '14px', borderTop: '1px solid #e5e7eb', paddingTop: '16px' }}>
          {authMode === 'login' ? (
            <>
              ¿No tienes cuenta?{' '}
              <button 
                type="button"
                onClick={() => {
                  setAuthMode('register');
                  setError('');
                  setAuthForm({ email: '', password: '', confirmPassword: '' });
                }}
                style={{ background: 'none', border: 'none', color: '#2563eb', textDecoration: 'underline', cursor: 'pointer' }}
              >
                Regístrate aquí
              </button>
            </>
          ) : (
            <>
              ¿Ya tienes cuenta?{' '}
              <button 
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setError('');
                  setAuthForm({ email: '', password: '', confirmPassword: '' });
                }}
                style={{ background: 'none', border: 'none', color: '#2563eb', textDecoration: 'underline', cursor: 'pointer' }}
              >
                Inicia sesión aquí
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  // LOADING INICIAL
  if (isLoadingAuth) {
    return (
      <div className="app">
        <div className="header">
          <h1>Control de Porciones</h1>
          <p style={{ color: '#bfdbfe', textAlign: 'center', padding: '20px' }}>
            Cargando...
          </p>
        </div>
      </div>
    );
  }

  // PANTALLA DE BIENVENIDA (solo si no está autenticado Y no tiene datos locales)
  if (!isAuthenticated && !showSetup && Object.keys(portionDistribution).length === 0) {
    return (
      <div className="app">
        {showAuth && <AuthModal />}
        
        <div className="header">
          <div className="header-top">
            <h1>Control de Porciones</h1>
            <button 
              onClick={() => setShowAuth(true)}
              style={{
                background: '#2563eb',
                color: 'white',
                border: 'none',
                padding: '8px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <LogIn size={16} />
              Iniciar Sesión
            </button>
          </div>
          <p style={{ color: '#bfdbfe', textAlign: 'center', padding: '20px' }}>
            Gestiona tu alimentación de forma inteligente
          </p>
        </div>
        
        <div style={{ padding: '40px 20px', textAlign: 'center', color: '#1f2937' }}>
          <h2>Bienvenido a Control de Porciones</h2>
          <p style={{ marginBottom: '32px', color: '#6b7280' }}>
            Controla tus porciones y seguimiento nutricional personalizado
          </p>
          
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button 
              onClick={() => {
                setAuthMode('login');
                setShowAuth(true);
              }}
              style={{ 
                background: '#2563eb', 
                color: 'white', 
                border: 'none', 
                padding: '12px 20px', 
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px'
              }}
            >
              <LogIn size={18} />
              Iniciar Sesión
            </button>
            
            <button 
              onClick={() => {
                setAuthMode('register');
                setShowAuth(true);
              }}
              style={{ 
                background: '#059669', 
                color: 'white', 
                border: 'none', 
                padding: '12px 20px', 
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px'
              }}
            >
              <UserPlus size={18} />
              Registrarse
            </button>
            
            <button 
              onClick={() => {
                setShowSetup(true);
              }}
              style={{ 
                background: '#6b7280', 
                color: 'white', 
                border: 'none', 
                padding: '12px 20px', 
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Continuar sin cuenta
            </button>
          </div>
          
          <div style={{ marginTop: '40px', fontSize: '14px', color: '#6b7280' }}>
            <h3>Características:</h3>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              <li>✓ Planes de alimentación personalizados</li>
              <li>✓ Seguimiento de porciones y calorías</li>
              <li>✓ Base de datos nutricional completa</li>
              <li>✓ Sincronización en todos tus dispositivos (con cuenta)</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // CONFIGURACION
  if (showSetup) {
    return (
      <div className="app">
        <div className="header">
          <div className="header-top">
            <h1>Configuración de Plan</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isAuthenticated && (
                <>
                  <div style={{ color: '#bfdbfe', fontSize: '12px' }}>
                    <User size={16} style={{ display: 'inline', marginRight: '4px' }} />
                    {user?.email}
                  </div>
                  <button 
                    onClick={handleLogout}
                    style={{
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      padding: '6px 10px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    <LogOut size={14} />
                  </button>
                </>
              )}
            </div>
          </div>
          <p style={{ color: '#bfdbfe' }}>Personaliza tus comidas y porciones</p>
        </div>

        <div style={{ padding: '20px' }}>
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3>Tus Comidas</h3>
              <button 
                onClick={addMeal} 
                style={{
                  background: '#2563eb',
                  color: 'white',
                  border: 'none',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                + Añadir
              </button>
            </div>
            
            {mealNames.map((meal, index) => (
              <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '6px' }}>
                <span style={{ flex: 1 }}>{meal}</span>
                {mealCount > 1 && (
                  <button 
                    onClick={() => {
                      const newNames = mealNames.filter((_, i) => i !== index);
                      setMealNames(newNames);
                      setMealCount(mealCount - 1);
                    }}
                    style={{ background: '#ef4444', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div style={{ marginBottom: '24px' }}>
            <h3>Porciones por Comida</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Grupo</th>
                    {mealNames.map((meal, index) => (
                      <th key={index} style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #e5e7eb', minWidth: '80px' }}>
                        {meal.length > 8 ? meal.substring(0, 8) + '...' : meal}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(foodGroups).map(group => (
                    <tr key={group}>
                      <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>
                        <span style={{ marginRight: '8px', fontWeight: 'bold' }}>{foodGroups[group].icon}</span>
                        {foodGroups[group].name}
                      </td>
                      {Array.from({ length: mealCount }, (_, index) => (
                        <td key={index} style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>
                          <input
                            type="number"
                            min="0"
                            value={portionDistribution[group]?.[index] || 0}
                            onChange={(e) => updatePortionDistribution(group, index, e.target.value)}
                            style={{ width: '60px', padding: '4px', textAlign: 'center', border: '1px solid #d1d5db', borderRadius: '4px' }}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <button
            onClick={() => {
              initializeConsumedFoods();
              setShowSetup(false);
            }}
            style={{
              width: '100%',
              background: '#059669',
              color: 'white',
              border: 'none',
              padding: '12px',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: 'pointer'
            }}
          >
            Comenzar Seguimiento
          </button>
        </div>
      </div>
    );
  }

  // APP PRINCIPAL
  return (
    <div className="app">
      {/* Modal de categorización */}
      {showCategoryModal && selectedFood && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Categorizar Alimento</h3>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
              <strong>{selectedFood.name}</strong>
              {selectedFood.brand && <span> - {selectedFood.brand}</span>}
            </p>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px' }}>
                Gramos por porción:
              </label>
              <input
                type="number"
                value={portionGrams}
                onChange={(e) => setPortionGrams(Math.max(1, parseInt(e.target.value) || 1))}
                style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                min="1"
              />
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              {Object.keys(foodGroups).map(group => (
                <button
                  key={group}
                  onClick={() => assignFoodCategory(group)}
                  style={{
                    display: 'block',
                    width: '100%',
                    margin: '8px 0',
                    padding: '12px',
                    background: '#f3f4f6',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <span style={{ marginRight: '8px', fontWeight: 'bold' }}>{foodGroups[group].icon}</span>
                  {foodGroups[group].name}
                </button>
              ))}
            </div>
            
            <button
              onClick={() => {
                setShowCategoryModal(false);
                setSelectedFood(null);
              }}
              style={{
                background: '#6b7280',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="header">
        <div className="header-top">
          <h1>Control de Porciones</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isAuthenticated ? (
              <>
                <div style={{ color: '#bfdbfe', fontSize: '12px' }}>
                  <User size={16} style={{ display: 'inline', marginRight: '4px' }} />
                  {user?.email}
                </div>
                <button 
                  onClick={() => setShowStats(true)}
                  style={{
                    background: 'transparent',
                    color: '#bfdbfe',
                    border: 'none',
                    padding: '6px',
                    cursor: 'pointer'
                  }}
                  title="Estadísticas"
                >
                  <BarChart3 size={20} />
                </button>
                <button 
                  onClick={() => setShowSetup(true)}
                  style={{
                    background: 'transparent',
                    color: '#bfdbfe',
                    border: 'none',
                    padding: '6px',
                    cursor: 'pointer'
                  }}
                  title="Configuración"
                >
                  <Settings size={20} />
                </button>
                <button 
                  onClick={handleLogout}
                  style={{
                    background: 'transparent',
                    color: '#bfdbfe',
                    border: 'none',
                    padding: '6px',
                    cursor: 'pointer'
                  }}
                  title="Cerrar Sesión"
                >
                  <LogOut size={20} />
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={() => setShowStats(true)}
                  style={{
                    background: 'transparent',
                    color: '#bfdbfe',
                    border: 'none',
                    padding: '6px',
                    cursor: 'pointer'
                  }}
                  title="Estadísticas"
                >
                  <BarChart3 size={20} />
                </button>
                <button 
                  onClick={() => setShowSetup(true)}
                  style={{
                    background: 'transparent',
                    color: '#bfdbfe',
                    border: 'none',
                    padding: '6px',
                    cursor: 'pointer'
                  }}
                  title="Configuración"
                >
                  <Settings size={20} />
                </button>
                <button 
                  onClick={() => setShowAuth(true)}
                  style={{
                    background: '#2563eb',
                    color: 'white',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                  title="Iniciar Sesión"
                >
                  <LogIn size={16} />
                </button>
              </>
            )}
          </div>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Activity size={16} style={{ marginRight: '4px' }} />
            <span style={{ fontSize: '14px' }}>Hoy: {getDailyCalories()} kcal</span>
          </div>
          <div style={{ fontSize: '14px' }}>
            {mealNames[currentMeal]}: {getMealCalories(currentMeal)} kcal
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '4px', marginTop: '8px', overflowX: 'auto' }}>
          {mealNames.map((meal, index) => (
            <button
              key={index}
              onClick={() => setCurrentMeal(index)}
              style={{
                padding: '6px 12px',
                background: currentMeal === index ? '#2563eb' : 'transparent',
                color: currentMeal === index ? 'white' : '#bfdbfe',
                border: currentMeal === index ? 'none' : '1px solid #374151',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                whiteSpace: 'nowrap'
              }}
            >
              {meal.length > 8 ? meal.substring(0, 8) + '...' : meal}
            </button>
          ))}
        </div>

        <div style={{ fontSize: '12px', color: '#bfdbfe', marginTop: '8px', display: 'flex', alignItems: 'center' }}>
          <Clock size={14} style={{ marginRight: '4px' }} />
          {mealNames[currentMeal]}
          <span style={{ marginLeft: '8px', display: 'flex', alignItems: 'center' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', marginRight: '4px', backgroundColor: connectionStatus.color }}></div>
            {connectionStatus.text}
          </span>
          {isAuthenticated && (
            <span style={{ marginLeft: '8px', color: '#22c55e' }}>
              • Sincronizado
            </span>
          )}
        </div>
      </div>

      {showAuth && <AuthModal />}

      {/* Error Message */}
      {error && (
        <div style={{ 
          margin: '16px', 
          padding: '12px', 
          backgroundColor: '#fef2f2', 
          border: '1px solid #fecaca', 
          borderRadius: '6px',
          color: '#dc2626',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center'
        }}>
          <AlertCircle size={16} style={{ marginRight: '8px' }} />
          {error}
        </div>
      )}

      {/* Búsqueda */}
      <div style={{ padding: '16px' }}>
        <div style={{ position: 'relative', marginBottom: '16px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
          <input
            type="text"
            placeholder="Buscar alimentos... (ej: pollo, manzana)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 10px 10px 40px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {isSearching && (
          <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
            Buscando...
          </div>
        )}

        {searchResults.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            {searchResults.map((food) => (
              <div 
                key={food.id}
                onClick={() => handleFoodSelect(food)}
                style={{
                  padding: '12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  marginBottom: '8px',
                  cursor: 'pointer',
                  backgroundColor: '#f9fafb'
                }}
              >
                <div style={{ fontWeight: '500', marginBottom: '4px' }}>{food.name}</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  {food.brand && <span>{food.brand} • </span>}
                  {food.calories ? `${food.calories} kcal/100g` : 'Información nutricional disponible'}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Alimentos consumidos */}
        <div>
          <h3 style={{ marginBottom: '16px' }}>
            Consumido en {mealNames[currentMeal]}
          </h3>

          {Object.keys(foodGroups).map(group => {
            const foods = consumedFoods[currentMeal]?.[group] || [];
            if (foods.length === 0) return null;

            return (
              <div key={group} style={{ marginBottom: '16px' }}>
                <h4 style={{ fontSize: '14px', color: foodGroups[group].icon, marginBottom: '8px' }}>
                  {foodGroups[group].icon} {foodGroups[group].name}
                </h4>
                {foods.map((food) => (
                  <div key={food.id} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '8px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '4px',
                    marginBottom: '4px'
                  }}>
                    <div>
                      <div style={{ fontWeight: '500', fontSize: '14px' }}>{food.name}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        {food.gramsPerPortion}g • {Math.round(food.calories * food.gramsPerPortion / 100)} kcal
                      </div>
                    </div>
                    <button
                      onClick={() => removeFood(currentMeal, group, food.id)}
                      style={{
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        padding: '4px',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            );
          })}

          {Object.values(consumedFoods[currentMeal] || {}).every(foods => foods.length === 0) && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6b7280' }}>
              <Utensils size={32} style={{ margin: '0 auto 16px' }} />
              <p>No has añadido alimentos a {mealNames[currentMeal].toLowerCase()}</p>
              <p style={{ fontSize: '12px' }}>Busca arriba para agregar alimentos</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PortionTracker;