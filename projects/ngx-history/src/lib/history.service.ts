import { Injectable, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Location } from '@angular/common';
import { BehaviorSubject, Observable, Subscription, filter } from 'rxjs';

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
}

/**
 * Service for managing browser-like navigation history in Angular applications.
 * Provides back/forward functionality similar to browser navigation.
 * 
 * @example
 * ```typescript
 * constructor(private historyService: HistoryService) {
 *   // Subscribe to navigation state changes
 *   this.historyService.navigationState$.subscribe(state => {
 *     console.log('Can go back:', state.canGoBack);
 *     console.log('Can go forward:', state.canGoForward);
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
  providedIn: 'root'
})
export class HistoryService implements OnDestroy {
  
  private readonly subscriptions = new Subscription();
  private isInternalNavigation = false;
  private previousPath: string | undefined;
  
  // Internal state - keeping original structure for compatibility
  private readonly _paths: string[] = [];
  private _currentIndex = 0;
  
  // Public observables for enhanced functionality
  private readonly _navigationState$ = new BehaviorSubject<NavigationState>(this.createInitialState());
  
  /**
   * Observable stream of navigation state changes
   */
  public readonly navigationState$: Observable<NavigationState> = this._navigationState$.asObservable();
  
  // Public properties for backward compatibility
  public get paths(): string[] {
    return [...this._paths]; // Return mutable copy for compatibility
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
    return this.location.path() || '/';
  }
  
  /**
   * Gets the current navigation state
   */
  public get currentState(): NavigationState {
    return this._navigationState$.value;
  }

  constructor(
    private readonly location: Location,
    private readonly router: Router
  ) {
    this.setupLocationListener();
  }

  /**
   * Cleanup resources when the service is destroyed
   */
  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this._navigationState$.complete();
  }

  /**
   * Setup the location change listener (original behavior)
   */
  private setupLocationListener(): void {
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
    
    this.subscriptions.add(() => locationSub());
  }

  /**
   * Handle navigation initiated by our service
   */
  private handleInternalNavigation(): void {
    const { _currentIndex: currentIndex, _paths: paths } = this;
    this.isInternalNavigation = false;
    this.updateNavigationState();
  }

  /**
   * Handle navigation initiated externally (router, browser buttons, etc.)
   */
  private handleExternalNavigation(path: string): void {
    const { _currentIndex: currentIndex, _paths: paths } = this;
    
    // If we're not at the end of history, remove forward history
    if (currentIndex < paths.length - 1) {
      this._paths.splice(currentIndex + 1);
    }
    
    // Add new path to history
    this._paths.push(path);
    this._currentIndex = this._paths.length - 1;
    
    this.updateNavigationState();
  }

  /**
   * Create the initial navigation state
   */
  private createInitialState(): NavigationState {
    return {
      paths: [],
      currentIndex: 0,
      canGoBack: false,
      canGoForward: false,
      currentPath: '/'
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
      currentPath: this.currentPath
    };
    
    this._navigationState$.next(state);
  }

  /**
   * Navigate to a specific index in the history
   */
  private navigateToIndex(index: number): boolean {
    if (index < 0 || index >= this._paths.length) {
      console.warn(`HistoryService: Invalid navigation index ${index}`);
      return false;
    }
    
    this.isInternalNavigation = true;
    this._currentIndex = index;
    const targetPath = this._paths[index];
    
    // Use router navigation (async but don't wait)
    this.router.navigateByUrl(targetPath).catch((error) => {
      console.error('HistoryService: Navigation failed', error);
      this.isInternalNavigation = false;
    });
    
    return true;
  }

  /**
   * Navigate backwards in history (like browser back button)
   * @returns True if navigation was initiated successfully
   */
  public goBack(): boolean {
    if (!this.canGoBack) {
      console.warn('HistoryService: Cannot go back, already at the beginning of history');
      return false;
    }
    
    return this.navigateToIndex(this._currentIndex - 1);
  }

  /**
   * Navigate forwards in history (like browser forward button)
   * @returns True if navigation was initiated successfully
   */
  public goForward(): boolean {
    if (!this.canGoForward) {
      console.warn('HistoryService: Cannot go forward, already at the end of history');
      return false;
    }
    
    return this.navigateToIndex(this._currentIndex + 1);
  }

  /**
   * Initialize or reset the service with an optional starting path
   * @param path Optional starting path, defaults to current path or '/home'
   * @returns Promise that resolves when initialization is complete
   */
  public async initialize(path?: string): Promise<boolean> {
    const initialPath = path || '/home';
    
    try {
      this.isInternalNavigation = true;
      const success = await this.router.navigateByUrl(initialPath);
      
      if (success) {
        this._paths.length = 0; // Clear existing history
        this._paths.push(initialPath);
        this._currentIndex = 0;
        this.updateNavigationState();
      }
      
      this.isInternalNavigation = false;
      return success;
    } catch (error) {
      console.error('HistoryService: Initialization failed', error);
      this.isInternalNavigation = false;
      return false;
    }
  }

  /**
   * Reset the service to initial state
   * @returns Promise that resolves when reset is complete
   */
  public async reset(): Promise<boolean> {
    return this.initialize();
  }

  // Additional utility methods for enhanced functionality
  
  /**
   * Clear all navigation history
   */
  public clearHistory(): void {
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
   * Get the number of items in navigation history
   * @returns The total number of history items
   */
  public get historyLength(): number {
    return this._paths.length;
  }
}
