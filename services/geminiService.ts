import { GoogleGenAI, Type } from "@google/genai";
import type { Meal, Training, StrengthTraining, StrengthEnduranceTraining } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

const calorieSchema = {
  type: Type.OBJECT,
  properties: {
    calories: { type: Type.NUMBER },
  },
  required: ['calories']
};

export const getMealCalories = async (meal: Omit<Meal, 'id' | 'calories'>): Promise<number | null> => {
  try {
    const prompt = `Estimate the calories for the following meal. Provide only the total calorie count as a number.\nMeal: ${meal.name}\nDescription: ${meal.description}`;
    
    const response = await ai.models.generateContent({
       model: "gemini-2.5-flash",
       contents: prompt,
       config: {
         responseMimeType: "application/json",
         responseSchema: calorieSchema,
       },
    });

    const jsonText = response.text.trim();
    if (jsonText) {
        const result = JSON.parse(jsonText);
        return result.calories ? Math.round(result.calories) : null;
    }
    return null;

  } catch (error) {
    console.error("Error fetching meal calories:", error);
    return null;
  }
};

const trainingCalorieSchema = {
  type: Type.OBJECT,
  properties: {
    caloriesBurned: { type: Type.NUMBER },
  },
  required: ['caloriesBurned']
};

const getTrainingDescription = (training: Training): string => {
    let details = '';
    switch(training.category) {
        case 'Fuerza':
            const strength = training as StrengthTraining;
            const weightDesc = strength.weightType === 'kg' ? `at ${strength.weight || 0}kg` : 'using bodyweight';
            details = `${strength.sets} sets of ${strength.reps} reps ${weightDesc}`;
            break;
        case 'Lucha':
            details = `for ${training.duration} minutes`;
            break;
        case 'Cardio':
            const cardio = training;
            details = `for ${cardio.duration} minutes`;
            if (cardio.distance) details += ` covering ${cardio.distance}km`;
            if (cardio.weight) details += ` with a ${cardio.weight}kg pack`;
            break;
        case 'Fuerza-Resistencia':
            const strengthEndurance = training as StrengthEnduranceTraining;
            details = `${strengthEndurance.sets} sets of ${strengthEndurance.reps} reps`;
            if (strengthEndurance.name === 'Thrusters' && strengthEndurance.weight) {
                details += ` with ${strengthEndurance.weight}kg`;
            }
            break;
    }
    return `Exercise: ${training.name} (${training.category}). Details: ${details}`;
}


export const getTrainingCalories = async (training: Training): Promise<number | null> => {
  try {
    const description = getTrainingDescription(training);
    const prompt = `Estimate the calories burned for the following workout session for an average adult. Provide only the total calorie count as a number.\n${description}`;
    
     const response = await ai.models.generateContent({
       model: "gemini-2.5-flash",
       contents: prompt,
       config: {
         responseMimeType: "application/json",
         responseSchema: trainingCalorieSchema,
       },
    });

    const jsonText = response.text.trim();
    if (jsonText) {
        const result = JSON.parse(jsonText);
        return result.caloriesBurned ? Math.round(result.caloriesBurned) : null;
    }
    return null;

  } catch (error) {
    console.error("Error fetching training calories:", error);
    return null;
  }
};