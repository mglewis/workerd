// Copyright (c) 2024 Cloudflare, Inc.
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

type ImageInfoResponse =
  | { format: 'image/svg+xml' }
  | {
      format: string;
      fileSize: number;
      width: number;
      height: number;
    };

type ImageTransform = {
  fit?: 'scale-down' | 'contain' | 'pad' | 'squeeze' | 'cover' | 'crop';
  gravity?:
    | 'left'
    | 'right'
    | 'top'
    | 'bottom'
    | 'center'
    | 'auto'
    | 'entropy'
    | 'face'
    | {
        x?: number;
        y?: number;
        mode: 'remainder' | 'box-center';
      };
  trim?: {
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
    width?: number;
    height?: number;
    border?:
      | boolean
      | {
          color?: string;
          tolerance?: number;
          keep?: number;
        };
  };
  width?: number;
  height?: number;
  background?: string;
  rotate?: number;
  sharpen?: number;
  blur?: number;
  contrast?: number;
  brightness?: number;
  gamma?: number;
  border?: {
    color?: string;
    width?: number;
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  };
  zoom?: number;
};

type ImageDrawOptions = {
  opacity?: number;
  repeat?: boolean | string;
  top?: number;
  left?: number;
  bottom?: number;
  right?: number;
};

type ImageOutputOptions = {
  format:
    | 'image/jpeg'
    | 'image/png'
    | 'image/gif'
    | 'image/webp'
    | 'image/avif'
    | 'rgb'
    | 'rgba';
  quality?: number;
  background?: string;
};

/**
 * Metadata for a hosted image
 */
interface ImageMetadata {
  id: string;
  filename?: string;
  uploaded?: string;
  requireSignedURLs: boolean;
  meta?: Record<string, unknown>;
  variants: string[];
  draft?: boolean;
  creator?: string;
}

/**
 * Options for uploading an image
 */
interface ImageUploadOptions {
  id?: string;
  filename?: string;
  requireSignedURLs?: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Options for updating image metadata
 */
interface ImageUpdateOptions {
  requireSignedURLs?: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Options for listing images
 */
interface ImageListOptions {
  limit?: number;
  cursor?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Result of listing images
 */
interface ImageList {
  images: ImageMetadata[];
  cursor?: string;
  listComplete: boolean;
}

interface ImagesBinding {
  /**
   * Get image metadata (type, width and height)
   * @throws {@link ImagesError} with code 9412 if input is not an image
   * @param stream The image bytes
   */
  info(stream: ReadableStream<Uint8Array>): Promise<ImageInfoResponse>;

  /**
   * Begin applying a series of transformations to an image
   * @param stream The image bytes
   * @returns A transform handle
   */
  input(stream: ReadableStream<Uint8Array>): ImageTransformer;

  /**
   * Get metadata for a hosted image
   * @param imageId The ID of the image (UUID or custom ID)
   * @returns Image metadata, or null if not found
   */
  get(imageId: string): Promise<ImageMetadata | null>;

  /**
   * Get the raw image data for a hosted image
   * @param imageId The ID of the image (UUID or custom ID)
   * @returns ReadableStream of image bytes, or null if not found
   */
  getImage(imageId: string): Promise<ReadableStream<Uint8Array> | null>;

  /**
   * Upload a new hosted image
   * @param image The image file to upload
   * @param options Upload configuration
   * @returns Metadata for the uploaded image
   * @throws {@link ImagesError} if upload fails
   */
  upload(
    image: ReadableStream<Uint8Array> | ArrayBuffer,
    options?: ImageUploadOptions
  ): Promise<ImageMetadata>;

  /**
   * Update hosted image metadata
   * @param imageId The ID of the image
   * @param options Properties to update
   * @returns Updated image metadata
   * @throws {@link ImagesError} if update fails
   */
  update(imageId: string, options: ImageUpdateOptions): Promise<ImageMetadata>;

  /**
   * Delete a hosted image
   * @param imageId The ID of the image
   * @returns True if deleted, false if not found
   */
  delete(imageId: string): Promise<boolean>;

  /**
   * List hosted images with pagination
   * @param options List configuration
   * @returns List of images with pagination info
   * @throws {@link ImagesError} if list fails
   */
  list(options?: ImageListOptions): Promise<ImageList>;
}

interface ImageTransformer {
  /**
   * Apply transform next, returning a transform handle.
   * You can then apply more transformations, draw, or retrieve the output.
   * @param transform
   */
  transform(transform: ImageTransform): ImageTransformer;

  /**
   * Draw an image on this transformer, returning a transform handle.
   * You can then apply more transformations, draw, or retrieve the output.
   * @param image The image (or transformer that will give the image) to draw
   * @param options The options configuring how to draw the image
   */
  draw(
    image: ReadableStream<Uint8Array> | ImageTransformer,
    options?: ImageDrawOptions
  ): ImageTransformer;

  /**
   * Retrieve the image that results from applying the transforms to the
   * provided input
   * @param options Options that apply to the output e.g. output format
   */
  output(options: ImageOutputOptions): Promise<ImageTransformationResult>;
}

interface ImageTransformationResult {
  /**
   * The image as a response, ready to store in cache or return to users
   */
  response(): Response;
  /**
   * The content type of the returned image
   */
  contentType(): string;
  /**
   * The bytes of the response
   */
  image(): ReadableStream<Uint8Array>;
}

interface ImagesError extends Error {
  readonly code: number;
  readonly message: string;
  readonly stack?: string;
}
