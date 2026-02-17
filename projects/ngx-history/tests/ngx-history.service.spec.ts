import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Location } from '@angular/common';
import { RouterTestingModule } from '@angular/router/testing';
import { Router, Routes } from '@angular/router';
import { Component } from '@angular/core';
import { NgxHistoryModule } from '../src/public-api';
import { HistoryService } from '../src/lib/history.service';

@Component({
  selector: 'test-about',
  template: `About`,
  standalone: false
})
export class AboutComponent {
}

@Component({
  selector: 'test-contact',
  template: `Contact`,
  standalone: false
})
export class ContactComponent {
}

@Component({
  selector: 'test-home',
  template: `Home`,
  standalone: false
})
export class HomeComponent {
}

@Component({
  selector: 'test-app',
  template: `<router-outlet></router-outlet>`,
  standalone: false
})
export class AppComponent {
  constructor(
    public history: HistoryService
  ) {}
}

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', component: HomeComponent },
  { path: 'about', component: AboutComponent },
  { path: 'contact', component: ContactComponent }
];

describe('NgxHistoryModule', () => {

  let location: Location;
  let router: Router;
  let history: HistoryService;
  let fixture;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        NgxHistoryModule,
        RouterTestingModule.withRoutes(routes)
      ],
      declarations: [
        HomeComponent,
        AboutComponent,
        ContactComponent,
        AppComponent
      ]
    });

    router = TestBed.inject(Router);
    location = TestBed.inject(Location);
    history = TestBed.inject(HistoryService);
    fixture = TestBed.createComponent(AppComponent);
    router.initialNavigation();
  });

  it('ngx-service should be created', () => {
    expect(history).toBeTruthy();
  });

  it('navigation log all url changes', fakeAsync(() => {
    router.navigate(['']);
    tick();
    router.navigate(['/about']);
    tick();
    router.navigate(['/contact']);
    tick();
    expect(history.paths).toEqual(['/home', '/about', '/contact']);
    expect(history.currentPath).toBe('/contact');
  }));

  it('goBack navigation works', fakeAsync(() => {
    router.navigate(['']);
    tick();
    router.navigate(['/about']);
    tick();
    router.navigate(['/contact']);
    tick();
    history.goBack();
    tick();
    expect(location.path()).toBe('/about');
    history.goBack();
    tick();
    expect(location.path()).toBe('/home');
    expect(location.path()).toEqual(history.currentPath);
  }));

  it('goForward navigation works', fakeAsync(() => {
    router.navigate(['']);
    tick();
    router.navigate(['/about']);
    tick();
    router.navigate(['/contact']);
    tick();
    history.goBack();
    tick();
    history.goBack();
    tick();
    expect(location.path()).toBe('/home');
    history.goForward();
    tick();
    expect(location.path()).toBe('/about');
    history.goForward();
    tick();
    expect(location.path()).toBe('/contact');
    expect(location.path()).toEqual(history.currentPath);
  }));

  it('can\'t goBack and goForward at first', fakeAsync(() => {
    expect(history.canGoBack).toBeFalse();
    expect(history.canGoForward).toBeFalse();
  }));

  it('canGoBack works', fakeAsync(() => {
    router.navigate(['']);
    tick();
    router.navigate(['/about']);
    tick();
    history.goBack();
    tick();
    expect(history.canGoBack).toBeFalse();
    expect(history.canGoForward).toBeTrue();
  }));

  it('canGoForward works', fakeAsync(() => {
    router.navigate(['']);
    tick();
    router.navigate(['/about']);
    tick();
    history.goBack();
    tick();
    history.goForward();
    tick();
    expect(history.canGoForward).toBeFalse();
    expect(history.canGoBack).toBeTrue();
  }));

  it('init & reset method works', fakeAsync(() => {
    history.init();
    router.navigate(['']);
    tick();
    router.navigate(['/about']);
    tick();
    router.navigate(['/contact']);
    tick();
    history.reset();
    tick();
    expect(location.path()).toBe('/home');
    expect(history.canGoBack).toBeFalse();
    expect(history.canGoForward).toBeFalse();
    history.init('/contact');
    tick();
    expect(location.path()).toBe('/contact');
    expect(history.canGoBack).toBeFalse();
    expect(history.canGoForward).toBeFalse();
  }));
});
