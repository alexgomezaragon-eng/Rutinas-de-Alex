import React, { useState, useEffect } from 'react';
import DailyLogList from './components/WorkoutList';
import DailyLogForm from './components/WorkoutForm';
import StatsView from './components/StatsView';
import PlusIcon from './components/icons/PlusIcon';
import DumbbellIcon from './components/icons/DumbbellIcon';
import ChartBarIcon from './components/icons/ChartBarIcon';
import type { DailyLog, Meal, Training, StrengthTraining, CombatTraining, CardioTraining, StrengthEnduranceTraining } from './types';

type View = 'list' | 'form' | 'stats';

const App: React.FC = () => {
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>(() => {
    try {
      const savedLogs = localStorage.getItem('dailyLogs');
      return savedLogs ? JSON.parse(savedLogs) : [];
    } catch (error) {
      console.error("Could not load logs from localStorage", error);
      return [];
    }
  });
  const [currentView, setCurrentView] = useState<View>('list');

  useEffect(() => {
    try {
      localStorage.setItem('dailyLogs', JSON.stringify(dailyLogs));
    } catch (error) {
      console.error("Could not save logs to localStorage", error);
    }
  }, [dailyLogs]);

  const addDailyLog = (log: DailyLog) => {
    setDailyLogs(prevLogs => {
        const logExists = prevLogs.some(l => l.id === log.id);
        if (logExists) {
          return prevLogs.map(l => (l.id === log.id ? log : l));
        }
        return [...prevLogs, log];
    });
    setCurrentView('list');
  };

  const handleImport = (rawCsvContent: string) => {
    try {
      let csvContent = rawCsvContent;
      // Strip BOM (Byte Order Mark) if present, which some editors add.
      if (csvContent.startsWith('\uFEFF')) {
        csvContent = csvContent.substring(1);
      }

      const parseCsv = (csv: string): string[][] => {
        const rows: string[][] = [];
        if (!csv) return rows;
    
        let currentRow: string[] = [];
        let field = '';
        let inQuotes = false;
        // Normalize line endings and trim any leading/trailing whitespace including newlines
        const normalizedCsv = csv.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
    
        for (let i = 0; i < normalizedCsv.length; i++) {
            const char = normalizedCsv[i];
    
            if (inQuotes) {
                // We are inside a quoted field
                if (char === '"') {
                    // Check for an escaped quote ("")
                    if (i + 1 < normalizedCsv.length && normalizedCsv[i + 1] === '"') {
                        field += '"';
                        i++; // Skip the second quote of the pair
                    } else {
                        // This is the closing quote of the field
                        inQuotes = false;
                    }
                } else {
                    field += char;
                }
            } else {
                // We are NOT inside a quoted field
                switch (char) {
                    case '"':
                        // A quote here marks the beginning of a quoted field
                        // This should only happen at the beginning of a field
                        if (field === '') {
                            inQuotes = true;
                        } else {
                            // A quote inside an unquoted field is just a literal character
                            field += char;
                        }
                        break;
                    case ',':
                        // End of a field
                        currentRow.push(field);
                        field = '';
                        break;
                    case '\n':
                        // End of a row
                        currentRow.push(field);
                        rows.push(currentRow);
                        currentRow = [];
                        field = '';
                        break;
                    default:
                        field += char;
                }
            }
        }
    
        // Add the final field and row to the list
        currentRow.push(field);
        rows.push(currentRow);
    
        // Filter out any completely empty rows that might have been parsed
        return rows.filter(row => row.length > 1 || (row.length === 1 && row[0] !== ''));
      };

      const allRows = parseCsv(csvContent);

      if (allRows.length < 2) {
        alert("El archivo está vacío o no tiene formato CSV válido.");
        return;
      }

      const headers = allRows[0].map(h => h.toLowerCase().trim());
      const requiredHeaders = ['date', 'type', 'name'];
      if (!requiredHeaders.every(h => headers.includes(h))) {
        alert("El archivo CSV debe contener al menos las columnas 'date', 'type' y 'name'.");
        return;
      }
      const dataRows = allRows.slice(1);

      const logsToUpdate = new Map<string, DailyLog>();

      dataRows.forEach(row => {
        if (row.length < headers.length) return; // Skip malformed rows
        
        const rowData: { [key: string]: string } = {};
        headers.forEach((header, index) => {
          rowData[header] = row[index] || '';
        });
        
        const date = rowData.date;
        if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            console.warn("Skipping row with invalid date:", row);
            return;
        };

        let logForDate = logsToUpdate.get(date);
        
        if (!logForDate) {
          const existingLog = dailyLogs.find(log => log.date === date);
          if (existingLog) {
            logForDate = { ...existingLog, trainings: [...existingLog.trainings], meals: [...existingLog.meals] };
          } else {
            logForDate = { id: crypto.randomUUID(), date, trainings: [], meals: [] };
          }
          logsToUpdate.set(date, logForDate);
        }
        
        const type = rowData.type?.toLowerCase().trim();

        if (type === 'training') {
          const category = rowData.category as Training['category'];
          if (!category || !rowData.name) return;

          let newTraining: Training | null = null;
          const baseTraining = {
              id: crypto.randomUUID(),
              name: rowData.name,
              caloriesBurned: rowData.calories ? parseInt(rowData.calories, 10) : null
          };

          switch (category) {
            case 'Fuerza':
              newTraining = {
                ...baseTraining,
                category,
                sets: parseInt(rowData.sets, 10) || 0,
                reps: parseInt(rowData.reps, 10) || 0,
                weightType: (rowData.weight_type as StrengthTraining['weightType']) || 'bodyweight',
                weight: rowData.weight_kg ? parseFloat(rowData.weight_kg) : undefined,
              };
              break;
            case 'Lucha':
              newTraining = {
                ...baseTraining,
                category,
                duration: parseInt(rowData.duration_min, 10) || 0,
              };
              break;
            case 'Cardio':
              newTraining = {
                ...baseTraining,
                category,
                duration: parseInt(rowData.duration_min, 10) || 0,
                distance: rowData.distance_km ? parseFloat(rowData.distance_km) : undefined,
                weight: rowData.weight_kg ? parseFloat(rowData.weight_kg) : undefined,
              };
              break;
            case 'Fuerza-Resistencia':
              newTraining = {
                ...baseTraining,
                category,
                sets: parseInt(rowData.sets, 10) || 0,
                reps: parseInt(rowData.reps, 10) || 0,
                weight: rowData.weight_kg ? parseFloat(rowData.weight_kg) : undefined,
              };
              break;
          }
          if (newTraining) {
            logForDate.trainings.push(newTraining);
          }
        } else if (type === 'meal') {
          if (!rowData.name || !rowData.description) return;

          const newMeal: Meal = {
            id: crypto.randomUUID(),
            name: rowData.name,
            description: rowData.description,
            calories: rowData.calories ? parseInt(rowData.calories, 10) : null
          };
          logForDate.meals.push(newMeal);
        } else {
            console.warn(`Skipping row with unknown or missing type: '${type}'`, row);
        }
      });
      
      if(logsToUpdate.size > 0) {
          const existingLogsByDate = new Map(dailyLogs.map(log => [log.date, log]));
          for (const [date, updatedLog] of logsToUpdate.entries()) {
            existingLogsByDate.set(date, updatedLog);
          }
          setDailyLogs(Array.from(existingLogsByDate.values()));
      }
      
      alert('¡Importación completada!');

    } catch (error) {
      console.error('Error importing CSV:', error);
      alert('Hubo un error al importar el archivo. Revisa el formato y el contenido.');
    }
  };

  const renderContent = () => {
    switch (currentView) {
      case 'form':
        return <DailyLogForm onAddLog={addDailyLog} onCancel={() => setCurrentView('list')} logs={dailyLogs} />;
      case 'stats':
        return <StatsView logs={dailyLogs} onBack={() => setCurrentView('list')} onImport={handleImport} />;
      case 'list':
      default:
        return (
          <>
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
              <h1 className="text-3xl font-bold text-white flex items-center gap-3 text-center sm:text-left">
                <DumbbellIcon className="w-8 h-8 text-cyan-400"/>
                Rutinas de Alex
              </h1>
              <div className="flex flex-wrap justify-center gap-2">
                <button onClick={() => setCurrentView('stats')} className="p-2 bg-slate-700 text-white rounded-full hover:bg-slate-600 transition-colors" aria-label="Ver estadísticas">
                  <ChartBarIcon className="w-6 h-6"/>
                </button>
                <button onClick={() => setCurrentView('form')} className="flex items-center gap-2 py-2 px-4 bg-cyan-600 text-white font-semibold rounded-md hover:bg-cyan-500 transition-colors shadow-md shadow-cyan-600/20">
                  <PlusIcon className="w-5 h-5"/>
                  <span>Añadir Registro</span>
                </button>
              </div>
            </div>
            <DailyLogList logs={dailyLogs} />
          </>
        );
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-4xl">
      <main>
        {renderContent()}
      </main>
      <footer className="text-center mt-12 text-slate-500 text-sm">
        <p>Hecho con 💪 por Alex.</p>
      </footer>
    </div>
  );
};

export default App;