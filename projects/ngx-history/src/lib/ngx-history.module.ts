import { NgModule, ModuleWithProviders } from '@angular/core';
import {
  HistoryService,
  HistoryConfig,
  HISTORY_CONFIG,
} from './history.service';

@NgModule({
  declarations: [],
  exports: [],
  providers: [], // HistoryService provides itself via providedIn: 'root'
})
export class NgxHistoryModule {
  /**
   * Configure the HistoryService with custom options
   * @param config Configuration options for the history service
   * @returns ModuleWithProviders for dependency injection
   */
  static forRoot(
    config: Partial<HistoryConfig>,
  ): ModuleWithProviders<NgxHistoryModule> {
    return {
      ngModule: NgxHistoryModule,
      providers: [{ provide: HISTORY_CONFIG, useValue: config }],
    };
  }

  /**
   * Use in feature modules (same configuration as root)
   * @returns NgxHistoryModule for feature modules
   */
  static forChild(): NgxHistoryModule {
    return NgxHistoryModule;
  }
}
