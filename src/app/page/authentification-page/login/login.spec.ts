import { TestBed, ComponentFixture } from '@angular/core/testing';
import { of, throwError, NEVER } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Login } from './login';

class MockLoginService {
  login = jasmine.createSpy('login');
}
const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

describe('Login Component', () => {
  let fixture: ComponentFixture<Login>;
  let component: Login;
  let loginService: MockLoginService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: MockLoginService, useClass: MockLoginService },
      ],
    })
      .overrideComponent(Login, {
        set: {
          providers: [{ provide: MockLoginService, useClass: MockLoginService }],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    loginService = TestBed.inject(MockLoginService);
    routerSpy.navigate.calls.reset();
    fixture.detectChanges();
  });

  function setCreds(u: string, p: string) {
    component.username = u;
    component.password = p;
    fixture.detectChanges();
  }

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  // Submit et validations
  it('canSubmit should be false when fields are empty', () => {
    setCreds('', '');
    expect(component.canSubmit()).toBeFalse();
  });

  it('canSubmit should be true when credentials are valid', () => {
    setCreds('validUser', 'validPassword');
    expect(component.canSubmit()).toBeTrue();
  });

  it('should show an error if username is too short', () => {
    setCreds('ab', 'password123');
    component.login();
    expect(component.errorMessage().toLowerCase()).toContain('username');
    expect(component.loading()).toBeFalse();
  });

  it('should show an error if password is too short', () => {
    setCreds('validUser', '123');
    component.login();
    expect(component.errorMessage().toLowerCase()).toContain('password');
    expect(component.loading()).toBeFalse();
  });

  it('should ignore a second submit while loading', () => {
    setCreds('validUser', 'validPassword');
    loginService.login.and.returnValue(NEVER);
    component.login();
    component.login();
    expect(loginService.login).toHaveBeenCalledTimes(1);
    expect(component.loading()).toBeTrue();
  });

  // Hors ligne
  it('should display an error if the browser is offline', () => {
    setCreds('validUser', 'validPassword');
    spyOnProperty(window.navigator, 'onLine', 'get').and.returnValue(false);

    component.login();
    expect(component.errorMessage().toLowerCase()).toContain('offline');
    expect(loginService.login).not.toHaveBeenCalled();
  });

  // Succès
  it('should navigate and show success message on login success', async () => {
    setCreds('validUser', 'validPassword');
    loginService.login.and.returnValue(of({ token: 'abc123' }));
    routerSpy.navigate.and.returnValue(Promise.resolve(true));

    component.login();

    expect(loginService.login).toHaveBeenCalledWith('validUser', 'validPassword');
    expect(component.successMessage()).toContain('success');
    expect(component.errorMessage()).toBe('');
    expect(component.loading()).toBeFalse();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/titlescreen']);
  });

  it('should handle unexpected server response (no token/user)', () => {
    setCreds('validUser', 'validPassword');
    loginService.login.and.returnValue(of({ foo: 'bar' }));

    component.login();

    expect(component.errorMessage().toLowerCase()).toContain('unexpected');
    expect(component.successMessage()).toBe('');
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });

  // Mapping des erreurs HTTP
  type Case = { status: number; serverMsg?: string; expectedFragment: string };
  const cases: Case[] = [
    { status: 0, expectedFragment: 'unable to reach the server' },
    { status: 400, expectedFragment: 'invalid request' },
    { status: 401, expectedFragment: 'incorrect' },
    { status: 403, expectedFragment: 'access denied' },
    { status: 409, expectedFragment: 'conflict' },
    { status: 423, expectedFragment: 'locked' },
    { status: 429, expectedFragment: 'too many attempts' },
    { status: 500, expectedFragment: 'internal server' },
    { status: 502, expectedFragment: 'gateway' },
    { status: 503, expectedFragment: 'unavailable' },
    { status: 504, expectedFragment: 'timeout' },
  ];

  for (const c of cases) {
    it(`should map HTTP ${c.status} to a readable message`, () => {
      setCreds('validUser', 'validPassword');
      const httpErr = new HttpErrorResponse({
        status: c.status,
        statusText: 'X',
        url: '/api/login',
        error: c.serverMsg ? { message: c.serverMsg } : 'ERR',
      });
      loginService.login.and.returnValue(throwError(() => httpErr));

      component.login();

      if (c.serverMsg) {
        expect(component.errorMessage()).toContain(c.serverMsg);
      } else {
        expect(component.errorMessage().toLowerCase()).toContain(
          c.expectedFragment.toLowerCase()
        );
      }

      expect(component.successMessage()).toBe('');
      expect(component.loading()).toBeFalse();
      expect(routerSpy.navigate).not.toHaveBeenCalled();
    });
  }

  it('should show the exact server message if provided', () => {
    setCreds('validUser', 'validPassword');
    const serverMsg = 'Your account is not yet activated.';
    const httpErr = new HttpErrorResponse({
      status: 403,
      error: { message: serverMsg },
      url: '/api/login',
      statusText: 'Forbidden',
    });
    loginService.login.and.returnValue(throwError(() => httpErr));

    component.login();
    expect(component.errorMessage()).toBe(serverMsg);
  });

  // Mise à jour de successMessage
  it('should clear successMessage when an error occurs', () => {
    setCreds('validUser', 'validPassword');
    component.successMessage.set('OK!');
    const httpErr = new HttpErrorResponse({ status: 401, error: 'x' });
    loginService.login.and.returnValue(throwError(() => httpErr));

    component.login();

    expect(component.successMessage()).toBe('');
    expect(component.errorMessage().toLowerCase()).toContain('incorrect');
  });

  it('should reset loading state after any request', () => {
    setCreds('validUser', 'validPassword');
    const httpErr = new HttpErrorResponse({ status: 500, error: 'x' });
    loginService.login.and.returnValue(throwError(() => httpErr));

    component.login();
    expect(component.loading()).toBeFalse();

    loginService.login.and.returnValue(of({ token: 't' }));
    component.login();
    expect(component.loading()).toBeFalse();
  });
});
