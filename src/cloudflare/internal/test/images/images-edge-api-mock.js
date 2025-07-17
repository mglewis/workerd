// Copyright (c) 2025 Cloudflare, Inc.
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

export default {
  /**
   * @param {Request} request
   */
  async fetch(request) {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const imageId = pathParts[pathParts.length - 1];

    if (imageId === 'not-found') {
      return new Response('Image not found', {
        status: 404,
        headers: {
          'content-type': 'text/plain',
        },
      });
    }

    if (imageId === 'bad-request') {
      return new Response('Bad request', {
        status: 400,
        headers: {
          'content-type': 'text/plain',
        },
      });
    }

    // Mock successful response with image data
    const mockImageData = `MOCK_IMAGE_DATA_${imageId}`;
    return new Response(mockImageData, {
      status: 200,
      headers: {
        'content-type': 'image/jpeg',
        'content-length': mockImageData.length.toString(),
      },
    });
  },
};
