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

/* ----------------------------------------------------------
 * Custom animated polyline material: "PolylineTrail"
 * --------------------------------------------------------*/

const PolylineTrailType = 'PolylineTrail';

class PolylineTrailMaterialProperty implements Cesium.MaterialProperty {
  definitionChanged = new Cesium.Event();

  private _color: Cesium.Color;
  private _duration: number;
  private _startTime: number;

  constructor(options: { color?: Cesium.Color; duration?: number } = {}) {
    this._color = options.color ?? Cesium.Color.CYAN;
    this._duration = options.duration ?? 4000; // ms per cycle
    this._startTime = performance.now();
  }

  get isConstant(): boolean {
    return false;
  }

  getType(_time: Cesium.JulianDate): string {
    return PolylineTrailType;
  }

  getValue(_time: Cesium.JulianDate, result?: any): any {
    if (!result) result = {};
    const now = performance.now();
    const normalized = ((now - this._startTime) % this._duration) / this._duration;

    result.color = this._color;
    result.time = normalized;
    return result;
  }

  equals(other?: any): boolean {
    return (
      other instanceof PolylineTrailMaterialProperty &&
      Cesium.Color.equals(this._color, other._color)
    );
  }
}

(Cesium.Material as any)._materialCache.addMaterial(PolylineTrailType, {
  fabric: {
    type: PolylineTrailType,
    uniforms: {
      color: Cesium.Color.CYAN,
      time: 0,
    },
    source: `
    czm_material czm_getMaterial(czm_materialInput materialInput)
    {
      czm_material material = czm_getDefaultMaterial(materialInput);
      float t = fract(materialInput.st.s - time);
      float alpha = smoothstep(0.0, 0.2, t) * (1.0 - smoothstep(0.6, 1.0, t));
      material.diffuse = color.rgb;
      material.alpha = alpha;
      return material;
    }`,
  },
  translucent: () => true,
});

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

  // DataSource for markers
  private pointsDS = new Cesium.CustomDataSource('points');

  ngAfterViewInit(): void {
    (window as any).CESIUM_BASE_URL = '/assets/cesium';

    Cesium.Ion.defaultAccessToken =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI2MTBkODAzYy02MWNmLTRlMTEtYjAwYi1kNWE3MThiODMzZjMiLCJpZCI6MzQ5NzMwLCJpYXQiOjE3NjAzMTA5NTB9.x2_sL00_RXclAoX2001Y0Ki-Joo11Ixh9tvJVoVDxsM';

    this.viewer = new Cesium.Viewer(this.container.nativeElement, {
      animation: false,
      timeline: false,
      infoBox: true,
      selectionIndicator: true,
    });

    this.viewer.dataSources.add(this.pointsDS);

    this.loadPoints();

    this.viewer.selectedEntityChanged.addEventListener((e) => {
      if (e) this.objectSelected.emit(e);
    });
  }

  ngOnChanges(): void {
    if (this.viewer) this.loadPoints();
  }

  private loadPoints() {
    this.pointsDS.entities.removeAll();

    for (const o of this.objects) {
      this.pointsDS.entities.add({
        id: o.id,
        name: o.label,
        position: o.position,

        point: {
          pixelSize: 10,
          color: Cesium.Color.YELLOW,
        },

        label: {
          text: o.label,
          font: "18px 'Roboto', sans-serif",
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 4,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,

          showBackground: true,
          backgroundColor: new Cesium.Color(0, 0, 0, 0.55),
          backgroundPadding: new Cesium.Cartesian2(10, 6),

          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, -20),
        },
      });
    }

    if (this.objects.length > 0) {
      this.viewer.zoomTo(this.pointsDS.entities);
    }
  }

  ngOnDestroy(): void {
    if (this.viewer && !this.viewer.isDestroyed()) this.viewer.destroy();
  }

  public flyToEntityById(id: string) {
    const entity = this.pointsDS.entities.getById(id);

    if (entity) {
      // highlight the selected event
      entity.point!.color = new Cesium.ConstantProperty(Cesium.Color.RED);

      this.viewer.flyTo(entity);
    } else {
      console.warn('Entity not found in pointsDS:', id);
    }
  }
  // ---------------- Animated curved arcs ----------------
  public drawCurvedTourPath(points: Cesium.Cartesian3[]) {
    if (!this.viewer || points.length < 2) return;

    const arcPositions: Cesium.Cartesian3[] = [];
    const height = 5000; // 100 km offset

    for (let i = 0; i < points.length - 1; i++) {
      const start = points[i];
      const end = points[i + 1];

      const geo = new Cesium.EllipsoidGeodesic(
        Cesium.Cartographic.fromCartesian(start),
        Cesium.Cartographic.fromCartesian(end)
      );

      const STEPS = 64;
      for (let j = 0; j <= STEPS; j++) {
        const f = j / STEPS;
        const pos = geo.interpolateUsingFraction(f);
        arcPositions.push(Cesium.Cartesian3.fromRadians(pos.longitude, pos.latitude, height));
      }
    }

    console.log('ADDING GLOWING TOUR ARC');

    this.viewer.entities.add({
      name: 'Tour Path',
      polyline: {
        positions: arcPositions,
        width: 4,
        material: new PolylineTrailMaterialProperty({
          color: Cesium.Color.CYAN.withAlpha(0.8),
          duration: 4000, // ms per cycle
        }),
        clampToGround: false,
      },
    });
  }
  public clearTourPath() {
    if (!this.viewer) return;

    const toRemove = this.viewer.entities.values.filter(
      (e) => e.name === 'Tour Path' || e.name === 'Tour Van'
    );

    toRemove.forEach((entity) => this.viewer.entities.remove(entity));
  }
}
