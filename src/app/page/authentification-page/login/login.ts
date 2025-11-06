import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize, timeout, catchError, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { LoginService } from '../services/login-service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css'],
})
export class Login {
  private readonly loginService = inject(LoginService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  // Champs
  username = '';
  password = '';

  // States UI
  loading = signal(false);
  errorMessage = signal<string>('');
  successMessage = signal<string>('');

  // Aides UI
  canSubmit = computed(() => {
    if (this.loading()) return false;
    const u = this.username?.trim() ?? '';
    const p = this.password?.trim() ?? '';
    return u.length >= 3 && u.length <= 128 && p.length >= 6 && p.length <= 256;
  });

  // Check si l'app est hors-ligne
  get isOffline(): boolean {
    return typeof navigator !== 'undefined' && navigator.onLine === false;
  }

  // Fonction de login
  login() {
    // Empêcher double-submit
    if (this.loading()) return;

    // Normaliser & re-valider
    const username = (this.username || '').trim();
    const password = (this.password || '').trim();

    if (!username || !password) {
      this.setError('Veuillez remplir tous les champs correctement.');
      return;
    }
    if (username.length < 3 || username.length > 128) {
      this.setError("Le nom d'utilisateur doit contenir plus de 3 caractères.");
      return;
    }
    if (password.length < 6 || password.length > 256) {
      this.setError('Le mot de passe doit contenir plus de 6 caractères.');
      return;
    }

    // Alerte hors-ligne
    if (this.isOffline) {
      this.setError('Vous êtes hors connexion. Veuillez vérifier votre réseau et réessayer.');
      return;
    }

    this.loading.set(true);
    this.clearMessages();

    // Securité
    this.loginService
      .login(username, password)
      .pipe(
        timeout({ first: 15000 }),
        catchError((err) => of(err)),
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (res) => {
          if (res instanceof HttpErrorResponse) {
            this.handleHttpError(res);
            return;
          }
          const isValid =
            !!res &&
            (typeof (res as any).token === 'string' ||
              typeof (res as any).user === 'object');

          if (!isValid) {
            this.setError(
              "Réponse serveur inattendue. Merci de réessayer ultérieurement."
            );
            return;
          }

          this.successMessage.set('Connexion réussie !');

          // Redirection vers l'accueil
          this.router.navigate(['/titlescreen']).catch(() => {
            this.setError(
              "Redirection échouée, réessayez plus tard."
            );
          });
        },
        // Gestion des erreurs
        error: (err) => {
          if (err instanceof HttpErrorResponse) {
            this.handleHttpError(err);
          } else {
            this.setError('Une erreur inconnue est survenue. Veuillez réessayer.');
            console.error('Erreur non HTTP :', err);
          }
        },
      });
  }

  private clearMessages() {
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  private setError(msg: string) {
    this.successMessage.set('');
    this.errorMessage.set(msg);
  }

  private handleHttpError(err: HttpErrorResponse) {
    if (err.status === 0) {
      this.setError(
        'Impossible de contacter le serveur. Vérifiez votre connexion réseau ou réessayez plus tard.'
      );
      console.error('Détail CORS :', err);
      return;
    }

    const serverMsg =
      (err.error && (err.error.message || err.error.error)) ||
      (typeof err.error === 'string' ? err.error : '');

    // Gestion des erreurs en fonction du status reçu
    switch (err.status) {
      case 400:
        this.setError(
          serverMsg ||
            'Requête invalide. Vérifiez vos identifiants et réessayez.'
        );
        break;

      case 401:
        this.setError(
          serverMsg || "Nom d'utilisateur ou mot de passe incorrect."
        );
        break;

      case 403:
        this.setError(
          serverMsg ||
            "Accès refusé. Votre compte n'a pas les droits nécessaires ou n'est pas encore activé."
        );
        break;

      case 409:
        this.setError(
          serverMsg || 'Conflit détecté. Réessayez dans quelques instants.'
        );
        break;

      case 423:
        this.setError(
          serverMsg ||
            'Compte temporairement verrouillé après trop de tentatives. Réessayez plus tard.'
        );
        break;

      case 429:
        this.setError(
          serverMsg ||
            'Trop de tentatives. Patientez quelques instants avant de réessayer.'
        );
        break;

      case 500:
        this.setError(
          serverMsg ||
            'Erreur interne du serveur. Réessayez plus tard.'
        );
        break;

      case 502:
        this.setError(
          serverMsg ||
            "Le service d'authentification est indisponible pour le moment."
        );
        break;

      case 503:
        this.setError(
          serverMsg ||
            'Service indisponible. Veuillez réessayer un peu plus tard.'
        );
        break;

      case 504:
        this.setError(
          serverMsg ||
            'Délai dépassé. Le serveur a mis trop de temps à répondre.'
        );
        break;

      default:
        this.setError(
          serverMsg ||
            `Une erreur est survenue (code ${err.status}). Veuillez réessayer.`
        );
        break;
    }

    console.error('Erreur HTTP détaillée :', {
      status: err.status,
      statusText: err.statusText,
      url: err.url,
      serverMsg,
      body: err.error,
    });
  }
}
