export const optimizeImage = async (
  imageDataUrl: string,
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.8,
  maxSizeKB = 100
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // Calculate new dimensions maintaining aspect ratio
      let width = img.width;
      let height = img.height;
      
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round(height * (maxWidth / width));
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round(width * (maxHeight / height));
          height = maxHeight;
        }
      }

      // Create canvas and resize image
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Draw image with smooth scaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to compressed JPEG
      let optimizedDataUrl = canvas.toDataURL('image/jpeg', quality);
      
      // Check size and recursively optimize if needed
      const checkSize = () => {
        const sizeInBytes = Math.round((optimizedDataUrl.length * 3) / 4);
        const sizeInKB = sizeInBytes / 1024;
        
        if (sizeInKB > maxSizeKB && quality > 0.1) {
          quality -= 0.1;
          optimizedDataUrl = canvas.toDataURL('image/jpeg', quality);
          checkSize();
        }
      };
      
      checkSize();
      resolve(optimizedDataUrl);
    };
    
    img.onerror = reject;
    img.src = imageDataUrl;
  });
};

export const optimizeProfilePicture = async (dataUrl: string): Promise<string> => {
  try {
    // Create a canvas element
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    // Create an image element
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = dataUrl;
    });

    // Calculate dimensions (maintain aspect ratio, max 100x100)
    const maxSize = 100;
    let width = img.width;
    let height = img.height;

    if (width > height) {
      if (width > maxSize) {
        height = Math.round(height * (maxSize / width));
        width = maxSize;
      }
    } else {
      if (height > maxSize) {
        width = Math.round(width * (maxSize / height));
        height = maxSize;
      }
    }

    // Set canvas dimensions
    canvas.width = width;
    canvas.height = height;

    // Draw image with smooth scaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, width, height);

    // Start with high quality and reduce until size is under 20KB
    let quality = 0.8;
    let optimizedDataUrl = canvas.toDataURL('image/jpeg', quality);
    
    while (true) {
      const sizeInBytes = Math.round((optimizedDataUrl.length * 3) / 4);
      const sizeInKB = sizeInBytes / 1024;
      
      if (sizeInKB <= 20 || quality <= 0.1) break;
      
      quality -= 0.1;
      optimizedDataUrl = canvas.toDataURL('image/jpeg', quality);
    }

    return optimizedDataUrl;
  } catch (error) {
    console.error('Error optimizing profile picture:', error);
    throw error;
  }
};

// Function to optimize images for payment slips
export const optimizeImageForPaymentSlip = async (dataUrl: string): Promise<string> => {
  return optimizeImage(dataUrl, 800, 800, 0.8, 100);
}; 