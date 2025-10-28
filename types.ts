export interface BaseTraining {
  id: string;
  category: 'Fuerza' | 'Lucha' | 'Cardio' | 'Fuerza-Resistencia';
  name: string;
  caloriesBurned: number | null;
}

export interface StrengthTraining extends BaseTraining {
  category: 'Fuerza';
  sets: number;
  reps: number;
  weightType: 'bodyweight' | 'kg';
  weight?: number;
}

export interface CombatTraining extends BaseTraining {
  category: 'Lucha';
  duration: number; // in minutes
}

export interface CardioTraining extends BaseTraining {
  category: 'Cardio';
  duration: number; // in minutes
  distance?: number; // in km
  weight?: number; // in kg for Rucking
}

export interface StrengthEnduranceTraining extends BaseTraining {
  category: 'Fuerza-Resistencia';
  sets: number;
  reps: number;
  weight?: number; // in kg for Thrusters
}


export type Training = StrengthTraining | CombatTraining | CardioTraining | StrengthEnduranceTraining;

export interface Meal {
  id: string;
  name: string;
  description: string;
  calories: number | null;
}

export interface DailyLog {
  id: string;
  date: string;
  bodyWeight?: number | null;
  trainings: Training[];
  meals: Meal[];
}