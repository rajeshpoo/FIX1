
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Cloud, UploadCloud, DownloadCloud, Loader2, AlertTriangle, ChevronRight, FileJson } from 'lucide-react';
import { prepareBackupData, restoreFromBackup } from '../utils/backupUtils';
import { notify, uploadBackupToDrive, listBackupsFromDrive, downloadBackupFromDrive } from '../services/firebaseService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  uid: string;
}

export const CloudBackupModal: React.FC<Props> = ({ isOpen, onClose, uid }) => {
  const [view, setView] = useState<'MAIN' | 'LIST' | 'CONFIRM'>('MAIN');
  const [loading, setLoading] = useState<boolean>(false);
  const [backups, setBackups] = useState<any[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleBackup = async () => {
      setLoading(true);
      notify("Processing", "Uploading to Drive...", "info");
      try {
          const { jsonString, fileName } = await prepareBackupData(uid);
          await uploadBackupToDrive(jsonString, fileName);
          notify("Success", "Backup saved to Cloud.", "success");
          onClose(); // Auto close on success
      } catch (err: any) {
          console.error("Backup Error:", err);
          notify("Failed", err.message || "Upload Error", "error");
      } finally {
          setLoading(false);
      }
  };

  const handleFetchList = async () => {
      setLoading(true);
      try {
          const files = await listBackupsFromDrive();
          if (files.length === 0) {
              notify("No Backups", "No FleetDost backups found in Drive.", "warning");
          } else {
              setBackups(files);
              setView('LIST');
          }
      } catch (err: any) {
          notify("Error", "Could not list files. Check Permissions.", "error");
      } finally {
          setLoading(false);
      }
  };

  const initRestore = (fileId: string) => {
      setSelectedFileId(fileId);
      setView('CONFIRM');
  };

  const executeRestore = async () => {
      if (!selectedFileId) return;
      
      setLoading(true);
      notify("Downloading", "Fetching backup file...", "info");
      try {
          const data = await downloadBackupFromDrive(selectedFileId);
          await restoreFromBackup(uid, data);
          notify("Restored", "Data merged successfully! Reloading...", "success");
          setTimeout(() => window.location.reload(), 1500);
      } catch (err: any) {
          notify("Error", "Restore failed.", "error");
          console.error(err);
          setLoading(false);
          setView('LIST');
      }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9000] flex items-center justify-center p-6 animate-fade-in font-sans">
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative w-full max-w-sm bg-white dark:bg-slate-950 rounded-[2.5rem] shadow-2xl animate-pop-in border border-slate-100 dark:border-white/5 overflow-hidden">
        
        {/* Header */}
        <div className="p-6 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 text-center relative">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 text-blue-600 rounded-[1.5rem] flex items-center justify-center mx-auto mb-4 shadow-inner">
                <Cloud size={32} />
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Google Drive Sync</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                {view === 'LIST' ? 'Select File to Restore' : view === 'CONFIRM' ? 'Confirm Action' : 'Secure Cloud Storage'}
            </p>
            <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-white dark:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                <X size={18} />
            </button>
        </div>

        <div className="p-6 space-y-6">
            {view === 'MAIN' && (
                <>
                    {/* Backup Action */}
                    <div onClick={loading ? undefined : handleBackup} className="group cursor-pointer">
                        <div className="p-5 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-800 flex items-center gap-4 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all hover:border-blue-500">
                            <div className="p-3 bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-500/30">
                                <UploadCloud size={24} />
                            </div>
                            <div>
                                <h4 className="font-black text-slate-900 dark:text-white">Backup Now</h4>
                                <p className="text-[10px] font-bold text-slate-400">Upload current data to Drive</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="h-px bg-slate-100 dark:bg-slate-800 flex-1"></div>
                        <span className="text-[9px] font-black text-slate-300 uppercase">OR</span>
                        <div className="h-px bg-slate-100 dark:bg-slate-800 flex-1"></div>
                    </div>

                    {/* Restore Action */}
                    <div onClick={loading ? undefined : handleFetchList} className="group cursor-pointer">
                        <div className="p-5 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-800 flex items-center gap-4 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-all hover:border-emerald-500">
                            <div className="p-3 bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-500/30">
                                <DownloadCloud size={24} />
                            </div>
                            <div>
                                <h4 className="font-black text-slate-900 dark:text-white">Restore from Cloud</h4>
                                <p className="text-[10px] font-bold text-slate-400">Browse Google Drive backups</p>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {view === 'LIST' && (
                <div className="space-y-3 max-h-[300px] overflow-y-auto no-scrollbar">
                    {backups.map(file => (
                        <div key={file.id} onClick={() => !loading && initRestore(file.id)} className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <FileJson size={18} className="text-slate-400 shrink-0" />
                                <div className="min-w-0">
                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{file.name}</p>
                                    <p className="text-[9px] font-mono text-slate-400">
                                        {new Date(file.createdTime).toLocaleDateString()} • {(parseInt(file.size)/1024).toFixed(1)} KB
                                    </p>
                                </div>
                            </div>
                            <ChevronRight size={14} className="text-slate-300" />
                        </div>
                    ))}
                    <button onClick={() => setView('MAIN')} className="w-full py-3 text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600">Back</button>
                </div>
            )}

            {view === 'CONFIRM' && (
                <div className="text-center animate-slide-up">
                    <div className="w-16 h-16 bg-amber-50 dark:bg-amber-900/20 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-100 dark:border-amber-900/30">
                        <AlertTriangle size={32} strokeWidth={2} />
                    </div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">Merge Data?</h3>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed mb-6 px-4">
                        This will download the backup and <span className="font-bold text-slate-800 dark:text-slate-200">merge</span> it with your current data. Newer entries will be preserved.
                    </p>
                    
                    <div className="grid grid-cols-2 gap-3">
                        <button 
                            onClick={() => setView('LIST')} 
                            className="py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold text-xs uppercase tracking-wider active:scale-95 transition-all"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={executeRestore} 
                            className="py-3 rounded-2xl bg-indigo-600 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-indigo-500/30 active:scale-95 transition-all"
                        >
                            Confirm
                        </button>
                    </div>
                </div>
            )}

            {loading && (
                <div className="absolute inset-0 bg-white/80 dark:bg-slate-950/80 flex items-center justify-center backdrop-blur-sm z-50">
                    <Loader2 size={32} className="animate-spin text-indigo-600" />
                </div>
            )}

            {view === 'MAIN' && (
                <div className="bg-amber-50 dark:bg-amber-900/10 p-3 rounded-xl flex gap-3 border border-amber-100 dark:border-amber-900/30">
                    <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-[9px] font-bold text-amber-700 dark:text-amber-400 leading-relaxed">
                        Drive Permission is "Just-in-Time". We ask only when you click these buttons.
                    </p>
                </div>
            )}
        </div>
      </div>
    </div>,
    document.body
  );
};
