import React, { useState, useEffect } from 'react';
import type { DailyLog, Training, Meal, CardioTraining, StrengthTraining, StrengthEnduranceTraining } from '../types';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import SparklesIcon from './icons/SparklesIcon';
import { getMealCalories, getTrainingCalories } from '../services/geminiService';

interface DailyLogFormProps {
  onAddLog: (log: DailyLog) => void;
  onCancel: () => void;
  logs: DailyLog[];
}

const TRAINING_OPTIONS = {
  'Fuerza': ['Dominadas', 'Flexiones', 'Fondos', 'Sentadillas', 'Remo barra baja', 'Zancadas', 'Dominadas australianas', 'Flexiones pino', 'Pies Barra'],
  'Lucha': ['BJJ', 'Wrestling', 'Kickboxing', 'MMA'],
  'Cardio': ['Rucking', 'Correr', 'Bicicleta', 'Comba'],
  'Fuerza-Resistencia': ['Thrusters', 'Burpees', 'Sprints', 'Battle Rope', 'Assault Bike'],
};
type TrainingCategory = keyof typeof TRAINING_OPTIONS;

const DailyLogForm: React.FC<DailyLogFormProps> = ({ onAddLog, onCancel, logs }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [bodyWeight, setBodyWeight] = useState<number | string>('');
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loadingItems, setLoadingItems] = useState<Set<string>>(new Set());
  const [existingLogId, setExistingLogId] = useState<string | null>(null);

  useEffect(() => {
    const existingLog = logs.find(log => log.date === date);
    if (existingLog) {
      setTrainings(existingLog.trainings);
      setMeals(existingLog.meals);
      setBodyWeight(existingLog.bodyWeight ?? '');
      setExistingLogId(existingLog.id);
    } else {
      setTrainings([]);
      setMeals([]);
      setBodyWeight('');
      setExistingLogId(null);
    }
  }, [date, logs]);


  // State for the "add training" controls
  const [selectedCategory, setSelectedCategory] = useState<TrainingCategory>('Fuerza');
  const [selectedTrainingName, setSelectedTrainingName] = useState(TRAINING_OPTIONS['Fuerza'][0]);

  // State for the "add meal" controls
  const [mealName, setMealName] = useState('');
  const [mealDescription, setMealDescription] = useState('');

  useEffect(() => {
      setSelectedTrainingName(TRAINING_OPTIONS[selectedCategory][0]);
  }, [selectedCategory]);

  const handleAddTraining = async () => {
    let newTraining: Training;
    const id = crypto.randomUUID();

    switch (selectedCategory) {
      case 'Fuerza':
        newTraining = { id, category: 'Fuerza', name: selectedTrainingName, sets: 3, reps: 10, weightType: 'bodyweight', caloriesBurned: null };
        break;
      case 'Lucha':
        newTraining = { id, category: 'Lucha', name: selectedTrainingName, duration: 30, caloriesBurned: null };
        break;
      case 'Cardio':
        newTraining = { id, category: 'Cardio', name: selectedTrainingName, duration: 30, distance: selectedTrainingName === 'Correr' || selectedTrainingName === 'Bicicleta' ? 5 : undefined, weight: selectedTrainingName === 'Rucking' ? 10 : undefined, caloriesBurned: null };
        break;
      case 'Fuerza-Resistencia':
        newTraining = { id, category: 'Fuerza-Resistencia', name: selectedTrainingName, sets: 5, reps: 15, weight: selectedTrainingName === 'Thrusters' ? 20 : undefined, caloriesBurned: null };
        break;
      default:
        return;
    }
    setTrainings(prev => [...prev, newTraining]);
    setLoadingItems(prev => new Set(prev).add(id));
    
    const caloriesBurned = await getTrainingCalories(newTraining);
    setTrainings(prev => prev.map(t => t.id === id ? { ...t, caloriesBurned } : t));
    setLoadingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
    });
  };
  
  const handleTrainingChange = (index: number, field: string, value: string | number) => {
    const newTrainings = [...trainings];
    const training = { ...newTrainings[index] };
    
    if (field === 'weightType' && value === 'bodyweight') {
      delete (training as StrengthTraining).weight;
    }

    if (field === 'weightType') {
       (training as any)[field] = value;
    } else if (typeof value === 'string') {
        const numValue = Number(value);
        if (!isNaN(numValue) && numValue >= 0) {
            (training as any)[field] = numValue;
        }
    } else {
        (training as any)[field] = value;
    }
    
    newTrainings[index] = training;
    setTrainings(newTrainings);
  };

  const removeTraining = (id: string) => {
    setTrainings(trainings.filter(t => t.id !== id));
  };

  const handleAddMeal = async () => {
    if (mealName.trim() && mealDescription.trim()) {
      const newMeal: Meal = { id: crypto.randomUUID(), name: mealName, description: mealDescription, calories: null };
      setMeals(prev => [...prev, newMeal]);
      setMealName('');
      setMealDescription('');

      setLoadingItems(prev => new Set(prev).add(newMeal.id));
      
      const calories = await getMealCalories(newMeal);
      setMeals(prev => prev.map(m => m.id === newMeal.id ? { ...m, calories } : m));
      setLoadingItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(newMeal.id);
          return newSet;
      });
    }
  };

  const removeMeal = (id: string) => {
    setMeals(meals.filter(m => m.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newLog: DailyLog = {
      id: existingLogId || crypto.randomUUID(),
      date,
      bodyWeight: bodyWeight ? Number(bodyWeight) : null,
      trainings,
      meals,
    };
    onAddLog(newLog);
  };

  const renderTrainingInputs = (training: Training, index: number) => {
    switch(training.category) {
        case 'Fuerza':
            const strength = training as StrengthTraining;
            return (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                    <input type="number" value={strength.sets} onChange={e => handleTrainingChange(index, 'sets', e.target.value)} className="input-field" placeholder="Series" aria-label="Series"/>
                    <input type="number" value={strength.reps} onChange={e => handleTrainingChange(index, 'reps', e.target.value)} className="input-field" placeholder="Reps" aria-label="Repeticiones"/>
                    <select value={strength.weightType} onChange={e => handleTrainingChange(index, 'weightType', e.target.value)} className="input-field" aria-label="Tipo de peso">
                        <option value="bodyweight">Peso Corporal</option>
                        <option value="kg">kg</option>
                    </select>
                    {strength.weightType === 'kg' && <input type="number" value={strength.weight || ''} onChange={e => handleTrainingChange(index, 'weight', e.target.value)} className="input-field" placeholder="Peso (kg)" aria-label="Peso en kg"/>}
                </div>
            );
        case 'Lucha':
            return <div className="grid grid-cols-2 gap-2 mt-2"><input type="number" value={training.duration} onChange={e => handleTrainingChange(index, 'duration', e.target.value)} className="input-field" placeholder="Duración (min)" aria-label="Duración en minutos"/></div>;
        case 'Cardio':
            const cardio = training as CardioTraining;
            return (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                    <input type="number" value={cardio.duration} onChange={e => handleTrainingChange(index, 'duration', e.target.value)} className="input-field" placeholder="Duración (min)" aria-label="Duración en minutos"/>
                    {cardio.name !== 'Comba' && <input type="number" value={cardio.distance || ''} onChange={e => handleTrainingChange(index, 'distance', e.target.value)} className="input-field" placeholder="Distancia (km)" aria-label="Distancia en km"/>}
                    {cardio.name === 'Rucking' && <input type="number" value={cardio.weight || ''} onChange={e => handleTrainingChange(index, 'weight', e.target.value)} className="input-field" placeholder="Peso (kg)" aria-label="Peso en kg"/>}
                </div>
            );
        case 'Fuerza-Resistencia':
            const se = training as StrengthEnduranceTraining;
            return (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                     <input type="number" value={se.sets} onChange={e => handleTrainingChange(index, 'sets', e.target.value)} className="input-field" placeholder="Series" aria-label="Series"/>
                     <input type="number" value={se.reps} onChange={e => handleTrainingChange(index, 'reps', e.target.value)} className="input-field" placeholder="Reps" aria-label="Repeticiones"/>
                     {se.name === 'Thrusters' && <input type="number" value={se.weight || ''} onChange={e => handleTrainingChange(index, 'weight', e.target.value)} className="input-field" placeholder="Peso (kg)" aria-label="Peso en kg"/>}
                </div>
            );
        default: return null;
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-slate-800 rounded-lg shadow-lg p-6 space-y-8">
      <style>{`
        .input-field {
          background-color: #1e293b; /* slate-800 */
          border: 1px solid #334155; /* slate-700 */
          color: white;
          padding: 0.5rem 0.75rem;
          border-radius: 0.375rem;
          width: 100%;
          transition: border-color 0.2s;
        }
        .input-field:focus {
          outline: none;
          border-color: #06b6d4; /* cyan-500 */
        }
      `}</style>
      
      <h2 className="text-3xl font-bold text-white text-center mb-6">{existingLogId ? 'Editar Registro Diario' : 'Añadir Registro Diario'}</h2>
      
      {/* Date and Body Weight */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-slate-300 mb-2">Fecha</label>
            <input type="date" id="date" value={date} onChange={e => setDate(e.target.value)} className="input-field" required/>
          </div>
          <div>
            <label htmlFor="bodyWeight" className="block text-sm font-medium text-slate-300 mb-2">Peso Corporal (kg)</label>
            <input type="number" id="bodyWeight" value={bodyWeight} onChange={e => setBodyWeight(e.target.value)} className="input-field" placeholder="Ej: 75.5"/>
          </div>
      </div>
      
      {/* Trainings Section */}
      <div className="space-y-4 p-4 border border-slate-700 rounded-lg">
        <h3 className="text-xl font-semibold text-white">Entrenamientos</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value as TrainingCategory)} className="input-field col-span-1" aria-label="Categoría de entrenamiento">
            {Object.keys(TRAINING_OPTIONS).map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
          <select value={selectedTrainingName} onChange={e => setSelectedTrainingName(e.target.value)} className="input-field col-span-1" aria-label="Nombre del entrenamiento">
            {TRAINING_OPTIONS[selectedCategory].map(name => <option key={name} value={name}>{name}</option>)}
          </select>
          <button type="button" onClick={handleAddTraining} className="flex justify-center items-center gap-2 py-2 px-4 bg-cyan-600 text-white font-semibold rounded-md hover:bg-cyan-500 transition-colors col-span-1">
            <PlusIcon className="w-5 h-5"/> Añadir
          </button>
        </div>
        <div className="space-y-3 pt-2">
          {trainings.map((training, index) => (
            <div key={training.id} className="bg-slate-700/50 p-3 rounded-md">
              <div className="flex justify-between items-start">
                  <div>
                      <p className="font-medium text-white">{training.name}</p>
                      <p className="text-xs text-cyan-400">{training.category}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {loadingItems.has(training.id) ? (
                        <SparklesIcon className="w-5 h-5 text-amber-400 animate-pulse"/>
                    ) : training.caloriesBurned != null ? (
                        <p className="text-sm font-medium text-amber-400">{training.caloriesBurned} kcal</p>
                    ) : null}
                    <button type="button" onClick={() => removeTraining(training.id)} className="p-1 text-slate-400 hover:text-red-400" aria-label={`Eliminar ${training.name}`}>
                      <TrashIcon className="w-5 h-5"/>
                    </button>
                  </div>
              </div>
              {renderTrainingInputs(training, index)}
            </div>
          ))}
        </div>
      </div>
      
      {/* Meals Section */}
      <div className="space-y-4 p-4 border border-slate-700 rounded-lg">
          <h3 className="text-xl font-semibold text-white">Comidas</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <input type="text" value={mealName} onChange={e => setMealName(e.target.value)} placeholder="Nombre de la comida" className="input-field col-span-1" aria-label="Nombre de la comida"/>
            <input type="text" value={mealDescription} onChange={e => setMealDescription(e.target.value)} placeholder="Descripción" className="input-field col-span-1" aria-label="Descripción de la comida"/>
            <button type="button" onClick={handleAddMeal} className="flex justify-center items-center gap-2 py-2 px-4 bg-cyan-600 text-white font-semibold rounded-md hover:bg-cyan-500 transition-colors col-span-1">
                <PlusIcon className="w-5 h-5"/> Añadir
            </button>
          </div>
          <div className="space-y-3 pt-2">
            {meals.map(meal => (
                <div key={meal.id} className="flex justify-between items-center bg-slate-700/50 p-3 rounded-md">
                    <div>
                        <p className="font-medium text-white">{meal.name}</p>
                        <p className="text-sm text-slate-400 whitespace-pre-wrap">{meal.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {loadingItems.has(meal.id) ? (
                            <SparklesIcon className="w-5 h-5 text-amber-400 animate-pulse"/>
                        ) : meal.calories != null ? (
                            <p className="text-sm font-medium text-amber-400">{meal.calories} kcal</p>
                        ) : null}
                        <button type="button" onClick={() => removeMeal(meal.id)} className="p-1 text-slate-400 hover:text-red-400" aria-label={`Eliminar ${meal.name}`}>
                          <TrashIcon className="w-5 h-5"/>
                        </button>
                    </div>
                </div>
            ))}
          </div>
      </div>
      
      {/* Action Buttons */}
      <div className="flex justify-end gap-4 pt-4">
        <button type="button" onClick={onCancel} className="py-2 px-6 bg-slate-600 text-white font-semibold rounded-md hover:bg-slate-500 transition-colors">Cancelar</button>
        <button type="submit" className="py-2 px-6 bg-cyan-600 text-white font-semibold rounded-md hover:bg-cyan-500 transition-colors shadow-md shadow-cyan-600/20">Guardar Registro</button>
      </div>
    </form>
  );
};

export default DailyLogForm;
