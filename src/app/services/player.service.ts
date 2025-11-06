// src/app/services/player.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface Preferences {
  showTutorial: boolean;
  tutorialVersionSeen: number;
  lastTutorialCompletedAt: string | null;
}

export interface MeDTO {
  pseudo: string;
  email: string;
  gamesPlayed: number;
  preferences: Preferences;
}

@Injectable({ providedIn: 'root' })
export class PlayerService {
  private base = environment.API_BASE_URL;

  constructor(private http: HttpClient) {}

  getMe() {
    return this.http.get<MeDTO>(`${this.base}/players/me`);
  }

  getTutorial() {
    return this.http.get<{ preferences: Preferences }>(`${this.base}/players/me/tutorial`);
  }

  setTutorial(action: 'enable' | 'disable', tutorialVersion = 1) {
    return this.http.post<{ preferences: Preferences }>(
      `${this.base}/players/me/tutorial`,
      { action, tutorialVersion }
    );
  }

  setShowTutorial(show: boolean) {
    return this.setTutorial(show ? 'enable' : 'disable');
  }
}
