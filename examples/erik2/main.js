var React = require('react');
var $ = require('jquery');
var _ = require('underscore');
var PureRenderMixin = require('react/addons').addons.PureRenderMixin;

Math.linearTween = function (t, b, c, d) {
	return c*t/d + b;
};
Math.easeOutBack = function (t, b, c, d, s) {
		if (s == undefined) s = 1.70158;
		return c*((t=t/d-1)*t*((s+1)*t + s) + 1) + b;
};

window.TRV = {
  last_scroll: 0,
  scan_components: [],
  getMarkers: function(scroll_top, window_height) {
    scroll_top = -1 * scroll_top;
    
    return _.reduce($(".marker-p"),  function(acc, p) {

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
        return {el_id: $(p).attr("id"), pct_elapsed: pct_elapsed, pct_elapsed_raw: pct_elapsed_raw};
      };

      return acc;
    }, {});
  },
  getMarkersInv: function(scroll_top, window_height) {
    scroll_top = -1 * scroll_top;
  
    return _.reduce($(".marker-p"),  function(acc, p) {

      acc[p.id] = function(anchor) {
        if(typeof(anchor) === "undefined"){
          var anchor = 0.0; 
        }

        var $p = $(p),
          el_height = $p.outerHeight(),
          el_top = $p.position().top,
          el_anchor = el_top + (el_height * anchor),
          pct_elapsed,
          pct_elapsed_raw;
          
        if (el_anchor > scroll_top + window_height) {
          pct_elapsed = 0;
        } else if (el_anchor < scroll_top) {
          pct_elapsed = 1.0;
        } else {
          pct_elapsed = 1 - ((el_anchor - scroll_top) / window_height);
        }
        pct_elapsed_raw = 1 - ((el_anchor - scroll_top) / window_height); 
        return {el_id: $(p).attr("id"), pct_elapsed: pct_elapsed, pct_elapsed_raw: pct_elapsed_raw};
      };

      return acc;
    }, {});
  },
  bot2Top: function(){
  
  }
};

class TestComponent extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div style={{position: 'relative', width: '100%', height: '100%'}}>
        <Timelapse/>
        <PagerL/>
        <PagerR/>
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
        inv_markers = TRV.getMarkersInv(new_scroll, window_height),
        last_state = _(this.state).clone(),
        new_state = this.adjust(last_state, {
          scroll_top: new_scroll,
          markers: markers,
          inv_markers: inv_markers
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
  }
  adjust(last_state, d) {
    var first_graf_elapsed = d.inv_markers["crown-vic-bleed"](0).pct_elapsed,
        window_height = $(window).height(),
        bg_top;
    bg_top = Math.linearTween(first_graf_elapsed, window_height, -1 * window_height, 1.0);
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

class PagerL extends ScanComponent {
  constructor(props) {
    super(props);
    this.state = {
      left: -160
    };
  }
  adjust(last_state, d) {
    var first_graf_elapsed = d.markers["crown-vic"](0.5).pct_elapsed,
        left;
    left = Math.easeOutBack(first_graf_elapsed, -160, 145, 1.0);
    return {left: left};
  }

  render() {
    return(
      <div id="left-pager" style={{left: this.state.left}}></div>
    )
  }
}

class PagerR extends ScanComponent {
  constructor(props) {
    super(props);
    this.state = {
      right: -160
    };
  }
  adjust(last_state, d) {
    var first_graf_elapsed = d.markers["crown-vic"](0.5).pct_elapsed,
        right;
    right = Math.easeOutBack(first_graf_elapsed, -160, 145, 1.0);
    return {right: right};
  }

  render() {
    return(
      <div id="right-pager" style={{right: this.state.right}}></div>
    )
  }
}

class Timelapse extends ScanComponent {
  constructor(props) {
    super(props);
    this.state = {
        frame: 0
    };
  }
 
  adjust(last_state, d) {
    var first_graf_elapsed = d.markers["12-chairs"](0.5).pct_elapsed,
        window_height = $(window).height(),
        frames = 59,
        frame,bg_top;
    frame = Math.round(frames * first_graf_elapsed);
    return {frame: frame};
  }

  render() {
    return(
        <img id="timelapse" src={"timelapse/frame_" + this.state.frame +".gif"}/>
    )
  }
}


$(function() {
  $("#page").height($(window).height() * 10);
  TRV.last_scroll = $(window).scrollTop();
  TRV.root = React.render(<TestComponent/>, document.getElementById('track'));
  $(window).on("scroll",_.throttle(function(){
    var new_scroll = $(window).scrollTop(),
        window_height = $(window).height(),
        $copy = $('#copy'),
        new_copy_top = (new_scroll / window_height) * (- $copy.height() * 0.1);
    var markers = TRV.getMarkers(new_copy_top, window_height);
    var inv_markers = TRV.getMarkersInv(new_copy_top, window_height);
    $copy.css({
      top: new_copy_top,
    });
    _(TRV.scan_components).each(function(c){
      var last_state = _(c.state).clone();
      var new_state = c.adjust(last_state, {
        scroll_top: new_scroll,
        markers: markers,
        inv_markers: inv_markers
      });
      c.setState(new_state);
    });
  },5));
});
