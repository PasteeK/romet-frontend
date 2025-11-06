import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject,
  PLATFORM_ID,
} from '@angular/core';
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
  styleUrl: './game.css',
})
export class Game implements AfterViewInit, OnDestroy {
  @ViewChild('gameContainer', { static: true }) gameContainer!: ElementRef;
  private platformId = inject(PLATFORM_ID);

  // Typage avec les types Phaser seulement (import type) ; l’instance réelle vient de l’import dynamique
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

    // ⬇️ Import dynamique robuste : gère les bundlers qui exposent Phaser sous `default`
    const phaserMod: any = await import('phaser');
    const PhaserNS = phaserMod.default ?? phaserMod;

    const GAME_WIDTH = 1280;
    const GAME_HEIGHT = 720;

    const config: Phaser.Types.Core.GameConfig = {
      type: PhaserNS.AUTO,
      backgroundColor: '#1d1d1d',
      // On met l’élément parent dans la config de scale pour garder ton setup
      scale: {
        mode: PhaserNS.Scale.FIT,
        autoCenter: PhaserNS.Scale.CENTER_BOTH,
        width: GAME_WIDTH,
        height: GAME_HEIGHT,
        parent: this.gameContainer.nativeElement,
      },
      dom: { createContainer: true },
      fps: { target: 60, forceSetTimeOut: true },
      scene: [], // on ajoute les scènes juste après
    };

    this.phaserGame = new PhaserNS.Game(config);

    // Ajout manuel des scènes (false = non actives à la création)
    this.phaserGame.scene.add('MapScene', MapScene, false);
    this.phaserGame.scene.add('MainScene', MainScene, false);
    this.phaserGame.scene.add('SmokingScene', SmokingScene, false);
    this.phaserGame.scene.add('TutorialScene', TutorialScene, false);

    // Registry: expose le service aux scènes
    this.phaserGame.registry.set('saveSvc', this.saveSvc);

    // Expo globale + signal "prêt"
    (window as any).phaserGame = this.phaserGame;
    (window as any).phaserReady = true;
    document.dispatchEvent(new Event('phaser-ready'));
  }

  ngOnDestroy(): void {
    // Si tu préfères détruire le jeu quand on quitte le composant :
    // this.phaserGame?.destroy(true);
    // delete (window as any).phaserGame;
    // delete (window as any).phaserReady;
  }
}