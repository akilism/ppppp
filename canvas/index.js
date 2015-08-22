var $ = require('jquery');
var React = require('react');
var {List, Repeat, Map} = require('immutable');

function randomEmoji() {
  var emojis = "😀😁😂😃😄😅😆😇😈👿😉😊😋😌😍😎😏😐😑😒😓😔😕😖😗😘😙😚😛😜😝😞😟😠😡😢😣😤😥😦😧😨😩😪😫😬😭😮😯😰😱😲😳";
  var randIndex = Math.floor(Math.floor(Math.random() * emojis.length/2) * 2);
  return emojis[randIndex] + emojis[randIndex+1];
}

var blotchProb = 0.3;
var freshDropProb = 0.4;

function initialMatrix(rlen, clen) {
  var initialCell = Map({content: '', opacity: 0});
  var cols = List(Repeat(initialCell, clen));
  return List(Repeat(cols, rlen));
}

function initialDrops(rlen, clen) {
  return List().setSize(clen).map(_ => {
    return Math.floor(Math.random() * rlen);
  });
}

function ageCells(matrix) {
  return matrix.map(row => {
    return row.map(col => {
      return col.set('opacity', 0).update('content', content => {
        if (Math.random() < blotchProb) {
          return 'f';
        } else {
          return content;
        }
      });
    });
  });
}

function fillDrops(drops, matrix) {
  return matrix.map((row, rowIndex) => {
    return row.withMutations(mutRow => {
      drops.forEach((rowIndex1, colIndex) => {
        if (rowIndex === rowIndex1) {
          mutRow.set(colIndex, Map({content: 'a', opacity: 1}));
        }
      });
    });
  });
}

function stepMatrix(drops, matrix) {
  return fillDrops(drops, ageCells(matrix));
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
    /* RAF measurement utility */
    elapsedCurrent = _current - _prev;
    elapsedTotal = _current - initial;
    if (elapsedCurrent > 20) {
      console.warn(`RAF loop took longer than 20ms (${elapsedCurrent})`);
    }
    _prev = _current;

    matrix = stepMatrix(drops, matrix);
    drops = stepDrops(rlen, drops);
    requestAnimationFrame(main);
  }
  requestAnimationFrame(main);
};
