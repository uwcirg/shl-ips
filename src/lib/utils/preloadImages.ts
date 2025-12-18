import { INSTANCE_CONFIG } from '$lib/config/instance_config';

export const imagePreload = preloadImages();

function preloadImages() {
  const uris = [`${INSTANCE_CONFIG.imgPath}/company-logo.png`, `${INSTANCE_CONFIG.imgPath}/divider.png`, `${INSTANCE_CONFIG.imgPath}/logo.png`];
  const images = Promise.all(
      uris.map(uri => new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(new Error('Failed to load image from data URI.'));
      img.src = uri;
    })
  ));
  return images;
}