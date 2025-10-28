import React, { useState } from 'react';
import type { DailyLog, Training, Meal, StrengthTraining, StrengthEnduranceTraining } from '../types';
import DumbbellIcon from './icons/DumbbellIcon';
import SparklesIcon from './icons/SparklesIcon';
import ChevronDownIcon from './icons/ChevronDownIcon';
import ScaleIcon from './icons/ScaleIcon';

interface DailyLogListProps {
  logs: DailyLog[];
}

const TrainingDetail: React.FC<{ training: Training }> = ({ training }) => {
  const renderDetails = () => {
    switch(training.category) {
      case 'Fuerza':
        const strength = training as StrengthTraining;
        const weightText = strength.weightType === 'kg' ? `@ ${strength.weight || 0}kg` : 'con Peso Corporal';
        return <p className="text-slate-300">{strength.sets}s x {strength.reps}r {weightText}</p>;
      case 'Lucha':
        return <p className="text-slate-300">{training.duration} min</p>;
      case 'Cardio':
        const cardio = training;
        let details = `${cardio.duration} min`;
        if (cardio.distance) details += ` / ${cardio.distance} km`;
        if (cardio.weight) details += ` / ${cardio.weight} kg`;
        return <p className="text-slate-300">{details}</p>;
      case 'Fuerza-Resistencia':
        const strengthEndurance = training as StrengthEnduranceTraining;
        let seDetails = `${strengthEndurance.sets}s x ${strengthEndurance.reps}r`;
        if (strengthEndurance.name === 'Thrusters' && strengthEndurance.weight) {
            seDetails += ` @ ${strengthEndurance.weight}kg`;
        }
        return <p className="text-slate-300">{seDetails}</p>;
    }
  }

  return (
    <div className="grid grid-cols-3 gap-2 items-center">
      <div className="col-span-2">
        <p className="font-medium text-white truncate">{training.name}</p>
        <p className="text-xs text-cyan-400">{training.category}</p>
      </div>
      <div className="text-right flex flex-col items-end">
        {renderDetails()}
        {training.caloriesBurned != null && (
            <div className="flex items-center gap-1 text-xs text-amber-400">
                <SparklesIcon className="w-3 h-3"/>
                <span>{training.caloriesBurned} kcal</span>
            </div>
        )}
      </div>
    </div>
  )
}

const DailyLogList: React.FC<DailyLogListProps> = ({ logs }) => {
  const [openLogId, setOpenLogId] = useState<string | null>(null);

  const handleToggle = (logId: string) => {
    setOpenLogId(prevId => (prevId === logId ? null : logId));
  };

  if (logs.length === 0) {
    return (
      <div className="text-center py-20">
        <DumbbellIcon className="w-24 h-24 mx-auto text-slate-600" />
        <h2 className="mt-6 text-2xl font-bold text-slate-400">Aún no hay registros</h2>
        <p className="mt-2 text-slate-500">
          ¡Haz clic en "Añadir Registro Diario" para empezar!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((log) => {
        const BMR = 1700;
        const totalCaloriesIn = log.meals.reduce((sum, meal) => sum + (meal.calories || 0), 0);
        const totalCaloriesOut = BMR + log.trainings.reduce((sum, training) => sum + (training.caloriesBurned || 0), 0);
        const isOpen = openLogId === log.id;

        return (
          <div key={log.id} className="bg-slate-800 rounded-lg shadow-lg overflow-hidden transition-all duration-300">
            <button
              onClick={() => handleToggle(log.id)}
              className="w-full text-left p-4 flex justify-between items-center hover:bg-slate-700/50 focus:outline-none focus:bg-slate-700/50"
              aria-expanded={isOpen}
              aria-controls={`log-content-${log.id}`}
            >
              <div className="flex-grow">
                <h3 className="text-lg font-bold text-white mb-1">{new Date(log.date + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long' })}</h3>
                <p className="text-sm text-cyan-400 font-semibold">{new Date(log.date + 'T00:00:00').toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
              <div className="flex items-center gap-4">
                 {log.bodyWeight != null && (
                    <div className="hidden sm:flex items-center gap-1 text-xs font-semibold text-slate-300">
                        <ScaleIcon className="w-4 h-4" />
                        <span>{log.bodyWeight} kg</span>
                    </div>
                )}
                <div className="hidden sm:flex items-center gap-2 text-xs">
                  <span className="font-semibold text-green-400">IN: {totalCaloriesIn} kcal</span>
                  <span className="font-semibold text-red-400">OUT: {totalCaloriesOut} kcal</span>
                </div>
                <ChevronDownIcon className={`w-6 h-6 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
              </div>
            </button>
            <div
              id={`log-content-${log.id}`}
              className={`transition-all duration-500 ease-in-out overflow-hidden ${isOpen ? 'max-h-[2000px]' : 'max-h-0'}`}
            >
              <div className="p-6 border-t border-slate-700 space-y-6">
                {log.trainings.length > 0 && (
                  <div>
                      <h4 className="text-lg font-semibold text-white mb-2 border-b border-slate-700 pb-1">Entrenamientos</h4>
                      <div className="space-y-3 pt-2">
                          {log.trainings.map((training) => <TrainingDetail key={training.id} training={training} />)}
                      </div>
                  </div>
                )}

                {log.meals.length > 0 && (
                  <div>
                      <h4 className="text-lg font-semibold text-white mb-2 border-b border-slate-700 pb-1">Comidas</h4>
                      <div className="space-y-3 pt-2 text-sm">
                          {log.meals.map((meal) => (
                              <div key={meal.id} className="flex justify-between items-start">
                                  <div>
                                      <p className="font-semibold text-slate-200">{meal.name}</p>
                                      <p className="text-slate-400 whitespace-pre-wrap">{meal.description}</p>
                                  </div>
                                  {meal.calories != null && (
                                      <div className="flex items-center gap-1 text-amber-400 font-medium whitespace-nowrap">
                                        <SparklesIcon className="w-4 h-4"/>
                                        <span>{meal.calories} kcal</span>
                                    </div>
                                  )}
                              </div>
                          ))}
                      </div>
                  </div>
                )}
                
                {log.trainings.length === 0 && log.meals.length === 0 && (
                  <p className="text-slate-400">No hay actividades registradas para este día.</p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DailyLogList;