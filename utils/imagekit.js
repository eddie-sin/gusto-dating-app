const ImageKit = require("imagekit");

// Lazy initialization - only create instance when needed and env vars are available
let imagekitInstance = null;

const getImageKit = () => {
  if (!imagekitInstance) {
    if (
      !process.env.IMAGEKIT_PUBLIC_KEY ||
      !process.env.IMAGEKIT_PRIVATE_KEY ||
      !process.env.IMAGEKIT_URL_ENDPOINT
    ) {
      throw new Error(
        "ImageKit environment variables are missing. Please configure IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, and IMAGEKIT_URL_ENDPOINT."
      );
    }
    imagekitInstance = new ImageKit({
      publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
      privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
      urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
    });
  }
  return imagekitInstance;
};

// Export the function so initialization happens when called (after env vars are loaded)
module.exports = getImageKit;
