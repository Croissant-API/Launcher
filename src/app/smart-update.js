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

function httpsRequest(url, options = {}, token) {
  if (token) {
    options.headers = options.headers || {};
    options.headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    options.headers['User-Agent'] = 'Croissant-Launcher/1.0';
  }
  return new Promise((resolve, reject) => {
    https
      .get(url, options, res => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return httpsRequest(res.headers.location, options, token).then(resolve).catch(reject);
        }
        if (res.statusCode !== 200 && res.statusCode !== 206) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
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

async function getRemoteZipStructure(url, token) {
  const headRes = await httpsRequest(url, { method: 'HEAD' }, token);
  const totalSize = parseInt(headRes.headers['content-length'] || '0');

  if (!headRes.headers['accept-ranges']) {
    throw new Error('Le serveur ne supporte pas les Range requests');
  }

  const chunkSize = Math.min(262144, totalSize);
  const rangeStart = totalSize - chunkSize;

  const { buffer } = await httpsRequest(
    url,
    {
      headers: { Range: `bytes=${rangeStart}-${totalSize - 1}` },
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
  const localDir = path.join(gamesDir, id);
  if (!fs.existsSync(localDir)) return true;
  try {
    if (!token) {
      throw new Error('Token is required for detection');
    }

    const remoteZipUrl = 'https://croissant-api.fr/api/games/' + id + '/download';
    let localFiles = listLocalFiles(localDir);

    if (remoteZipUrl.includes('github.com')) {
      let gitCount = 0;
      for (const [key] of localFiles) {
        if (key.startsWith('.git/')) {
          localFiles.delete(key);
          gitCount++;
        }
      }
    }

    const { files: remoteFiles } = await getRemoteZipStructure(remoteZipUrl, token);
    let needUpdate = false;
    for (const remoteFile of remoteFiles) {
      if (remoteFile.name.endsWith('/')) continue;
      const localFile = localFiles.get(remoteFile.name);
      if (!localFile) {
        needUpdate = true;
        break;
      }
      if (localFile.size !== remoteFile.uncompressedSize) {
        needUpdate = true;
        break;
      }
      if (localFile) localFiles.delete(remoteFile.name);
    }
    if (localFiles.size > 0) {
      needUpdate = true;
    }
    return needUpdate;
  } catch (e) {
    return false;
  }
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
  const totalBytes = toDownload.reduce((sum, f) => sum + f.compressedSize, 0);
  let downloadedBytes = 0;
  for (let i = 0; i < toDownload.length; i++) {
    const file = toDownload[i];
    const content = await downloadFileFromZip(remoteZipUrl, file, token);
    const fullPath = path.join(localDir, file.name);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
    downloadedBytes += file.compressedSize;
    const percent = Math.round((downloadedBytes / totalBytes) * 100);
    cb(percent);
  }
}

export { detect, update };
