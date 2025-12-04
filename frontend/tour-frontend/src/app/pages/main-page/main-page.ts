// src/app/pages/main-page/main-page.ts
import { Component, ViewChild } from '@angular/core';
import * as Cesium from 'cesium';

import { CesiumComponent } from './cesium-component/cesium-component';
import { WidgetComponent } from './widget-component/widget-component';
import { EventsService } from '../../core/services/events.service';

@Component({
  selector: 'app-main-page',
  standalone: true,
  imports: [CesiumComponent, WidgetComponent],
  templateUrl: './main-page.html',
  styleUrl: './main-page.scss',
})
export class MainPage {
  objects: any[] = [];
  eventList: any[] = [];

  @ViewChild(CesiumComponent)
  cesiumComponent!: CesiumComponent;

  constructor(private events: EventsService) {}

  onSearch(data: any) {
    const { artistId, artistName } = data;
    console.log('Selected artist:', artistName, artistId);

    this.events
      .getEvents({
        attractionId: artistId,
        classificationName: 'music',
        size: 100,
      })
      .subscribe((tm: any) => {
        const items = tm?._embedded?.events ?? [];

        // sort by date
        const sorted = items.sort((a: any, b: any) => {
          const da = a.dates?.start?.dateTime ?? a.dates?.start?.localDate;
          const db = b.dates?.start?.dateTime ?? b.dates?.start?.localDate;
          return new Date(da).getTime() - new Date(db).getTime();
        });

        this.eventList = items
          .filter((e: any) => e._embedded?.venues?.[0]?.location)
          .map((e: any) => {
            const v = e._embedded.venues[0];

            return {
              id: e.id,
              name: e.name,
              venue: v.name,
              city: v.city?.name ?? '',
              date: e.dates?.start?.localDate,
              latitude: Number(v.location.latitude),
              longitude: Number(v.location.longitude),

              image:
                e.images?.[0]?.url ||
                e._embedded?.attractions?.[0]?.images?.[0]?.url ||
                'assets/default-event.jpg',
            };
          });
        console.log(
          'Event images:',
          this.eventList.map((e) => e.image)
        );

        this.objects = this.eventList.map((e) => ({
          id: e.id,
          label: `${e.city} — ${e.venue} (${e.date})`,
          position: Cesium.Cartesian3.fromDegrees(e.longitude, e.latitude),
        }));

        // Build position list and send to Cesium
        const points = this.objects.map((o) => o.position);
        this.cesiumComponent.clearTourPath();

        console.log('Calling drawCurvedTourPath', points);
        this.cesiumComponent.drawCurvedTourPath(points);
      });
  }

  flyToEvent(e: any) {
    if (!this.cesiumComponent) return;
    this.cesiumComponent.flyToEntityById(e.id);
  }

  onObjectSelected(e: any) {
    console.log('Selected on globe:', e);
  }
}
