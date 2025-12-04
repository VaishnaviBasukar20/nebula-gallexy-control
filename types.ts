export interface SimulationParams {
  chaos: number; // 0.0 to 1.0
  scale: number; // 0.0 to 1.0
  active: boolean;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export enum SimulationState {
  STABLE = 'STABLE',
  UNSTABLE = 'UNSTABLE',
  COLLAPSING = 'COLLAPSING',
  SUPERNOVA = 'SUPERNOVA'
}