var {List, Repeat, Map} = require('immutable');

var appleColor = require('./apple_color_emoji.ttf');

function randomEmoji() {
  var emojis = "😀😁😂😃😄😅😆😇😈👿😉😊😋😌😍😎😏😐😑😒😓😔😕😖😗😘😙😚😛😜😝😞😟😠😡😢😣😤😥😦😧😨😩😪😫😬😭😮😯😰😱😲😳";
  var randIndex = Math.floor(Math.floor(Math.random() * emojis.length/2) * 2);
  return emojis[randIndex] + emojis[randIndex+1];
}

var blotchProb = 0.3;
var freshDropProb = 0.4;

var initialCell = Map({content: '', opacity: 0});

function initialMatrix(rlen, clen) {
  var cols = List(Repeat(initialCell, clen));
  return List(Repeat(cols, rlen)).toJS();
}

function initialDrops(rlen, clen) {
  var ret = [];
  return List().setSize(clen).map(_ => {
    return Math.floor(Math.random() * rlen);
  }).toJS();
}

function ageCells(matrix) {
  return matrix.map(row => {
    return row.map(col => {
      var content;
      if (Math.random() < blotchProb) {
        content = 'f';
      } else {
        content = col.content;
      }
      return {
        opacity: 0,
        content: content,
      };
    });
  });
}

function fillDrops(clen, drops, matrix) {
  return matrix.map((row, rowIndex) => {
    var mutRow = [];
    for (var i = 0; i < clen; i++) {
      var rowIndex1 = drops[i];
      if (rowIndex  ===  rowIndex1) {
        mutRow.push({content: 'f', 'opacity': 1});
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

function renderMatrix(matrix) {
}

window.onload = function() {
  var rlen = 100;
  var clen = 100;
  var drops = initialDrops(rlen, clen);
  var matrix = initialMatrix(rlen, clen);

  var initial = performance.now();
  var _prev = initial;
  var elapsedCurrent = 0;
  var elapsedTotal = 0;
  function main(_current) {
    elapsedCurrent = _current - _prev;
    elapsedTotal = _current - initial;
    if (elapsedCurrent > 25) {
      console.warn(`RAF loop took longer than 20ms (${elapsedCurrent})`);
    }
    _prev = _current;
    matrix = stepMatrix(clen, drops, matrix);
    drops = stepDrops(rlen, drops);
    renderMatrix(matrix);
    requestAnimationFrame(main);
  }
  requestAnimationFrame(main);
};
