# NgxHistory

<a href="https://circleci.com/gh/lumentut/ngx-history/tree/master">
  <img src="https://img.shields.io/circleci/build/github/lumentut/ngx-history.svg?logo=circleci&logoColor=fff&label=CircleCI" alt="CI status" />
</a>&nbsp;
<a href="https://www.npmjs.com/package/ngx-history">
  <img src="https://img.shields.io/npm/v/ngx-history.svg?logo=npm&logoColor=fff&label=NPM+package&color=limegreen" alt="ngx-history on npm" />
</a>&nbsp;
<a href="https://github.com/lumentut/ngx-history/blob/master/LICENSE">
  <img src="https://img.shields.io/npm/l/ngx-history.svg?color=blue" alt="MIT License" />
</a>&nbsp;
<a href="https://lumentut.github.io/ngx-history/">
  <img src="https://img.shields.io/badge/demo-online-brightgreen.svg" alt="Demo" />
</a>

> **Modern Angular navigation history service with reactive programming support**

`NgxHistory` is a lightweight Angular service that provides browser-like navigation history functionality with full TypeScript support and reactive programming patterns. Build intuitive navigation experiences in your Angular applications with observables, state tracking, and seamless router integration.

✨ **Features:**

- 🎯 **Angular 21+ Support** - Built with the latest Angular features
- 🔄 **Reactive Programming** - Observable streams with RxJS integration
- 📊 **State Tracking** - Real-time navigation state with `NavigationState` interface
- 🚀 **Zero Configuration** - Works out of the box with `providedIn: 'root'`
- 📱 **TypeScript First** - Complete type safety and IntelliSense support
- ⚡ **Tree Shakeable** - Minimal bundle size impact
- 🔙 **Browser-like Navigation** - Familiar back/forward functionality
- 🧪 **Well Tested** - Comprehensive test coverage
- 🎛️ **Flexible Setup** - NgModule, Standalone, or direct injection
- 🔥 **New APIs** - Signals, observables, and async/await patterns

## 🚀 Quick Start

### Installation

```bash
npm install ngx-history
# or
yarn add ngx-history
# or
pnpm install ngx-history
```

### Basic Usage

```typescript
import { Component } from "@angular/core";
import { HistoryService } from "ngx-history";

@Component({
  selector: "app-navigation",
  template: `
    <div class="nav-controls">
      <button [disabled]="!navigationState.canGoBack" (click)="historyService.goBack()">← Back</button>

      <button [disabled]="!navigationState.canGoForward" (click)="historyService.goForward()">Forward →</button>

      <span class="current-path">
        {{ navigationState.currentPath }}
      </span>
    </div>
  `,
})
export class NavigationComponent {
  navigationState = this.historyService.navigationState();

  constructor(public historyService: HistoryService) {}
}
```

## 📚 Usage Examples

### 1. Traditional NgModule Approach

```typescript
// app.module.ts
import { NgModule } from "@angular/core";
import { NgxHistoryModule } from "ngx-history";

@NgModule({
  imports: [
    // Basic usage - no configuration needed
    NgxHistoryModule,

    // Or with custom configuration
    NgxHistoryModule.forRoot({
      maxHistoryLength: 100,
      debugMode: true,
      defaultRoute: "/dashboard",
    }),
  ],
})
export class AppModule {}
```

### 2. Standalone/Modern Angular Approach

```typescript
// main.ts
import { bootstrapApplication } from "@angular/platform-browser";
import { HISTORY_CONFIG } from "ngx-history";

bootstrapApplication(AppComponent, {
  providers: [
    // Optional configuration
    {
      provide: HISTORY_CONFIG,
      useValue: {
        maxHistoryLength: 50,
        debugMode: false,
      },
    },
    // HistoryService auto-provided via 'root'
  ],
});
```

### 3. Component with Subscriptions

```typescript
import { Component, OnInit, OnDestroy } from "@angular/core";
import { HistoryService, NavigationError } from "ngx-history";
import { Subscription } from "rxjs";

@Component({
  selector: "app-smart-nav",
  template: `
    <div class="navigation">
      <!-- Navigation controls -->
      <button [disabled]="!canGoBack" (click)="goBack()">← Back</button>

      <button [disabled]="!canGoForward" (click)="goForward()">Forward →</button>

      <!-- Error display -->
      <div *ngFor="let error of errors" class="error">
        {{ error.message }}
      </div>
    </div>
  `,
})
export class SmartNavigationComponent implements OnInit, OnDestroy {
  canGoBack = false;
  canGoForward = false;
  errors: NavigationError[] = [];

  private subscription = new Subscription();

  constructor(private historyService: HistoryService) {}

  ngOnInit() {
    // Subscribe to navigation state
    this.subscription.add(
      this.historyService.navigationState$.subscribe((state) => {
        this.canGoBack = state.canGoBack;
        this.canGoForward = state.canGoForward;
      }),
    );

    // Subscribe to navigation errors
    this.subscription.add(
      this.historyService.navigationError$.subscribe((error) => {
        this.errors = [...this.errors, error].slice(-3); // Keep last 3
      }),
    );
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  async goBack() {
    await this.historyService.goBack();
  }

  async goForward() {
    await this.historyService.goForward();
  }
}
```

### Reactive Programming Example

```typescript
import { Component, OnInit } from "@angular/core";
import { HistoryService, NavigationState } from "ngx-history";
import { Observable } from "rxjs";

@Component({
  selector: "app-smart-navigation",
  template: `
    <div *ngIf="navigationState$ | async as state">
      <div class="history-info">
        <p>Current: {{ state.currentPath }}</p>
        <p>History Length: {{ state.historyLength }}</p>
        <p>Can Go Back: {{ state.canGoBack }}</p>
        <p>Can Go Forward: {{ state.canGoForward }}</p>
      </div>

      <div class="navigation-controls">
        <button [disabled]="!state.canGoBack" (click)="historyService.goBack()" class="nav-btn">← Previous</button>

        <button [disabled]="!state.canGoForward" (click)="historyService.goForward()" class="nav-btn">Next →</button>
      </div>
    </div>
  `,
})
export class SmartNavigationComponent implements OnInit {
  navigationState$!: Observable<NavigationState>;

  constructor(private historyService: HistoryService) {}

  ngOnInit(): void {
    // Subscribe to navigation state changes
    this.navigationState$ = this.historyService.navigationState$;

    // React to state changes
    this.navigationState$.subscribe((state) => {
      console.log("Navigation state changed:", state);
      // Implement custom logic based on navigation state
    });
  }
}
```

## 📖 API Documentation

### HistoryService

The main service providing navigation history functionality.

#### Properties

| Property           | Type                          | Description                                   |
| ------------------ | ----------------------------- | --------------------------------------------- |
| `navigationState$` | `Observable<NavigationState>` | Observable stream of navigation state changes |

#### Methods

| Method              | Return Type               | Description                                                      |
| ------------------- | ------------------------- | ---------------------------------------------------------------- |
| `navigationState()` | `Signal<NavigationState>` | Angular signal for current navigation state                      |
| `goBack()`          | `boolean`                 | Navigate to previous page. Returns `true` if navigation occurred |
| `goForward()`       | `boolean`                 | Navigate to next page. Returns `true` if navigation occurred     |
| `canGoBack()`       | `boolean`                 | Check if backward navigation is possible                         |
| `canGoForward()`    | `boolean`                 | Check if forward navigation is possible                          |

### NavigationState Interface

Complete navigation state information.

```typescript
interface NavigationState {
  canGoBack: boolean; // Whether backward navigation is possible
  canGoForward: boolean; // Whether forward navigation is possible
  currentPath: string; // Current route path
  historyLength: number; // Number of entries in history
}
```

## 🎮 Demo Application

Explore a comprehensive demo showcasing NgxHistory features:

**[🚀 Live Demo](https://lumentut.github.io/ngx-history/)**

The demo includes:

- Real-time navigation state visualization
- Interactive back/forward controls
- Multiple page navigation examples
- Reactive programming patterns
- TypeScript usage examples

## 🔄 Migration Guide

### From v1.x to v2.0

NgxHistory v2.0 introduces breaking changes for Angular 21+ support:

#### Before (v1.x)

```typescript
// Old module import required
import { NgxHistoryModule } from "ngx-history";

@NgModule({
  imports: [NgxHistoryModule],
})
export class AppModule {}

// Old API
const canGoBack = this.historyService.canGoBack;
const canGoForward = this.historyService.canGoForward;
```

#### After (v2.0)

```typescript
// No module import needed - service uses providedIn: 'root'
import { HistoryService } from "ngx-history";

// New reactive API
const navigationState = this.historyService.navigationState();
const canGoBack = navigationState.canGoBack;
const canGoForward = navigationState.canGoForward;

// Or use observables
this.historyService.navigationState$.subscribe((state) => {
  console.log("State:", state);
});
```

#### Breaking Changes

- **Angular 15+ Required** - Minimum Angular version increased
- **API Changes** - New reactive API with signals and observables
- **Module Removal** - No need to import `NgxHistoryModule`
- **TypeScript Updates** - Enhanced type definitions

#### Migration Steps

1. Update to Angular 15+
2. Remove `NgxHistoryModule` imports
3. Update service usage to new API
4. Test navigation functionality

## 🛠️ Development

### Requirements

- Node.js 20.11+
- Angular 21+
- TypeScript 5.9+

### Setup

```bash
git clone https://github.com/lumentut/ngx-history.git
cd ngx-history
npm install

# Build library
npm run build

# Run tests
npm test

# Build demo
ng build ngx-history-demo
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📋 Requirements

- **Angular**: 21.0.0 or higher
- **RxJS**: 7.0.0 or higher
- **TypeScript**: 5.0.0 or higher

## 📄 License

This project is licensed under the [MIT License](LICENSE) - see the LICENSE file for details.

## 🏷️ Version History

- **v2.0.0** - Angular 21+ support, reactive programming, TypeScript modernization
- **v1.x** - Legacy Angular 11-14 support (maintenance mode)

---

**Made with ❤️ by [Yohanes Lumentut](https://github.com/lumentut)**
