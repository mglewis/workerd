// Copyright (c) 2025 Cloudflare, Inc.
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

import { WorkerEntrypoint } from 'cloudflare:workers';

// Mock implementing RPC methods just like real edge-API
export class ServiceEntrypoint extends WorkerEntrypoint {
  async get(imageId) {
    if (imageId === 'not-found') {
      return null;
    }

    return {
      id: imageId,
      filename: 'test.jpg',
      uploaded: '2024-01-01T00:00:00Z',
      requireSignedURLs: false,
      variants: ['public'],
      meta: {},
      draft: false,
    };
  }

  async getImage(imageId) {
    if (imageId === 'not-found') {
      return null;
    }

    const mockData = `MOCK_IMAGE_DATA_${imageId}`;
    return new Blob([mockData]).stream();
  }

  async upload(uploadData) {
    if (
      uploadData.file &&
      uploadData.file.data &&
      uploadData.file.data.toString() === 'INVALID'
    ) {
      throw new Error('Invalid image data');
    }

    return {
      id: uploadData.id || 'generated-id',
      filename: uploadData.file?.filename || 'uploaded.jpg',
      uploaded: '2024-01-01T00:00:00Z',
      requireSignedURLs: uploadData.requireSignedURLs || false,
      variants: ['public'],
      meta: uploadData.metadata || {},
      draft: false,
    };
  }

  async update(imageId, body) {
    if (imageId === 'not-found') {
      throw new Error('Image not found');
    }

    return {
      id: imageId,
      filename: 'updated.jpg',
      uploaded: '2024-01-01T00:00:00Z',
      requireSignedURLs:
        body.requireSignedURLs !== undefined ? body.requireSignedURLs : false,
      variants: ['public'],
      meta: body.metadata || {},
      draft: false,
    };
  }

  async delete(imageId) {
    return imageId !== 'not-found';
  }

  async list(listOptions) {
    // Mock returns small list, no pagination for now
    const images = [
      {
        id: 'image-1',
        filename: 'test1.jpg',
        uploaded: '2024-01-01T00:00:00Z',
        requireSignedURLs: false,
        variants: ['public'],
        meta: {},
      },
      {
        id: 'image-2',
        filename: 'test2.jpg',
        uploaded: '2024-01-02T00:00:00Z',
        requireSignedURLs: false,
        variants: ['public'],
        meta: {},
      },
    ];

    // Apply pagination if requested
    const perPage = listOptions.per_page || 50;

    // Return RPC format (JavaScript conventions: camelCase, cursor instead of continuation_token)
    return {
      images: images.slice(0, perPage),
      cursor: undefined, // No pagination in mock
    };
  }

  // Keep existing fetch() for transform/info tests
  async fetch(request) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Handle transform requests (existing functionality)
    if (pathname.endsWith('/transform')) {
      const formData = await request.formData();
      const image = await formData.get('image').text();
      const transforms = JSON.parse(formData.get('transforms'));
      const output_format = formData.get('output_format');
      const draw_images = formData.getAll('draw_image');

      const result = {
        image,
        output_format,
        transforms,
      };

      if (draw_images.length > 0) {
        result.draw_image = [];
        for (const draw_image of draw_images) {
          result.draw_image.push(await draw_image.text());
        }
      }

      if (image === 'BAD') {
        return new Response('Bad request', {
          status: 400,
          headers: {
            'cf-images-binding': 'err=123',
          },
        });
      }

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      });
    }

    // Handle info requests (existing functionality)
    if (pathname.endsWith('/info')) {
      const formData = await request.formData();
      const image = await formData.get('image').text();

      if (image === 'BAD') {
        return new Response('Bad request', {
          status: 400,
          headers: {
            'cf-images-binding': 'err=123',
          },
        });
      }

      if (image.startsWith('<svg')) {
        return new Response(JSON.stringify({ format: 'image/svg+xml' }), {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        });
      }

      return new Response(
        JSON.stringify({
          format: 'image/png',
          file_size: 123,
          width: 123,
          height: 123,
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        }
      );
    }

    return new Response('Not found', { status: 404 });
  }
}

// Default export for fetch handler
export default {
  async fetch(request, env, ctx) {
    const entrypoint = new ServiceEntrypoint(ctx, env);
    return entrypoint.fetch(request);
  },
};
