import { v2 as cloudinary } from 'cloudinary';

const configureCloudinary = () => {
  if (process.env.CLOUDINARY_CLOUD_NAME) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true
    });
    console.log('☁️ Cloudinary configured');
  } else {
    console.log('⚠️ Cloudinary not configured (optional)');
  }
};

export { cloudinary, configureCloudinary };
