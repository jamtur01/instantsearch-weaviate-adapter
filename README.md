# InstantSearch Weaviate Adapter

This adapter enables you to use [Weaviate](https://weaviate.io/) as a backend for [InstantSearch.js](https://github.com/algolia/instantsearch.js/). It provides seamless integration between Weaviate's vector search capabilities and InstantSearch's rich UI components.

## Installation

```bash
npm install instantsearch-weaviate-adapter
```

## Usage

Here's a basic example of how to use the adapter:

```javascript
import { WeaviateSearchAdapter } from 'instantsearch-weaviate-adapter';
import instantsearch from 'instantsearch.js';
import { searchBox, hits } from 'instantsearch.js/es/widgets';

// Initialize the adapter
const searchAdapter = new WeaviateSearchAdapter({
  weaviateUrl: 'http://localhost:8080',  // Your Weaviate instance URL
  className: 'Article',                  // Your Weaviate class name
  apiKey: 'your-api-key',               // Optional: Your Weaviate API key
  fields: ['title', 'content', '_additional { certainty }'] // Fields to retrieve
});

// Initialize InstantSearch
const search = instantsearch({
  indexName: 'your-index-name',
  searchClient: searchAdapter
});

// Add widgets
search.addWidgets([
  searchBox({
    container: '#searchbox'
  }),
  hits({
    container: '#hits',
    templates: {
      item: (hit) => `
        <div>
          <h2>${hit.title}</h2>
          <p>${hit.content}</p>
          <p>Certainty: ${hit._additional.certainty}</p>
        </div>
      `
    }
  })
]);

// Start the search
search.start();
```

## Configuration Options

The `WeaviateSearchAdapter` accepts the following options:

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| weaviateUrl | string | Yes | The URL of your Weaviate instance |
| className | string | Yes | The name of the Weaviate class to search |
| apiKey | string | No | Your Weaviate API key (if authentication is enabled) |
| fields | string[] | No | The fields to retrieve from Weaviate. Defaults to `['_additional { id }']` |
| attributesToRetrieve | string[] | No | Alias for fields (for Algolia compatibility) |
| attributesToHighlight | string[] | No | Fields to highlight in the results (not currently implemented) |

## Features

- Full-text search using Weaviate's vector search capabilities
- Pagination support
- Filtering support using Weaviate's where filter syntax
- Compatible with all InstantSearch widgets
- TypeScript support

## Filter Syntax

The adapter supports filtering using a simplified syntax similar to Algolia's. Filters should be provided in the following format:

```javascript
"field:value AND otherField:>100"
```

Supported operators:
- Equal: `field:value`
- Greater than: `field:>value`
- Less than: `field:<value`
- AND combinations: `field1:value1 AND field2:value2`

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run linting
npm run lint

# Format code
npm run format
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
