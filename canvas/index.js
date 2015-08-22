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
          return randomEmoji();
        } else {
          return content;
        }
      });
    });
  });
}

function watchDrops(drops, matrix) {
  return matrix.map((row, rowIndex) => {
    return row.withMutations(mutRow => {
      drops.forEach((rowIndex1, colIndex) => {
        if (rowIndex === rowIndex1) {
          mutRow.set(colIndex, Map({content: randomEmoji(), opacity: 1}));
        }
      });
    });
  });
}

function stepMatrix(drops, matrix) {
  return watchDrops(cursors, ageCells(matrix));
}

function stepDrops(rlen, drops) {
  return drops.map(rowIndex => {
    if (rowIndex < rlen) {
      return rowIndex + 1;
    } else {
      if (Math.random() < freshDropProb) {
        return 0;
      } else {
        return c;
      }
    }
  });
}

window.onload = function() {
  var rlen = 100;
  var clen = 100;
  var matrix = initialMatrix(rlen, clen);
  var drops = initialDrops(rlen, clen);

  var initial = performance.now();
  function main(current) {
    var now = current - inital;
    console.log(now);
    requestAnimationFrame(main);
  }
  requestAnimationFrame(main);
};
