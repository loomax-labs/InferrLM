'use strict';

const fs = require('fs');
const lib = require('image-size-v2');
const fromBuffer = lib.imageSize || lib.default || lib;

function imageSize(input) {
  const data = typeof input === 'string' ? fs.readFileSync(input) : input;
  return fromBuffer(data);
}

module.exports = imageSize;
module.exports.imageSize = imageSize;
module.exports.default = imageSize;
module.exports.disableTypes = lib.disableTypes;
module.exports.types = lib.types;
