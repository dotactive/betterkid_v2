'use client';
import { useState, useEffect } from 'react';

interface ImagePickerProps {
  folder: string; // e.g., 'banner' or 'thumb'
  selectedImage: string | null; // e.g., '/banner/banner1.jpg'
  onSelect: (image: string | null) => void; // Callback to update parent state
  isOpen: boolean; // Control panel open state from parent
  onClose: () => void; // Callback to close the panel
}

const ImagePicker: React.FC<ImagePickerProps> = ({ folder, selectedImage, onSelect, isOpen, onClose }) => {
  const [images, setImages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Fetch images from the specified folder
  useEffect(() => {
    const fetchImages = async () => {
      try {
        const response = await fetch(`/api/images?folder=${folder}`);
        if (!response.ok) {
          throw new Error('Failed to fetch images');
        }
        const imageList: string[] = await response.json();
        console.log(`Fetched images for folder: ${folder}`, imageList);
        setImages(imageList.filter((img) => img));
      } catch (err) {
        console.error(`Failed to fetch images for ${folder}:`, err);
        setError('Failed to load images');
      }
    };
    fetchImages();
  }, [folder]);

  const handleImageSelect = (image: string | null) => {
    console.log(`Selected image: ${image} for folder: ${folder}`);
    onSelect(image);
    onClose(); // Close panel after selection
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black opacity-50 transition-opacity"
          onClick={onClose}
        />
      )}
      {/* Sliding Panel */}
      <div
        className={`
          fixed top-0 right-0 h-full w-full max-w-md z-50 bg-white shadow-2xl border-l border-gray-200
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
          flex flex-col
        `}
        style={{ pointerEvents: isOpen ? 'auto' : 'none' }}
      >
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h4 className="text-lg font-semibold">Select {folder} Image</h4>
          <button
            className="text-gray-500 hover:text-red-600 text-2xl font-bold"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {error && <p className="text-red-500 mb-2">{error}</p>}
          <div className="flex flex-wrap gap-4">
            {images.length === 0 ? (
              <p className="text-gray-500">No images found in {folder} folder.</p>
            ) : (
              images.map((image) => (
                <div
                  key={image}
                  className={`cursor-pointer border rounded-lg p-1 transition
                    ${selectedImage === image ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-200'}
                  `}
                  onClick={() => handleImageSelect(image)}
                >
                  <img
                    src={image}
                    alt={`${folder} image`}
                    className={folder === 'banner' ? 'w-40 h-auto rounded' : 'w-16 h-16 object-cover rounded'}
                    onError={() => console.warn(`Image not found: ${image}`)}
                  />
                </div>
              ))
            )}
            <button
              onClick={() => handleImageSelect(null)}
              className={`px-3 py-2 rounded font-medium transition
                ${selectedImage === null ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-blue-100'}
              `}
            >
              Clear Selection
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ImagePicker;