import { MonsterActionType, MonsterAction } from "../Monster";

export type SoundRef =
  | string
  | { key: string; volume?: number; rate?: number; detune?: number };

export type SoundSet = SoundRef | SoundRef[];

export interface MonsterSounds {
  // Joué à l'apparition du monstre
  spawn?: SoundSet;
  // Joué quand le monstre exécute une action
  action?: Partial<Record<MonsterActionType, SoundSet>>;
  // Joué quand le monstre prend un dégât
  hit?: SoundSet;
  // Joué quand le monstre meurt
  death?: SoundSet;
}

export interface BaseMonsterConfig {
  name: string;
  texture: string;
  maxHP: number;
  actions: MonsterAction[];
  goldReward: { min: number; max: number } | number;
  actionsPerTurn?: number;
  sounds?: MonsterSounds;
}