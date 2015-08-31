var React = require('react');
var embedComponent = require('embedComponent');
var $ = require('jquery');
var _ = require('underscore');
var PureRenderMixin = require('react/addons').addons.PureRenderMixin;

Math.linearTween = function (t, b, c, d) {
	return c*t/d + b;
};

window.TRV = {
    last_scroll: 0,
    scan_components: [],
    getPositions: function(scroll_top,window_height){
        return  _($(".marker-p")).map(function(p){
          var el_top = $(p).position().top,
              el_height = $(p).height(),
              pct_elapsed;
          if(el_top > scroll_top){
            pct_elapsed = 0;
          } else if (el_top + el_height < scroll_top){
            pct_elapsed = 1.0;
          } else {
            pct_elapsed = (scroll_top - el_top) / el_height
          }
          return {el_id: $(p).attr("id"), pct_elapsed: pct_elapsed}
        });
    }
};

class TestComponent extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div>
        <Bg/>
      </div>
    );
  }
}

class ScanComponent extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
        last_scroll: 0
    }
    TRV.scan_components.push(this);
  }

  adjust() {
    throw "You must override adjust"
  }
}

class Bg extends ScanComponent {
  adjust(last_state,d) {
    var first_graf_elapsed = d.pos[0].pct_elapsed,
        bg_top = -1 * $(window).height();
    if(first_graf_elapsed > 0.5){
        bg_top = Math.linearTween(first_graf_elapsed - 0.5, bg_top, -1 * bg_top, 0.5)
    }
    return {bg_top: bg_top}
  }

  render(){
    return(
        <div className='bg-slide' style={{position: "fixed", top: this.state.bg_top}}/>
    )
  }
}


$(function(){
    TRV.last_scroll = $(window).scrollTop();
    TRV.root = React.render(<TestComponent/>, document.getElementById('track'));
    $(window).on("scroll",function(){
      var new_scroll = $(window).scrollTop();
      var window_height = $(window).height();
      var pos = TRV.getPositions(new_scroll,window_height);
      _(TRV.scan_components).each(function(c){
        var last_state = _(c.state).clone();
        var new_state = c.adjust(last_state,{scroll_top: new_scroll, pos: pos});
        c.setState(new_state)        
      })
    })

})
