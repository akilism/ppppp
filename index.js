var $ = require('jquery');
var _ = require('underscore');
var React = require('react');

function randomEmoji() {
  var emojis = "😀😁😂😃😄😅😆😇😈👿😉😊😋😌😍😎😏😐😑😒😓😔😕😖😗😘😙😚😛😜😝😞😟😠😡😢😣😤😥😦😧😨😩😪😫😬😭😮😯😰😱😲😳";
  var randIndex = Math.floor(Math.floor(Math.random() * emojis.length/2) * 2);
  return emojis[randIndex] + emojis[randIndex+1];
}

var Grid = React.createClass({
  getInitialState() {
    return {
      cols: 100,
      rows: 100,
    };
  },

  componentDidMount() {
    this.listener = _.debounce(this.handleResize, 200);
    this.resize($(window).width(), $(window).height());
    $(window).on('resize', this.listener);
  },

  handleResize() {
    this.resize($(window).width(), $(window).height());
    console.log(window.screenX, window.screenY);
  },

  resize(cols,rows) {
    this.setState({
      cols: Math.floor(cols / 20 + 1),
      rows: Math.floor(rows / 20 + 1),
    });
  },

  getEmojiRow() {
    var emojis = [];
    for (var i=0; i<this.state.cols; i++) {
      emojis.push(randomEmoji());
    }

    return emojis.map((e) => {
      return (
        <span style={{display: 'inline-block', width: '20px', height: '20px'}}>{e}</span>
      );
    });
  },

  render() {
    var rows = [];
    for (var i=0;i<this.state.rows;i++) {
      rows.push(this.getEmojiRow());
    }
    rows = rows.map(r => {
      return <div style={{height: 20, whiteSpace: 'nowrap'}}>{r}</div>
    });

    return (<div>{rows}</div>);
  }
});

window.$ = $;
window.onload = function() {
  React.render(<Grid/>, document.body);
};
