var $ = require('jquery');
var React = require('react');
var {maps} = require('google');

function makeScrollAware(Component, container) {
  class Spy extends React.Component {
    render() {
      var size = 10000;
      var initialStyle = {
        width: `${size}%`,
        height: `${size}%`,
        top: `-${size/2}%`,
        left: `-${size/2}%`,
      };
      return (
        <div style={initialStyle}>
          <Component {...this.props} {...this.state} />
        </div>
      );
    }
  }
  return Spy;
}

$(function() {
  var initialWidth = $(document.body).width();
  var initialHeight = $(document.body).height();
  $(window).on('scroll', () => {
    console.log($(window).scrollTop());
  });
  $('.text-container').css({
    width: initialWidth * 1000,
    height: initialHeight * 1000,
    position: 'relative',
    top: '-50%',
    left: '-50%',
  });
});
