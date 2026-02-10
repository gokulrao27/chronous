import React, { useCallback, useState } from 'react';
import { X, Upload, Calendar, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { parseICS } from '../utils/icsParser';
import { CalendarEvent } from '../types';

interface CalendarImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (events: CalendarEvent[]) => void;
}

export const CalendarImportModal: React.FC<CalendarImportModalProps> = ({ isOpen, onClose, onImport }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  }, []);

  const processFile = async (file: File) => {
    setProcessing(true);
    setError(null);
    
    if (!file.name.endsWith('.ics')) {
      setError('Please upload a valid .ics file');
      setProcessing(false);
      return;
    }

    try {
      const events = await parseICS(file);
      if (events.length === 0) {
        setError('No valid events found in this file.');
      } else {
        onImport(events);
        onClose();
      }
    } catch (err) {
      setError('Failed to parse file. Ensure it is a valid calendar export.');
    } finally {
      setProcessing(false);
      setIsDragging(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-text-main/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface border border-stroke rounded-lg w-full max-w-md shadow-2xl animate-slide-up overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-stroke bg-canvas">
          <h2 className="text-lg font-bold text-text-main flex items-center gap-2">
            <Calendar className="h-5 w-5 text-brand-500" />
            Import Calendar
          </h2>
          <button onClick={onClose} className="text-text-sub hover:text-text-main transition-colors p-1 hover:bg-stroke rounded">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-6">
          <p className="text-sm text-text-sub mb-4">
            Drag and drop an <strong>.ics</strong> file from your email invite or calendar export (Google/Outlook) to visualize it on the timeline.
          </p>

          <div 
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
              isDragging 
                ? 'border-brand-500 bg-brand-50' 
                : 'border-stroke hover:border-brand-300 hover:bg-canvas-subtle'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {processing ? (
               <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500 mb-3"></div>
                  <p className="text-sm font-medium text-text-main">Parsing Calendar...</p>
               </div>
            ) : (
              <>
                <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mx-auto mb-3 border border-stroke">
                   <Upload className="w-6 h-6 text-brand-500" />
                </div>
                <p className="text-sm font-bold text-text-main mb-1">Click or drag file to upload</p>
                <p className="text-xs text-text-muted">Supports .ics files</p>
                <input 
                  type="file" 
                  accept=".ics"
                  className="hidden" 
                  id="ics-upload"
                  onChange={handleFileInput}
                />
                <label 
                  htmlFor="ics-upload" 
                  className="mt-4 inline-block px-4 py-2 bg-white border border-stroke rounded shadow-sm text-xs font-semibold text-text-main hover:bg-gray-50 cursor-pointer"
                >
                  Select File
                </label>
              </>
            )}
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
          
          <div className="mt-6 border-t border-stroke pt-4">
            <h4 className="text-xs font-bold text-text-sub uppercase tracking-wide mb-2">How to get an .ics file?</h4>
            <ul className="text-xs text-text-muted space-y-1.5 list-disc pl-4">
               <li><strong>Gmail:</strong> Open email invite &rarr; Click "More Options" (3 dots) &rarr; "Download .ics"</li>
               <li><strong>Outlook:</strong> Drag the calendar event from Outlook to your desktop.</li>
               <li><strong>Google Calendar:</strong> Settings &rarr; Import & Export &rarr; Export.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};