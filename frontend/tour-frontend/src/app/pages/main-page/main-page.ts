import { Component } from '@angular/core';
import { CesiumComponent } from './cesium-component/cesium-component';
import { WidgetComponent } from './widget-component/widget-component';

@Component({
  selector: 'app-main-page',
  standalone: true,
  imports: [CesiumComponent, WidgetComponent],
  templateUrl: './main-page.html',
  styleUrl: './main-page.scss',
})
export class MainPage {}
