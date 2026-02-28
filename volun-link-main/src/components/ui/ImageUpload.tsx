import { useState, useCallback } from 'react';
import { Upload, X, ImageIcon, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './button';
import { Alert, AlertDescription } from './alert';

interface ImageUploadProps {
  maxImages?: number;
  maxSizeMB?: number;
  onImagesChange: (images: File[]) => void;
  existingImages?: string[];
  className?: string;
}

const ImageUpload = ({
  maxImages = 10,
  maxSizeMB = 5,
  onImagesChange,
  existingImages = [],
  className = '',
}: ImageUploadProps) => {
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>('');
  const [dragActive, setDragActive] = useState(false);

  const validateFile = (file: File): string | null => {
    // Check file type
    if (!file.type.startsWith('image/')) {
      return 'Only image files are allowed';
    }

    // Check file size
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
      return `Image size must be less than ${maxSizeMB}MB`;
    }

    return null;
  };

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;

      setError('');
      const fileArray = Array.from(files);

      // Check total images limit
      if (images.length + fileArray.length + existingImages.length > maxImages) {
        setError(`You can only upload up to ${maxImages} images`);
        return;
      }

      // Validate each file
      const validFiles: File[] = [];
      const newPreviews: string[] = [];

      for (const file of fileArray) {
        const validationError = validateFile(file);
        if (validationError) {
          setError(validationError);
          continue;
        }

        validFiles.push(file);

        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            newPreviews.push(e.target.result as string);
            if (newPreviews.length === validFiles.length) {
              setPreviews((prev) => [...prev, ...newPreviews]);
            }
          }
        };
        reader.readAsDataURL(file);
      }

      if (validFiles.length > 0) {
        const updatedImages = [...images, ...validFiles];
        setImages(updatedImages);
        onImagesChange(updatedImages);
      }
    },
    [images, maxImages, maxSizeMB, onImagesChange, existingImages.length]
  );

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  };

  const removeImage = (index: number) => {
    const updatedImages = images.filter((_, i) => i !== index);
    const updatedPreviews = previews.filter((_, i) => i !== index);
    setImages(updatedImages);
    setPreviews(updatedPreviews);
    onImagesChange(updatedImages);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Drag & Drop Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-lg transition-all duration-300 ${
          dragActive
            ? 'border-primary bg-primary/5 scale-[1.02]'
            : 'border-border hover:border-primary/50'
        }`}
      >
        <input
          type="file"
          id="image-upload"
          multiple
          accept="image/*"
          onChange={(e) => handleFiles(e.target.files)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />

        <div className="p-8 text-center">
          <motion.div
            animate={{
              scale: dragActive ? 1.1 : 1,
              rotate: dragActive ? 5 : 0,
            }}
            transition={{ duration: 0.2 }}
          >
            <Upload
              className={`mx-auto h-12 w-12 mb-4 ${
                dragActive ? 'text-primary' : 'text-muted-foreground'
              }`}
            />
          </motion.div>

          <h3 className="text-lg font-semibold mb-2">
            {dragActive ? 'Drop images here' : 'Upload Event Photos'}
          </h3>

          <p className="text-sm text-muted-foreground mb-4">
            Drag and drop or click to browse
          </p>

          <p className="text-xs text-muted-foreground">
            Maximum {maxImages} images • Up to {maxSizeMB}MB each • JPG, PNG, GIF
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Image Previews */}
      <AnimatePresence>
        {(previews.length > 0 || existingImages.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
          >
            {/* Existing Images */}
            {existingImages.map((url, index) => (
              <motion.div
                key={`existing-${index}`}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
                className="relative group aspect-square"
              >
                <img
                  src={url}
                  alt={`Event ${index + 1}`}
                  className="w-full h-full object-cover rounded-lg border-2 border-border"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm">Existing</span>
                </div>
              </motion.div>
            ))}

            {/* New Image Previews */}
            {previews.map((preview, index) => (
              <motion.div
                key={`new-${index}`}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
                className="relative group aspect-square"
              >
                <img
                  src={preview}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-full object-cover rounded-lg border-2 border-primary"
                />

                {/* Remove Button */}
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                  onClick={() => removeImage(index)}
                >
                  <X className="h-4 w-4" />
                </Button>

                {/* Upload Progress Overlay (simulated) */}
                {uploading && (
                  <div className="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center">
                    <Loader2 className="h-8 w-8 text-white animate-spin" />
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Images Count */}
      {(previews.length > 0 || existingImages.length > 0) && (
        <p className="text-sm text-muted-foreground text-center">
          {previews.length + existingImages.length} of {maxImages} images uploaded
        </p>
      )}
    </div>
  );
};

export default ImageUpload;
