import React, { useState, useEffect } from 'react';
import { Plus, Search, Trash2, Settings, Utensils, AlertCircle, Clock, Target, Edit3, Save, X, Scale, Activity, BarChart3, LogIn, LogOut, UserPlus, User } from 'lucide-react';
import './App.css';

const PortionTracker = () => {
  // ESTADOS DE AUTENTICACION
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' o 'register'
  const [authForm, setAuthForm] = useState({ email: '', password: '', confirmPassword: '' });
  const [authLoading, setAuthLoading] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  // CONSTANTES PARA KEYS DE LOCALSTORAGE (mantener como fallback)
  const STORAGE_KEYS = {
    PERSONAL_FOODS: 'personalFoods',
    MEAL_CONFIG: 'mealConfig', 
    CONSUMED_FOODS: 'consumedFoods',
    PORTION_DISTRIBUTION: 'portionDistribution',
    CURRENT_MEAL: 'currentMeal',
    SEARCH_HISTORY: 'searchHistory'
  };

  // FUNCIONES HELPER PARA PERSISTENCIA LOCAL (fallback)
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
  const [showSetup, setShowSetup] = useState(true);
  const [currentMeal, setCurrentMeal] = useState(0);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedFood, setSelectedFood] = useState(null);
  const [portionGrams, setPortionGrams] = useState(100);
  const [showStats, setShowStats] = useState(false);
  
  // Base de datos personal de alimentos
  const [personalFoods, setPersonalFoods] = useState({});
  const [showPersonalFoods, setShowPersonalFoods] = useState(false);

  // Configuracion de comidas y porciones
  const [mealCount, setMealCount] = useState(3);
  const [mealNames, setMealNames] = useState(['Desayuno', 'Almuerzo', 'Cena']);
  const [portionDistribution, setPortionDistribution] = useState({});
  const [isEditingMeal, setIsEditingMeal] = useState(-1);
  const [tempMealName, setTempMealName] = useState('');

  // Registro de alimentos consumidos
  const [consumedFoods, setConsumedFoods] = useState({});

  // Historial de busquedas
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

  // FUNCIONES DE AUTENTICACION
  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setIsAuthenticated(false);
        setIsLoadingAuth(false);
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
      }
    } catch (error) {
      console.error('Error verificando autenticacion:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setError('');

    try {
      if (authMode === 'register' && authForm.password !== authForm.confirmPassword) {
        setError('Las contrasenas no coinciden');
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
          // Usuario nuevo - guardar configuracion local inicial
          await saveUserProfile();
        }
        
        setShowSetup(false);
      } else {
        setError(data.error || 'Error en autenticacion');
      }
    } catch (error) {
      console.error('Error en autenticacion:', error);
      setError('Error de conexion');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    setUser(null);
    setIsAuthenticated(false);
    
    // Limpiar datos
    setPersonalFoods({});
    setConsumedFoods({});
    setPortionDistribution({});
    setMealNames(['Desayuno', 'Almuerzo', 'Cena']);
    setMealCount(3);
    setCurrentMeal(0);
    setSearchHistory([]);
    setShowSetup(true);
  };

  // FUNCIONES DE SINCRONIZACION CON SERVIDOR
  const loadUserData = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      // Cargar perfil de usuario
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

      // Cargar alimentos consumidos del dia actual
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
  }, []);

  // CARGAR DATOS LOCALES SI NO ESTA AUTENTICADO
  useEffect(() => {
    if (!isAuthenticated && !isLoadingAuth) {
      // Cargar configuracion de comidas
      const savedConfig = loadFromStorage(STORAGE_KEYS.MEAL_CONFIG);
      if (savedConfig) {
        setMealNames(savedConfig.mealNames || ['Desayuno', 'Almuerzo', 'Cena']);
        setMealCount(savedConfig.mealCount || 3);
      }

      // Cargar alimentos personales
      const savedPersonalFoods = loadFromStorage(STORAGE_KEYS.PERSONAL_FOODS, {});
      setPersonalFoods(savedPersonalFoods);

      // Cargar distribucion de porciones
      const savedPortionDistribution = loadFromStorage(STORAGE_KEYS.PORTION_DISTRIBUTION);
      if (savedPortionDistribution) {
        setPortionDistribution(savedPortionDistribution);
      }

      // Cargar alimentos consumidos del dia actual
      const today = new Date().toDateString();
      const savedConsumedFoods = loadFromStorage(`${STORAGE_KEYS.CONSUMED_FOODS}_${today}`, {});
      setConsumedFoods(savedConsumedFoods);

      // Cargar comida actual
      const savedCurrentMeal = loadFromStorage(STORAGE_KEYS.CURRENT_MEAL, 0);
      setCurrentMeal(savedCurrentMeal);

      // Cargar historial de busquedas
      const savedSearchHistory = loadFromStorage(STORAGE_KEYS.SEARCH_HISTORY, []);
      setSearchHistory(savedSearchHistory);
    }
  }, [isAuthenticated, isLoadingAuth]);

  // GUARDAR CAMBIOS AUTOMATICAMENTE
  useEffect(() => {
    if (isAuthenticated) {
      saveUserProfile();
    } else {
      const config = { mealNames, mealCount };
      saveToStorage(STORAGE_KEYS.MEAL_CONFIG, config);
    }
  }, [mealNames, mealCount, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      saveUserProfile();
    } else {
      saveToStorage(STORAGE_KEYS.PORTION_DISTRIBUTION, portionDistribution);
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
      saveToStorage(`${STORAGE_KEYS.CONSUMED_FOODS}_${today}`, consumedFoods);
    }
  }, [consumedFoods, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      saveToStorage(STORAGE_KEYS.CURRENT_MEAL, currentMeal);
    }
  }, [currentMeal, isAuthenticated]);

  // Verificar estado del backend al cargar
  useEffect(() => {
    checkBackendHealth();
  }, []);
  
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

  // RESTO DE FUNCIONES EXISTENTES (sin cambios en la logica principal)
  const saveSearchToHistory = (searchTerm, results) => {
    if (results.length > 0) {
      const newHistory = [
        { term: searchTerm, timestamp: Date.now(), resultCount: results.length },
        ...searchHistory.filter(h => h.term !== searchTerm).slice(0, 9)
      ];
      setSearchHistory(newHistory);
      if (!isAuthenticated) {
        saveToStorage(STORAGE_KEYS.SEARCH_HISTORY, newHistory);
      }
    }
  };

  const clearOldData = () => {
    if (!isAuthenticated) {
      const today = new Date().toDateString();
      const keys = Object.keys(localStorage);
      
      keys.forEach(key => {
        if (key.startsWith(STORAGE_KEYS.CONSUMED_FOODS) && !key.includes(today)) {
          const dateStr = key.replace(STORAGE_KEYS.CONSUMED_FOODS + '_', '');
          const date = new Date(dateStr);
          const daysDiff = (new Date(today) - date) / (1000 * 60 * 60 * 24);
          
          if (daysDiff > 7) {
            localStorage.removeItem(key);
          }
        }
      });
    }
  };

  const resetTodayData = () => {
    if (window.confirm('?Seguro que quieres reiniciar los datos de hoy?')) {
      setConsumedFoods({});
      setCurrentMeal(0);
      initializeConsumedFoods();
    }
  };

  const checkBackendHealth = async () => {
    try {
      setError('Conectando con servidor...');
      const response = await fetch(`${API_BASE}/health`);
      const data = await response.json();

      if (response.ok) {
        setBackendStatus('connected');
        setError('');
        console.log('Backend conectado:', data);
      } else {
        setBackendStatus('error');
        setError('Error de servidor');
      }
    } catch (err) {
      setBackendStatus('offline');
      setError('Servidor offline - usando modo demo');
      console.warn('Backend offline, usando datos mock');
    }
  };

  const startEditingFood = (food) => {
    setEditingFood(food);
    setNewStandardGrams(food.standardPortionGrams);
    setShowEditFood(true);
  };

  const deleteFood = (foodId) => {
    const updatedFoods = { ...personalFoods };
    delete updatedFoods[foodId];
    savePersonalFoods(updatedFoods);
  };

  const saveEditedFood = () => {
    if (editingFood) {
      const updatedFoods = {
        ...personalFoods,
        [editingFood.id]: {
          ...editingFood,
          standardPortionGrams: newStandardGrams
        }
      };
      savePersonalFoods(updatedFoods);
      setShowEditFood(false);
      setEditingFood(null);
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

      const normalized = list.map((f, idx) => {
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

      return normalized;
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
          saveSearchToHistory(term, processed);
        } else {
          const errorText = await res.text();
          console.error('Error en busqueda:', {
            status: res.status,
            statusText: res.statusText,
            body: errorText
          });
          setSearchResults([]);
          setError(`Error en busqueda: ${res.status} ${res.statusText}`);
        }
      } else {
        setSearchResults([]);
        setError('Backend no conectado');
      }
    } catch (err) {
      console.error('Error de conexion:', err);
      setSearchResults([]);
      setError(`Error de conexion: ${err.message}`);
    } finally {
      setIsSearching(false);
    }
  };

  const startEditingConsumption = (food, mealIndex, groupName) => {
    setEditingConsumption({ food, mealIndex, groupName });
    setNewConsumedGrams(food.actualGrams || food.gramsPerPortion || food.standardPortionGrams);
    setShowEditConsumption(true);
  };

  const saveEditedConsumption = () => {
    if (editingConsumption) {
      const { food, mealIndex, groupName } = editingConsumption;
      const newConsumed = { ...consumedFoods };
      
      const foodIndex = newConsumed[mealIndex][groupName].findIndex(f => f.id === food.id);
      if (foodIndex !== -1) {
        newConsumed[mealIndex][groupName][foodIndex] = {
          ...food,
          actualGrams: newConsumedGrams,
          gramsPerPortion: newConsumedGrams
        };
      }
      
      setConsumedFoods(newConsumed);
      setShowEditConsumption(false);
      setEditingConsumption(null);
    }
  };

  const getFoodDetails = async (foodId) => {
    if (backendStatus !== 'connected' || !foodId.startsWith('fs_')) return null;

    try {
      const cleanId = foodId.replace('fs_', '');
      let res = await fetch(`${API_BASE}/food/${cleanId}`);

      if (res.status === 404 || res.status === 405) {
        res = await fetch(`${API_BASE}/food/${cleanId}`, { method: 'POST' });
      }

      if (res.ok) {
        const data = await res.json();
        return data;
      }
    } catch (error) {
      console.error('Error obteniendo detalles:', error);
    }
    return null;
  };

  const savePersonalFoods = (foods) => {
    setPersonalFoods(foods);
    if (!isAuthenticated) {
      saveToStorage(STORAGE_KEYS.PERSONAL_FOODS, foods);
    }
  };

  useEffect(() => {
    if (Object.keys(portionDistribution).length === 0) {
      initializePortionDistribution();
    }
    if (Object.keys(consumedFoods).length === 0) {
      initializeConsumedFoods();
    }
  }, [mealCount]);

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

  const addMeal = () => {
    const newCount = mealCount + 1;
    setMealCount(newCount);
    setMealNames([...mealNames, `Comida ${newCount}`]);
  };

  const removeMeal = (index) => {
    if (mealCount > 1) {
      const newNames = mealNames.filter((_, i) => i !== index);
      setMealNames(newNames);
      setMealCount(mealCount - 1);
      
      const newDist = { ...portionDistribution };
      Object.keys(newDist).forEach(group => {
        newDist[group].splice(index, 1);
      });
      setPortionDistribution(newDist);
      
      const newConsumed = { ...consumedFoods };
      delete newConsumed[index];
      const reindexed = {};
      Object.keys(newConsumed).forEach((key, i) => {
        if (parseInt(key) > index) {
          reindexed[parseInt(key) - 1] = newConsumed[key];
        } else {
          reindexed[key] = newConsumed[key];
        }
      });
      setConsumedFoods(reindexed);
      
      if (currentMeal >= mealCount - 1) {
        setCurrentMeal(Math.max(0, mealCount - 2));
      }
    }
  };

  const updatePortionDistribution = (group, mealIndex, value) => {
    const newDist = { ...portionDistribution };
    newDist[group][mealIndex] = Math.max(0, parseInt(value) || 0);
    setPortionDistribution(newDist);
  };

  const handleFoodSelect = async (food) => {
    const existingFood = personalFoods[food.id];
    if (existingFood) {
      addFood(existingFood);
    } else {
      if (food.isFromAPI && (!food.calories || !food.protein)) {
        const details = await getFoodDetails(food.id);
        if (details && details.food) {
          food = { ...food, ...details.food };
        }
      }
      
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
      savePersonalFoods(newPersonalFoods);
      
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

  const getRemainingPortions = (mealIndex, group) => {
    const planned = portionDistribution[group]?.[mealIndex] || 0;
    let consumed = 0;
    
    if (consumedFoods[mealIndex]?.[group]) {
      consumedFoods[mealIndex][group].forEach(food => {
        const actualGrams = food.actualGrams || food.gramsPerPortion;
        const standardGrams = food.standardPortionGrams || food.gramsPerPortion;
        consumed += actualGrams / standardGrams;
      });
    }
    
    return Math.max(0, planned - consumed);
  };

  const getTotalConsumedPortions = (group) => {
    let total = 0;
    Object.values(consumedFoods).forEach(meal => {
      if (meal[group]) {
        meal[group].forEach(food => {
          const actualGrams = food.actualGrams || food.gramsPerPortion;
          const standardGrams = food.standardPortionGrams || food.gramsPerPortion;
          const portions = actualGrams / standardGrams;
          total += portions;
        });
      }
    });
    return Math.round(total * 10) / 10;
  };

  const getTotalPlannedPortions = (group) => {
    return portionDistribution[group]?.reduce((sum, portions) => sum + portions, 0) || 0;
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

  const getDailyCalories = () => {
    let totalCalories = 0;
    for (let i = 0; i < mealCount; i++) {
      totalCalories += getMealCalories(i);
    }
    return totalCalories;
  };

  const getMealMacros = (mealIndex) => {
    const macros = { protein: 0, carbs: 0, fat: 0, fiber: 0 };
    Object.values(consumedFoods[mealIndex] || {}).forEach(foods => {
      foods.forEach(food => {
        const multiplier = (food.gramsPerPortion || 100) / 100;
        macros.protein += (food.protein || 0) * multiplier;
        macros.carbs += (food.carbs || 0) * multiplier;
        macros.fat += (food.fat || 0) * multiplier;
        macros.fiber += (food.fiber || 0) * multiplier;
      });
    });
    return {
      protein: Math.round(macros.protein * 10) / 10,
      carbs: Math.round(macros.carbs * 10) / 10,
      fat: Math.round(macros.fat * 10) / 10,
      fiber: Math.round(macros.fiber * 10) / 10
    };
  };

  const getDailyMacros = () => {
    const dailyMacros = { protein: 0, carbs: 0, fat: 0, fiber: 0 };
    for (let i = 0; i < mealCount; i++) {
      const mealMacros = getMealMacros(i);
      dailyMacros.protein += mealMacros.protein;
      dailyMacros.carbs += mealMacros.carbs;
      dailyMacros.fat += mealMacros.fat;
      dailyMacros.fiber += mealMacros.fiber;
    }
    return {
      protein: Math.round(dailyMacros.protein * 10) / 10,
      carbs: Math.round(dailyMacros.carbs * 10) / 10,
      fat: Math.round(dailyMacros.fat * 10) / 10,
      fiber: Math.round(dailyMacros.fiber * 10) / 10
    };
  };

  const startEditingMeal = (index) => {
    setIsEditingMeal(index);
    setTempMealName(mealNames[index]);
  };

  const saveMealName = () => {
    const newNames = [...mealNames];
    newNames[isEditingMeal] = tempMealName || `Comida ${isEditingMeal + 1}`;
    setMealNames(newNames);
    setIsEditingMeal(-1);
    setTempMealName('');
  };

  const cancelEditingMeal = () => {
    setIsEditingMeal(-1);
    setTempMealName('');
  };

  const addFromPersonalFoods = (food) => {
    addFood(food);
    setShowPersonalFoods(false);
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

  // COMPONENTE DE AUTENTICACION
  const AuthModal = () => (
    <div className="modal-overlay">
      <div className="modal">
        <h3>{authMode === 'login' ? 'Iniciar Sesion' : 'Registrarse'}</h3>
        
        <form onSubmit={handleAuth}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px' }}>
              Email:
            </label>
            <input
              type="email"
              value={authForm.email}
              onChange={(e) => setAuthForm({...authForm, email: e.target.value})}
              style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
              required
            />
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px' }}>
              Contrasena:
            </label>
            <input
              type="password"
              value={authForm.password}
              onChange={(e) => setAuthForm({...authForm, password: e.target.value})}
              style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
              required
              minLength="6"
            />
          </div>
          
          {authMode === 'register' && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px' }}>
                Confirmar Contrasena:
              </label>
              <input
                type="password"
                value={authForm.confirmPassword}
                onChange={(e) => setAuthForm({...authForm, confirmPassword: e.target.value})}
                style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                required
                minLength="6"
              />
            </div>
          )}
          
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <button 
              type="submit" 
              disabled={authLoading}
              style={{ 
                flex: 1, 
                background: '#2563eb', 
                color: 'white', 
                border: 'none', 
                padding: '8px', 
                borderRadius: '6px',
                opacity: authLoading ? 0.7 : 1
              }}
            >
              {authLoading ? 'Procesando...' : (authMode === 'login' ? 'Iniciar Sesion' : 'Registrarse')}
            </button>
            <button 
              type="button"
              onClick={() => setShowAuth(false)} 
              className="cancel-btn-modal"
            >
              Cancelar
            </button>
          </div>
        </form>
        
        <div style={{ textAlign: 'center', fontSize: '14px' }}>
          {authMode === 'login' ? (
            <>
              ?No tienes cuenta?{' '}
              <button 
                type="button"
                onClick={() => setAuthMode('register')}
                style={{ background: 'none', border: 'none', color: '#2563eb', textDecoration: 'underline', cursor: 'pointer' }}
              >
                Registrate
              </button>
            </>
          ) : (
            <>
              ?Ya tienes cuenta?{' '}
              <button 
                type="button"
                onClick={() => setAuthMode('login')}
                style={{ background: 'none', border: 'none', color: '#2563eb', textDecoration: 'underline', cursor: 'pointer' }}
              >
                Inicia sesion
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  // COMPONENTE DE HISTORIAL DE BUSQUEDAS
  const SearchHistoryComponent = () => (
    searchHistory.length > 0 && (
      <div style={{ marginBottom: '16px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <h4 style={{ fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Busquedas Recientes</h4>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {searchHistory.slice(0, 5).map((search, index) => (
            <button
              key={index}
              onClick={() => setSearchTerm(search.term)}
              style={{ 
                padding: '4px 8px', 
                fontSize: '11px', 
                background: '#e2e8f0', 
                border: 'none', 
                borderRadius: '4px', 
                cursor: 'pointer',
                color: '#475569'
              }}
            >
              {search.term} ({search.resultCount})
            </button>
          ))}
        </div>
      </div>
    )
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

  // PANTALLA PARA USUARIOS NO AUTENTICADOS
  if (!isAuthenticated) {
    return (
      <div className="app">
        {showAuth && <AuthModal />}
        
        <div className="header">
          <div className="header-top">
            <h1>Control de Porciones</h1>
            <button 
              onClick={() => setShowAuth(true)}
              className="header-btn"
            >
              <LogIn size={20} />
            </button>
          </div>
          <p style={{ color: '#bfdbfe', textAlign: 'center', padding: '20px' }}>
            Inicia sesion para sincronizar tus datos en todos tus dispositivos
          </p>
        </div>
        
        <div style={{ padding: '40px 20px', textAlign: 'center', color: '#1f2937' }}>
          <h2>Bienvenido a Control de Porciones</h2>
          <p style={{ marginBottom: '24px', color: '#6b7280' }}>
            Gestiona tu alimentacion de forma inteligente con seguimiento personalizado
          </p>
          
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button 
              onClick={() => {
                setAuthMode('login');
                setShowAuth(true);
              }}
              style={{ 
                background: '#2563eb', 
                color: 'white', 
                border: 'none', 
                padding: '12px 24px', 
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <LogIn size={20} />
              Iniciar Sesion
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
                padding: '12px 24px', 
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <UserPlus size={20} />
              Registrarse
            </button>
            
            <button 
              onClick={() => {
                setShowSetup(false);
                clearOldData();
              }}
              style={{ 
                background: '#6b7280', 
                color: 'white', 
                border: 'none', 
                padding: '12px 24px', 
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Continuar sin cuenta
            </button>
          </div>
          
          <div style={{ marginTop: '40px', fontSize: '14px', color: '#6b7280' }}>
            <h3>Caracteristicas:</h3>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              <li>? Planes de alimentacion personalizados</li>
              <li>? Seguimiento de porciones y calorias</li>
              <li>? Base de datos nutricional completa</li>
              <li>? Sincronizacion en todos tus dispositivos</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  if (showSetup) {
    return (
      <div className="app">
        <div className="header">
          <div className="header-top">
            <h1>Configuracion de Plan</h1>
            <div className="header-buttons">
              {isAuthenticated && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#bfdbfe', fontSize: '12px' }}>
                    <User size={16} />
                    {user?.email}
                  </div>
                  <button 
                    onClick={handleLogout}
                    className="header-btn"
                    title="Cerrar Sesion"
                  >
                    <LogOut size={20} />
                  </button>
                </>
              )}
            </div>
          </div>
          <p style={{ color: '#bfdbfe' }}>Personaliza tus comidas y porciones</p>
        </div>

        <div className="setup-content">
          <div className="setup-section">
            <div className="section-header">
              <h3>Tus Comidas</h3>
              <button onClick={addMeal} className="add-meal-btn">
                + Anadir
              </button>
            </div>
            
            {mealNames.map((meal, index) => (
              <div key={index} className="meal-config">
                {isEditingMeal === index ? (
                  <div className="editing-meal">
                    <input
                      value={tempMealName}
                      onChange={(e) => setTempMealName(e.target.value)}
                      className="meal-name-input"
                      placeholder="Nombre de la comida"
                    />
                    <button onClick={saveMealName} className="save-btn">
                      <Save size={16} />
                    </button>
                    <button onClick={cancelEditingMeal} className="cancel-btn">
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="meal-display">
                    <span className="meal-name">{meal}</span>
                    <button onClick={() => startEditingMeal(index)} className="edit-btn">
                      <Edit3 size={16} />
                    </button>
                    {mealCount > 1 && (
                      <button onClick={() => removeMeal(index)} className="remove-btn">
                        <X size={16} />
                      </button>
                    )}
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
                {mealNames.map((meal, index) => (
                  <div key={index}>
                    {meal.length > 6 ? meal.substring(0, 6) + '...' : meal}
                  </div>
                ))}
              </div>
              {Object.keys(foodGroups).map(group => (
                <div key={group} className="table-row" style={{ gridTemplateColumns: `1fr repeat(${mealCount}, 60px)` }}>
                  <div className="group-cell">
                    <span className="group-icon">{foodGroups[group].icon}</span>
                    <span className="group-name">{foodGroups[group].name}</span>
                  </div>
                  {Array.from({ length: mealCount }, (_, index) => (
                    <input
                      key={index}
                      type="number"
                      min="0"
                      value={portionDistribution[group]?.[index] || 0}
                      onChange={(e) => updatePortionDistribution(group, index, e.target.value)}
                      className="portion-input"
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => {
              initializeConsumedFoods();
              setShowSetup(false);
            }}
            className="start-tracking-btn"
          >
            Comenzar Seguimiento
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {/* Modal para editar cantidad consumida */}
      {showEditConsumption && editingConsumption && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Editar Cantidad Consumida</h3>
            <p style={{ fontSize: '14px', marginBottom: '16px' }}>
              <strong>{editingConsumption.food.name}</strong>
            </p>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px' }}>
                Gramos consumidos:
              </label>
              <input
                type="number"
                value={newConsumedGrams}
                onChange={(e) => setNewConsumedGrams(Math.max(1, parseInt(e.target.value) || 1))}
                style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                min="1"
              />
              <p style={{ fontSize: '12px', color: '#2563eb', marginTop: '4px' }}>
                Calorias: {Math.round(editingConsumption.food.calories * newConsumedGrams / 100)} kcal
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={saveEditedConsumption} style={{ flex: 1, background: '#2563eb', color: 'white', border: 'none', padding: '8px', borderRadius: '6px' }}>
                Guardar
              </button>
              <button onClick={() => setShowEditConsumption(false)} className="cancel-btn-modal">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header con indicador de estado de backend */}
      <div className="header">
        <div className="header-top">
          <h1>Control de Porciones</h1>
          <div className="header-buttons">
            {isAuthenticated ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#bfdbfe', fontSize: '12px' }}>
                  <User size={16} />
                  {user?.email}
                </div>
                <button 
                  onClick={() => setShowStats(true)}
                  className="header-btn"
                  title="Estadisticas"
                >
                  <BarChart3 size={20} />
                </button>
                <button 
                  onClick={() => setShowSetup(true)}
                  className="header-btn"
                  title="Configuracion"
                >
                  <Settings size={20} />
                </button>
                <button 
                  onClick={handleLogout}
                  className="header-btn"
                  title="Cerrar Sesion"
                >
                  <LogOut size={20} />
                </button>
              </>
            ) : (
              <button 
                onClick={() => setShowAuth(true)}
                className="header-btn"
                title="Iniciar Sesion"
              >
                <LogIn size={20} />
              </button>
            )}
          </div>
        </div>
        
        {/* Contador de calorias */}
        <div className="header-stats">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Activity size={16} style={{ marginRight: '4px' }} />
            <span style={{ fontSize: '14px' }}>Hoy: {getDailyCalories()} kcal</span>
          </div>
          <div style={{ fontSize: '14px' }}>
            {mealNames[currentMeal]}: {getMealCalories(currentMeal)} kcal
          </div>
        </div>
        
        {/* Selector de comidas */}
        <div className="meal-tabs">
          {mealNames.map((meal, index) => (
            <button
              key={index}
              onClick={() => setCurrentMeal(index)}
              className={`meal-tab ${currentMeal === index ? 'active' : ''}`}
            >
              {meal.length > 8 ? meal.substring(0, 8) + '...' : meal}
            </button>
          ))}
        </div>

        <div style={{ fontSize: '14px', color: '#bfdbfe', display: 'flex', alignItems: 'center' }}>
          <Clock size={16} style={{ display: 'inline', marginRight: '4px' }} />
          {mealNames[currentMeal]}
          <span style={{ marginLeft: '8px', fontSize: '12px', display: 'flex', alignItems: 'center' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', marginRight: '4px', backgroundColor: connectionStatus.color }}></div>
            {connectionStatus.text}
          </span>
          {isAuthenticated && (
            <span style={{ marginLeft: '8px', fontSize: '12px', color: '#22c55e' }}>
              ¡E Sincronizado
            </span>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-message">
          <AlertCircle size={16} style={{ display: 'inline', marginRight: '8px' }} />
          {error}
          {backendStatus === 'offline' && (
            <button 
              onClick={checkBackendHealth}
              style={{ marginLeft: '8px', padding: '2px 8px', fontSize: '12px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Reconectar
            </button>
          )}
        </div>
      )}

      {/* Modal de categorizacion */}
      {showCategoryModal && selectedFood && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Categorizar Alimento</h3>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
              <strong>{selectedFood.name}</strong>
              {selectedFood.brand && <span> - {selectedFood.brand}</span>}
              {selectedFood.isFromAPI && <span style={{ color: '#22c55e', fontSize: '12px' }}> (FatSecret)</span>}
            </p>
            
            {/* Mostrar info nutricional si esta disponible */}
            {(selectedFood.calories || selectedFood.protein || selectedFood.carbs || selectedFood.fat) && (
              <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#1e40af', marginBottom: '8px' }}>
                  Informacion Nutricional (por 100g)
                </div>
                <div style={{ fontSize: '12px', color: '#1e40af' }}>
                  {selectedFood.calories && <div>Calorias: {selectedFood.calories} kcal</div>}
                  {selectedFood.protein && <div>Proteina: {selectedFood.protein}g</div>}
                  {selectedFood.carbs && <div>Carbohidratos: {selectedFood.carbs}g</div>}
                  {selectedFood.fat && <div>Grasas: {selectedFood.fat}g</div>}
                </div>
              </div>
            )}
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: '#1f2937', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                <Scale size={16} style={{ display: 'inline', marginRight: '4px' }} />
                Gramos por porcion:
              </label>
              <input
                type="number"
                value={portionGrams}
                onChange={(e) => setPortionGrams(Math.max(1, parseInt(e.target.value) || 1))}
                style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', outline: 'none' }}
                min="1"
                step="5"
              />
              {selectedFood.calories && (
                <p style={{ fontSize: '12px', color: '#2563eb', marginTop: '4px' }}>
                  Equivale a {Math.round(selectedFood.calories * portionGrams / 100)} kcal
                </p>
              )}
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              {Object.keys(foodGroups).map(group => (
                <button
                  key={group}
                  onClick={() => assignFoodCategory(group)}
                  className="category-btn"
                >
                  <span className="category-icon">{foodGroups[group].icon}</span>
                  {foodGroups[group].name}
                  <span className="default-grams">
                    ({foodGroups[group].defaultGrams}g tipico)
                  </span>
                </button>
              ))}
            </div>
            
            <button
              onClick={() => {
                setShowCategoryModal(false);
                setSelectedFood(null);
              }}
              className="cancel-btn-modal"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Modal de alimentos personales */}
      {showPersonalFoods && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Mis Alimentos</h3>
            
            {Object.keys(personalFoods).length === 0 ? (
              <div className="empty-personal-foods">
                <p>No tienes alimentos guardados.</p>
                <p>Busca y categoriza para crear tu biblioteca.</p>
              </div>
            ) : (
              <div className="personal-foods-list">
                {Object.values(personalFoods).map(food => (
                  <div 
                    key={food.id}
                    onClick={() => addFromPersonalFoods(food)}
                    className="personal-food-item"
                  >
                    <div className="personal-food-info">
                      <div className="personal-food-name">{food.name}</div>
                      <div className="personal-food-details">
                        {foodGroups[food.group].icon} {food.standardPortionGrams}g = 1 porcion
                        {food.isFromAPI && <span style={{ color: '#22c55e' }}>FatSecret</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteFood(food.id);
                        }}
                        style={{ padding: '4px', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                      >
                        <Trash2 size={12} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditingFood(food);
                        }}
                        style={{ padding: '4px', background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer' }}
                      >
                        <Edit3 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <button
              onClick={() => setShowPersonalFoods(false)}
              className="cancel-btn-modal"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {showEditFood && editingFood && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Editar Alimento</h3>
            <p style={{ fontSize: '14px', marginBottom: '16px' }}>
              <strong>{editingFood.name}</strong>
            </p>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px' }}>
                Gramos por porcion estandar:
              </label>
              <input
                type="number"
                value={newStandardGrams}
                onChange={(e) => setNewStandardGrams(Math.max(1, parseInt(e.target.value) || 1))}
                style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                min="1"
              />
            </div>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={saveEditedFood} style={{ flex: 1, background: '#2563eb', color: 'white', border: 'none', padding: '8px', borderRadius: '6px' }}>
                Guardar
              </button>
              <button onClick={() => setShowEditFood(false)} className="cancel-btn-modal">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de estadisticas */}
      {showStats && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Estadisticas Diarias</h3>
              <button onClick={() => setShowStats(false)} className="close-modal-btn">
                <X size={20} />
              </button>
            </div>
            
            <div className="stats-calories">
              <div className="total-calories">{getDailyCalories()}</div>
              <div className="calories-label">Calorias Totales</div>
            </div>

            <div className="stats-section">
              <h4>Macronutrientes Diarios</h4>
              <div>
                {(() => {
                  const dailyMacros = getDailyMacros();
                  return (
                    <>
                      <div className="meal-calorie-item" style={{ background: '#fef2f2', borderColor: '#fecaca' }}>
                        <span style={{ color: '#991b1b' }}>Proteina</span>
                        <span style={{ color: '#dc2626', fontWeight: '600' }}>{dailyMacros.protein}g</span>
                      </div>
                      <div className="meal-calorie-item" style={{ background: '#fffbeb', borderColor: '#fed7aa' }}>
                        <span style={{ color: '#92400e' }}>Carbohidratos</span>
                        <span style={{ color: '#d97706', fontWeight: '600' }}>{dailyMacros.carbs}g</span>
                      </div>
                      <div className="meal-calorie-item" style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}>
                        <span style={{ color: '#166534' }}>Grasas</span>
                        <span style={{ color: '#059669', fontWeight: '600' }}>{dailyMacros.fat}g</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            <div className="stats-section">
              <h4>Calorias por Comida</h4>
              <div>
                {mealNames.map((meal, index) => (
                  <div key={index} className="meal-calorie-item">
                    <span className="meal-calorie-name">{meal}</span>
                    <span className="meal-calorie-value">{getMealCalories(index)} kcal</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Resto del contenido */}
      <div className="daily-summary">
        <div className="summary-header">
          <h2 style={{ fontSize: '14px', fontWeight: '600', color: '#1e40af' }}>Resumen Diario</h2>
          <button
            onClick={() => setShowPersonalFoods(true)}
            className="personal-foods-btn"
          >
            Mis Alimentos ({Object.keys(personalFoods).length})
          </button>
        </div>
        <div className="portion-grid">
          {Object.keys(foodGroups).map(group => {
            const consumed = getTotalConsumedPortions(group);
            const total = getTotalPlannedPortions(group);
            const percentage = total > 0 ? (consumed / total) * 100 : 0;
            
            return (
              <div
                key={group}
                className="portion-card"
                style={{ 
                  background: group === 'carbohidratos' ? '#eff6ff' :
                            group === 'proteinas' ? '#f0f9ff' :
                            group === 'protegrasa' ? '#faf5ff' :
                            group === 'grasas' ? '#ecfeff' :
                            group === 'frutas' ? '#f0f9ff' :
                            '#f0fdfa',
                  borderColor: group === 'carbohidratos' ? '#bfdbfe' :
                             group === 'proteinas' ? '#7dd3fc' :
                             group === 'protegrasa' ? '#c4b5fd' :
                             group === 'grasas' ? '#67e8f9' :
                             group === 'frutas' ? '#7dd3fc' :
                             '#5eead4',
                  color: '#1e40af'
                }}
              >
                <div className="portion-header">
                  <span className="group-icon-small">{foodGroups[group].icon}</span>
                  <span className="group-name-small">{foodGroups[group].name}</span>
                </div>
                <div className="portion-count">{consumed}/{total}</div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ padding: '16px' }}>
        <div className="current-meal-section">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1f2937', fontSize: '16px', marginBottom: '16px' }}>
            <Target size={20} />
            {mealNames[currentMeal]} - Porciones Restantes
          </h2>
          
          <div className="remaining-portions">
            {Object.keys(foodGroups).map(group => {
              const remaining = getRemainingPortions(currentMeal, group);
              const planned = portionDistribution[group]?.[currentMeal] || 0;
              return (
                <div
                  key={group}
                  className="remaining-card"
                  style={{ 
                    background: group === 'carbohidratos' ? '#eff6ff' :
                              group === 'proteinas' ? '#f0f9ff' :
                              group === 'protegrasa' ? '#faf5ff' :
                              group === 'grasas' ? '#ecfeff' :
                              group === 'frutas' ? '#f0f9ff' :
                              '#f0fdfa',
                    borderColor: group === 'carbohidratos' ? '#bfdbfe' :
                               group === 'proteinas' ? '#7dd3fc' :
                               group === 'protegrasa' ? '#c4b5fd' :
                               group === 'grasas' ? '#67e8f9' :
                               group === 'frutas' ? '#7dd3fc' :
                               '#5eead4',
                    color: '#1e40af',
                    textAlign: 'center'
                  }}
                >
                  <div className="remaining-header">
                    <span style={{ marginRight: '4px' }}>{foodGroups[group].icon}</span>
                    <span style={{ fontSize: '11px', fontWeight: '500' }}>{foodGroups[group].name}</span>
                  </div>
                  <div className="remaining-count">
                    {remaining > 0 ? `${remaining}/${planned}` : '?'}
                  </div>
                </div>
              );
            })}
          </div>

          {(() => {
            const mealMacros = getMealMacros(currentMeal);
            const hasAnyMacros = mealMacros.protein > 0 || mealMacros.carbs > 0 || mealMacros.fat > 0;
            
            if (hasAnyMacros) {
              return (
                <div className="meal-macros">
                  <div className="macros-title">Macros {mealNames[currentMeal]}</div>
                  <div className="macros-grid">
                    <div className="macro-item protein">
                      <div className="macro-value">{mealMacros.protein}g</div>
                      <div className="macro-label">Proteina</div>
                    </div>
                    <div className="macro-item carbs">
                      <div className="macro-value">{mealMacros.carbs}g</div>
                      <div className="macro-label">Carbos</div>
                    </div>
                    <div className="macro-item fat">
                      <div className="macro-value">{mealMacros.fat}g</div>
                      <div className="macro-label">Grasas</div>
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          })()}
        </div>

        <div className="current-meal-section">
          <div className="search-box">
            <Search className="search-icon" size={16} />
            <input
              type="text"
              placeholder={backendStatus === 'connected' ? 
                "Buscar en FatSecret... (ej: chicken breast, apple)" : 
                "Buscar alimentos... (ej: pollo, manzana, arroz)"
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <SearchHistoryComponent />

          {isSearching && (
            <div className="loading">
              <div className="spinner"></div>
              {backendStatus === 'connected' ? 'Buscando en FatSecret...' : 'Buscando alimentos...'}
            </div>
          )}

          {searchResults.length > 0 && (
            <div className="results">
              {searchResults.map((food, index) => {
                const isPersonalFood = personalFoods[food.id];
                return (
                  <div 
                    key={food.id}
                    onClick={() => handleFoodSelect(food)}
                    className="result-item"
                  >
                    <div className="result-info">
                      <div className="result-name">{food.name}</div>
                      <div className="result-details">
                        {food.brand && <span>{food.brand} ¡E </span>}
                        {food.isFromAPI ? (
                          <span style={{ color: '#22c55e' }}>FatSecret ¡E </span>
                        ) : (
                          <span>Datos locales ¡E </span>
                        )}
                        {food.calories ? `${food.calories} kcal/100g` : 'Tap para info nutricional'}
                        {food.protein && <span> ¡E {food.protein}g prot</span>}
                        {food.carbs && <span> ¡E {food.carbs}g carb</span>}
                        {food.fat && <span> ¡E {food.fat}g grasa</span>}
                      </div>
                      {isPersonalFood && (
                        <div className="saved-indicator">
                          ? Guardado como {foodGroups[isPersonalFood.group].icon} ({isPersonalFood.gramsPerPortion}g)
                        </div>
                      )}
                    </div>
                    <div className="result-action">
                      <div className={`status-badge ${isPersonalFood ? 'saved' : 'new'}`}>
                        {isPersonalFood ? 'Anadir' : 'Categorizar'}
                      </div>
                      <Plus className="add-icon" size={16} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {searchTerm.length >= 2 && !isSearching && searchResults.length === 0 && (
            <div style={{ textAlign: 'center', padding: '16px', color: '#6b7280' }}>
              <div style={{ fontSize: '14px' }}>No se encontraron alimentos para "{searchTerm}"</div>
              <div style={{ fontSize: '12px', marginTop: '4px', color: '#2563eb' }}>
                {backendStatus === 'connected' ? 
                  'Intenta con terminos en ingles o mas especificos' :
                  'Intenta con terminos mas simples'
                }
              </div>
            </div>
          )}
        </div>

        <div className="current-meal-section">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1f2937', fontSize: '16px', marginBottom: '16px' }}>
            <Utensils size={16} />
            Consumido en {mealNames[currentMeal]}
          </h3>

          {Object.keys(foodGroups).map(group => {
            const foods = consumedFoods[currentMeal]?.[group] || [];
            if (foods.length === 0) return null;

            return (
              <div key={group} style={{ marginBottom: '16px' }}>
                <div className="group-header-consumed">
                  {foods.map((food) => (
                    <div key={food.id} className="consumed-item">
                      <div className="consumed-info">
                        <div className="consumed-name">
                          {food.name}
                          {food.isFromAPI && <span style={{ color: '#22c55e', fontSize: '12px', marginLeft: '4px' }}></span>}
                        </div>
                        <div className="consumed-details">
                          {food.actualGrams || food.gramsPerPortion}g ({Math.round((food.actualGrams || food.gramsPerPortion) / (food.standardPortionGrams || food.gramsPerPortion) * 10) / 10} porciones) {Math.round(food.calories * (food.actualGrams || food.gramsPerPortion) / 100)} kcal {food.protein && <span> {Math.round(food.protein * (food.actualGrams || food.gramsPerPortion) / 100 * 10) / 10}g prot</span>}
                          <span className="timestamp"> {food.timestamp}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          onClick={() => startEditingConsumption(food, currentMeal, group)}
                          style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', padding: '4px' }}
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => removeFood(currentMeal, group, food.id)}
                          className="remove-btn"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {Object.values(consumedFoods[currentMeal] || {}).every(foods => foods.length === 0) && (
            <div className="empty-meal">
              <Utensils className="empty-icon" size={32} />
              <p>No has anadido alimentos a {mealNames[currentMeal].toLowerCase()}</p>
              <p className="empty-subtitle">
                {backendStatus === 'connected' ? 
                  'Busca en FatSecret arriba o usa tus alimentos guardados' :
                  'Busca arriba o usa tus alimentos guardados'
                }
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="info-section">
        <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#1e40af', marginBottom: '8px' }}>
          Como usar:
        </h3>
        <div style={{ fontSize: '12px', color: '#1e40af' }}>
          <div style={{ marginBottom: '4px' }}>
            ? <strong>Busca alimentos</strong> {backendStatus === 'connected' ? 'en la base de datos de FatSecret' : 'con datos nutricionales'}
          </div>
          <div style={{ marginBottom: '4px' }}>? <strong>Categoriza y define gramos</strong> por porcion la primera vez</div>
          <div style={{ marginBottom: '4px' }}>? <strong>Anade automaticamente</strong> en siguientes busquedas</div>
          <div style={{ marginBottom: '4px' }}>? <strong>Seguimiento completo</strong> de calorias y macros</div>
          <div>? <strong>Datos {isAuthenticated ? 'sincronizados en la nube' : 'guardados localmente'}</strong></div>
        </div>
        
        {backendStatus !== 'connected' && (
          <div style={{ marginTop: '8px', fontSize: '11px', color: '#f59e0b', backgroundColor: '#fef3c7', padding: '8px', borderRadius: '6px' }}>
            <strong>Modo Demo:</strong> Para acceder a datos nutricionales reales, inicia el servidor backend.
          </div>
        )}
        
        {isAuthenticated ? (
          <div style={{ marginTop: '8px', fontSize: '11px', color: '#059669', backgroundColor: '#d1fae5', padding: '8px', borderRadius: '6px' }}>
            <strong>Cuenta sincronizada:</strong> Tus datos se guardan automaticamente en la nube y se sincronizan entre dispositivos.
          </div>
        ) : (
          <div style={{ marginTop: '8px', fontSize: '11px', color: '#2563eb', backgroundColor: '#eff6ff', padding: '8px', borderRadius: '6px' }}>
            <strong>Modo local:</strong> Los datos se guardan en tu navegador. Para sincronizar entre dispositivos, <button onClick={() => setShowAuth(true)} style={{ background: 'none', border: 'none', color: '#2563eb', textDecoration: 'underline', cursor: 'pointer' }}>inicia sesion</button>.
          </div>
        )}
      </div>
    </div>
  );
};

export default PortionTracker;