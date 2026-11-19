import { ttsToday } from '../../voice/src/gemini-tts.ts';
import { policy } from '../../shared/src/secrets.ts';
console.log(JSON.stringify({ today: ttsToday(), budget: policy().ttsDailyBudget }));
