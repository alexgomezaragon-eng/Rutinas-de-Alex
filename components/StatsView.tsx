import React, { useRef } from 'react';
import type { DailyLog, Training, StrengthTraining, StrengthEnduranceTraining, CardioTraining, CombatTraining } from '../types';
import ChartBarIcon from './icons/ChartBarIcon';
import CloudArrowDownIcon from './icons/CloudArrowDownIcon';
import CloudArrowUpIcon from './icons/CloudArrowUpIcon';

interface StatsViewProps {
  logs: DailyLog[];
  onBack: () => void;
  onImport: (csvContent: string) => void;
}

const StatsView: React.FC<StatsViewProps> = ({ logs, onBack, onImport }) => {
  const importInputRef = useRef<HTMLInputElement>(null);
  const BMR = 1700;

  const totalMinutes = logs.reduce((total, log) => {
    return total + log.trainings.reduce((logTotal, training) => {
      if ('duration' in training) {
        return logTotal + training.duration;
      }
      return logTotal;
    }, 0);
  }, 0);

  const totalCaloriesIn = logs.reduce((total, log) => {
    return total + log.meals.reduce((logTotal, meal) => logTotal + (meal.calories || 0), 0);
  }, 0);

  const totalCaloriesOut = logs.reduce((total, log) => {
    return total + log.trainings.reduce((logTotal, training) => logTotal + (training.caloriesBurned || 0), 0);
  }, logs.length * BMR);
  
  const balance = totalCaloriesIn - totalCaloriesOut;

  const allTrainings = logs
    .flatMap(log => log.trainings.map(training => ({ ...training, date: log.date })))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const renderTrainingDetails = (training: Training) => {
    switch(training.category) {
      case 'Fuerza':
        const strength = training as StrengthTraining;
        const weightText = strength.weightType === 'kg' ? `@ ${strength.weight || 0}kg` : 'con Peso Corporal';
        return `${strength.sets}s x ${strength.reps}r ${weightText}`;
      case 'Lucha':
        return `${training.duration} min`;
      case 'Cardio':
        const cardio = training as CardioTraining;
        let details = `${cardio.duration} min`;
        if (cardio.distance) details += ` / ${cardio.distance} km`;
        if (cardio.weight) details += ` / ${cardio.weight} kg`;
        return details;
      case 'Fuerza-Resistencia':
        const strengthEndurance = training as StrengthEnduranceTraining;
        let seDetails = `${strengthEndurance.sets}s x ${strengthEndurance.reps}r`;
        if (strengthEndurance.name === 'Thrusters' && strengthEndurance.weight) {
            seDetails += ` @ ${strengthEndurance.weight}kg`;
        }
        return seDetails;
      default:
        return '';
    }
  };

  const escapeCsvCell = (cellData: any): string => {
    const stringVal = String(cellData ?? '');
    if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n')) {
      return `"${stringVal.replace(/"/g, '""')}"`;
    }
    return stringVal;
  };
  
  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.href) {
      URL.revokeObjectURL(link.href);
    }
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExport = () => {
    const headers = [
      'date', 'type', 'category', 'name', 'description', 'sets', 'reps',
      'weight_type', 'weight_kg', 'duration_min', 'distance_km', 'calories'
    ];
    
    const allRows = logs.flatMap(log => {
      const trainingRows = log.trainings.map(t => {
        const row: { [key: string]: any } = {
          date: log.date,
          type: 'training',
          category: t.category,
          name: t.name,
          description: '',
          calories: t.caloriesBurned ?? '',
        };
        switch(t.category) {
          case 'Fuerza':
            const strength = t as StrengthTraining;
            row.sets = strength.sets;
            row.reps = strength.reps;
            row.weight_type = strength.weightType;
            row.weight_kg = strength.weight ?? '';
            break;
          case 'Lucha':
            row.duration_min = (t as CombatTraining).duration;
            break;
          case 'Cardio':
            const cardio = t as CardioTraining;
            row.duration_min = cardio.duration;
            row.distance_km = cardio.distance ?? '';
            row.weight_kg = cardio.weight ?? '';
            break;
          case 'Fuerza-Resistencia':
            const strengthEndurance = t as StrengthEnduranceTraining;
            row.sets = strengthEndurance.sets;
            row.reps = strengthEndurance.reps;
            row.weight_kg = strengthEndurance.weight ?? '';
            break;
        }
        return headers.map(header => escapeCsvCell(row[header])).join(',');
      });

      const mealRows = log.meals.map(m => {
        const row = {
          date: log.date,
          type: 'meal',
          category: '',
          name: m.name,
          description: m.description,
          calories: m.calories ?? '',
          sets: '',
          reps: '',
          weight_type: '',
          weight_kg: '',
          duration_min: '',
          distance_km: '',
        };
        return headers.map(header => escapeCsvCell(row[header as keyof typeof row])).join(',');
      });

      return [...trainingRows, ...mealRows];
    });

    const csvContent = [headers.join(','), ...allRows].join('\n');
    downloadFile(csvContent, 'rutinas_alex_data.csv');
  };
  
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        if (content) {
          onImport(content);
        }
      };
      reader.readAsText(file);
      event.target.value = '';
    }
  };

  return (
    <div className="bg-slate-800 rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-white flex items-center gap-3">
          <ChartBarIcon className="w-8 h-8 text-cyan-400"/>
          Estadísticas Generales
        </h2>
        <button onClick={onBack} className="py-2 px-4 bg-slate-700 text-white rounded-md hover:bg-slate-600 transition-colors">Volver</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 text-center">
        <div className="bg-slate-700/50 p-4 rounded-lg">
          <p className="text-sm text-slate-400">Calorías Totales (Entrada)</p>
          <p className="text-2xl font-bold text-green-400">{totalCaloriesIn} kcal</p>
        </div>
        <div className="bg-slate-700/50 p-4 rounded-lg">
          <p className="text-sm text-slate-400">Calorías Totales (Salida)</p>
          <p className="text-2xl font-bold text-red-400">{totalCaloriesOut} kcal</p>
        </div>
        <div className="bg-slate-700/50 p-4 rounded-lg">
          <p className="text-sm text-slate-400">Balance Energético</p>
          <p className={`text-2xl font-bold ${balance > 0 ? 'text-green-400' : 'text-red-400'}`}>{balance > 0 ? '+' : ''}{balance} kcal</p>
        </div>
        <div className="md:col-span-3 bg-slate-700/50 p-4 rounded-lg">
          <p className="text-sm text-slate-400">Tiempo Total de Entrenamiento</p>
          <p className="text-2xl font-bold text-cyan-400">{Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m</p>
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-8 p-4 bg-slate-700/50 rounded-lg">
          <h3 className="text-lg font-semibold text-white">Gestión de Datos</h3>
          <div className="flex flex-wrap justify-center gap-4">
            <button onClick={() => importInputRef.current?.click()} className="flex items-center gap-2 py-2 px-4 bg-slate-600 text-cyan-300 rounded-md hover:bg-slate-500 text-sm font-semibold">
              <CloudArrowUpIcon className="w-5 h-5"/>
              Importar CSV
            </button>
            <input type="file" ref={importInputRef} onChange={handleFileSelect} accept=".csv" className="hidden" />
            
            <button onClick={handleExport} className="flex items-center gap-2 py-2 px-4 bg-cyan-700 text-white rounded-md hover:bg-cyan-600 text-sm font-semibold">
              <CloudArrowDownIcon className="w-5 h-5"/>
              Exportar Todo (CSV)
            </button>
          </div>
      </div>

      <div>
        <h3 className="text-xl font-semibold text-white mb-4 border-b border-slate-700 pb-2">Historial de Entrenamientos</h3>
        <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
          {allTrainings.length > 0 ? (
            allTrainings.map(training => (
              <div key={training.id} className="grid grid-cols-4 gap-4 items-center bg-slate-700/50 p-3 rounded-md">
                <div className="col-span-4 sm:col-span-1">
                  <p className="font-semibold text-white">{new Date(training.date + 'T00:00:00').toLocaleDateString('es-ES', { month: 'long', day: 'numeric' })}</p>
                </div>
                <div className="col-span-4 sm:col-span-3 grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <p className="font-medium text-slate-200">{training.name}</p>
                      <p className="text-xs text-cyan-400">{training.category}</p>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <p className="text-sm text-slate-300">{renderTrainingDetails(training)}</p>
                      {training.caloriesBurned != null && <p className="text-xs text-amber-400">{training.caloriesBurned} kcal</p>}
                    </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-slate-400 text-center py-4">No hay entrenamientos registrados.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatsView;