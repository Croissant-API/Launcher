import fs from 'fs';
import https from 'https';
import path from 'path';
import zlib from 'zlib';
import os from 'os';

let gamesDir;
if (process.platform === 'linux') {
  gamesDir = path.join(process.env.HOME, '.croissant-launcher', 'games');
} else if (process.platform === 'darwin') {
  gamesDir = path.join(process.env.HOME, 'Library', 'Application Support', 'Croissant-Launcher', 'games');
} else {
  gamesDir = path.join(process.env.APPDATA, 'Croissant-Launcher', 'games');
}

function httpsRequest(url, options = {}, token) {
  if (token) {
    options.headers = options.headers || {};
    options.headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
  }

  // Use a custom User-Agent to mimic Node.js behavior
  options.headers = {
    ...options.headers,
    'User-Agent': 'Croissant-Launcher/1.0 (Node.js)',
  };

  return new Promise((resolve, reject) => {
    https
      .get(url, options, res => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return httpsRequest(res.headers.location, options, token).then(resolve).catch(reject);
        }
        if (res.statusCode !== 200 && res.statusCode !== 206) {
          let chunks = [];
          res.on('data', chunk => chunks.push(chunk));
          res.on('end', () => {
            const body = Buffer.concat(chunks).toString();
            console.error(`HTTP Error: ${res.statusCode} - ${body}`);
            reject(new Error(`HTTP ${res.statusCode}: ${body}`));
          });
          return;
        }
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => resolve({ buffer: Buffer.concat(chunks), headers: res.headers }));
      })
      .on('error', error => {
        console.error(`Network error while fetching ${url}:`, error);
        reject(error);
      });
  });
}

function listLocalFiles(baseDir) {
  const result = new Map();
  function scan(dir) {
    for (const file of fs.readdirSync(dir)) {
      const full = path.join(dir, file);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        scan(full);
      } else {
        const rel = path.relative(baseDir, full).replace(/\\/g, '/');
        result.set(rel, { size: stat.size });
      }
    }
  }
  scan(baseDir);
  return result;
}

function parseZipCentralDirectory(buffer) {
  const files = [];
  let offset = buffer.length - 22;

  while (offset >= 0) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) {
      break;
    }
    offset--;
  }

  if (offset < 0) {
    throw new Error('Signature EOCD introuvable');
  }

  const centralDirSize = buffer.readUInt32LE(offset + 12);
  const centralDirOffset = buffer.readUInt32LE(offset + 16);
  const commentLength = buffer.readUInt16LE(offset + 20);

  let pos = buffer.length - 22 - commentLength - centralDirSize;
  const endPos = buffer.length - 22 - commentLength;

  while (pos < endPos) {
    const sig = buffer.readUInt32LE(pos);
    if (sig !== 0x02014b50) break;

    const compressedSize = buffer.readUInt32LE(pos + 20);
    const uncompressedSize = buffer.readUInt32LE(pos + 24);
    const fileNameLength = buffer.readUInt16LE(pos + 28);
    const extraFieldLength = buffer.readUInt16LE(pos + 30);
    const fileCommentLength = buffer.readUInt16LE(pos + 32);
    const localHeaderOffset = buffer.readUInt32LE(pos + 42);

    const fileName = buffer.toString('utf8', pos + 46, pos + 46 + fileNameLength);

    files.push({
      name: fileName,
      compressedSize,
      uncompressedSize,
      localHeaderOffset,
    });

    pos += 46 + fileNameLength + extraFieldLength + fileCommentLength;
  }

  return files;
}

const CONTENT_LENGTH_FILE = path.join(gamesDir, 'content-lengths.json');

function saveContentLength(url, contentLength) {
  let contentLengths = {};
  if (fs.existsSync(CONTENT_LENGTH_FILE)) {
    try {
      contentLengths = JSON.parse(fs.readFileSync(CONTENT_LENGTH_FILE, 'utf8'));
    } catch (error) {
      console.error('Failed to parse content-length file:', error);
    }
  }

  const previousEntry = contentLengths[url];
  const isUpdatedSinceLastCheck = previousEntry ? previousEntry.contentLength === contentLength : false;

  contentLengths[url] = {
    contentLength,
    isUpdatedSinceLastCheck,
  };

  console.log('Saving content length:', CONTENT_LENGTH_FILE);
  fs.writeFileSync(CONTENT_LENGTH_FILE, JSON.stringify(contentLengths, null, 2));
}

async function fetchAndCompareContentLength(url, token) {
  const headRes = await httpsRequest(url, { method: 'HEAD', headers: { 'X-Request-Arbo': 'true' } }, token);
  const newContentLength = parseInt(headRes.headers['content-length'] || '0');

  let contentLengths = {};
  if (fs.existsSync(CONTENT_LENGTH_FILE)) {
    try {
      contentLengths = JSON.parse(fs.readFileSync(CONTENT_LENGTH_FILE, 'utf8'));
    } catch (error) {
      console.error('Failed to parse content-length file:', error);
    }
  }

  const previousEntry = contentLengths[url];
  const hasChanged = !previousEntry || previousEntry.contentLength !== newContentLength;

  if (hasChanged) {
    saveContentLength(url, newContentLength);
  }

  return { hasChanged, newContentLength };
}

async function getRemoteZipStructure(url, token) {
  const headRes = await httpsRequest(url, { method: 'HEAD', headers: { 'X-Request-Arbo': 'true' } }, token);
  const totalSize = parseInt(headRes.headers['content-length'] || '0');

  if (!headRes.headers['accept-ranges']) {
    throw new Error('Le serveur ne supporte pas les Range requests');
  }

  const chunkSize = Math.min(262144, totalSize);
  const rangeStart = totalSize - chunkSize;

  const { buffer } = await httpsRequest(
    url,
    {
      headers: { Range: `bytes=${rangeStart}-${totalSize - 1}`, 'X-Request-Arbo': 'true' },
    },
    token
  );

  let files = parseZipCentralDirectory(buffer);

  if (url.includes('github.com') && url.includes('/archive/refs/heads/')) {
    const parts = url.split('/');
    const repo = parts[4];
    const branch = parts[7].split('.')[0];
    const prefix = `${repo}-${branch}/`;
    files = files.map(f => ({
      ...f,
      name: f.name.startsWith(prefix) ? f.name.slice(prefix.length) : f.name,
    }));
  }

  return { files, totalSize };
}

async function downloadFileFromZip(url, fileInfo, token) {
  const start = fileInfo.localHeaderOffset;
  const end = start + 30 + 1024;

  const { buffer: headerBuf } = await httpsRequest(
    url,
    {
      headers: { Range: `bytes=${start}-${end}` },
    },
    token
  );

  const fileNameLength = headerBuf.readUInt16LE(26);
  const extraFieldLength = headerBuf.readUInt16LE(28);
  const dataStart = 30 + fileNameLength + extraFieldLength;

  const actualStart = start + dataStart;
  const actualEnd = actualStart + fileInfo.compressedSize - 1;

  const { buffer: dataBuf } = await httpsRequest(
    url,
    {
      headers: { Range: `bytes=${actualStart}-${actualEnd}` },
    },
    token
  );

  const compressionMethod = headerBuf.readUInt16LE(8);

  if (compressionMethod === 0) {
    return dataBuf;
  } else if (compressionMethod === 8) {
    return zlib.inflateRawSync(dataBuf);
  } else {
    throw new Error(`Méthode de compression ${compressionMethod} non supportée`);
  }
}

async function detect(id, token) {
  const remoteZipUrl = 'https://croissant-api.fr/api/games/' + id + '/download';
  const localDir = path.join(gamesDir, id);

  // Check if the local directory for the game exists
  if (!fs.existsSync(localDir)) {
    console.error(`Local directory for game ${id} does not exist. Reinstallation required.`);
    return false; // Cannot update if the game is not installed
  }

  let contentLengths = {};
  if (fs.existsSync(CONTENT_LENGTH_FILE)) {
    try {
      contentLengths = JSON.parse(fs.readFileSync(CONTENT_LENGTH_FILE, 'utf8'));
    } catch (error) {
      console.error('Failed to parse content-length file:', error);
    }
  }

  const headRes = await httpsRequest(remoteZipUrl, { method: 'HEAD', headers: { 'X-Request-Arbo': 'true' } }, token);
  const newContentLength = parseInt(headRes.headers['content-length'] || '0');
  console.log('Fetched content length:', newContentLength);
  const entry = contentLengths[remoteZipUrl];
  if (!contentLengths[remoteZipUrl] || contentLengths[remoteZipUrl].contentLength !== newContentLength) {
    saveContentLength(remoteZipUrl, newContentLength);
    return true;
  }
  return !entry.isUpdatedSinceLastCheck;
}

async function downloadFilesConcurrently(files, remoteZipUrl, token, localDir, cb) {
  const concurrencyLimit = 5; // Nombre maximum de téléchargements simultanés
  const totalBytes = files.reduce((sum, f) => sum + f.compressedSize, 0);
  let downloadedBytes = 0;

  // Ensure resource.asar is always included in the download queue
  if (!files.some(file => file.name === 'resource.asar')) {
    files.push({
      name: 'resource.asar',
      compressedSize: 0, // Placeholder, actual size will be determined dynamically
      uncompressedSize: 0, // Placeholder
      localHeaderOffset: 0, // Placeholder
    });
  }

  const downloadQueue = files.slice(); // Copie de la liste des fichiers
  const activeDownloads = new Set();

  async function downloadNext() {
    if (downloadQueue.length === 0) return;

    const file = downloadQueue.shift();
    const downloadPromise = (async () => {
      try {
        const content = await downloadFileFromZip(remoteZipUrl, file, token);
        const fullPath = path.join(localDir, file.name);

        // Disable ASAR handling temporarily for Electron
        const originalNoAsar = process.noAsar;
        process.noAsar = true;

        try {
          fs.mkdirSync(path.dirname(fullPath), { recursive: true });
          fs.writeFileSync(fullPath, content);
        } finally {
          process.noAsar = originalNoAsar; // Restore original value
        }

        downloadedBytes += file.compressedSize;
        const percent = Math.round((downloadedBytes / totalBytes) * 100);
        cb(percent);
      } catch (error) {
        console.error(`Failed to download or write file: ${file.name}`, error);
      }
    })();

    activeDownloads.add(downloadPromise);
    downloadPromise.finally(() => activeDownloads.delete(downloadPromise));

    await downloadPromise;
    await downloadNext();
  }

  const initialDownloads = Array.from({ length: concurrencyLimit }, () => downloadNext());
  await Promise.all(initialDownloads);

  // Update content-length after successful download
  const { newContentLength } = await fetchAndCompareContentLength(remoteZipUrl, token);
  updateContentLength(remoteZipUrl, newContentLength);
}

async function update(id, cb, token) {
  const localDir = path.join(gamesDir, id);
  if (!fs.existsSync(localDir)) {
    fs.mkdirSync(localDir, { recursive: true });
  }
  const remoteZipUrl = 'https://croissant-api.fr/api/games/' + id + '/download';
  let localFiles = listLocalFiles(localDir);

  if (remoteZipUrl.includes('github.com')) {
    for (const [key] of localFiles) {
      if (key.startsWith('.git/')) {
        localFiles.delete(key);
      }
    }
  }

  const { files: remoteFiles } = await getRemoteZipStructure(remoteZipUrl, token);
  const toDownload = [];
  const toDelete = [];
  for (const remoteFile of remoteFiles) {
    if (remoteFile.name.endsWith('/')) continue;
    const localFile = localFiles.get(remoteFile.name);
    if (!localFile || localFile.size !== remoteFile.uncompressedSize) {
      toDownload.push(remoteFile);
    }
    if (localFile) {
      localFiles.delete(remoteFile.name);
    }
  }
  for (const localFileName of localFiles.keys()) {
    toDelete.push(localFileName);
  }

  for (const fileName of toDelete) {
    const fullPath = path.join(localDir, fileName);
    if (fs.existsSync(fullPath)) {
      fs.rmSync(fullPath);
    }
  }
  if (toDownload.length === 0) {
    cb(100);
    return;
  }

  await downloadFilesConcurrently(toDownload, remoteZipUrl, token, localDir, cb);
}

function updateContentLength(url, newContentLength) {
  let contentLengths = {};
  if (fs.existsSync(CONTENT_LENGTH_FILE)) {
    try {
      contentLengths = JSON.parse(fs.readFileSync(CONTENT_LENGTH_FILE, 'utf8'));
    } catch (error) {
      console.error('Failed to parse content-length file:', error);
    }
  }

  contentLengths[url] = {
    contentLength: newContentLength,
    isUpdatedSinceLastCheck: true,
  };

  fs.writeFileSync(CONTENT_LENGTH_FILE, JSON.stringify(contentLengths, null, 2));
}

export { detect, update };
