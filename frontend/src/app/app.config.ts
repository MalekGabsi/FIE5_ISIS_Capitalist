import { ApplicationConfig, inject, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { InMemoryCache } from '@apollo/client/core';
import { provideApollo } from 'apollo-angular';
import { HttpLink } from 'apollo-angular/http';
import { BackendUrl } from './backend-url';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withFetch()),
    provideApollo(() => {
      const backend = inject(BackendUrl);
      return {
        // Evaluated per request, so a new backend address applies immediately.
        link: inject(HttpLink).create({ uri: () => backend.graphql() }),
        cache: new InMemoryCache(),
        // GameService signals are the single source of truth for the world,
        // so Apollo's normalized cache is bypassed entirely.
        defaultOptions: {
          query: { fetchPolicy: 'no-cache' },
          mutate: { fetchPolicy: 'no-cache' },
        },
      };
    }),
  ],
};
