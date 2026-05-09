import fs from 'fs';

function getDuration(filePath) {
  const buffer = fs.readFileSync(filePath);
  const mvhdOffset = buffer.indexOf(Buffer.from('mvhd'));
  if (mvhdOffset === -1) return null;
  
  // mvhd structure: 4 bytes size, 4 bytes 'mvhd', 1 byte version, 3 bytes flags...
  // version 0: 4 bytes creation, 4 bytes modification, 4 bytes timescale, 4 bytes duration
  // version 1: 8 bytes creation, 8 bytes modification, 4 bytes timescale, 8 bytes duration
  
  const version = buffer[mvhdOffset + 8];
  let timescale, duration;
  
  if (version === 0) {
    timescale = buffer.readUInt32BE(mvhdOffset + 12 + 8);
    duration = buffer.readUInt32BE(mvhdOffset + 12 + 12);
  } else {
    timescale = buffer.readUInt32BE(mvhdOffset + 12 + 20);
    duration = Number(buffer.readBigUInt64BE(mvhdOffset + 12 + 24));
  }
  
  return duration / timescale;
}

const path = './public/Whisk_mwyyujywgdo2uwy20cn0atytcdn4qtlmndzm1so.mp4';
console.log('Duration:', getDuration(path));
