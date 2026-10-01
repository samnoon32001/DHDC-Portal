import React, { useState, useRef, type DragEvent, type ChangeEvent } from 'react';
import { Upload, X, Image as ImageIcon, Link as LinkIcon, CheckCircle2, AlertCircle } from 'lucide-react';
import { processImageFile, formatFileSize } from '../../utils/imageUtils';

interface ImageUploadFieldProps {
  id?: string;
  label?: string;
  value?: string;
  onChange: (value: string) => void;
  helperText?: string;
  aspectRatio?: 'square' | 'portrait';
  maxSizeBytes?: number;
}

export const ImageUploadField: React.FC<ImageUploadFieldProps> = ({
  id = 'image-upload-field',
  label = 'Student Photo',
  value = '',
  onChange,
  helperText,
  aspectRatio = 'square',
  maxSizeBytes = 5 * 1024 * 1024, // 5MB source limit
}) => {
  const [mode, setMode] = useState<'upload' | 'url'>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedInfo, setUploadedInfo] = useState<{ name: string; size: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError(null);

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (JPEG, PNG, WEBP, or HEIC).');
      return;
    }

    if (file.size > maxSizeBytes) {
      setError(`File size is too large. Max allowed: ${formatFileSize(maxSizeBytes)}.`);
      return;
    }

    setIsProcessing(true);
    try {
      // Compress and resize appropriately for avatar/topper slides
      const result = await processImageFile(file, {
        maxWidth: 640,
        maxHeight: 640,
        quality: 0.88,
      });

      onChange(result.dataUrl);
      setUploadedInfo({ name: file.name, size: result.sizeBytes });
    } catch (err: any) {
      console.error('Error processing image upload:', err);
      setError(err?.message || 'Failed to process selected image.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleFile(file);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      handleFile(file);
    }
  };

  const handleClear = () => {
    onChange('');
    setUploadedInfo(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      {/* Header with Mode Switching (File Upload vs URL fallback) */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
          {label}
        </label>
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[11px] font-medium">
          <button
            type="button"
            onClick={() => setMode('upload')}
            className={`px-2 py-0.5 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
              mode === 'upload'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 font-bold shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Upload className="w-3 h-3" />
            Upload File
          </button>
          <button
            type="button"
            onClick={() => setMode('url')}
            className={`px-2 py-0.5 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
              mode === 'url'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 font-bold shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <LinkIcon className="w-3 h-3" />
            Web URL
          </button>
        </div>
      </div>

      {mode === 'upload' ? (
        <div className="space-y-2">
          {/* Active Preview / Drop Zone */}
          {value ? (
            <div className="relative flex items-center gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
              {/* Thumbnail */}
              <div
                className={`relative overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0 ${
                  aspectRatio === 'square' ? 'w-16 h-16' : 'w-14 h-18'
                }`}
              >
                <img
                  src={value}
                  alt="Student photo preview"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Meta details */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Photo Ready</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {uploadedInfo?.name || 'Image attached and optimized'}
                </p>
                {uploadedInfo && (
                  <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                    Optimized size: {formatFileSize(uploadedInfo.size)}
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                >
                  Replace
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                  title="Remove Photo"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-xl p-4 sm:p-5 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                isDragging
                  ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/30'
                  : 'border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:border-slate-400'
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-2 shadow-xs">
                {isProcessing ? (
                  <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Upload className="w-5 h-5" />
                )}
              </div>

              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                {isProcessing ? 'Optimizing photo...' : 'Click to upload photo or drag & drop'}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                PNG, JPG, WEBP up to 5MB (automatically resized & compressed)
              </p>
            </div>
          )}

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            id={`${id}-file-input`}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/jpg,image/heic"
            onChange={handleInputChange}
            className="hidden"
          />
        </div>
      ) : (
        /* Direct URL input mode for web links / CDNs */
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              id={`${id}-url-input`}
              type="url"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Paste direct photo link (https://...)"
              className="flex-1 px-3.5 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100"
            />
            {value && (
              <button
                type="button"
                onClick={handleClear}
                className="p-2 text-slate-400 hover:text-rose-500 rounded-lg cursor-pointer"
                title="Clear URL"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {value && (
            <div className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-700 shrink-0">
                <img
                  src={value}
                  alt="Preview"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                  onError={() => setError('Unable to load image from this URL.')}
                />
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate flex-1">
                Live URL Preview
              </span>
            </div>
          )}
        </div>
      )}

      {/* Error alert */}
      {error && (
        <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 text-xs font-medium">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Helper text explaining storage */}
      {helperText && (
        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
          {helperText}
        </p>
      )}
    </div>
  );
};
