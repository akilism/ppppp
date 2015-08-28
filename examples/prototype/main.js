var React = require('react');
var embedComponent = require('embedComponent');
var $ = require('jquery');
var _ = require('underscore');
var PureRenderMixin = require('react/addons').addons.PureRenderMixin;

window.TRV = {
    last_scroll: 0,
    scan_components: []
};

class TestComponent extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div>
        <RedSquare/>
        <BlueSquare/>
        <div style={{height: 100000}}></div>
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

class RedSquare extends ScanComponent {
  adjust(last_state,pos){
    last_state.last_scroll = 2 * pos.scroll_y;
    return last_state;
  }

  render() {
    return (
      <div style={{width: 100, height: 100, "backgroundColor": "red", top: this.state.last_scroll, position: "relative"}}>
      </div>
    );
  }
}

class BlueSquare extends RedSquare {
  adjust(last_state,pos){
    var new_state = super.adjust(last_state,pos);
    //new_state.last_scroll = new_state.last_scroll * 0.8;
    new_state.last_scroll = 0;
    return new_state;
  }
  render() {
    return (
      <div style={{width: 50, height: 50, "backgroundColor": "cyan", top: this.state.last_scroll, position: "relative"}}>
      </div>
    );
  }
}

$(function(){
    TRV.last_scroll = $(window).scrollTop();
    TRV.root = React.render(<TestComponent/>, document.body);
    $(window).on("scroll",function(){
      var new_scroll = $(window).scrollTop();
      _(TRV.scan_components).each(function(c){
        var last_state = _(c.state).clone();
        var new_state = c.adjust(last_state,{scroll_y: new_scroll});
        c.setState(new_state)        
      })
    })

})
