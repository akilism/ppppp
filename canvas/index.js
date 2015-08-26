var {List, Repeat, Map} = require('immutable');
var punycode = require('punycode');
var path = require('path');
var async = require('async');
var emoji = require('apple-color-emoji');


var emojis = "😀😁😂😃😄😅😆😇😈👿😉😊😋😌😍😎😏😐😑😒😓😔😕😖😗😘😙😚😛😜😝😞😟😠😡😢😣😤😥😦😧😨😩😪😫😬😭😮😯😰😱😲😳";

function loadEmoji(ch, cb) {
  var image = new Image(20, 20);
  image.src = emoji.getImage(ch);
  if (cb != null) {
    image.addEventListener('load', () => {
      cb(null, image);
    }, false);
  }
}

function loadEmojis(str, cb) {
  var chars = punycode.ucs2.decode(str).map((codePoint) => {
    return String.fromCodePoint(codePoint);
  });
  async.map(chars, loadEmoji, cb);
}

function randomEmoji() {
  var randIndex = Math.floor(Math.floor(Math.random() * emojis.length/2) * 2);
  return emojis[randIndex] + emojis[randIndex+1];
}

var blotchProb = 0.3;
var freshDropProb = 0.1;

var initialCell = Map({content: '', opacity: 0});

function initialMatrix(rlen, clen) {
  var cols = List(Repeat(initialCell, clen));
  return List(Repeat(cols, rlen)).toJS();
}

function initialDrops(rlen, clen) {
  var ret = [];
  return List(Repeat(0, clen)).toJS();
  return List().setSize(clen).map(_ => {
    return Math.floor(Math.random() * rlen);
  }).toJS();
}

function ageCells(matrix) {
  return matrix.map(row => {
    return row.map(cell => {
      return {
        opacity: Math.max(0, cell.opacity / 1.05 - 0.05),
        content: Math.random() < blotchProb ? randomEmoji() : cell.content,
      };
    });
  });
}

function fillDrops(clen, drops, matrix) {
  return matrix.map((row, rowIndex) => {
    var mutRow = [];
    for (var i = 0; i < clen; i++) {
      var rowIndex1 = drops[i];
      var cell = row[i];
      if (rowIndex  ===  rowIndex1) {
        mutRow.push({content: randomEmoji(), opacity: 1});
      } else {
        mutRow.push(row[i]);
      }
    }
    return mutRow;
  });
}

function stepMatrix(clen, drops, matrix) {
  return fillDrops(clen, drops, ageCells(matrix));
}

function stepDrops(rlen, drops) {
  return drops.map(rowIndex => {
    if (rowIndex < rlen) {
      return rowIndex + 1;
    } else {
      if (Math.random() < freshDropProb) {
        return 0;
      } else {
        return rowIndex;
      }
    }
  });
}

var image = new Image(14, 14);
image.src = emoji.getImage('😈');
function renderMatrix(canvas, ctx, matrix) {
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  //ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#0f0';
  matrix.forEach((row, ri) => {
    row.forEach((cell, ci) => {
      ctx.globalAlpha = cell.opacity;
      //ctx.fillRect(ci * 14, ri * 14, 14, 14);
      ctx.drawImage(image, ci * 20, ri * 20);
      //ctx.fillText(cell.content, ci * 14 + 7, ri * 14 + 7);
    });
  });
}

window.onload = function() {
  var canvas = document.createElement('canvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  var ctx = canvas.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#0f0';
  var rlen = Math.ceil(canvas.height/20);
  var clen = Math.ceil(canvas.width/20);
  var drops = initialDrops(rlen, clen);
  var matrix = initialMatrix(rlen, clen);

  loadEmojis(emojis, (_, emojiImages) => { 
    setInterval(function main() {
      matrix = stepMatrix(clen, drops, matrix);
      drops = stepDrops(rlen, drops);
      renderMatrix(canvas, ctx, matrix);
    }, 100);
  });
  document.body.appendChild(canvas);
};
