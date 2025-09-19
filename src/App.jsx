import React, { useState, useEffect } from 'react';
import { Plus, Search, Trash2, Settings, Utensils, AlertCircle, Clock, Target, Edit3, Save, X, Scale, Activity, BarChart3, Download, Upload, LogOut, User, Eye, EyeOff } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
const PortionTracker = () => {
  // Estados de autenticacion
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // Estados existentes de la aplicacion
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
  const [showSetup, setShowSetup] = useState(false);
  const [currentMeal, setCurrentMeal] = useState(0);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedFood, setSelectedFood] = useState(null);
  const [portionGrams, setPortionGrams] = useState(100);
  const [showStats, setShowStats] = useState(false);
  
  // Estados de datos
  const [personalFoods, setPersonalFoods] = useState({});
  const [showPersonalFoods, setShowPersonalFoods] = useState(false);
  const [mealCount, setMealCount] = useState(3);
  const [mealNames, setMealNames] = useState(['Desayuno', 'Almuerzo', 'Cena']);
  const [portionDistribution, setPortionDistribution] = useState({});
  const [isEditingMeal, setIsEditingMeal] = useState(-1);
  const [tempMealName, setTempMealName] = useState('');
  const [consumedFoods, setConsumedFoods] = useState({});

  // URL del backend
		const API_BASE = "https://portion-tracker-backend-production.up.railway.app/api";
  // Token de autenticacion
		const getAuthToken = () => {
		  const token = localStorage.getItem(`auth_token_${window.location.hostname}`);
		  // Validar que el token no este corrupto
		  if (token && token !== 'undefined' && token !== 'null') {
			return token;
		  }
		  return null;
		};

		const setAuthToken = (token) => {
		  if (token && token !== 'undefined' && token !== 'null') {
			localStorage.setItem(`auth_token_${window.location.hostname}`, token);
		  }
		};

		const removeAuthToken = () => {
		  localStorage.removeItem(`auth_token_${window.location.hostname}`);
		  // Limpiar tambien cualquier token antiguo
		  localStorage.removeItem('auth_token');
		};

  // Headers con autenticacion
  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getAuthToken()}`
  });
  
  // Funcion helper para estilos de boton
const buttonStyle = (variant = 'primary') => {
  const styles = {
    primary: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)'
    },
    secondary: {
      background: 'white',
      color: '#667eea',
      border: '2px solid #667eea',
      boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
    },
    danger: {
      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      color: 'white',
      boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)'
    }
  };

  return {
    ...styles[variant],
    padding: '12px 24px',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative',
    overflow: 'hidden',
    border: styles[variant].border || 'none',
    transform: 'translateY(0)',
    ':hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 6px 20px rgba(102, 126, 234, 0.4)'
    },
    ':active': {
      transform: 'translateY(0)',
      boxShadow: '0 2px 10px rgba(102, 126, 234, 0.3)'
    }
  };
};

const foodGroups = {
  carbohidratos: { 
    name: 'Carbohidratos', 
    icon: '??', 
    defaultGrams: 30,
    color: '#3b82f6'
  },
  proteinas: { 
    name: 'Proteinas', 
    icon: '??', 
    defaultGrams: 100,
    color: '#8b5cf6'
  },  
  protegrasa: { 
    name: 'Protegrasa', 
    icon: '??', 
    defaultGrams: 30,
    color: '#ec4899'
  },
  grasas: { 
    name: 'Grasas', 
    icon: '??', 
    defaultGrams: 10,
    color: '#10b981'
  },
  frutas: { 
    name: 'Frutas', 
    icon: '??', 
    defaultGrams: 150,
    color: '#f59e0b'
  },
  lacteos: { 
    name: 'Lacteos', 
    icon: '??', 
    defaultGrams: 250,
    color: '#06b6d4'
  }
};
	  
	  // Agregar esto al useEffect inicial
useEffect(() => {
  // Cargar Google Fonts
  const link = document.createElement('link');
  link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap';
  link.rel = 'stylesheet';
  document.head.appendChild(link);
}, []);


  // Verificar autenticacion al cargar
  useEffect(() => {
    const checkAuth = async () => {
      const token = getAuthToken();
      if (token) {
        try {
          const response = await fetch(`${API_BASE}/auth/me`, {
            headers: getAuthHeaders()
          });
          
          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
            setIsAuthenticated(true);
            await loadUserData();
          } else {
            removeAuthToken();
          }
        } catch (error) {
          console.error('Error verificando autenticacion:', error);
          removeAuthToken();
        }
      }
    };

    checkAuth();
    checkBackendHealth();
  }, []);

  // Cargar datos del usuario autenticado
	const loadUserData = async () => {
	  try {
		// Cargar perfil de usuario
		const profileResponse = await fetch(`${API_BASE}/user/profile`, {
		  headers: getAuthHeaders()
		});

		if (profileResponse.ok) {
		  const profile = await profileResponse.json();
		  
		  // Solo asignar si hay datos, mantener valores por defecto si no
		  if (profile.meal_names && profile.meal_names.length > 0) {
			setMealNames(profile.meal_names);
			setMealCount(profile.meal_names.length);
		  }
		  
		  if (profile.portion_distribution && Object.keys(profile.portion_distribution).length > 0) {
			setPortionDistribution(profile.portion_distribution);
		  } else {
			initializePortionDistribution();
		  }
		  
		  if (profile.personal_foods) {
			setPersonalFoods(profile.personal_foods);
		  }
		} else {
		  // Si no hay perfil, inicializar con valores por defecto
		  initializePortionDistribution();
		}

		// Cargar alimentos consumidos del dia actual
		const today = new Date().toISOString().split('T')[0];
		const consumedResponse = await fetch(`${API_BASE}/user/consumed-foods/${today}`, {
		  headers: getAuthHeaders()
		});

		if (consumedResponse.ok) {
		  const consumedData = await consumedResponse.json();
		  if (consumedData.consumed_foods && Object.keys(consumedData.consumed_foods).length > 0) {
			setConsumedFoods(consumedData.consumed_foods);
		  } else {
			initializeConsumedFoods();
		  }
		} else {
		  initializeConsumedFoods();
		}
	  } catch (error) {
		console.error('Error cargando datos del usuario:', error);
		initializePortionDistribution();
		initializeConsumedFoods();
	  }
	};

  // Inicializar datos de usuario
  const initializeUserData = () => {
    // Solo inicializar si estan vacios
    if (Object.keys(portionDistribution).length === 0) {
    initializePortionDistribution();
    }
    if (Object.keys(consumedFoods).length === 0) {
    initializeConsumedFoods();
    }
  };

  // Guardar perfil de usuario
  const saveUserProfile = async (profileData) => {
    try {
      const response = await fetch(`${API_BASE}/user/profile`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(profileData)
      });

      if (!response.ok) {
        throw new Error('Error guardando perfil');
      }
    } catch (error) {
      console.error('Error guardando perfil:', error);
    }
  };

  // Guardar alimentos consumidos
  const saveConsumedFoods = async (consumedData) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`${API_BASE}/user/consumed-foods`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          date: today,
          consumed_foods: consumedData
        })
      });

      if (!response.ok) {
        throw new Error('Error guardando alimentos consumidos');
      }
    } catch (error) {
      console.error('Error guardando alimentos consumidos:', error);
    }
  };

  // Auto-guardar cuando cambian los datos
		useEffect(() => {
		  if (isAuthenticated && user) {
			// Debounce para evitar multiples guardados
			const timeoutId = setTimeout(() => {
			  const profileData = {
				meal_names: mealNames,
				meal_count: mealCount,
				portion_distribution: portionDistribution,
				personal_foods: personalFoods
			  };
			  saveUserProfile(profileData);
			}, 1000); // Esperar 1 segundo antes de guardar

			return () => clearTimeout(timeoutId);
		  }
		}, [mealNames, mealCount, portionDistribution, personalFoods, isAuthenticated]);

		useEffect(() => {
		  if (isAuthenticated && user && Object.keys(consumedFoods).length > 0) {
			// Verificar que realmente hay alimentos consumidos
			const hasConsumedFoods = Object.values(consumedFoods).some(meal => 
			  Object.values(meal).some(group => group.length > 0)
			);
			
			if (hasConsumedFoods) {
			  const timeoutId = setTimeout(() => {
				saveConsumedFoods(consumedFoods);
			  }, 1000);
			  
			  return () => clearTimeout(timeoutId);
			}
		  }
		}, [consumedFoods, isAuthenticated]);

  // Verificar si es un nuevo dia y limpiar consumidos
  useEffect(() => {
    if (isAuthenticated) {
      const checkNewDay = () => {
        const today = new Date().toDateString();
        const lastCheck = localStorage.getItem('lastDayCheck');
        
        if (lastCheck && lastCheck !== today) {
          // Es un nuevo dia, limpiar consumidos
          setConsumedFoods({});
          initializeConsumedFoods();
        }
        
        localStorage.setItem('lastDayCheck', today);
      };

      checkNewDay();
      
      // Verificar cada minuto si cambio el dia
      const interval = setInterval(checkNewDay, 60000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  // Resto de funciones existentes
  const checkBackendHealth = async () => {
    try {
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
      setError('Servidor offline');
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

  const searchFoodsAPI = async (term) => {
    if (!term || term.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setError('');

    try {
      if (backendStatus === 'connected') {
        const response = await fetch(`${API_BASE}/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: term, maxResults: 15 })
        });

        if (response.ok) {
          const data = await response.json();
          const processed = normalizeFoods(data);
          setSearchResults(processed);
        } else {
          setSearchResults([]);
          setError(`Error en busqueda: ${response.status}`);
        }
      } else {
        setSearchResults([]);
        setError('Backend no conectado');
      }
    } catch (err) {
      setSearchResults([]);
      setError(`Error de conexion: ${err.message}`);
    } finally {
      setIsSearching(false);
    }
  };

  const normalizeFoods = (data) => {
    let list = [];
    if (Array.isArray(data)) list = data;
    else if (Array.isArray(data?.foods)) list = data.foods;
    else if (Array.isArray(data?.foods?.food)) list = data.foods.food;
    else if (data?.foods?.food) list = [data.foods.food];

    return list.map((f, idx) => ({
      id: `fs_${f.id ?? f.food_id ?? f.foodId ?? idx}`,
      name: f.name ?? f.food_name ?? `Alimento ${idx + 1}`,
      calories: parseFloat(f.calories ?? f.kcal) || null,
      protein: parseFloat(f.protein ?? f.proteins) || null,
      carbs: parseFloat(f.carbs ?? f.carbohydrates) || null,
      fat: parseFloat(f.fat ?? f.fats) || null,
      brand: f.brand ?? f.brand_name ?? '',
      type: 'API',
      description: f.description ?? '',
      isFromAPI: true
    }));
  };

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

const handleLogout = () => {
  removeAuthToken();
  setUser(null);
  setIsAuthenticated(false);
  // Limpiar estados
  setPersonalFoods({});
  setConsumedFoods({});
  setPortionDistribution({});
  setMealNames(['Desayuno', 'Almuerzo', 'Cena']);
  setMealCount(3);
  setCurrentMeal(0);
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
          total += actualGrams / standardGrams;
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

const getDailyMacros = () => {
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;

  Object.values(consumedFoods).forEach(meal => {
    Object.values(meal).forEach(foods => {
      foods.forEach(food => {
        const grams = food.actualGrams || food.gramsPerPortion || 100;
        totalProtein += (food.protein || 0) * grams / 100;
        totalCarbs += (food.carbs || 0) * grams / 100;
        totalFat += (food.fat || 0) * grams / 100;
      });
    });
  });

  return {
    protein: Math.round(totalProtein),
    carbs: Math.round(totalCarbs),
    fat: Math.round(totalFat)
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

  // Pantalla de autenticacion
  if (!isAuthenticated) {
  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        padding: '60px 40px',
        borderRadius: '20px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
        width: '100%',
        maxWidth: '420px',
        textAlign: 'center'
      }}>
        {/* Logo o imagen */}
        <div style={{
          width: '80px',
          height: '80px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '20px',
          margin: '0 auto 30px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '36px',
          color: 'white'
        }}>
          ???
        </div>

        <h1 style={{ 
          color: '#1f2937', 
          fontSize: '32px', 
          fontWeight: 'bold', 
          marginBottom: '12px' 
        }}>
          Control de Porciones
        </h1>
        
        <p style={{ 
          color: '#6b7280', 
          fontSize: '16px',
          marginBottom: '40px',
          lineHeight: '1.5'
        }}>
          Gestiona tu alimentacion de forma inteligente
        </p>

        {authError && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '14px'
          }}>
            {authError}
          </div>
        )}

        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px'
        }}>
          <div style={{ transform: 'scale(1.1)' }}>
            <GoogleLogin
              onSuccess={async (credentialResponse) => {
                setAuthLoading(true);
                setAuthError('');
                
                try {
                  const response = await fetch(`${API_BASE}/auth/google`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      token: credentialResponse.credential
                    })
                  });
                  
                  const data = await response.json();
                  
                  if (response.ok) {
                    setAuthToken(data.token);
                    setUser(data.user);
                    setIsAuthenticated(true);
                    await loadUserData();
                  } else {
                    setAuthError(data.error || 'Error al iniciar sesion');
                  }
                } catch (error) {
                  setAuthError('Error de conexion con el servidor');
                } finally {
                  setAuthLoading(false);
                }
              }}
              onError={() => {
                setAuthError('Error al iniciar sesion con Google');
              }}
              theme="outline"
              size="large"
              shape="pill"
              logo_alignment="left"
              width="280"
            />
          </div>

          {authLoading && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              color: '#6b7280' 
            }}>
              <div style={{
                width: '16px',
                height: '16px',
                border: '2px solid #e5e7eb',
                borderTop: '2px solid #667eea',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              Iniciando sesion...
            </div>
          )}
        </div>

        <div style={{ 
          marginTop: '40px',
          paddingTop: '20px',
          borderTop: '1px solid #e5e7eb',
          fontSize: '12px', 
          color: '#6b7280' 
        }}>
          {backendStatus === 'connected' ? (
            <span style={{ color: '#059669' }}>
              ? Conectado a la base de datos
            </span>
          ) : (
            <span>? Verificando conexion...</span>
          )}
        </div>

        <div style={{ 
          marginTop: '20px',
          fontSize: '11px', 
          color: '#9ca3af',
          lineHeight: '1.4'
        }}>
          Al continuar, aceptas que tu informacion se almacene de forma segura 
          para proporcionarte el servicio.
        </div>
      </div>
    </div>
  );
}

  // Pantalla de configuracion
  if (showSetup) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px'
      }}>
        <div style={{
          maxWidth: '800px',
          margin: '0 auto',
          background: 'white',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            padding: '24px',
            textAlign: 'center'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>Configuracion de Plan</h1>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', fontSize: '14px' }}>
                  <User size={16} style={{ marginRight: '4px' }} />
                  {user?.email}
                </div>
                <button
                  onClick={handleLogout}
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    color: 'white',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <LogOut size={14} />
                  Salir
                </button>
              </div>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.9)', margin: 0 }}>
              Personaliza tus comidas y porciones
            </p>
          </div>

          <div style={{ padding: '24px' }}>
            {/* Seccion de comidas */}
            <div style={{ marginBottom: '32px' }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '16px' 
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', margin: 0 }}>
                  Tus Comidas
                </h3>
                <button 
                  onClick={addMeal}
                  style={{
                    background: '#2563eb',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Plus size={16} />
                  Anadir
                </button>
              </div>
              
              {mealNames.map((meal, index) => (
                <div key={index} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  marginBottom: '8px'
                }}>
                  {isEditingMeal === index ? (
                    <>
                      <input
                        value={tempMealName}
                        onChange={(e) => setTempMealName(e.target.value)}
                        style={{
                          flex: 1,
                          padding: '8px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                        placeholder="Nombre de la comida"
                      />
                      <button 
                        onClick={saveMealName}
                        style={{
                          background: '#059669',
                          color: 'white',
                          border: 'none',
                          padding: '8px',
                          borderRadius: '6px',
                          cursor: 'pointer'
                        }}
                      >
                        <Save size={16} />
                      </button>
                      <button 
                        onClick={() => setIsEditingMeal(-1)}
                        style={{
                          background: '#6b7280',
                          color: 'white',
                          border: 'none',
                          padding: '8px',
                          borderRadius: '6px',
                          cursor: 'pointer'
                        }}
                      >
                        <X size={16} />
                      </button>
                    </>
                  ) : (
                    <>
                      <span style={{ flex: 1, fontSize: '16px', fontWeight: '500', color: '#1f2937' }}>
                        {meal}
                      </span>
                      <button 
                        onClick={() => startEditingMeal(index)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#2563eb',
                          cursor: 'pointer',
                          padding: '4px'
                        }}
                      >
                        <Edit3 size={16} />
                      </button>
                      {mealCount > 1 && (
                        <button 
                          onClick={() => removeMeal(index)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            padding: '4px'
                          }}
                        >
                          <X size={16} />
                        </button>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Tabla de porciones */}
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', marginBottom: '16px' }}>
                Porciones por Comida
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th style={{ 
                        padding: '12px', 
                        textAlign: 'left', 
                        fontWeight: '600', 
                        color: '#374151',
                        border: '1px solid #e5e7eb'
                      }}>
                        Grupo
                      </th>
                      {mealNames.map((meal, index) => (
                        <th key={index} style={{ 
                          padding: '12px', 
                          textAlign: 'center', 
                          fontWeight: '600', 
                          color: '#374151',
                          border: '1px solid #e5e7eb',
                          fontSize: '12px'
                        }}>
                          {meal.length > 8 ? meal.substring(0, 8) + '...' : meal}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(foodGroups).map(group => (
                      <tr key={group}>
                        <td style={{ 
                          padding: '12px', 
                          border: '1px solid #e5e7eb',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: `${foodGroups[group].color}20`,
							fontSize: '12px',
							fontWeight: 'bold',
							color: foodGroups[group].color
                          }}>
                            {foodGroups[group].icon}
                          </span>
                          <span style={{ fontSize: '14px', fontWeight: '500', color: '#1f2937' }}>
                            {foodGroups[group].name}
                          </span>
                        </td>
                        {Array.from({ length: mealCount }, (_, index) => (
                          <td key={index} style={{ 
                            padding: '12px', 
                            border: '1px solid #e5e7eb',
                            textAlign: 'center'
                          }}>
                            <input
                              type="number"
                              min="0"
                              value={portionDistribution[group]?.[index] || 0}
                              onChange={(e) => updatePortionDistribution(group, index, e.target.value)}
                              style={{
                                width: '60px',
                                padding: '6px',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                textAlign: 'center',
                                fontSize: '14px'
                              }}
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
                padding: '16px',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Comenzar Seguimiento
            </button>
          </div>
        </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8fafc',
		fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"    
		}}>
      {/* Modales */}
      {showEditConsumption && editingConsumption && (
        // Para todos los modales
			<div style={{
			  position: 'fixed',
			  top: 0,
			  left: 0,
			  right: 0,
			  bottom: 0,
			  background: 'rgba(0, 0, 0, 0.4)',
			  backdropFilter: 'blur(8px)',
			  WebkitBackdropFilter: 'blur(8px)',
			  display: 'flex',
			  alignItems: 'center',
			  justifyContent: 'center',
			  zIndex: 2000,
			  padding: '20px',
			  animation: 'fadeIn 0.3s ease-out'
			}}>
			  <div style={{
				background: 'white',
				padding: '32px',
				borderRadius: '20px',
				width: '100%',
				maxWidth: '500px',
				boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
				animation: 'slideUp 0.3s ease-out',
				border: '1px solid rgba(255,255,255,0.2)'
			  }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#1f2937' }}>
              Editar Cantidad Consumida
            </h3>
            <p style={{ fontSize: '14px', marginBottom: '16px', color: '#6b7280' }}>
              <strong>{editingConsumption.food.name}</strong>
            </p>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                Gramos consumidos:
              </label>
              <input
                type="number"
                value={newConsumedGrams}
                onChange={(e) => setNewConsumedGrams(Math.max(1, parseInt(e.target.value) || 1))}
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  border: '1px solid #d1d5db', 
                  borderRadius: '8px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
                min="1"
              />
              <p style={{ fontSize: '12px', color: '#2563eb', marginTop: '8px' }}>
                Calorias: {Math.round(editingConsumption.food.calories * newConsumedGrams / 100)} kcal
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={saveEditedConsumption}
                style={{ 
                  flex: 1, 
                  background: '#2563eb', 
                  color: 'white', 
                  border: 'none', 
                  padding: '12px', 
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Guardar
              </button>
              <button 
                onClick={() => setShowEditConsumption(false)}
                style={{ 
                  flex: 1, 
                  background: '#6b7280', 
                  color: 'white', 
                  border: 'none', 
                  padding: '12px', 
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de categorizacion */}
      {showCategoryModal && selectedFood && (
        // Para todos los modales
			<div style={{
			  position: 'fixed',
			  top: 0,
			  left: 0,
			  right: 0,
			  bottom: 0,
			  background: 'rgba(0, 0, 0, 0.4)',
			  backdropFilter: 'blur(8px)',
			  WebkitBackdropFilter: 'blur(8px)',
			  display: 'flex',
			  alignItems: 'center',
			  justifyContent: 'center',
			  zIndex: 2000,
			  padding: '20px',
			  animation: 'fadeIn 0.3s ease-out'
			}}>
			  <div style={{
				background: 'white',
				padding: '32px',
				borderRadius: '20px',
				width: '100%',
				maxWidth: '500px',
				boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
				animation: 'slideUp 0.3s ease-out',
				border: '1px solid rgba(255,255,255,0.2)'
			  }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#1f2937' }}>
              Categorizar Alimento
            </h3>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
              <strong>{selectedFood.name}</strong>
              {selectedFood.brand && <span> - {selectedFood.brand}</span>}
              {selectedFood.isFromAPI && (
				  <span style={{
					background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
					color: 'white',
					fontSize: '10px',
					padding: '2px 8px',
					borderRadius: '999px',
					fontWeight: '600',
					marginLeft: '8px',
					boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)',
					display: 'inline-flex',
					alignItems: 'center',
					gap: '4px'
				  }}>
					<span style={{ fontSize: '8px' }}>?</span> FatSecret
				  </span>
				)}
            </p>
            
            {/* Info nutricional */}
            {(selectedFood.calories || selectedFood.protein || selectedFood.carbs || selectedFood.fat) && (
              <div style={{ 
                marginBottom: '16px', 
                padding: '12px', 
                background: '#eff6ff', 
                borderRadius: '8px', 
                border: '1px solid #bfdbfe' 
              }}>
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
              <label style={{ 
                display: 'block', 
                color: '#374151', 
                fontSize: '14px', 
                fontWeight: '500', 
                marginBottom: '8px' 
              }}>
                <Scale size={16} style={{ display: 'inline', marginRight: '4px' }} />
                Gramos por porcion:
              </label>
              <input
                type="number"
                value={portionGrams}
                onChange={(e) => setPortionGrams(Math.max(1, parseInt(e.target.value) || 1))}
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  border: '1px solid #d1d5db', 
                  borderRadius: '8px', 
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
                min="1"
                step="5"
              />
              {selectedFood.calories && (
                <p style={{ fontSize: '12px', color: '#2563eb', marginTop: '8px' }}>
                  Equivale a {Math.round(selectedFood.calories * portionGrams / 100)} kcal
                </p>
              )}
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '12px', color: '#374151' }}>
                Selecciona la categoria:
              </div>
              {Object.keys(foodGroups).map(group => (
                <button
                  key={group}
                  onClick={() => assignFoodCategory(group)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px',
                    marginBottom: '8px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: '#e5e7eb',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      color: '#374151'
                    }}>
                      {foodGroups[group].icon}
                    </span>
                    <span style={{ fontWeight: '500', color: '#1f2937' }}>
                      {foodGroups[group].name}
                    </span>
                  </div>
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>
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
              style={{
                width: '100%',
                background: '#6b7280',
                color: 'white',
                border: 'none',
                padding: '12px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
      {/* Modal de edicion de alimento personal */}
        {showEditFood && editingFood && (
          // Para todos los modales
				<div style={{
				  position: 'fixed',
				  top: 0,
				  left: 0,
				  right: 0,
				  bottom: 0,
				  background: 'rgba(0, 0, 0, 0.4)',
				  backdropFilter: 'blur(8px)',
				  WebkitBackdropFilter: 'blur(8px)',
				  display: 'flex',
				  alignItems: 'center',
				  justifyContent: 'center',
				  zIndex: 2000,
				  padding: '20px',
				  animation: 'fadeIn 0.3s ease-out'
				}}>
				  <div style={{
					background: 'white',
					padding: '32px',
					borderRadius: '20px',
					width: '100%',
					maxWidth: '500px',
					boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
					animation: 'slideUp 0.3s ease-out',
					border: '1px solid rgba(255,255,255,0.2)'
				  }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#1f2937' }}>
                Editar Alimento
              </h3>
              <p style={{ fontSize: '14px', marginBottom: '16px', color: '#6b7280' }}>
                <strong>{editingFood.name}</strong>
              </p>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                  Gramos por porción:
                </label>
                <input
                  type="number"
                  value={newStandardGrams}
                  onChange={(e) => setNewStandardGrams(Math.max(1, parseInt(e.target.value) || 1))}
                  style={{ 
                    width: '100%', 
                    padding: '12px', 
                    border: '1px solid #d1d5db', 
                    borderRadius: '8px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                  min="1"
                />
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                  Categoría:
                </label>
                <select
                  value={editingFood.group}
                  onChange={(e) => {
                    const newFood = { ...editingFood, group: e.target.value };
                    setEditingFood(newFood);
                  }}
                  style={{ 
                    width: '100%', 
                    padding: '12px', 
                    border: '1px solid #d1d5db', 
                    borderRadius: '8px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                >
                  {Object.keys(foodGroups).map(group => (
                    <option key={group} value={group}>
                      {foodGroups[group].icon} - {foodGroups[group].name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  onClick={() => {
                    const newPersonalFoods = {
                      ...personalFoods,
                      [editingFood.id]: {
                        ...editingFood,
                        standardPortionGrams: newStandardGrams,
                        gramsPerPortion: newStandardGrams
                      }
                    };
                    setPersonalFoods(newPersonalFoods);
                    setShowEditFood(false);
                    setEditingFood(null);
                  }}
                  style={{ 
                    flex: 1, 
                    background: '#2563eb', 
                    color: 'white', 
                    border: 'none', 
                    padding: '12px', 
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Guardar
                </button>
                <button 
                  onClick={() => {
                    setShowEditFood(false);
                    setEditingFood(null);
                  }}
                  style={{ 
                    flex: 1, 
                    background: '#6b7280', 
                    color: 'white', 
                    border: 'none', 
                    padding: '12px', 
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      {/* Modal de estadisticas */}
      {showStats && (
			  <div style={{
				position: 'fixed',
				top: 0,
				left: 0,
				right: 0,
				bottom: 0,
				background: 'rgba(0, 0, 0, 0.4)',
				backdropFilter: 'blur(8px)',
				WebkitBackdropFilter: 'blur(8px)',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				zIndex: 2000,
				padding: '20px',
				animation: 'fadeIn 0.3s ease-out'
			  }}>
				<div style={{
				  background: 'white',
				  padding: '32px',
				  borderRadius: '20px',
				  width: '100%',
				  maxWidth: '600px',
				  maxHeight: '90vh',
				  overflowY: 'auto',
				  boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
				  animation: 'slideUp 0.3s ease-out',
				  border: '1px solid rgba(255,255,255,0.2)'
				}}>
				  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
					<h3 style={{ fontSize: '20px', fontWeight: '700', color: '#1f2937', margin: 0 }}>
					  ?? Estadisticas Diarias
					</h3>
					<button 
					  onClick={() => setShowStats(false)}
					  style={{
						background: 'none',
						border: 'none',
						color: '#6b7280',
						cursor: 'pointer',
						padding: '4px'
					  }}
					>
					  <X size={20} />
					</button>
				  </div>
				  
				  <div style={{ textAlign: 'center', marginBottom: '32px' }}>
					<div style={{ 
					  fontSize: '56px', 
					  fontWeight: '800', 
					  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
					  WebkitBackgroundClip: 'text',
					  WebkitTextFillColor: 'transparent',
					  marginBottom: '8px'
					}}>
					  {getDailyCalories()}
					</div>
					<div style={{ 
					  fontSize: '14px', 
					  color: '#64748b',
					  fontWeight: '500',
					  textTransform: 'uppercase',
					  letterSpacing: '1px'
					}}>
					  Calorias Totales
					</div>
				  </div>

				  <div style={{ marginBottom: '24px' }}>
					<h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#1f2937' }}>
					  Calorias por Comida
					</h4>
					{mealNames.map((meal, index) => (
					  <div key={index} style={{
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'center',
						padding: '12px',
						marginBottom: '8px',
						background: '#f8fafc',
						borderRadius: '8px'
					  }}>
						<span style={{ color: '#374151', fontWeight: '500' }}>{meal}</span>
						<span style={{ fontWeight: '700', color: '#1f2937', fontSize: '18px' }}>
						  {getMealCalories(index)} kcal
						</span>
					  </div>
					))}
				  </div>
				</div>
				</div>
			  </div>
			)}

      {/* Header */}
     <div style={{
		  background: 'rgba(255, 255, 255, 0.1)',
		  backdropFilter: 'blur(20px)',
		  WebkitBackdropFilter: 'blur(20px)',
		  borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
		  position: 'sticky',
		  top: 0,
		  zIndex: 100,
		  padding: '16px 20px',
		  boxShadow: '0 4px 30px rgba(0,0,0,0.1)'
		}}>
		  {/* Gradiente de fondo sutil */}
		  <div style={{
			position: 'absolute',
			inset: 0,
			background: 'linear-gradient(135deg, #667eeacc 0%, #764ba2cc 100%)',
			zIndex: -1
		  }} />
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>
              Control de Porciones
            </h1>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', fontSize: '14px' }}>
                <User size={16} style={{ marginRight: '4px' }} />
                {user?.email}
              </div>
              <button 
                onClick={() => setShowStats(true)}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: 'white',
                  padding: '8px',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
                title="Estadisticas"
              >
                <BarChart3 size={18} />
              </button>
              <button 
                onClick={() => setShowSetup(true)}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: 'white',
                  padding: '8px',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
                title="Configuracion"
              >
                <Settings size={18} />
              </button>
              <button
                onClick={handleLogout}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: 'white',
                  padding: '8px',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
                title="Cerrar Sesion"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <Activity size={16} style={{ marginRight: '4px' }} />
                <span style={{ fontSize: '14px' }}>Hoy: {getDailyCalories()} kcal</span>
              </div>
              <div style={{ fontSize: '14px' }}>
                {mealNames[currentMeal]}: {getMealCalories(currentMeal)} kcal
              </div>
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>
              {backendStatus === 'connected' ? 'Conectado a FatSecret' : 'Modo offline'}
            </div>
          </div>
          
          {/* Selector de comidas */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
            {mealNames.map((meal, index) => (
              <button
                key={index}
                onClick={() => setCurrentMeal(index)}
                style={{
                  background: currentMeal === index ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: currentMeal === index ? '600' : '500',
                  whiteSpace: 'nowrap',
                  minWidth: 'fit-content'
                }}
              >
                {meal}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#dc2626',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <AlertCircle size={16} style={{ marginRight: '8px' }} />
            {error}
          </div>
          {backendStatus === 'offline' && (
            <button 
              onClick={checkBackendHealth}
              style={{ 
                padding: '4px 12px', 
                fontSize: '12px', 
                background: '#2563eb', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px', 
                cursor: 'pointer' 
              }}
            >
              Reconectar
            </button>
          )}
        </div>
      )}

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      {/* Resumen diario */}
      <div
        style={{
          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '16px',
          textAlign: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          transition: 'all 0.3s ease',
          animation: 'fadeIn 0.5s ease-out',
          cursor: 'pointer',
          marginBottom: '16px'
        }}
        onClick={() => setShowPersonalFoods(true)}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        Mis Alimentos ({Object.keys(personalFoods).length})
      </div>
        
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', 
        gap: '12px' 
      }}>
        {Object.keys(foodGroups).map(group => {
          const consumed = getTotalConsumedPortions(group);
          const total = getTotalPlannedPortions(group);
          const percentage = total > 0 ? (consumed / total) * 100 : 0;
          
          return (
            <div
              key={group}
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: '#e5e7eb',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  color: '#374151',
                  marginRight: '6px'
                }}>
                  {foodGroups[group].icon}
                </span>
                <span style={{ fontSize: '12px', fontWeight: '500', color: '#374151' }}>
                  {foodGroups[group].name}
                </span>
              </div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937', marginBottom: '4px' }}>
                {consumed}/{total}
              </div>
              {/* Barra de progreso */}
              <div style={{
                width: '100%',
                height: '8px',
                background: 'linear-gradient(90deg, #e5e7eb 0%, #f3f4f6 100%)',
                borderRadius: '999px',
                overflow: 'hidden',
                position: 'relative'
              }}>
                <div style={{
                  width: `${Math.min(percentage, 100)}%`,
                  height: '100%',
                  background: percentage >= 100 
                    ? 'linear-gradient(90deg, #10b981 0%, #059669 100%)' 
                    : `linear-gradient(90deg, ${foodGroups[group].color} 0%, ${foodGroups[group].color}dd 100%)`,
                  transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                  borderRadius: '999px',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {/* Efecto de brillo animado */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                    animation: 'shimmer 2s infinite'
                  }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
                
        {/* Seccion de comida actual */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            color: '#1f2937', 
            fontSize: '18px', 
            marginBottom: '16px',
            fontWeight: '600'
          }}>
            <Target size={20} />
            {mealNames[currentMeal]} - Porciones Restantes
          </h2>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
            gap: '12px',
            marginBottom: '20px'
          }}>
            {Object.keys(foodGroups).map(group => {
              const remaining = getRemainingPortions(currentMeal, group);
              const planned = portionDistribution[group]?.[currentMeal] || 0;
              return (
                <div
                  key={group}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'center'
                  }}
                >
                  <div style={{ marginBottom: '8px' }}>
                    <span style={{ marginRight: '4px', fontSize: '12px' }}>{foodGroups[group].icon}</span>
                    <span style={{ fontSize: '11px', fontWeight: '500' }}>{foodGroups[group].name}</span>
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
                    {planned > 0 ? `${remaining}/${planned}` : '0/0'}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Busqueda de alimentos */}
          <div style={{ position: 'relative', marginBottom: '16px' }}>
            <Search style={{ 
              position: 'absolute', 
              left: '12px', 
              top: '50%', 
              transform: 'translateY(-50%)', 
              color: '#6b7280' 
            }} size={16} />
            <input
              type="text"
              placeholder={backendStatus === 'connected' ? 
                "Buscar en FatSecret... (ej: chicken breast, apple)" : 
                "Buscar alimentos... (ej: pollo, manzana, arroz)"
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 12px 12px 40px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {isSearching && (
            <div style={{ 
              textAlign: 'center', 
              padding: '20px', 
              color: '#6b7280' 
            }}>
              <div style={{
                width: '20px',
                height: '20px',
                border: '2px solid #e5e7eb',
                borderTop: '2px solid #2563eb',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 8px'
              }} />
              {backendStatus === 'connected' ? 'Buscando en FatSecret...' : 'Buscando alimentos...'}
            </div>
          )}

          {searchResults.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              {searchResults.map((food) => {
                const isPersonalFood = personalFoods[food.id];
                return (
                  <div 
                    key={food.id}
                    onClick={() => handleFoodSelect(food)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px',
                      marginBottom: '8px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#e2e8f0';
                      e.currentTarget.style.borderColor = '#9ca3af';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#f8fafc';
                      e.currentTarget.style.borderColor = '#e2e8f0';
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: '500', color: '#1f2937', marginBottom: '4px' }}>
                        {food.name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        {food.brand && <span>{food.brand} </span>}
                        {food.isFromAPI ? (
                          <span style={{ color: '#22c55e' }}>FatSecret </span>
                        ) : (
                          <span>Datos locales  </span>
                        )}
                        {food.calories ? `${food.calories} kcal/100g` : 'Tap para info nutricional'}
                        {food.protein && <span> {food.protein}g prot</span>}
                      </div>
                      {isPersonalFood && (
                        <div style={{ fontSize: '11px', color: '#059669', marginTop: '2px' }}>
                         Guardado como {foodGroups[isPersonalFood.group].icon} ({isPersonalFood.gramsPerPortion}g)
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        padding: '4px 8px',
                        background: isPersonalFood ? '#d1fae5' : '#dbeafe',
                        color: isPersonalFood ? '#059669' : '#2563eb',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '500'
                      }}>
                        {isPersonalFood ? 'Anadir' : 'Categorizar'}
                      </span>
                      <Plus size={16} style={{ color: '#6b7280' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {searchTerm.length >= 2 && !isSearching && searchResults.length === 0 && (
            <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
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

        {/* Alimentos consumidos */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            color: '#1f2937', 
            fontSize: '18px', 
            marginBottom: '16px',
            fontWeight: '600'
          }}>
            <Utensils size={18} />
            Consumido en {mealNames[currentMeal]}
          </h3>

          {Object.keys(foodGroups).map(group => {
            const foods = consumedFoods[currentMeal]?.[group] || [];
            if (foods.length === 0) return null;

            return (
              <div key={group} style={{ marginBottom: '16px' }}>
                {foods.map((food) => (
                  <div key={food.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px',
                    marginBottom: '8px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px'
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: '500', color: '#1f2937', marginBottom: '2px' }}>
                        {food.name}
                        {food.isFromAPI && <span style={{ color: '#22c55e', fontSize: '12px', marginLeft: '4px' }}> </span>}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        {food.actualGrams || food.gramsPerPortion}g 
                        ({Math.round((food.actualGrams || food.gramsPerPortion) / (food.standardPortionGrams || food.gramsPerPortion) * 10) / 10} porciones) 
                       {Math.round(food.calories * (food.actualGrams || food.gramsPerPortion) / 100)} kcal
                        {food.protein && <span>  {Math.round(food.protein * (food.actualGrams || food.gramsPerPortion) / 100 * 10) / 10}g prot</span>}
                        <span style={{ color: '#9ca3af' }}>  {food.timestamp}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        onClick={() => startEditingConsumption(food, currentMeal, group)}
                        style={{ 
                          background: 'none', 
                          border: 'none', 
                          color: '#2563eb', 
                          cursor: 'pointer', 
                          padding: '4px' 
                        }}
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => removeFood(currentMeal, group, food.id)}
                        style={{ 
                          background: 'none', 
                          border: 'none', 
                          color: '#ef4444', 
                          cursor: 'pointer', 
                          padding: '4px' 
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}

          {Object.values(consumedFoods[currentMeal] || {}).every(foods => foods.length === 0) && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              <Utensils size={32} style={{ margin: '0 auto 12px', display: 'block' }} />
              <p style={{ fontSize: '16px', marginBottom: '8px' }}>
                No has anadido alimentos a {mealNames[currentMeal].toLowerCase()}
              </p>
              <p style={{ fontSize: '14px' }}>
                {backendStatus === 'connected' ? 
                  'Busca en FatSecret arriba o usa tus alimentos guardados' :
                  'Busca arriba o usa tus alimentos guardados'
                }
              </p>
            </div>
          )}
        </div>

        {/* Modal de alimentos personales */}
        {showPersonalFoods && (
          // Para todos los modales
				<div style={{
				  position: 'fixed',
				  top: 0,
				  left: 0,
				  right: 0,
				  bottom: 0,
				  background: 'rgba(0, 0, 0, 0.4)',
				  backdropFilter: 'blur(8px)',
				  WebkitBackdropFilter: 'blur(8px)',
				  display: 'flex',
				  alignItems: 'center',
				  justifyContent: 'center',
				  zIndex: 2000,
				  padding: '20px',
				  animation: 'fadeIn 0.3s ease-out'
				}}>
				  <div style={{
					background: 'white',
					padding: '32px',
					borderRadius: '20px',
					width: '100%',
					maxWidth: '500px',
					boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
					animation: 'slideUp 0.3s ease-out',
					border: '1px solid rgba(255,255,255,0.2)'
				  }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#1f2937' }}>
                Mis Alimentos
              </h3>
              
              {Object.keys(personalFoods).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                  <p style={{ fontSize: '16px', marginBottom: '8px' }}>No tienes alimentos guardados.</p>
                  <p style={{ fontSize: '14px' }}>Busca y categoriza para crear tu biblioteca.</p>
                </div>
              ) : (
                <div style={{ marginBottom: '20px' }}>
                  {Object.values(personalFoods).map(food => (
                    <div 
                      key={food.id}
                      onClick={() => {
                        addFood(food);
                        setShowPersonalFoods(false);
                      }}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px',
                        marginBottom: '8px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#e2e8f0';
                        e.currentTarget.style.borderColor = '#9ca3af';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#f8fafc';
                        e.currentTarget.style.borderColor = '#e2e8f0';
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: '500', color: '#1f2937', marginBottom: '2px' }}>
                          {food.name}
                        </div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>
                          {foodGroups[food.group].icon} {food.standardPortionGrams}g = 1 porcion
                          {food.isFromAPI && <span style={{ color: '#22c55e', marginLeft: '8px' }}>FatSecret</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // Establecer el alimento para editar
                            setEditingFood(food);
                            setNewStandardGrams(food.standardPortionGrams);
                            setShowEditFood(true);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#2563eb',
                            cursor: 'pointer',
                            padding: '4px'
                          }}
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const newPersonalFoods = { ...personalFoods };
                            delete newPersonalFoods[food.id];
                            setPersonalFoods(newPersonalFoods);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            padding: '4px'
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <button
                onClick={() => setShowPersonalFoods(false)}
                style={{
                  width: '100%',
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        )}

        {/* Informacion de uso */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '20px',
          marginTop: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937', marginBottom: '12px' }}>
            Como usar:
          </h3>
          <div style={{ fontSize: '14px', color: '#6b7280', lineHeight: '1.5' }}>
            <div style={{ marginBottom: '8px' }}>
               <strong>Busca alimentos</strong> {backendStatus === 'connected' ? 'en la base de datos de FatSecret' : 'con datos nutricionales'}
            </div>
            <div style={{ marginBottom: '8px' }}>
               <strong>Categoriza y define gramos</strong> por porcion la primera vez
            </div>
            <div style={{ marginBottom: '8px' }}>
               <strong>Anade automaticamente</strong> en siguientes busquedas
            </div>
            <div style={{ marginBottom: '8px' }}>
               <strong>Seguimiento completo</strong> de calorias y macros
            </div>
            <div>
               <strong>Datos sincronizados</strong> - guardados en tu cuenta personal
            </div>
          </div>
          
          <div style={{ 
            marginTop: '12px', 
            fontSize: '12px', 
            color: '#059669', 
            background: '#d1fae5', 
            padding: '8px', 
            borderRadius: '6px' 
          }}>
            <strong>Cuenta Personal:</strong> Tus datos se guardan automaticamente en la nube. Los alimentos consumidos se reinician cada dia a las 00:00.
          </div>
        </div>
        </div>

      <style>{`
		  @keyframes spin {
			0% { transform: rotate(0deg); }
			100% { transform: rotate(360deg); }
		  }
		  
		  @keyframes fadeIn {
			from { opacity: 0; transform: translateY(10px); }
			to { opacity: 1; transform: translateY(0); }
		  }
		  
		  @keyframes slideUp {
			from { transform: translateY(20px); opacity: 0; }
			to { transform: translateY(0); opacity: 1; }
		  }
		  
		  @keyframes shimmer {
			0% { background-position: -200% center; }
			100% { background-position: 200% center; }
		  }
		  
		  @keyframes pulse {
			0%, 100% { transform: scale(1); }
			50% { transform: scale(1.05); }
		  }
		`}</style>
    </div>
  );
}

export default PortionTracker;