// Copyright (c) 2024 Cloudflare, Inc.
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0
// @ts-ignore
import * as assert from 'node:assert';

function inputStream(body) {
  return new Blob([body]).stream();
}

/**
 * @typedef {{'images': ImagesBinding}} Env
 *
 */

export const test_images_info_bitmap = {
  /**
   * @param {unknown} _
   * @param {Env} env
   */
  async test(_, env) {
    const info = await env.images.info(inputStream('png'));
    assert.deepStrictEqual(info, {
      format: 'image/png',
      fileSize: 123,
      width: 123,
      height: 123,
    });
  },
};

export const test_images_info_svg = {
  /**
   * @param {unknown} _
   * @param {Env} env
   */
  async test(_, env) {
    const info = await env.images.info(inputStream('<svg></svg>'));
    assert.deepStrictEqual(info, {
      format: 'image/svg+xml',
    });
  },
};

export const test_images_info_error = {
  /**
   * @param {unknown} _
   * @param {Env} env
   */
  async test(_, env) {
    /**
     * @type {any} e;
     */
    let e;

    try {
      await env.images.info(inputStream('BAD'));
    } catch (e2) {
      e = e2;
    }

    assert.equal(true, !!e);
    assert.equal(e.code, 123);
    assert.equal(e.message, 'IMAGES_INFO_ERROR 123: Bad request');
  },
};

export const test_images_transform = {
  /**
   * @param {unknown} _
   * @param {Env} env
   */

  async test(_, env) {
    const blob = new Blob(['png']);

    const result = await env.images
      .input(blob.stream())
      .transform({ rotate: 90 })
      .output({ format: 'image/avif' });

    // Would be image/avif in real life, but mock always returns JSON
    assert.equal(result.contentType(), 'application/json');
    const body = await result.response().json();

    assert.deepStrictEqual(body, {
      image: 'png',
      output_format: 'image/avif',
      transforms: [{ imageIndex: 0, rotate: 90 }],
    });
  },
};

export const test_images_nested_draw = {
  /**
   * @param {unknown} _
   * @param {Env} env
   */

  async test(_, env) {
    const result = await env.images
      .input(inputStream('png'))
      .transform({ rotate: 90 })
      .draw(env.images.input(inputStream('png1')).transform({ rotate: 180 }))
      .draw(
        env.images
          .input(inputStream('png2'))
          .draw(inputStream('png3'))
          .transform({ rotate: 270 })
      )
      .draw(inputStream('png4'))
      .output({ format: 'image/avif' });

    // Would be image/avif in real life, but mock always returns JSON
    assert.equal(result.contentType(), 'application/json');
    const body = await result.response().json();

    assert.deepStrictEqual(body, {
      image: 'png',
      draw_image: ['png1', 'png2', 'png3', 'png4'],
      output_format: 'image/avif',
      transforms: [
        { imageIndex: 0, rotate: 90 },
        { imageIndex: 1, rotate: 180 },
        { drawImageIndex: 1, targetImageIndex: 0 },
        { drawImageIndex: 3, targetImageIndex: 2 },
        { imageIndex: 2, rotate: 270 },
        { drawImageIndex: 2, targetImageIndex: 0 },
        { drawImageIndex: 4, targetImageIndex: 0 },
      ],
    });
  },
};

export const test_images_transformer_draw_twice_disallowed = {
  /**
   * @param {unknown} _
   * @param {Env} env
   */

  async test(_, env) {
    /**
     * @type {any} e;
     */
    let e;

    let t = env.images.input(inputStream('png1'));

    try {
      await env.images
        .input(inputStream('png'))
        .draw(t)
        .draw(t)
        .output({ format: 'image/avif' });
    } catch (e1) {
      e = e1;
    }

    assert.equal(true, !!e);
    assert.equal(e.code, 9525);
    assert.equal(
      e.message,
      'IMAGES_TRANSFORM_ERROR 9525: ImageTransformer consumed; you may only call .output() or draw a transformer once'
    );
  },
};

export const test_images_transformer_already_consumed_disallowed = {
  /**
   * @param {unknown} _
   * @param {Env} env
   */

  async test(_, env) {
    /**
     * @type {any} e;
     */
    let e;

    let t = env.images.input(inputStream('png1'));

    await t.output({});

    try {
      await env.images
        .input(inputStream('png'))
        .draw(t)
        .output({ format: 'image/avif' });
    } catch (e1) {
      e = e1;
    }

    assert.equal(true, !!e);
    assert.equal(e.code, 9525);
    assert.equal(
      e.message,
      'IMAGES_TRANSFORM_ERROR 9525: ImageTransformer consumed; you may only call .output() or draw a transformer once'
    );
  },
};

export const test_images_transform_bad = {
  /**
   * @param {unknown} _
   * @param {Env} env
   */

  async test(_, env) {
    /**
     * @type {any} e;
     */
    let e;

    try {
      await env.images
        .input(inputStream('BAD'))
        .transform({ rotate: 90 })
        .output({ format: 'image/avif' });
    } catch (e2) {
      e = e2;
    }

    assert.equal(true, !!e);
    assert.equal(e.code, 123);
    assert.equal(e.message, 'IMAGES_TRANSFORM_ERROR 123: Bad request');
  },
};

export const test_images_transform_consumed = {
  /**
   * @param {unknown} _
   * @param {Env} env
   */

  async test(_, env) {
    /**
     * @type {any} e;
     */
    let e;

    try {
      let transformer = env.images
        .input(inputStream('png'))
        .transform({ rotate: 90 });

      await transformer.output({ format: 'image/avif' });
      await transformer.output({ format: 'image/avif' });
    } catch (e2) {
      e = e2;
    }

    assert.equal(true, !!e);
    assert.equal(e.code, 9525);
    assert.equal(
      e.message,
      'IMAGES_TRANSFORM_ERROR 9525: ImageTransformer consumed; you may only call .output() or draw a transformer once'
    );
  },
};

// ===== RPC Method Tests =====

// GET metadata
export const test_images_get_success = {
  /**
   * @param {unknown} _
   * @param {Env} env
   */
  async test(_, env) {
    const metadata = await env.images.get('test-image-id');
    assert.notEqual(metadata, null);
    assert.equal(metadata.id, 'test-image-id');
    assert.equal(metadata.filename, 'test.jpg');
    assert.equal(metadata.requireSignedURLs, false);
  },
};

export const test_images_get_not_found = {
  /**
   * @param {unknown} _
   * @param {Env} env
   */
  async test(_, env) {
    const metadata = await env.images.get('not-found');
    assert.equal(metadata, null);
  },
};

// GET image blob
export const test_images_getImage_success = {
  /**
   * @param {unknown} _
   * @param {Env} env
   */
  async test(_, env) {
    const stream = await env.images.getImage('test-image-id');
    assert.notEqual(stream, null);

    // Read and verify stream content
    const reader = stream.getReader();
    let result = '';
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      result += new TextDecoder().decode(value);
    }

    assert.equal(result, 'MOCK_IMAGE_DATA_test-image-id');
  },
};

export const test_images_getImage_not_found = {
  /**
   * @param {unknown} _
   * @param {Env} env
   */
  async test(_, env) {
    const stream = await env.images.getImage('not-found');
    assert.equal(stream, null);
  },
};

// UPLOAD
export const test_images_upload_with_options = {
  /**
   * @param {unknown} _
   * @param {Env} env
   */
  async test(_, env) {
    const imageData = new Blob(['test image']).stream();
    const metadata = await env.images.upload(imageData, {
      id: 'custom-id',
      filename: 'upload-test.jpg',
      requireSignedURLs: true,
      metadata: { key: 'value' },
    });

    assert.equal(metadata.id, 'custom-id');
    assert.equal(metadata.filename, 'upload-test.jpg');
    assert.equal(metadata.requireSignedURLs, true);
    assert.deepStrictEqual(metadata.meta, { key: 'value' });
  },
};

export const test_images_upload_arraybuffer = {
  /**
   * @param {unknown} _
   * @param {Env} env
   */
  async test(_, env) {
    const buffer = new TextEncoder().encode('test image').buffer;
    const metadata = await env.images.upload(buffer);

    assert.notEqual(metadata, null);
    assert.equal(typeof metadata.id, 'string');
  },
};

// UPDATE
export const test_images_update_success = {
  /**
   * @param {unknown} _
   * @param {Env} env
   */
  async test(_, env) {
    const metadata = await env.images.update('test-image-id', {
      requireSignedURLs: true,
      metadata: { updated: true },
    });

    assert.equal(metadata.id, 'test-image-id');
    assert.equal(metadata.requireSignedURLs, true);
    assert.deepStrictEqual(metadata.meta, { updated: true });
  },
};

export const test_images_update_not_found = {
  /**
   * @param {unknown} _
   * @param {Env} env
   */
  async test(_, env) {
    /**
     * @type {any} e;
     */
    let e;
    try {
      await env.images.update('not-found', { requireSignedURLs: true });
    } catch (err) {
      e = err;
    }
    assert.notEqual(e, undefined);
    assert.equal(e.message.includes('not found'), true);
  },
};

// DELETE
export const test_images_delete_success = {
  /**
   * @param {unknown} _
   * @param {Env} env
   */
  async test(_, env) {
    const result = await env.images.delete('test-image-id');
    assert.equal(result, true);
  },
};

export const test_images_delete_not_found = {
  /**
   * @param {unknown} _
   * @param {Env} env
   */
  async test(_, env) {
    const result = await env.images.delete('not-found');
    assert.equal(result, false);
  },
};

// LIST
export const test_images_list_default = {
  /**
   * @param {unknown} _
   * @param {Env} env
   */
  async test(_, env) {
    const result = await env.images.list();

    assert.notEqual(result.images, null);
    assert.equal(Array.isArray(result.images), true);
    assert.equal(result.images.length, 2);
    assert.equal(result.listComplete, true);
  },
};

export const test_images_list_with_options = {
  /**
   * @param {unknown} _
   * @param {Env} env
   */
  async test(_, env) {
    const result = await env.images.list({
      limit: 1,
      sortOrder: 'asc',
    });

    assert.equal(result.images.length, 1);
    // TODO(IMAGES-2032): Test cursor once pagination is implemented
  },
};
