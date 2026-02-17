import { Injectable, Inject, OnDestroy, Optional } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Location } from '@angular/common';
import {
  BehaviorSubject,
  Observable,
  Subject,
  Subscription,
  filter,
  fromEvent,
} from 'rxjs';

/**
 * Configuration options for HistoryService
 */
export interface HistoryConfig {
  /** Maximum number of history entries to maintain */
  maxHistoryLength: number;
  /** Enable debug logging */
  debugMode: boolean;
  /** Auto-initialize service with current route */
  autoInitialize: boolean;
  /** Default route to navigate to on initialization */
  defaultRoute: string;
}

/**
 * Default configuration for HistoryService
 */
export const DEFAULT_HISTORY_CONFIG: HistoryConfig = {
  maxHistoryLength: 50,
  debugMode: false,
  autoInitialize: true,
  defaultRoute: '/',
};

/**
 * Injection token for HistoryService configuration
 */
export const HISTORY_CONFIG = 'HISTORY_CONFIG';

/**
 * Represents different types of navigation errors
 */
export type NavigationErrorType =
  | 'NAVIGATION_FAILED'
  | 'INVALID_INDEX'
  | 'INITIALIZATION_FAILED'
  | 'CONCURRENT_NAVIGATION';

/**
 * Represents a navigation error
 */
export interface NavigationError {
  readonly type: NavigationErrorType;
  readonly message: string;
  readonly timestamp: Date;
  readonly originalError?: unknown;
}

/**
 * Represents the navigation state of the history service
 */
export interface NavigationState {
  /** Array of navigation paths in chronological order */
  readonly paths: readonly string[];
  /** Current position in the history stack */
  readonly currentIndex: number;
  /** Whether the user can navigate backwards */
  readonly canGoBack: boolean;
  /** Whether the user can navigate forwards */
  readonly canGoForward: boolean;
  /** The current active path */
  readonly currentPath: string;
  /** Total number of entries in history */
  readonly historyLength: number;
  /** Whether the service is currently navigating */
  readonly isNavigating: boolean;
}

/**
 * Service for managing browser-like navigation history in Angular applications.
 * Provides back/forward functionality similar to browser navigation with enhanced
 * error handling, memory management, and testability.
 *
 * @example
 * ```typescript
 * constructor(private historyService: HistoryService) {
 *   // Subscribe to navigation state changes
 *   this.historyService.navigationState$.subscribe(state => {
 *     console.log('Can go back:', state.canGoBack);
 *     console.log('Can go forward:', state.canGoForward);
 *   });
 *
 *   // Subscribe to navigation errors
 *   this.historyService.navigationError$.subscribe(error => {
 *     console.error('Navigation error:', error.message);
 *   });
 * }
 *
 * // Navigate back
 * this.historyService.goBack();
 *
 * // Navigate forward
 * this.historyService.goForward();
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class HistoryService implements OnDestroy {
  private readonly config: HistoryConfig;
  private readonly subscriptions = new Subscription();
  private readonly destroySubject = new Subject<void>();

  // Navigation state management
  private navigationPromise: Promise<boolean> | null = null;
  private isInternalNavigation = false;
  private previousPath: string | undefined;
  private isInitialized = false;

  // Internal state
  private readonly _paths: string[] = [];
  private _currentIndex = 0;
  private _isNavigating = false;

  // Public observables
  private readonly _navigationState$: BehaviorSubject<NavigationState>;

  private readonly _navigationError$ = new Subject<NavigationError>();

  /**
   * Observable stream of navigation state changes
   */
  public readonly navigationState$: Observable<NavigationState>;

  /**
   * Observable stream of navigation errors
   */
  public readonly navigationError$: Observable<NavigationError> =
    this._navigationError$.asObservable();

  // Public properties for backward compatibility
  public get paths(): readonly string[] {
    return [...this._paths]; // Return immutable copy
  }

  public get canGoBack(): boolean {
    return this._currentIndex > 0;
  }

  public get canGoForward(): boolean {
    return this._currentIndex < this._paths.length - 1;
  }

  /**
   * Gets the current path
   */
  public get currentPath(): string {
    const defaultRoute = this.config?.defaultRoute || '/';
    return this.location.path() || defaultRoute;
  }

  /**
   * Gets the current navigation state
   */
  public get currentState(): NavigationState {
    return this._navigationState$.value;
  }

  /**
   * Gets the number of items in navigation history
   */
  public get historyLength(): number {
    return this._paths.length;
  }

  /**
   * Whether the service is currently navigating
   */
  public get isNavigating(): boolean {
    return this._isNavigating;
  }

  constructor(
    private readonly location: Location,
    private readonly router: Router,
    @Optional() @Inject(HISTORY_CONFIG) config?: Partial<HistoryConfig>,
  ) {
    this.config = { ...DEFAULT_HISTORY_CONFIG, ...config };

    // Initialize observables after config is set
    this._navigationState$ = new BehaviorSubject<NavigationState>(
      this.createInitialState(),
    );
    this.navigationState$ = this._navigationState$.asObservable();

    this.log('HistoryService initialized with config:', this.config);

    this.setupLocationListener();
    this.setupBrowserHistoryListener();

    if (this.config.autoInitialize) {
      this.initializeWithCurrentRoute();
    }
  }

  /**
   * Cleanup resources when the service is destroyed
   */
  ngOnDestroy(): void {
    this.log('HistoryService destroying...');
    this.destroySubject.next();
    this.destroySubject.complete();
    this.subscriptions.unsubscribe();
    this._navigationState$.complete();
    this._navigationError$.complete();
  }

  /**
   * Setup the location change listener with proper error handling
   */
  private setupLocationListener(): void {
    try {
      const locationSub = this.location.onUrlChange((path: string) => {
        if (this.previousPath !== path) {
          this.previousPath = path;
          if (this.isInternalNavigation) {
            this.handleInternalNavigation();
          } else {
            this.handleExternalNavigation(path);
          }
        }
      });

      // Fix: Add the subscription directly, not a function
      this.subscriptions.add(locationSub);
      this.log('Location listener setup complete');
    } catch (error) {
      this.emitError(
        'INITIALIZATION_FAILED',
        'Failed to setup location listener',
        error,
      );
    }
  }

  /**
   * Setup browser history (popstate) listener
   */
  private setupBrowserHistoryListener(): void {
    try {
      const popstateSub = fromEvent(window, 'popstate').subscribe(() => {
        this.log('Browser popstate event detected');
        this.handleBrowserHistoryChange();
      });

      this.subscriptions.add(popstateSub);
      this.log('Browser history listener setup complete');
    } catch (error) {
      this.emitError(
        'INITIALIZATION_FAILED',
        'Failed to setup browser history listener',
        error,
      );
    }
  }

  /**
   * Initialize with current route on service startup
   */
  private async initializeWithCurrentRoute(): Promise<void> {
    try {
      const currentPath = this.currentPath;
      this.log('Auto-initializing with current route:', currentPath);

      if (!this._paths.includes(currentPath)) {
        this.addToHistory(currentPath);
        this.updateNavigationState();
        this.isInitialized = true;
      }
    } catch (error) {
      this.emitError(
        'INITIALIZATION_FAILED',
        'Failed to initialize with current route',
        error,
      );
    }
  }

  /**
   * Handle browser history changes (back/forward buttons)
   */
  private handleBrowserHistoryChange(): void {
    const currentPath = this.currentPath;
    const pathIndex = this._paths.indexOf(currentPath);

    if (pathIndex !== -1) {
      this._currentIndex = pathIndex;
      this.updateNavigationState();
      this.log('Synced with browser history, index:', pathIndex);
    } else {
      this.log(
        'Browser navigated to unknown path, adding to history:',
        currentPath,
      );
      this.handleExternalNavigation(currentPath);
    }
  }

  /**
   * Handle navigation initiated by our service
   */
  private handleInternalNavigation(): void {
    this.log('Handling internal navigation');
    this.isInternalNavigation = false;
    this._isNavigating = false;
    this.updateNavigationState();
  }

  /**
   * Handle navigation initiated externally (router, browser buttons, etc.)
   */
  private handleExternalNavigation(path: string): void {
    this.log('Handling external navigation to:', path);

    // If we're not at the end of history, remove forward history
    if (this._currentIndex < this._paths.length - 1) {
      this._paths.splice(this._currentIndex + 1);
      this.log('Removed forward history, new length:', this._paths.length);
    }

    // Add new path to history with memory management
    this.addToHistory(path);
    this._currentIndex = this._paths.length - 1;

    this.updateNavigationState();
  }

  /**
   * Add path to history with memory management
   */
  private addToHistory(path: string): void {
    this._paths.push(path);

    // Implement memory management
    if (this._paths.length > this.config.maxHistoryLength) {
      const removedCount = this._paths.length - this.config.maxHistoryLength;
      this._paths.splice(0, removedCount);
      this._currentIndex = Math.max(0, this._currentIndex - removedCount);
      this.log(`Memory management: removed ${removedCount} old entries`);
    }
  }

  /**
   * Create the initial navigation state
   */
  private createInitialState(): NavigationState {
    const defaultRoute = this.config?.defaultRoute || '/';
    return {
      paths: [],
      currentIndex: 0,
      canGoBack: false,
      canGoForward: false,
      currentPath: defaultRoute,
      historyLength: 0,
      isNavigating: false,
    };
  }

  /**
   * Update the navigation state and emit changes
   */
  private updateNavigationState(): void {
    const state: NavigationState = {
      paths: this.paths,
      currentIndex: this._currentIndex,
      canGoBack: this.canGoBack,
      canGoForward: this.canGoForward,
      currentPath: this.currentPath,
      historyLength: this.historyLength,
      isNavigating: this._isNavigating,
    };

    this._navigationState$.next(state);
    this.log('Navigation state updated:', state);
  }

  /**
   * Emit a navigation error
   */
  private emitError(
    type: NavigationErrorType,
    message: string,
    originalError?: unknown,
  ): void {
    const error: NavigationError = {
      type,
      message,
      timestamp: new Date(),
      originalError,
    };

    this._navigationError$.next(error);
    this.log('Navigation error emitted:', error);
  }

  /**
   * Debug logging utility
   */
  private log(message: string, ...args: unknown[]): void {
    if (this.config.debugMode) {
      console.log(`[HistoryService] ${message}`, ...args);
    }
  }

  /**
   * Navigate to a specific index in the history with improved race condition handling
   */
  private async navigateToIndex(index: number): Promise<boolean> {
    if (index < 0 || index >= this._paths.length) {
      const message = `Invalid navigation index ${index}. Valid range: 0-${this._paths.length - 1}`;
      this.emitError('INVALID_INDEX', message);
      return false;
    }

    // Prevent concurrent navigations
    if (this.navigationPromise) {
      this.emitError(
        'CONCURRENT_NAVIGATION',
        'Navigation already in progress, waiting...',
      );
      try {
        await this.navigationPromise;
      } catch {
        // Previous navigation failed, continue with this one
      }
    }

    this.navigationPromise = this.performNavigation(index);
    return this.navigationPromise;
  }

  /**
   * Perform the actual navigation
   */
  private async performNavigation(index: number): Promise<boolean> {
    try {
      this._isNavigating = true;
      this.isInternalNavigation = true;
      this._currentIndex = index;
      const targetPath = this._paths[index];

      this.log(`Navigating to index ${index}: ${targetPath}`);
      this.updateNavigationState();

      const success = await this.router.navigateByUrl(targetPath);

      if (!success) {
        this.emitError(
          'NAVIGATION_FAILED',
          `Failed to navigate to ${targetPath}`,
        );
        this.isInternalNavigation = false;
        this._isNavigating = false;
      }

      return success;
    } catch (error) {
      this.emitError('NAVIGATION_FAILED', `Navigation error: ${error}`, error);
      this.isInternalNavigation = false;
      this._isNavigating = false;
      return false;
    } finally {
      this.navigationPromise = null;
    }
  }

  /**
   * Navigate backwards in history (like browser back button)
   * @returns Promise that resolves to true if navigation was initiated successfully
   */
  public async goBack(): Promise<boolean> {
    if (!this.canGoBack) {
      this.emitError(
        'INVALID_INDEX',
        'Cannot go back, already at the beginning of history',
      );
      return false;
    }

    return this.navigateToIndex(this._currentIndex - 1);
  }

  /**
   * Navigate forwards in history (like browser forward button)
   * @returns Promise that resolves to true if navigation was initiated successfully
   */
  public async goForward(): Promise<boolean> {
    if (!this.canGoForward) {
      this.emitError(
        'INVALID_INDEX',
        'Cannot go forward, already at the end of history',
      );
      return false;
    }

    return this.navigateToIndex(this._currentIndex + 1);
  }

  /**
   * Initialize or reset the service with an optional starting path
   * @param path Optional starting path, defaults to current path or default route
   * @returns Promise that resolves when initialization is complete
   */
  public async initialize(path?: string): Promise<boolean> {
    try {
      this.log('Initializing HistoryService...');
      const initialPath =
        path || this.currentPath || this.config?.defaultRoute || '/';

      this._isNavigating = true;
      this.isInternalNavigation = true;
      this.updateNavigationState();

      const success = await this.router.navigateByUrl(initialPath);

      if (success) {
        this._paths.length = 0; // Clear existing history
        this.addToHistory(initialPath);
        this._currentIndex = 0;
        this.isInitialized = true;
        this.updateNavigationState();
        this.log(
          'HistoryService initialized successfully with path:',
          initialPath,
        );
      } else {
        this.emitError(
          'INITIALIZATION_FAILED',
          `Failed to navigate to initial path: ${initialPath}`,
        );
      }

      this.isInternalNavigation = false;
      this._isNavigating = false;
      return success;
    } catch (error) {
      this.emitError('INITIALIZATION_FAILED', 'Initialization failed', error);
      this.isInternalNavigation = false;
      this._isNavigating = false;
      return false;
    }
  }

  /**
   * Reset the service to initial state
   * @returns Promise that resolves when reset is complete
   */
  public async reset(): Promise<boolean> {
    this.log('Resetting HistoryService...');
    return this.initialize();
  }

  // Enhanced utility methods

  /**
   * Clear all navigation history
   */
  public clearHistory(): void {
    this.log('Clearing navigation history');
    this._paths.length = 0;
    this._currentIndex = 0;
    this.updateNavigationState();
  }

  /**
   * Get the path at a specific index in history
   * @param index The index to retrieve
   * @returns The path at the given index, or undefined if invalid
   */
  public getPathAtIndex(index: number): string | undefined {
    return this._paths[index];
  }

  /**
   * Check if a specific path exists in the navigation history
   * @param path The path to check
   * @returns True if the path exists in history
   */
  public hasPath(path: string): boolean {
    return this._paths.includes(path);
  }

  /**
   * Navigate to a specific path if it exists in history
   * @param path The path to navigate to
   * @returns Promise that resolves to true if navigation occurred
   */
  public async navigateToPath(path: string): Promise<boolean> {
    const index = this._paths.indexOf(path);
    if (index === -1) {
      this.emitError('INVALID_INDEX', `Path not found in history: ${path}`);
      return false;
    }

    return this.navigateToIndex(index);
  }

  /**
   * Get a snapshot of current service configuration
   */
  public getConfig(): Readonly<HistoryConfig> {
    return { ...this.config };
  }

  /**
   * Check if the service has been initialized
   */
  public get initialized(): boolean {
    return this.isInitialized;
  }
}
