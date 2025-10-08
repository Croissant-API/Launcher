import fs from 'fs';
import https from 'https';
import path from 'path';
import zlib from 'zlib';

let gamesDir;
if (process.platform === 'linux') {
  gamesDir = path.join(process.env.HOME, '.croissant-launcher', 'games');
} else if (process.platform === 'darwin') {
  gamesDir = path.join(process.env.HOME, 'Library', 'Application Support', 'Croissant-Launcher', 'games');
} else {
  gamesDir = path.join(process.env.APPDATA, 'Croissant-Launcher', 'games');
}

function httpsRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    https
      .get(url, options, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return httpsRequest(res.headers.location, options).then(resolve).catch(reject);
        }
        if (res.statusCode !== 200 && res.statusCode !== 206) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => resolve({ buffer: Buffer.concat(chunks), headers: res.headers }));
      })
      .on('error', reject);
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

async function getRemoteZipStructure(url) {
  const headRes = await httpsRequest(url, { method: 'HEAD' });
  const totalSize = parseInt(headRes.headers['content-length'] || '0');

  if (!headRes.headers['accept-ranges']) {
    throw new Error('Le serveur ne supporte pas les Range requests');
  }

  const chunkSize = Math.min(65536, totalSize);
  const rangeStart = totalSize - chunkSize;

  const { buffer } = await httpsRequest(url, {
    headers: { Range: `bytes=${rangeStart}-${totalSize - 1}` },
  });

  const files = parseZipCentralDirectory(buffer);

  return { files, totalSize };
}

async function downloadFileFromZip(url, fileInfo) {
  const start = fileInfo.localHeaderOffset;
  const end = start + 30 + 1024;

  const { buffer: headerBuf } = await httpsRequest(url, {
    headers: { Range: `bytes=${start}-${end}` },
  });

  const fileNameLength = headerBuf.readUInt16LE(26);
  const extraFieldLength = headerBuf.readUInt16LE(28);
  const dataStart = 30 + fileNameLength + extraFieldLength;

  const actualStart = start + dataStart;
  const actualEnd = actualStart + fileInfo.compressedSize - 1;

  const { buffer: dataBuf } = await httpsRequest(url, {
    headers: { Range: `bytes=${actualStart}-${actualEnd}` },
  });

  const compressionMethod = headerBuf.readUInt16LE(8);

  if (compressionMethod === 0) {
    return dataBuf;
  } else if (compressionMethod === 8) {
    return zlib.inflateRawSync(dataBuf);
  } else {
    throw new Error(`Méthode de compression ${compressionMethod} non supportée`);
  }
}

function getGameDownloadUrl(gameId) {
  return new Promise((resolve, reject) => {
    const url = `https://croissant-api.fr/api/games/${gameId}`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const game = JSON.parse(data);
          resolve(game.downloadUrl);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function detect(id) {
  const localDir = path.join(gamesDir, id);
  if (!fs.existsSync(localDir)) return true;
  try {
    const remoteZipUrl = await getGameDownloadUrl(id);
    const localFiles = listLocalFiles(localDir);
    const { files: remoteFiles } = await getRemoteZipStructure(remoteZipUrl);
    let needUpdate = false;
    for (const remoteFile of remoteFiles) {
      if (remoteFile.name.endsWith('/')) continue;
      const localFile = localFiles.get(remoteFile.name);
      if (!localFile || localFile.size !== remoteFile.uncompressedSize) {
        needUpdate = true;
        break;
      }
      if (localFile) localFiles.delete(remoteFile.name);
    }
    if (localFiles.size > 0) needUpdate = true;
    return needUpdate;
  } catch (e) {
    return true;
  }
}

async function update(id, cb) {
  const localDir = path.join(gamesDir, id);
  if (!fs.existsSync(localDir)) {
    fs.mkdirSync(localDir, { recursive: true });
  }
  const remoteZipUrl = await getGameDownloadUrl(id);
  const localFiles = listLocalFiles(localDir);
  const { files: remoteFiles } = await getRemoteZipStructure(remoteZipUrl);
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
  const totalBytes = toDownload.reduce((sum, f) => sum + f.compressedSize, 0);
  let downloadedBytes = 0;
  for (let i = 0; i < toDownload.length; i++) {
    const file = toDownload[i];
    const content = await downloadFileFromZip(remoteZipUrl, file);
    const fullPath = path.join(localDir, file.name);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
    downloadedBytes += file.compressedSize;
    const percent = Math.round((downloadedBytes / totalBytes) * 100);
    cb(percent);
  }
}

export { detect, update };


