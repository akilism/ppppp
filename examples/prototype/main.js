var React = require('react');
var $ = require('jquery');
var _ = require('underscore');
var PureRenderMixin = require('react/addons').addons.PureRenderMixin;

Math.linearTween = function (t, b, c, d) {
	return c*t/d + b;
};

window.TRV = {
  last_scroll: 0,
  scan_components: [],
  getMarkers: function(scroll_top, window_height) {
    scroll_top = -1 * scroll_top;
    return  _($(".marker-p")).map(function(p) {
      var $p = $(p),
          // $copy = $("#copy"),
          el_top = $p.position().top,
          el_height = $p.height(),
          pct_elapsed;
          
      // console.log(scroll_top, $copy.offset().top);
      
      if (el_top > scroll_top) {
        pct_elapsed = 0;
      } else if (el_top + el_height < scroll_top) {
        pct_elapsed = 1.0;
      } else {
        pct_elapsed = (scroll_top - el_top) / el_height;
      }
      console.log($p.attr("id"), scroll_top, el_top, pct_elapsed);
      return {el_id: $(p).attr("id"), pct_elapsed: pct_elapsed};
    });
  },
};

class TestComponent extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div style={{position: 'relative', width: '100%', height: '100%'}}>
        <Bg/>
      </div>
    );
  }
}

class ScanComponent extends React.Component {
  constructor(props) {
    super(props);
    TRV.scan_components.push(this);
  }

  componentDidMount(){
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
    var first_graf_elapsed = d.markers[1].pct_elapsed,
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


$(function() {
  $("#page").height($(window).height() * 6);
  TRV.last_scroll = $(window).scrollTop();
  TRV.root = React.render(<TestComponent/>, document.getElementById('track'));
  $(window).on("scroll",_.throttle(function(){
    var new_scroll = $(window).scrollTop(),
        window_height = $(window).height(),
        $copy = $('#copy'),
        new_copy_top = (new_scroll / window_height) * (- $copy.height() * 0.1);
    var markers = TRV.getMarkers(new_copy_top, window_height);
    $copy.css({
      top: new_copy_top,
    });
    _(TRV.scan_components).each(function(c){
      var last_state = _(c.state).clone();
      var new_state = c.adjust(last_state, {
        scroll_top: new_scroll,
        markers: markers,
      });
      c.setState(new_state);
    });
  },5));
});
