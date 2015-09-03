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
    
    return _.reduce($(".marker-p"),  function(acc, p) {

      acc[p.id] = function(anchor) {
        if(typeof(anchor) === "undefined"){
          anchor = 0.0; 
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
          anchor = 0.0; 
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

class CopyComponent extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      activeArc: this.props.arcs[0].name
    }
  }

  componentDidMount() {
    $(window).on("scroll",_.throttle(function(evt){
      var new_scroll = $(window).scrollTop(),
          window_height = $(window).height(),
          $copy = $('.copy'),
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
          inv_markers: inv_markers,
          evt: evt
        });
        c.setState(new_state);
      });
    },5));
  }

  transitionArc(node) {
    console.log('transitionTo:', node);
    var newActive = this.props.arcs.filter((a) => {
      return a.markers.filter((m) => {
        return m.name === node.to;
      }).length > 0;
    });

    console.log("newActive:", newActive[0].name);
  }

  setActive(i, marker) {
    if(marker.left && marker.right) {
      if(Math.random() >= 0.5) {
        this.transitionArc(marker.left);
      } else {
        this.transitionArc(marker.right);
      }
    } else if(marker.left) {
      this.transitionArc(marker.left);
    } else if(marker.right) {
      this.transitionArc(marker.right);
    }
  }

  render() {
    var arcs = this.props.arcs.map((a, i) => {
      return <ArcComponent setActive={this.setActive.bind(this, i)} markers={a.markers} name={a.name} idx={i} key={a.name} />;
    })
   return ( 
      <div className="copy">
        {arcs}
      </div>
    );
  }
}

class ArcComponent extends React.Component {
  constructor(props) {
    super(props);
  }

  handleClick(i) {
    var marker = this.props.markers[i];
    this.props.setActive(marker);
  }

  render() {
    var markers = this.props.markers.map((m, i) => {
        return <MarkerComponent clickHandler={this.handleClick.bind(this, i)} copy={m.copy} name={m.name} key={m.name} idx={i} left={_.extend(m.left, {'direction': 'left'})} right={_.extend(m.right, {'direction': 'right'})} />;
      });
    var classes = "arc-" + this.props.idx + " " + this.props.name;
    return (
      <div ref={this.props.name} className={classes}>
        {markers}
      </div>
    );
  }
}

class MarkerComponent extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <p className="marker-p" onClick={this.props.clickHandler} ref={this.props.name}>
        {this.props.copy}
      </p>
    );
  }
}

class SoundTrigger extends ScanComponent {
  constructor(props) {
    super(props);
    this.state = {
      playing: false
    }
    this.trigger = 'always';  //always, once, n plays
    this.soundPath = 'ambient_city.mp3';
  }

  loadAudioFile() {
    console.log(this.soundPath);

    return fetch(this.soundPath, {
      method: "GET"
    })
    .then((response) => { return response.arrayBuffer(); })
    .then((arrayBuff) => {
      return new Promise((resolve, reject) => {
        this.audioContext.decodeAudioData(arrayBuff, 
          function(buffer) { resolve(buffer); }, 
          function(err) { reject(err); });
      });
    })
    .catch((error) => { console.error(error); });
  }

  getWindowAudioContext() {
    try {
      window.AudioContext = window.AudioContext || window.webkitAudioContext;
      window.audioctx = window.audioctx || new AudioContext();
      return window.audioctx;
    } catch (e) {
      console.log('No Web Audio API support.');
      return {};
    }
  }

  getSource() {
    if(!this.source) {
      this.source = this.audioContext.createBufferSource();
    }

    return this.source;
  }

  play() {
    if(!this.state.playing) {
      // console.log("play");
      var source = this.getSource();
      source.buffer = this.soundBuffer;
      source.connect(this.audioContext.destination);
      source.loop = false;
      source.start();
    }
  }

  removeSource() { this.source = null; }

  stop() {
    if(this.source){
      // console.log("stop");
      var source = this.getSource();
      source.stop();
      this.removeSource();
    }
  }

  adjust(last_state, d) {
    var marker_elapsed = d.markers["crown-vic"](0.5).pct_elapsed;
    // console.log("marker elapsed:", marker_elapsed);
    if(marker_elapsed > 0 && marker_elapsed < 0.75) {
      this.play();
      return {playing: true};
    } else if(marker_elapsed === 1 || marker_elapsed === 0) {
      this.stop();
      return {playing: false};
    } else {
      return {playing: last_state.playing};
    }
  }

  componentWillMount() {
    this.audioContext = this.getWindowAudioContext();
    this.loadAudioFile(this.audio).then((audioBuffer) => {
      this.soundBuffer = audioBuffer;
    });
  }

  render() {
    return (
      <p className="sound-trigger"></p>
    );
  }
}

class HotSpot extends ScanComponent {
  constructor(props) {
    super(props);
    this.state = {
      visible: false
    };
  }

  isTouched() {
    debugger;
  }

  adjust(last_state, d) {
    var marker_elapsed = d.markers["crown-vic"](0.5).pct_elapsed;
    // console.log("marker elapsed:", marker_elapsed);
    if(marker_elapsed > 0 && marker_elapsed < 0.75) {
      return {visible: true};
    } else if(marker_elapsed === 1) {
      return {visible: false};
    }
    return {visible: false};
  }

  getVis() {
    if(this.state.visible) {
      return {visibility: "visible"};
    } else {
      return {visibility: "hidden"};
    }
  }

  render() {
    return (
      <p className="hot-spot" style={this.getVis()}></p>
    );
  }
}


var arcs = [
    { "name": "Williamsburg",
      "markers": [
        { "name": "intro",
          "copy": "We just moved to a new office, which is in a different part of the neighborhood than we are used to. In New York, even something as small as a few blocks can change everything. To show us around, we hooked up with VICE veteran, Ben Kammerle, to show us all the spots.",
          "left": null,
          "right": null},
        { "name": "12-chairs",
          "copy": "He first took us to 12 chairs. One of the best new restaurants in the neighborhood and right next door to the office. It’s run by some badass Israelis - we talked to the owner and got his story. He ordered us some hummus and falafel. It was awesome but Ben was extremely rude to the staff. Ben was being a total jerk, but thank goodness 12 Chairs has some incredible mint lemonade to calm us down.",
          "left": {"to": "ss-crown-vic", "duration": 1500},
          "right": null},
        { "name": "crown-vic",
          "copy": "To Ben, Brooklyn in the summer means bars with backyards. \"Don’t even mess around with ones that don’t.\" he says, \"No one will be there.\" He took us to one of the best backyards, Crown Victoria. Probably because he’s cheap. In the back of the bar was a great taco truck... Great drinks... And tons of space to waste away your day. In brooklyn, day drinking is encouraged. There’s a tone of games to wile away the day. Cornholing. I don’t know why they call it that. Horseshoes. Not to mention, on sundays they roast an entire pig",
          "left": null,
          "right": null},
        { "name": "crown-vic-2",
          "copy": "To Ben, Brooklyn in the summer means bars with backyards. \"Don’t even mess around with ones that don’t.\" he says, \"No one will be there.\" He took us to one of the best backyards, Crown Victoria. Probably because he’s cheap. In the back of the bar was a great taco truck... Great drinks... And tons of space to waste away your day. In brooklyn, day drinking is encouraged. There’s a tone of games to wile away the day. Cornholing. I don’t know why they call it that. Horseshoes. Not to mention, on sundays they roast an entire pig",
          "left": {"to": "ss-12-chairs", "duration": 1500},
          "right": {"to": "e-crown-vic", "duration": 1500}}
      ]},
    { "name": "Southside Williamsburg",
      "markers": [
        { "name": "ss-intro",
          "copy": "We just moved to a new office, which is in a different part of the neighborhood than we are used to. In New York, even something as small as a few blocks can change everything. To show us around, we hooked up with VICE veteran, Ben Kammerle, to show us all the spots.",
          "left": null,
          "right": null},
        { "name": "ss-12-chairs",
          "copy": "He first took us to 12 chairs. One of the best new restaurants in the neighborhood and right next door to the office. It’s run by some badass Israelis - we talked to the owner and got his story. He ordered us some hummus and falafel. It was awesome but Ben was extremely rude to the staff. Ben was being a total jerk, but thank goodness 12 Chairs has some incredible mint lemonade to calm us down.",
          "left": null,
          "right": null},
        { "name": "ss-crown-vic",
          "copy": "To Ben, Brooklyn in the summer means bars with backyards. \"Don’t even mess around with ones that don’t.\" he says, \"No one will be there.\" He took us to one of the best backyards, Crown Victoria. Probably because he’s cheap. In the back of the bar was a great taco truck... Great drinks... And tons of space to waste away your day. In brooklyn, day drinking is encouraged. There’s a tone of games to wile away the day. Cornholing. I don’t know why they call it that. Horseshoes. Not to mention, on sundays they roast an entire pig",
          "left": null,
          "right": null},
        { "name": "ss-crown-vic-2",
          "copy": "To Ben, Brooklyn in the summer means bars with backyards. \"Don’t even mess around with ones that don’t.\" he says, \"No one will be there.\" He took us to one of the best backyards, Crown Victoria. Probably because he’s cheap. In the back of the bar was a great taco truck... Great drinks... And tons of space to waste away your day. In brooklyn, day drinking is encouraged. There’s a tone of games to wile away the day. Cornholing. I don’t know why they call it that. Horseshoes. Not to mention, on sundays they roast an entire pig",
          "left": null,
          "right": null}
      ]},
    { "name": "East Williamsburg",
      "markers": [
        { "name": "e-intro",
          "copy": "We just moved to a new office, which is in a different part of the neighborhood than we are used to. In New York, even something as small as a few blocks can change everything. To show us around, we hooked up with VICE veteran, Ben Kammerle, to show us all the spots.",
          "left": null,
          "right": null},
        { "name": "e-12-chairs",
          "copy": "He first took us to 12 chairs. One of the best new restaurants in the neighborhood and right next door to the office. It’s run by some badass Israelis - we talked to the owner and got his story. He ordered us some hummus and falafel. It was awesome but Ben was extremely rude to the staff. Ben was being a total jerk, but thank goodness 12 Chairs has some incredible mint lemonade to calm us down.",
          "left": null,
          "right": null},
        { "name": "e-crown-vic",
          "copy": "To Ben, Brooklyn in the summer means bars with backyards. \"Don’t even mess around with ones that don’t.\" he says, \"No one will be there.\" He took us to one of the best backyards, Crown Victoria. Probably because he’s cheap. In the back of the bar was a great taco truck... Great drinks... And tons of space to waste away your day. In brooklyn, day drinking is encouraged. There’s a tone of games to wile away the day. Cornholing. I don’t know why they call it that. Horseshoes. Not to mention, on sundays they roast an entire pig",
          "left": null,
          "right": null},
        { "name": "e-crown-vic-2",
          "copy": "To Ben, Brooklyn in the summer means bars with backyards. \"Don’t even mess around with ones that don’t.\" he says, \"No one will be there.\" He took us to one of the best backyards, Crown Victoria. Probably because he’s cheap. In the back of the bar was a great taco truck... Great drinks... And tons of space to waste away your day. In brooklyn, day drinking is encouraged. There’s a tone of games to wile away the day. Cornholing. I don’t know why they call it that. Horseshoes. Not to mention, on sundays they roast an entire pig",
          "left": null,
          "right": null}
      ]}];


$(function() {
  $("#page").height($(window).height() * 10);
  TRV.last_scroll = $(window).scrollTop();
  TRV.root = React.render(<TestComponent/>, document.getElementById('track'));
  React.render(<CopyComponent arcs={arcs} />, document.getElementById('page'));

  function transitionTo(fromEl, toEl, duration, direction) {
    var parentFrom = fromEl.parent();
    var parentTo = toEl.parent();

    // console.log(toEl.offset(), toEl.position(), toEl.height());
    
    $("#copy").animate({ top: (toEl.position().top * -1) }, duration);
    if(direction === "left") {
      parentFrom.css('position', 'relative');
      parentTo.animate({left: parentFrom.offset().left}, duration, function() {
        parentTo.css('position', 'initial');
      });
      parentFrom.animate({left: "300%"}, duration, function() {
        parentFrom.css('position', 'fixed');
      });
    } else if (direction === "right") {
      parentTo.css('position', 'relative');
      parentFrom.css('position', 'fixed');
      parentTo.animate({left: 0}, duration, function() {
        parentTo.css('position', 'initial');
      });
      parentFrom.animate({left: "-300%"}, duration, function() {
        // fromEl.css('position', 'fixed');
      });
    }
  }
      
  // $('#crown-vic').on('click', function(evt) {
  //   transitionTo($(this), $('#intro-col1'), 1500, "left");
  // });

  // $('#crown-vic-2').on('click', function(evt) {
  //   transitionTo($(this), $('#intro-col3'), 1500, "right");
  // });

  // $('#intro-col1').on('click', function(evt) {
  //   transitionTo($(this), $('#crown-vic'), 1500, "right");
  // });

  // $('#intro-col3').on('click', function(evt) {
  //   transitionTo($(this), $('#crown-vic-2'), 1500, "left");
  // });
});
