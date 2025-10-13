// src/app/pages/main-page/cesium-component/cesium-component.ts
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  Input,
  Output,
  EventEmitter,
} from '@angular/core';
import * as Cesium from 'cesium';

@Component({
  selector: 'app-cesium-component',
  standalone: true,
  template: `<div #container class="globe"></div>`,
  styles: [
    `
      .globe {
        height: 100%;
        width: 100%;
        display: block;
      }
    `,
  ],
})
export class CesiumComponent implements AfterViewInit, OnDestroy {
  @ViewChild('container', { static: true }) container!: ElementRef<HTMLDivElement>;
  @Input() objects: any[] = [];
  @Output() objectSelected = new EventEmitter<any>();

  private viewer!: Cesium.Viewer;

  ngAfterViewInit(): void {
    // 1) Tell Cesium where static assets live (must match angular.json output)
    (window as any).CESIUM_BASE_URL = '/assets/cesium';

    // 2) (Optional) If you’ll use Cesium ion assets/terrain:
    Cesium.Ion.defaultAccessToken =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI2MTBkODAzYy02MWNmLTRlMTEtYjAwYi1kNWE3MThiODMzZjMiLCJpZCI6MzQ5NzMwLCJpYXQiOjE3NjAzMTA5NTB9.x2_sL00_RXclAoX2001Y0Ki-Joo11Ixh9tvJVoVDxsM';

    // 3) Create the viewer
    this.viewer = new Cesium.Viewer(this.container.nativeElement, {
      animation: false,
      timeline: false,
      infoBox: true,
      selectionIndicator: true,
    });

    // 4) Example: add/update entities from @Input() objects
    this.loadObjects();

    // 5) Example: click to emit selected entity
    this.viewer.selectedEntityChanged.addEventListener((e) => {
      if (e) this.objectSelected.emit(e);
    });
  }

  ngOnChanges(): void {
    if (this.viewer) this.loadObjects();
  }

  private loadObjects() {
    const ds = this.viewer.entities;
    ds.removeAll();
    for (const o of this.objects) {
      ds.add({
        id: o.id,
        name: o.name,
        position: o.position, // e.g., Cartesian3.fromDegrees(lon, lat, alt)
        point: { pixelSize: 8, color: (Cesium as any).Color.CYAN },
      });
    }
    if (this.objects.length) this.viewer.zoomTo(this.viewer.entities);
  }

  ngOnDestroy(): void {
    if (this.viewer && !this.viewer.isDestroyed()) this.viewer.destroy();
  }
}
