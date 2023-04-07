import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { BrowserAnimationsModule as AnimationsModule } from '@angular/platform-browser/animations';

import { MatToolbarModule } from '@angular/material/toolbar';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { HttpClientModule } from '@angular/common/http';
import { WifiSettingsComponent } from './wifi-settings/wifi-settings.component';
import { SkinEditorComponent } from './skin-editor/skin-editor.component';
import { AdornerStylePipe } from './skin-editor/adorner-style.pipe';

@NgModule({
  declarations: [
    AppComponent,
    WifiSettingsComponent,
    SkinEditorComponent,
    AdornerStylePipe
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    AnimationsModule,
    MatToolbarModule,
    MatExpansionModule,
    MatSelectModule,
    MatButtonModule,
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
