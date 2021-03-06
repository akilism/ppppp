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
    // return _.reduce(_.filter($(".marker-p"), (el) => { console.log(el.getAttribute("data-activate")); return true;}),  function(acc, p) {
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
          pct_elapsed_raw,
          isActive = ($p.attr("data-activate") === "true") ? true : false;
        if (el_top > scroll_anchor) {
          pct_elapsed = 0;
        } else if (el_top + el_height < scroll_anchor) {
          pct_elapsed = 1.0;
        } else {
          pct_elapsed = (scroll_anchor - el_top) / el_height;
        }
        pct_elapsed_raw = (scroll_anchor - el_top) / el_height;
        return {el_id: $(p).attr("id"), pct_elapsed: pct_elapsed, pct_elapsed_raw: pct_elapsed_raw, isActive: isActive};
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
          pct_elapsed_raw,
          isActive = ($p.attr("data-activate") === "true") ? true : false;

        if (el_anchor > scroll_top + window_height) {
          pct_elapsed = 0;
        } else if (el_anchor < scroll_top) {
          pct_elapsed = 1.0;
        } else {
          pct_elapsed = 1 - ((el_anchor - scroll_top) / window_height);
        }
        pct_elapsed_raw = 1 - ((el_anchor - scroll_top) / window_height);
        return {el_id: $(p).attr("id"), pct_elapsed: pct_elapsed, pct_elapsed_raw: pct_elapsed_raw, isActive: isActive};
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
        <SoundTrigger marker="12-chairs" anchor="0.15" trigger="always" soundPath="../akil2/ambient_city.mp3" />
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
    $(window).on("scroll",_.throttle((evt) => {
      var new_scroll = $(window).scrollTop(),
          window_height = $(window).height(),
          $copy = $(React.findDOMNode(this.refs.copy)),
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
    },5).bind(this));
  }

  transitionArc(fromNode, toNode) {
    // console.log('transitionTo:', toNode.to, " from:", fromNode);
    var duration = toNode.duration,
      direction = toNode.direction;
    var newActive = this.props.arcs.filter((a) => {
        return a.markers.filter((m) => {
          return m.name === toNode.to;
        }).length > 0;
      });


    var refTo = this.refs[newActive[0].name],
      refFrom = this.refs[this.state.activeArc],
      parentFrom = $(React.findDOMNode(refFrom)),
      parentTo = $(React.findDOMNode(refTo)),
      toEl = $(React.findDOMNode(refTo.refs[toNode.to])),
      fromEl = $(React.findDOMNode(refFrom.refs[fromNode]));

    //might need to adjust scrollTop here also.
    $(".copy").animate({ top: (toEl.position().top * -1) }, duration);
    if(direction === "left") {
      // parentTo.css('position', 'relative');
      parentFrom.css('position', 'absolute');
      parentTo.animate({left: parentFrom.offset().left}, duration, function() {
        parentTo.css('position', 'initial');
      });
      parentFrom.animate({left: "200%"}, duration, function() {
        parentFrom.css('position', 'absolute');
      });
    } else if (direction === "right") {
      // parentTo.css('position', 'relative');
      parentFrom.css('position', 'absolute');
      parentTo.animate({left: 0}, duration, function() {
        parentTo.css('position', 'initial');
      });
      parentFrom.animate({left: "-200%"}, duration, function() {
        // fromEl.css('position', 'fixed');
      });
    }
    this.setState({activeArc: newActive[0].name});
  }

  setActive(i, marker) {
    if(marker.left && marker.right) {
      if(Math.random() >= 0.5) {
        this.transitionArc(marker.name, marker.left);
      } else {
        this.transitionArc(marker.name, marker.right);
      }
    } else if(marker.left) {
      this.transitionArc(marker.name, marker.left);
    } else if(marker.right) {
      this.transitionArc(marker.name, marker.right);
    }
  }

  render() {
    var arcs = this.props.arcs.map((a, i) => {
      return <ArcComponent isActive={(a.name === this.state.activeArc)} setActive={this.setActive.bind(this, i)} ref={a.name} content={a.content} name={a.name} idx={i} key={a.name} />;
    })
   return (
      <div className="copy" ref="copy">
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
    var marker = this.props.content[i];
    this.props.setActive(marker);
  }

  getContent(content) {
    return content.map((el, i) => {
      switch (el.type) {
        case "marker":
          return <MarkerComponent isActive={this.props.isActive} clickHandler={this.handleClick.bind(this, i)} id={el.name} copy={el.copy} ref={el.name} key={el.name} idx={i} left={_.extend(el.left, {'direction': 'left'})} right={_.extend(el.right, {'direction': 'right'})} />;
        case "transition":
          return <TransitionComponent marker={el.marker} anchor={el.anchor} ref={el.name} key={el.name} />
        case "timelapse":
          return <Timelapse marker={el.marker} anchor={el.anchor} ref={el.name} key={el.name} />
        default:
          throw new Error("Unrecognized Component Type: " + el.type);
      }
    });
  }

  render() {
    var classes = "arc-" + this.props.idx + " " + this.props.name;
    var content = this.getContent(this.props.content);
    return (
      <div className={classes}>
        {content}
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
      <p className="marker-p" id={this.props.id}  onClick={this.props.clickHandler} data-activate={this.props.isActive}>
        {this.props.copy}
      </p>
    );
  }
}

class TransitionComponent extends ScanComponent {
  constructor(props) {
    super(props);
    this.state = {
      visible: false

    };
  }

  adjust(last_state, d) {
    var marker = d.markers[this.props.marker](this.props.anchor);
    var marker_elapsed = marker.pct_elapsed;

    if(marker_elapsed > 0) {
      var opacity = Math.linearTween(marker_elapsed, 0, 1, 1.0);
      return {visible: true, opacity: opacity};
    }

    return {visible: false};
  }

  getStyle() {
    if(this.state.visible) {
      return {visibility: "visible", opacity: this.state.opacity};
    } else {
      return {visibility: "visible", opacity: 0};
    }
  }

  render() {
    var content = <img src="fireworks.jpg" style={{width: "100%"}} />;
    return (
      <div className="transition" style={this.getStyle()}>
        {content}
      </div>
    );
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
    var first_graf_elapsed = d.markers[this.props.marker](this.props.anchor).pct_elapsed,
        frames = 59,
        frame,bg_top;
    frame = Math.round(frames * first_graf_elapsed);
    return {frame: frame};
  }

  render() {
    return(
        <img style={{width: "100%"}} id="timelapse" src={"/erik/timelapse/frame_" + this.state.frame +".gif"}/>
    )
  }
}

class SoundTrigger extends ScanComponent {
  constructor(props) {
    super(props);
    this.state = {
      playing: false
    }
    // this.trigger = 'always';  //always, once, n plays
    // this.soundPath = 'ambient_city.mp3';
  }

  loadAudioFile() {
    console.log(this.props.soundPath);

    return fetch(this.props.soundPath, {
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
    var marker = d.markers[this.props.marker](this.props.anchor);
    var marker_elapsed = marker.pct_elapsed;
    // console.log("marker elapsed:", marker_elapsed);
    if(marker.isActive) {
      if(marker_elapsed > 0 && marker_elapsed < 0.25) {
        this.play();
        return {playing: true};
      } else if(marker_elapsed === 1 || marker_elapsed === 0) {
        this.stop();
        return {playing: false};
      }
    }

    return {playing: last_state.playing};
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

var arcs = [{ "name": "Williamsburg",
      "content": [
        { "name": "intro",
          "copy": "We just moved to a new office, which is in a different part of the neighborhood than we are used to. In New York, even something as small as a few blocks can change everything. To show us around, we hooked up with VICE veteran, Ben Kammerle, to show us all the spots.",
          "type": "marker",
          "left": null,
          "right": null},
        { "name": "12-chairs",
          "copy": "He first took us to 12 chairs. One of the best new restaurants in the neighborhood and right next door to the office. It’s run by some badass Israelis - we talked to the owner and got his story. He ordered us some hummus and falafel. It was awesome but Ben was extremely rude to the staff. Ben was being a total jerk, but thank goodness 12 Chairs has some incredible mint lemonade to calm us down.",
          "type": "marker",
          "left": null,
          "right": null},
         { "name": "timelapse",
          "type": "timelapse",
          "marker": "12-chairs",
          "anchor": 0.17},
        { "name": "crown-vic",
          "copy": "To Ben, Brooklyn in the summer means bars with backyards. \"Don’t even mess around with ones that don’t.\" he says, \"No one will be there.\" He took us to one of the best backyards, Crown Victoria. Probably because he’s cheap. In the back of the bar was a great taco truck... Great drinks... And tons of space to waste away your day. In brooklyn, day drinking is encouraged. There’s a tone of games to wile away the day. Cornholing. I don’t know why they call it that. Horseshoes. Not to mention, on sundays they roast an entire pig",
          "type": "marker",
          "left": null,
          "right": null},
        { "name": "fireworks-transition",
          "type": "transition",
          "marker": "crown-vic",
          "anchor": 0.20},
        { "name": "crown-vic-2",
          "copy": "To Ben, Brooklyn in the summer means bars with backyards. \"Don’t even mess around with ones that don’t.\" he says, \"No one will be there.\" He took us to one of the best backyards, Crown Victoria. Probably because he’s cheap. In the back of the bar was a great taco truck... Great drinks... And tons of space to waste away your day. In brooklyn, day drinking is encouraged. There’s a tone of games to wile away the day. Cornholing. I don’t know why they call it that. Horseshoes. Not to mention, on sundays they roast an entire pig",
          "type": "marker",
          "left": null,
          "right": null}
      ]}];

$(function() {
  $("#page").height($(window).height() * 10);
  React.render(<CopyComponent arcs={arcs} />, document.getElementById('copyHolder'));
  TRV.last_scroll = $(window).scrollTop();
  TRV.root = React.render(<TestComponent/>, document.getElementById('track'));

});
