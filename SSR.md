IMPORTANT

- SSR renders the dashboard from its in memory cache
- as soon as page is rendered on the client it runs a (non blocking) request for fresh data for all active adapters.
- after the initial request for fresh data the poll intervals kick in.
- every time a request for fresh data runs it stores the result in the memory cache.
