import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class EventsService {
  private http = inject(HttpClient);

  /**
   * Calls the backend /api/events endpoint
   * Accepts any object with event search parameters
   * (keyword, city, stateCode, page, size, sort, etc.)
   */
  getEvents(paramsObj: any): Observable<any> {
    let params = new HttpParams();

    for (const key of Object.keys(paramsObj)) {
      const value = paramsObj[key];
      if (value !== null && value !== undefined && value !== '') {
        params = params.set(key, value);
      }
    }

    return this.http.get('/api/events', { params });
  }

  getKeywordSuggestions(keyword: string) {
    if (!keyword || keyword.trim().length < 2) return of([]);

    return this.getEvents({ keyword, size: 5 }).pipe(
      map((tm: any) => tm?._embedded?.events?.map((e: any) => e.name) ?? [])
    );
  }

  getArtistSuggestions(keyword: string) {
    if (!keyword || keyword.trim().length < 2) return of([]);

    // 🔹 classificationName must be *lowercase* "music" per TM docs
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
            const id = a.id as string;
            const name = a.name as string;
            if (!artistMap.has(id)) {
              artistMap.set(id, { id, name });
            }
          }
        }

        const kw = keyword.toLowerCase();
        let artists = Array.from(artistMap.values()).filter((a) =>
          a.name.toLowerCase().includes(kw)
        );

        // exact match first, then alphabetical
        artists.sort((a, b) => {
          const aName = a.name.toLowerCase();
          const bName = b.name.toLowerCase();
          const aExact = aName === kw;
          const bExact = bName === kw;
          if (aExact && !bExact) return -1;
          if (!aExact && bExact) return 1;
          return aName.localeCompare(bName);
        });

        return artists.slice(0, 10);
      })
    );
  }
}
