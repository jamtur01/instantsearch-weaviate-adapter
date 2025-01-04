# InstantSearch Weaviate Adapter

An adapter to use [Weaviate](https://weaviate.io/) with [InstantSearch.js](https://www.algolia.com/doc/guides/building-search-ui/what-is-instantsearch/js/).

## Installation

```bash
# If using npm
npm install @instantsearch/weaviate-adapter

# If using yarn
yarn add @instantsearch/weaviate-adapter
```

Note: Since this package is published to GitHub Packages, you'll need to authenticate with GitHub. Create a `.npmrc` file in your project root with:

```
@instantsearch:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN
```

Replace `YOUR_GITHUB_TOKEN` with a GitHub personal access token that has the `read:packages` scope.

## Usage

```typescript
import { WeaviateSearchAdapter } from '@instantsearch/weaviate-adapter';
import instantsearch from 'instantsearch.js';

const searchClient = new WeaviateSearchAdapter({
  weaviateUrl: 'http://localhost:8080',
  className: 'YourClass',
});

const search = instantsearch({
  indexName: 'YourClass',
  searchClient,
});

// Add widgets and initialize as usual
```

## Features

- Full support for Weaviate query types:
  - BM25 text search
  - Vector search (nearText, nearObject)
  - Hybrid search
  - Advanced filtering
  - Sorting
- Compatible with all InstantSearch widgets
- TypeScript support

## Development

### Prerequisites

- Node.js (v16 or later)
- Docker (for running Weaviate locally)

### Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start Weaviate:
   ```bash
   docker run -d --name weaviate \
     -p 8080:8080 \
     -e QUERY_DEFAULTS_LIMIT=25 \
     -e AUTHENTICATION_ANONYMOUS_ACCESS_ENABLED=true \
     -e DEFAULT_VECTORIZER_MODULE=text2vec-contextionary \
     -e ENABLE_MODULES=text2vec-contextionary \
     cr.weaviate.io/semitechnologies/weaviate:1.28.2
   ```

### Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run linter
npm run lint

# Format code
npm run format
```

### CI/CD Pipeline

The project uses GitHub Actions for continuous integration and deployment:

- Tests run on every push and pull request
- Tests run against Node.js versions 16.x, 18.x, and 20.x
- Linting is performed on every push
- New versions are automatically published to GitHub Packages when a release is created

### Creating a Release

1. Update version in package.json
2. Create and push a tag:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
3. Create a release on GitHub using the tag
4. The CI/CD pipeline will automatically publish to GitHub Packages

## License

MIT
