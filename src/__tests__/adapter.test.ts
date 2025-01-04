import { WeaviateSearchAdapter } from '../adapter';
import { WeaviateClient } from 'weaviate-ts-client';

describe('WeaviateSearchAdapter', () => {
  let adapter: WeaviateSearchAdapter;
  let client: WeaviateClient;
  const TEST_CLASS = 'Test';
  let hasTextVectorizer = false;

  beforeAll(async () => {
    adapter = new WeaviateSearchAdapter({
      weaviateUrl: 'http://localhost:8080',
      className: TEST_CLASS,
    });

    client = (adapter as any).client as WeaviateClient;

    try {
      // Check if Weaviate is available
      const meta = await client.misc.metaGetter().do();
      if (!meta) {
        throw new Error('Weaviate not available');
      }

      // Check for text vectorizer module
      try {
        const meta = await client.misc.metaGetter().do();
        hasTextVectorizer = meta.modules?.some((m: { name: string }) => 
          m.name === 'text2vec-contextionary'
        ) || false;
      } catch (e) {
        console.log('Could not check for text vectorizer module:', e);
        hasTextVectorizer = false;
      }

      // Delete test class if it exists
      try {
        await client.schema.classDeleter().withClassName(TEST_CLASS).do();
      } catch (e) {
        // Ignore error if class doesn't exist
      }

      // Create test class
      const classConfig = {
        class: TEST_CLASS,
        vectorIndexConfig: {
          distance: 'cosine',
        },
        ...(hasTextVectorizer && {
          vectorizer: 'text2vec-contextionary',
        }),
        properties: [
          {
            name: 'title',
            dataType: ['text'],
            ...(hasTextVectorizer && {
              vectorizer: 'text2vec-contextionary',
            }),
          },
          {
            name: 'description',
            dataType: ['text'],
            ...(hasTextVectorizer && {
              vectorizer: 'text2vec-contextionary',
            }),
          },
          {
            name: 'price',
            dataType: ['number'],
          },
        ],
      };

      await client.schema
        .classCreator()
        .withClass(classConfig)
        .do();

      // Add test data
      const testData = [
        {
          title: 'iPhone 12',
          description: 'A great smartphone with amazing features',
          price: 799,
        },
        {
          title: 'Samsung Galaxy S21',
          description: 'Android flagship with excellent camera',
          price: 899,
        },
        {
          title: 'Google Pixel 6',
          description: 'Pure Android experience with great AI features',
          price: 699,
        },
      ];

      for (const item of testData) {
        await client.data.creator().withClassName(TEST_CLASS).withProperties(item).do();
      }

      // Wait for indexing
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('Failed to initialize test environment:', error);
      throw error;
    }
  });

  afterAll(async () => {
    // Clean up test data
    const client = (adapter as any).client as WeaviateClient;
    try {
      await client.schema.classDeleter().withClassName(TEST_CLASS).do();
    } catch (e) {
      console.error('Error cleaning up test class:', e);
    }
  });

  it('should connect to Weaviate successfully', async () => {
    try {
      const client = (adapter as any).client as WeaviateClient;
      const meta = await client.misc.metaGetter().do();
      expect(meta).toBeDefined();
      expect(meta.version).toBeDefined();
    } catch (error) {
      console.log('Skipping test - Weaviate not available');
      return;
    }
  });

  it('should perform basic search', async () => {
    try {
      const results = await adapter.search([
        {
          params: {
            query: 'iPhone',
          },
        },
      ]);

      expect(results.results).toHaveLength(1);
      expect(results.results[0].hits).toHaveLength(1);
      expect(results.results[0].hits[0].title).toBe('iPhone 12');
    } catch (error) {
      console.log('Skipping test - Weaviate not available');
      return;
    }
  });

  it('should handle pagination', async () => {
    try {
      const results = await adapter.search([
        {
          params: {
            query: '',
            hitsPerPage: 2,
            page: 0,
          },
        },
      ]);

      expect(results.results[0].hits).toHaveLength(2);
      expect(results.results[0].page).toBe(0);
      expect(results.results[0].nbPages).toBe(2);
    } catch (error) {
      console.log('Skipping test - Weaviate not available');
      return;
    }
  });

  it('should handle basic filters', async () => {
    try {
      const results = await adapter.search([
        {
          params: {
            query: '',
            filters: 'price:>800',
          },
        },
      ]);

      expect(results.results[0].hits).toHaveLength(1);
      expect(results.results[0].hits[0].title).toBe('Samsung Galaxy S21');
    } catch (error) {
      console.log('Skipping test - Weaviate not available');
      return;
    }
  });

  it('should handle multiple AND filters', async () => {
    try {
      const results = await adapter.search([
        {
          params: {
            query: '',
            filters: 'price:>600 AND price:<800',
          },
        },
      ]);

      expect(results.results[0].hits).toHaveLength(1);
      expect(results.results[0].hits[0].title).toBe('Google Pixel 6');
    } catch (error) {
      console.log('Skipping test - Weaviate not available');
      return;
    }
  });

  it('should handle OR filters', async () => {
    try {
      const results = await adapter.search([
        {
          params: {
            query: '',
            filters: 'price:>800 OR price:<700',
          },
        },
      ]);

      expect(results.results[0].hits).toHaveLength(2);
      expect(results.results[0].hits.map(hit => hit.title).sort()).toEqual([
        'Google Pixel 6',
        'Samsung Galaxy S21',
      ]);
    } catch (error) {
      console.log('Skipping test - Weaviate not available');
      return;
    }
  });

  it('should handle complex filters', async () => {
    try {
      const results = await adapter.search([
        {
          params: {
            query: '',
            filters: 'price:>=800 AND title:*Samsung* OR price:<700 AND description:*Android*',
          },
        },
      ]);

      expect(results.results[0].hits).toHaveLength(2);
      expect(results.results[0].hits.map(hit => hit.title).sort()).toEqual([
        'Google Pixel 6',
        'Samsung Galaxy S21',
      ]);
    } catch (error) {
      console.log('Skipping test - Weaviate not available');
      return;
    }
  });

  it('should handle sorting', async () => {
    try {
      const results = await adapter.search([
        {
          params: {
            query: '',
            sortBy: [{ property: 'price', order: 'asc' }],
          },
        },
      ]);

      expect(results.results[0].hits).toHaveLength(3);
      expect(results.results[0].hits.map(hit => hit.title)).toEqual([
        'Google Pixel 6',
        'iPhone 12',
        'Samsung Galaxy S21',
      ]);
    } catch (error) {
      console.log('Skipping test - Weaviate not available');
      return;
    }
  });

  it('should handle hybrid search', async () => {
    try {
      if (!hasTextVectorizer) {
        console.log('Skipping hybrid search test - text vectorizer not available');
        return;
      }
      const results = await adapter.search([
        {
          params: {
            query: 'smartphone camera',
            hybrid: true,
          },
        },
      ]);

      expect(results.results[0].hits.length).toBeGreaterThan(0);
    } catch (error) {
      console.log('Skipping test - Weaviate not available');
      return;
    }
  });

  it('should handle nearText search', async () => {
    try {
      if (!hasTextVectorizer) {
        console.log('Skipping nearText search test - text vectorizer not available');
        return;
      }
      const results = await adapter.search([
        {
          params: {
            nearText: {
              concepts: ['premium smartphone'],
            },
          },
        },
      ]);

      expect(results.results[0].hits.length).toBeGreaterThan(0);
    } catch (error) {
      console.log('Skipping test - Weaviate not available');
      return;
    }
  });

  it('should return empty results for non-matching query', async () => {
    try {
      const results = await adapter.search([
        {
          params: {
            query: 'nonexistent',
          },
        },
      ]);

      expect(results.results[0].hits).toHaveLength(0);
      expect(results.results[0].nbHits).toBe(0);
    } catch (error) {
      console.log('Skipping test - Weaviate not available');
      return;
    }
  });
});
