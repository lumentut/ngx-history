import { NgModule } from '@angular/core';
import { HistoryService } from './history.service';

@NgModule({
    declarations: [],
    exports: [],
    providers: [] // HistoryService provides itself via providedIn: 'root'"
})
export class NgxHistoryModule {}
