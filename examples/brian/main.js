var React = require('react');
var $ = require('jquery');
var _ = require('underscore');
var PureRenderMixin = require('react/addons').addons.PureRenderMixin;
var {maps} = require('google');

Math.linearTween = function (t, b, c, d) {
  return c*t/d + b;
};

const viceNorth = new maps.LatLng(40.7211588,-73.9579174);
const twelveChairs = new maps.LatLng(40.714472, -73.965169);
const viceSouth = new maps.LatLng(40.7146628,-73.9658753);

window.TRV = {
  last_scroll: 0,
  scan_components: [],
  getMarkers: function(scroll_top, window_height) {
    scroll_top = -1 * scroll_top;
    
    return _.reduce($(".marker-p"), function(acc, p) {

      acc[p.id] = function(anchor) {
        if(typeof(anchor) === "undefined"){
          var anchor = 0.0; 
        }

        var $p = $(p),
          el_height = $p.outerHeight(),
          el_top = $p.position().top,
          scroll_anchor = scroll_top + (window_height * anchor),
          pct_elapsed,
          pct_elapsed_raw;
          
        if (el_top > scroll_anchor) {
          pct_elapsed = 0;
        } else if (el_top + el_height < scroll_anchor) {
          pct_elapsed = 1.0;
        } else {
          pct_elapsed = (scroll_anchor - el_top) / el_height;
        }
        pct_elapsed_raw = (scroll_anchor - el_top) / el_height; 
        return {
          el_id: $(p).attr("id"),
          pct_elapsed,
          pct_elapsed_raw,
        };
      };

      return acc;
    }, {});
  }
};

class TestComponent extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div style={{position: 'relative', width: '100%', height: '100%'}}>
        <MovingMap/>
      </div>
    );
  }
}

class ScanComponent extends React.Component {
  constructor(props) {
    super(props);
    TRV.scan_components.push(this);
  }
 
  componentDidMount() {
    var new_scroll = $(window).scrollTop(),
        window_height = $(window).height(),
        markers = TRV.getMarkers(new_scroll, window_height),
        last_state = _(this.state).clone(),
        new_state = this.adjust(last_state, {
          scroll_top: new_scroll,
          markers: markers,
        });
    this.setState(new_state);
  }

  adjust() {
    throw "You must override adjust"
  }
}

class Bg extends ScanComponent {
  constructor(props) {
    super(props);
    this.state = {
      bg_top: 0
    };
    TRV.scan_components.push(this);
  }

  adjust(last_state, d) {
    var first_graf_elapsed = d.markers["crown-vic"](1).pct_elapsed,
        window_height = $(window).height(),
        bg_top;
    if (first_graf_elapsed > 0.5) {
      bg_top = Math.linearTween(first_graf_elapsed - 0.5, -window_height, window_height, 0.5);
    } else {
      bg_top = -window_height;
    }
    return {bg_top: bg_top};
  }

  render() {
    return(
      <div className='bg-slide' style={{
        position: "fixed",
        top: this.state.bg_top,
        width: $(window).width(),
        height: $(window).height(),
      }}/>
    )
  }
}

class MovingMap extends ScanComponent {
  constructor(props) {
    super(props);
    this.state = {
      bg_top: - $(window).height(),
      path: 'left',
    };
  }

  adjust(last_state, d) {
    var first_graf_elapsed = d.markers["intro"](0.5).pct_elapsed,
        window_height = $(window).height(),
        bg_top = - $(window).height();
    bg_top = Math.linearTween(first_graf_elapsed * 0.5, -window_height, window_height, 0.5);
    return {
      bg_top: bg_top,
      markerOpacity: d.markers['12-chairs'](0).pct_elapsed,
    };
  }

  componentDidMount() {
    this.map = new maps.Map(React.findDOMNode(this.refs.map), {
      center: { lat:40.721648, lng:-73.9817507 },
      zoom: 15,

      disableDefaultUI: true,
      scrollwheel: false,
      navigationControl: false,
      mapTypeControl: false,
      scaleControl: false,
      draggable: false,
    });
    this.marker = new maps.Marker({
      position: twelveChairs,
    });
    this.marker.setMap(this.map);
  }

  componentDidUpdate() {
    console.log(this.state);
    this.marker.setOptions({
      opacity: this.state.markerOpacity,
    });
  }

  render() {
    var style = {
      position: "fixed",
      left: 0,
      top: 0,
      width: $(window).width(),
      height: $(window).height(),
    };
    var mapStyle = {
      width: $(window).width(),
      height: $(window).height(),
    };
    var overlayStyle = { 
      width: $(window).width(),
      height: $(window).height(),
      position: 'absolute',
      top: 0,
      left: 0,
    };
    return (
      <div style={style}>
        <div ref="map" style={mapStyle} />
        <div style={overlayStyle}>
          <button>Left</button>
          <button>Right</button>
        </div>
      </div>
    );
  }
}


$(function() {
  $("#page").height($(window).height() * 10);
  TRV.last_scroll = $(window).scrollTop();
  TRV.root = React.render(<TestComponent/>, document.getElementById('track'));
  const initialScrollTop = $(window).scrollTop();

  function modifyText(copy, scrollTop) {
    let window_width = $(window).width(),
        window_height = $(window).height(),
        copy_height = $(copy).height(),
        markers = TRV.getMarkers(copy_height, window_height),
        top = (scrollTop / window_height) * copy_height * -0.1,
        left = Math.linearTween(markers);
    $(copy).css({top, left});
  }
  $(window).on("scroll", _.throttle(function(){
    var new_scroll = $(window).scrollTop(),
        window_height = $(window).height(),
        window_width = $(window).width(),
        $copy = $('#copy'),
        copy_width = $copy.width(),
        new_copy_top = (new_scroll / window_height) * ($copy.height() * -0.1),
        markers = TRV.getMarkers(new_copy_top, window_height),
        new_copy_left = Math.linearTween(
          markers['intro'](0).pct_elapsed,
          (window_width - copy_width) / 2,
          -1 * (window_width - copy_width) / 2,
          1
        );
    $copy.css({
      top: new_copy_top,
      left: new_copy_left,
    });
    _(TRV.scan_components).each(function(c){
      var last_state = _(c.state).clone();
      var new_state = c.adjust(last_state, {
        scroll_top: new_scroll,
        markers: markers,
      });
      c.setState(new_state);
    });
  }, 5));
});
