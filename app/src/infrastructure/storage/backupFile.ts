const backupMimeType = 'application/json';

export function downloadBackupFile(serialized: string, timestamp = new Date()) {
  if (typeof document === 'undefined' || typeof URL === 'undefined') {
    return;
  }

  const blob = new Blob([serialized], { type: backupMimeType });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = objectUrl;
  link.download = buildBackupFileName(timestamp);
  link.style.display = 'none';
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

export async function readBackupFile(file: File) {
  if (typeof file.text === 'function') {
    return file.text();
  }

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve(typeof reader.result === 'string' ? reader.result : '');
    };
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read backup file.'));
    reader.readAsText(file);
  });
}

function buildBackupFileName(timestamp: Date) {
  const isoStamp = timestamp.toISOString().replace(/[:.]/g, '-');
  return `hiit-master-backup-${isoStamp}.json`;
}
