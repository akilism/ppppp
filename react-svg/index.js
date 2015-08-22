var $ = require('jquery');
var _ = require('underscore');
var React = require('react');

var {List, Repeat, Map} = require('immutable');

function randomEmoji() {
  var emojis = "😀😁😂😃😄😅😆😇😈👿😉😊😋😌😍😎😏😐😑😒😓😔😕😖😗😘😙😚😛😜😝😞😟😠😡😢😣😤😥😦😧😨😩😪😫😬😭😮😯😰😱😲😳";
  var emojis = "😀😁😂😃😄😅";
  var randIndex = Math.floor(Math.floor(Math.random() * emojis.length/2) * 2);
  return emojis[randIndex] + emojis[randIndex+1];
}

function initializeMatrix(rlen, clen) {
  return List(Repeat(
           List(Repeat(
             Map({content: '', opacity: 0}),
             clen)),
          rlen));
}

function initializeCursors(rlen, clen) {
  return List().setSize(clen).map(_ => {
    return Math.floor(Math.random() * rlen);
  });
}

function updateCells(matrix) {
  return matrix.map(r => {
    return r.map(c => {
      return c.set('opacity', 0).update('content', c => {
        if (Math.random() < 0.5) {
          return randomEmoji();
        } else {
          return c;
        }
      });
    });
  });
}

function updateCursors(cursors, matrix) {
  return matrix.map((r,ri) => {
    return r.withMutations(mutR => {
      cursors.forEach((c, ci) => {
        if (c === ri) {
          mutR.set(ci, Map({content: randomEmoji(), opacity: 1}))
        }
      });
    });
  });
}

function stepMatrix(cursors, matrix) {
  return updateCursors(cursors, updateCells(matrix));
}

function stepCursors(rlen, cursor) {
  return cursor.map(c => {
    if (c < rlen) {
      return c + 1;
    } else {
      if (Math.random() < 0.3) {
        return 0;
      } else {
        return c;
      }
    }
  });
}

var Cell = React.createClass({
  render() {
    var x = Math.floor(this.props.x * 10);
    var y = Math.floor(this.props.y * 10 + 10);
    var transition;
    if (this.props.opacity === 1) {
      transition = 'opacity 0s';
    } else {
      transition = 'opacity 1s';
    }
    return (
      <text
        x={x}
        y={y}
        style={{opacity:this.props.opacity, transition:transition}}>
        {this.props.content}
      </text>
    );
  }
});

var Grid = React.createClass({
  getInitialState() {
    return {
      matrix: initializeMatrix(100, 100),
      cursors: initializeCursors(100, 100),
    };
  },

  componentDidMount() {
    setInterval(this.makeItRain, 125);
    this.makeItRain();
  },

  makeItRain() {
    var newCursors = stepCursors(100, this.state.cursors);
    var newMatrix = stepMatrix(newCursors, this.state.matrix);
    this.setState({
      cursors: newCursors,
      matrix: newMatrix,
    });
  },

  render() {
    var cells = [];
    this.state.matrix.forEach((r, ri) => {
      r.forEach((c, ci) => {
        cells.push(
          <Cell
            x={ci}
            y={ri}
            content={c.get('content')}
            opacity={c.get('opacity')}
            key={ci.toString()+','+ri.toString()}
            />
        );
      });
    });
    return (
      <svg style={{fontSize:10}} textAlign="middle" width={1000} height={1000}>{cells}</svg>
    );
  }
});

window.onload = function() {
  React.render(<Grid/>, document.body);
};
