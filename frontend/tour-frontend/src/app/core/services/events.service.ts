import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class EventsService {
  private http = inject(HttpClient);

  /**
   * Calls the backend /api/events endpoint.
   */
  getEvents(paramsObj: any): Observable<any> {
    let params = new HttpParams();

    for (const key of Object.keys(paramsObj)) {
      const value = paramsObj[key];
      if (value !== null && value !== undefined && value !== '') {
        params = params.set(key, value);
      }
    }

    console.log('EventsService → Final HTTP params:', paramsObj);
    return this.http.get('/api/events', { params });
  }

  /**
   * Artist suggestions for autocomplete
   */
  getArtistSuggestions(keyword: string) {
    if (!keyword || keyword.trim().length < 2) return of([]);

    return this.getEvents({
      keyword,
      classificationName: 'music',
      size: 200,
    }).pipe(
      map((tm: any) => {
        const events = tm?._embedded?.events ?? [];
        const artistMap = new Map<string, { id: string; name: string }>();

        for (const ev of events) {
          const atts = ev?._embedded?.attractions ?? [];
          for (const a of atts) {
            if (!a?.id || !a?.name) continue;
            artistMap.set(a.id, { id: a.id, name: a.name });
          }
        }

        const lower = keyword.toLowerCase();
        const artists = Array.from(artistMap.values()).filter((a) =>
          a.name.toLowerCase().includes(lower)
        );

        artists.sort((a, b) => {
          const aa = a.name.toLowerCase();
          const bb = b.name.toLowerCase();

          if (aa === lower && bb !== lower) return -1;
          if (aa !== lower && bb === lower) return 1;
          return aa.localeCompare(bb);
        });

        return artists.slice(0, 10);
      })
    );
  }
}
