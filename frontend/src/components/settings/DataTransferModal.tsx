import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { SectionCountList } from '@/components/ui/SectionCountList';
import { Icon } from '@/components/ui/Icon';
import { api } from '@/services/api';
import type { DataExportSummaryDto, DataTransferResult } from '@/models';
import { parseExportArchive } from '@/lib/dataTransfer/parseExportArchive';
import { logger } from '@/lib/logger';
import { DATA_TRANSFER_VERSION, buildEmptyExportSummary } from '@/lib/dataTransfer/config';

interface DataTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'export' | 'import';
}

export function DataTransferModal({ isOpen, onClose, initialMode = 'export' }: DataTransferModalProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'export' | 'import'>(initialMode);

  // Export state
  const [summary, setSummary] = useState<DataExportSummaryDto | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Import state
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<DataExportSummaryDto | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<DataTransferResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  const [prevInitialMode, setPrevInitialMode] = useState(initialMode);

  if (isOpen !== prevIsOpen || initialMode !== prevInitialMode) {
    setPrevIsOpen(isOpen);
    setPrevInitialMode(initialMode);
    if (isOpen) {
      setActiveTab(initialMode);
      if (initialMode === 'export') {
        setIsSummaryLoading(true);
      }
    }
  }

  useEffect(() => {
    let isCancelled = false;
    if (isOpen && activeTab === 'export') {
      api
        .get<DataExportSummaryDto>('/data/export/summary')
        .then((data) => {
          if (!isCancelled) setSummary(data);
        })
        .catch((err) => {
          if (!isCancelled) {
            logger.child('DataTransferModal').error('Failed to load export summary', { err });
            setSummary((prev) => prev || buildEmptyExportSummary());
          }
        })
        .finally(() => {
          if (!isCancelled) setIsSummaryLoading(false);
        });
    }
    return () => {
      isCancelled = true;
    };
  }, [isOpen, activeTab]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const blob = await api.getBlob('/data/export');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mypaybyday-export-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      logger.child('DataTransferModal').error('Export failed', { err });
    } finally {
      setIsExporting(false);
    }
  };

  const processFile = async (file: File) => {
    setImportFile(file);
    setImportResult(null);
    setImportError(null);
    setIsParsing(true);

    try {
      const preview = await parseExportArchive(file);
      setImportPreview(preview);
    } catch (err) {
      logger.child('DataTransferModal').warn('Client-side zip parse failed', { err });
      setImportError((err as Error).message || t('dataTransfer.errors.invalidFile', 'Invalid backup archive format'));
      setImportPreview(null);
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleImport = async () => {
    if (!importFile) return;

    setIsImporting(true);
    setImportError(null);
    try {
      const result = await api.postBinary<DataTransferResult>('/data/import', importFile, 'application/zip');
      setImportResult(result);
      await queryClient.invalidateQueries();
    } catch (err) {
      logger.child('DataTransferModal').error('Import failed', { err });
      setImportError((err as Error).message || 'Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  const totalExportItems = summary?.sections.reduce((acc, s) => acc + s.count, 0) || 0;
  const totalPreviewItems = importPreview?.sections.reduce((acc, s) => acc + s.count, 0) || 0;

  return (
    <Modal open={isOpen} onClose={onClose} size="lg" title={t('dataTransfer.modalTitle', 'Data Backup & Restore')}>
      <div className="space-y-4">
        {/* Segmented Control Tabs */}
        <div className="p-1 rounded-full bg-dn-surface-low border border-white/5 flex gap-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab('export');
              setIsSummaryLoading(true);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-1.5 px-4 rounded-full text-xs font-medium transition-all ${
              activeTab === 'export'
                ? 'bg-dn-surface text-dn-text-main border border-white/10 shadow-sm'
                : 'text-dn-text-muted hover:text-dn-text-main'
            }`}
          >
            <Icon name="download" className="text-base" />
            {t('dataTransfer.tabs.export', 'Export Data')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('import')}
            className={`flex-1 flex items-center justify-center gap-2 py-1.5 px-4 rounded-full text-xs font-medium transition-all ${
              activeTab === 'import'
                ? 'bg-dn-surface text-dn-text-main border border-white/10 shadow-sm'
                : 'text-dn-text-muted hover:text-dn-text-main'
            }`}
          >
            <Icon name="upload" className="text-base" />
            {t('dataTransfer.tabs.import', 'Import Data')}
          </button>
        </div>

        {/* EXPORT TAB */}
        {activeTab === 'export' && (
          <div className="space-y-4">
            {/* Minimal Clean Card */}
            <div className="p-3.5 rounded-2xl bg-dn-surface-low/60 border border-white/5 space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-dn-text-main">
                  {totalExportItems} {t('dataTransfer.totalRecords', 'Records Ready')}
                </p>
                <span className="text-[11px] font-mono text-dn-text-muted">
                  v{summary?.version || DATA_TRANSFER_VERSION}
                </span>
              </div>
              <p className="text-xs text-dn-text-muted">
                {t('dataTransfer.exportDesc', 'Exports all 12 system sections and attached media files into a ZIP package.')}
              </p>
            </div>

            {/* Section Breakdown Grid */}
            {isSummaryLoading ? (
              <div className="flex items-center justify-center py-8 gap-2">
                <Icon name="sync" className="animate-spin text-dn-accent text-base" />
                <span className="text-xs text-dn-text-muted">{t('dataTransfer.loadingSummary', 'Loading summary...')}</span>
              </div>
            ) : summary ? (
              <SectionCountList counts={summary.sections} compact />
            ) : null}

            {/* Footer Action */}
            <div className="flex items-center justify-between pt-3 border-t border-white/5">
              <Button variant="ghost" onClick={onClose}>
                {t('common.close', 'Close')}
              </Button>
              <Button variant="primary" onClick={handleExport} disabled={isExporting}>
                {isExporting ? (
                  <span className="flex items-center gap-2">
                    <Icon name="sync" className="animate-spin text-base" />
                    {t('dataTransfer.exporting', 'Exporting...')}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Icon name="download" className="text-base" />
                    {t('dataTransfer.downloadZip', 'Download Backup (.ZIP)')}
                  </span>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* IMPORT TAB */}
        {activeTab === 'import' && (
          <div className="space-y-4">
            {!importResult ? (
              <>
                {/* Minimal Clean Dropzone */}
                <label
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={`flex flex-col items-center justify-center p-5 rounded-2xl border border-dashed transition-all cursor-pointer ${
                    isDragging
                      ? 'border-dn-accent bg-dn-accent/10'
                      : importFile
                      ? 'border-dn-accent/40 bg-dn-surface/80'
                      : 'border-white/10 bg-dn-surface-low/40 hover:border-white/20'
                  }`}
                >
                  <Icon name={importFile ? 'task' : 'cloud_upload'} className="text-2xl text-dn-accent mb-1.5" />
                  <span className="text-xs font-semibold text-dn-text-main text-center">
                    {importFile ? importFile.name : t('dataTransfer.selectFile', 'Choose or Drop Backup Archive (.ZIP)')}
                  </span>
                  <span className="text-[11px] text-dn-text-muted mt-0.5 text-center">
                    {importFile
                      ? `${(importFile.size / 1024).toFixed(1)} KB — ${t('dataTransfer.readyToInspect', 'Archive parsed & verified')}`
                      : t('dataTransfer.fileHint', 'Supports .zip backup files produced by My Pay By Day')}
                  </span>
                  <input type="file" accept=".zip" onChange={handleFileSelect} className="hidden" />
                </label>

                {isParsing && (
                  <div className="flex items-center justify-center py-3 gap-2 text-xs text-dn-text-muted">
                    <Icon name="sync" className="animate-spin text-dn-accent text-base" />
                    {t('dataTransfer.analyzing', 'Inspecting backup entries...')}
                  </div>
                )}

                {importError && (
                  <div className="p-3 rounded-2xl bg-dn-danger/10 border border-dn-danger/25 text-xs text-dn-danger flex items-center gap-2">
                    <Icon name="error" className="text-base shrink-0" />
                    <span>{importError}</span>
                  </div>
                )}

                {importPreview && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <h4 className="text-xs font-medium text-dn-text-muted uppercase tracking-wider">
                        {t('dataTransfer.previewTitle', 'Backup Contents Preview')}
                      </h4>
                      <span className="text-xs font-medium text-dn-accent">
                        {totalPreviewItems} {t('dataTransfer.itemsFound', 'records found')}
                      </span>
                    </div>
                    <SectionCountList counts={importPreview.sections} compact />
                  </div>
                )}
              </>
            ) : (
              /* Success Result View */
              <div className="space-y-4">
                <SectionCountList results={importResult.sections} />
              </div>
            )}

            {/* Footer Action */}
            <div className="flex items-center justify-between pt-3 border-t border-white/5">
              <Button
                variant="ghost"
                onClick={() => {
                  if (importResult) {
                    setImportFile(null);
                    setImportPreview(null);
                    setImportResult(null);
                  }
                  onClose();
                }}
              >
                {importResult ? t('common.done', 'Done') : t('common.cancel', 'Cancel')}
              </Button>

              {importFile && !importResult && (
                <Button variant="primary" onClick={handleImport} disabled={isImporting || isParsing}>
                  {isImporting ? (
                    <span className="flex items-center gap-2">
                      <Icon name="sync" className="animate-spin text-base" />
                      {t('dataTransfer.importing', 'Restoring Data...')}
                    </span>
                  ) : (
                    <span className="flex items-center gap-2 font-medium">
                      <Icon name="settings_backup_restore" className="text-base" />
                      {t('dataTransfer.startImport', 'Restore Backup')}
                    </span>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
