import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type * as Phaser from 'phaser';

import { MainScene } from './scenes/main.scene';
import { MapScene } from './scenes/map.scene';
import { SavegameService } from '../services/savegame.service';
import { SmokingScene } from './scenes/smoking.scene';
import { TutorialScene } from './scenes/tutorial.scene';

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [],
  templateUrl: './game.html',
  styleUrl: './game.css'
})
export class Game implements AfterViewInit, OnDestroy {
  @ViewChild('gameContainer', { static: true }) gameContainer!: ElementRef;
  private platformId = inject(PLATFORM_ID);
  phaserGame!: Phaser.Game;

  constructor(private saveSvc: SavegameService) {}

  async ngAfterViewInit(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    // Si un jeu existe déjà (navigation retour), réutilise-le
    if ((window as any).phaserGame) {
      this.phaserGame = (window as any).phaserGame as Phaser.Game;
      document.dispatchEvent(new Event('phaser-ready'));
      return;
    }

    // ⬇️ Import dynamique: Phaser part dans un chunk séparé
    const PhaserNS = await import('phaser');

    const GAME_WIDTH = 1280;
    const GAME_HEIGHT = 720;

    const config: Phaser.Types.Core.GameConfig = {
      type: PhaserNS.AUTO,
      backgroundColor: '#1d1d1d',
      scale: {
        mode: PhaserNS.Scale.FIT,
        autoCenter: PhaserNS.Scale.CENTER_BOTH,
        width: GAME_WIDTH,
        height: GAME_HEIGHT,
        parent: this.gameContainer.nativeElement
      },
      dom: { createContainer: true },
      fps: { target: 60, forceSetTimeOut: true },
      scene: [] // on ajoute manuellement dessous
    };

    this.phaserGame = new PhaserNS.Game(config);

    // Ajout manuel des scènes, actives = false
    this.phaserGame.scene.add('MapScene', MapScene, false);
    this.phaserGame.scene.add('MainScene', MainScene, false);
    this.phaserGame.scene.add('SmokingScene', SmokingScene, false);
    this.phaserGame.scene.add('TutorialScene', TutorialScene, false);

    // Registry: service dispo dans les scènes
    this.phaserGame.registry.set('saveSvc', this.saveSvc);

    // Expo globale + signal prêt
    (window as any).phaserGame = this.phaserGame;
    (window as any).phaserReady = true;
    document.dispatchEvent(new Event('phaser-ready'));
  }

  ngOnDestroy(): void {
    // Tu peux choisir de garder le jeu vivant pour des retours plus rapides :
    // this.phaserGame?.destroy(true);
    // delete (window as any).phaserGame;
    // delete (window as any).phaserReady;
  }
}
