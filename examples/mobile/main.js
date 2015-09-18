var $ = require('jquery');
var React = require('react');
var ReactDOM = require('react-dom');
var _ = require('underscore');
var directions = require('directions');
var Conti = require('conti');

var scaler = (function(currMin, currMax, otherMin, otherMax) {
  var left = currMax - currMin;
  var right = otherMax - otherMin;

  var scale = right / left;

  var getVal = function(val) {
    return otherMin + (val - currMin) * scale;
  };

  return getVal;
});

window.Conti = Conti;
window.jQ = $;

/*
  // Progress V.
  <div className="v-white-glow"/>
  <div className="v-white">
    <div className="v-red" style={{height: this.state.redh}}/>
  </div>
  <div className="full-black" style={{opacity: this.state.black}}/>
*/

Math.linearTween = function (t, b, c, d) {
  //
  return c*t/d + b;
};
Math.easeOutBack = function (t, b, c, d, s) {
    if (s === undefined) s = 1.70158;
    return c*((t=t/d-1)*t*((s+1)*t + s) + 1) + b;
};
Math.easeInOutQuad = function (t, b, c, d) {
  t /= d/2;
  if (t < 1) return c/2*t*t + b;
  t--;
  return -c/2 * (t*(t-2) - 1) + b;
};

var scene = [
    { "name": "marseille",
      "type": "title",
      "title": "MARSEILLE",
      "backgroundImage": "/erik3/marseille_1.jpg",
      "fontSize": 250,
      "coords": { "lat": 40.8025967, "lng": -73.9502753},
      "progressIndicator": {
        "name": "Marseille",
        "location": "France",
        "startPosition": 0,
        "endPosition": 0.15,
      }},
    // {"name": "progressmap",
    //  "type": "routemap"},
    {"name": "square",
      "type": "slide1",
      "coords": { "lat": 40.780916, "lng": -73.972981 },
      "progressIndicator": {
        "name": "Marseille Square",
        "location": "Marseille, France",
        "startPosition": 0.15,
        "endPosition": 0.35
      }},
    {"name": "slide2",
      "type": "slide2",
      "coords": { "lat": 40.704021, "lng": -74.017073},
      "progressIndicator": {
        "name": "Life is Hard",
        "location": "Marseille, France",
        "startPosition": 0.35,
        "endPosition": 1
      }},
      ];


function createViewport(Component, container) {
  class Viewport extends React.Component {
    getChildContext() {
      return {
        getPercentage: this.getPct.bind(this),
        getPercentageInverse: this.getInv.bind(this)
      };
    }

    componentWillMount() {
      var viewportWidth, viewportHeight;
      if (container === document.body) {
        //if mobile use screen height and width
        [viewportWidth, viewportHeight] = [$(window).width(), $(window).height()+56];
      } else {
        [viewportWidth, viewportHeight] = [$(container).width(), $(container).height()];
      }
      if (!viewportWidth || !viewportHeight) {
        throw new Error("Viewport must have a non-zero width and height");
      }

      this.setState({measurements: {
        viewportWidth, viewportHeight, viewportLeft: 0, viewportTop: 0,
        contentHeight: (viewportHeight * 12), adjustedViewportTop: 0,
        pctScroll: 0 }});
    }

    componentDidMount() {
      $(window).on('scroll', _.throttle(this.handleScroll.bind(this), 10));
    }

    render() {
      var style = {
        width: this.state.measurements.viewportWidth,
        height: this.state.measurements.contentHeight,
      };

      return (
        <div style={style}>
          <Component ref="viewportRoot" measurements={this.state.measurements} />
        </div>
      );
    }

    getPct(ref, anchor) {
      var component = this.bfs(ref);
      return component.getPct(anchor);
    }

    getInv(ref, anchor) {
      var component = this.bfs(ref);
      return component.getInv(anchor);
    }

    handleScroll(ev) {
      var viewportLeft = $(ev.target).scrollLeft(),
          viewportTop = $(ev.target).scrollTop(),
          contentHeight = this.state.measurements.contentHeight,
          adjustedViewportTop = (viewportTop / this.state.measurements.viewportHeight) * (contentHeight * 0.1),
          pctScroll = viewportTop / (contentHeight - this.state.measurements.viewportHeight);
      // console.log("pctScroll:", pctScroll, " contentHeight:", contentHeight, " viewportTop:", viewportTop, " viewportHeight:", this.state.measurements.viewportHeight);
      this.setState({measurements: _.extend(this.state.measurements, {viewportLeft, viewportTop, contentHeight, adjustedViewportTop, pctScroll})});
    }

    bfs(ref) {
      let items = [];
      let path = [];

      var buildPath = function(path) { return path.reverse().join(' -> '); };

      var search = function(items, goal, path) {
        if(items.length === 0) { throw new Error('Item not found.'); }
        let [refName, component] = items.shift();
        if(goal === refName) { return component; }
        return search(_.pairs(component.refs).concat(items), goal, path.concat(refName));
      };

      return search(_.pairs(this.refs), ref, []);
    }
  }

  Viewport.childContextTypes = {
    getPercentage: React.PropTypes.func.isRequired,
    getPercentageInverse: React.PropTypes.func.isRequired,
  };

  return Viewport;
}

class Root extends React.Component {
  constructor(props) {
    super(props)
  }

  render() {
    return (
      <div>
        <Slide3 measurements={this.props.measurements} start={0.75} end={1} />
        <Slide2 measurements={this.props.measurements} start={0.65} end={0.75} />
        <Slide1 measurements={this.props.measurements} start={0.10} end={0.65} />
        <Title measurements={this.props.measurements} start={0} end={0.10} title="marseille" backgroundImage="/erik3/marseille_1.jpg" />
      </div>
    );
  }
}

class Base extends React.Component {
  constructor(props) {
    super(props);
  }

  getPct(anchor) {
    var {viewportHeight, adjustedViewportTop} = this.props.measurements,
      $p = $(ReactDOM.findDOMNode(this)),
      el_height = $p.outerHeight(),
      el_top = $p.position().top,
      scroll_anchor = adjustedViewportTop + (viewportHeight * anchor),
      pct_elapsed,
      pct_elapsed_raw;
      // isActive = ($p.attr("data-activate") === "true") ? true : false;

    if (el_top > scroll_anchor) {
      pct_elapsed = 0;
    } else if (el_top + el_height < scroll_anchor) {
      pct_elapsed = 1.0;
    } else {
      pct_elapsed = (scroll_anchor - el_top) / el_height;
    }
    pct_elapsed_raw = (scroll_anchor - el_top) / el_height;
    //el_id: $p.attr("id"), isActive: isActive
    return {pct_elapsed: pct_elapsed, pct_elapsed_raw: pct_elapsed_raw};
  }

  getInv(anchor) {
    var {viewportHeight, viewportTop} = this.props.measurements,
      $p = $(ReactDOM.findDOMNode(this)),
      el_height = $p.outerHeight(),
      el_top = $p.position().top,
      el_anchor = el_top + (el_height * anchor),
      pct_elapsed,
      pct_elapsed_raw;

      if (el_anchor > viewportTop + viewportHeight) {
        pct_elapsed = 0;
      } else if (el_anchor < viewportTop) {
        pct_elapsed = 1.0;
      } else {
        pct_elapsed = 1 - ((el_anchor - viewportTop) / viewportHeight);
      }
      pct_elapsed_raw = 1 - ((el_anchor - viewportTop) / viewportHeight);
      // el_id: $(p).attr("id"), isActive: isActive
      return {pct_elapsed: pct_elapsed, pct_elapsed_raw: pct_elapsed_raw};
  }
}

class MarkerComponent extends Base {
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

class ScanComponent extends Base {
  constructor(props) {
    super(props);
    this.scaler = scaler(this.props.start, this.props.end, 0, 1);
  }

  adjust() {
    throw "You must override adjust"
  }
}

ScanComponent.contextTypes = {
  getPercentage: React.PropTypes.func.isRequired,
};

class SlideComponent extends ScanComponent {
  constructor(props) {
    super(props);
    this.state = {
      top: 0
    }
  }

  componentWillReceiveProps() {
    this.setState(_.extend(this.state, this.adjust(this.state)));
  }

  adjust(last_state) {
    var {viewportHeight, viewportTop, adjustedViewportTop, contentHeight, pctScroll} = this.props.measurements;

    var destTop = viewportHeight * -1,
      newTop;

    if (pctScroll >= this.props.end) {
        newTop = destTop;
    } else if(pctScroll >= this.props.start){
        newTop = Math.linearTween((pctScroll-this.props.start), 0, destTop, 0.1);
    } else {
      newTop = 0;
    }

    return {top: newTop};
  }

  render() {
    // width: this.props.measurements.viewportWidth
    return(
      <div className='bg-slide' style={{
        top: this.state.top,
        backgroundColor: this.props.backgroundColor,
        height: this.props.measurements.viewportHeight,
      }}>
       {this.props.backgroundColor}
      </div>
    )
  }
}

class Title extends ScanComponent {
  constructor(props) {
    super(props);
    this.state = {
      top: 0
    };
  }

  componentWillReceiveProps() {
    this.setState(_.extend(this.state, this.adjust(this.state)));
  }

  isActive(d){
    return (d.pctScroll >= this.props.start && d.pctScroll < this.props.end);
  }

  adjust(last_state) {
    var {viewportHeight, viewportTop, adjustedViewportTop, contentHeight, pctScroll} = this.props.measurements,
        adjustedPctScroll = this.scaler(pctScroll),
        active = this.isActive(this.props.measurements),
        dest_top = viewportHeight * -1,
        newTop;

    if(adjustedPctScroll < 1){
        newTop = Math.linearTween(adjustedPctScroll, 0, dest_top, 1);
    } else if (pctScroll) {
        newTop = dest_top;
    }
    return {top: newTop};
  }

  render() {
    return(
      <div className='bg-slide' style={{
        height: this.props.measurements.viewportHeight,
        top: this.state.top,
        backgroundImage: "url('" + this.props.backgroundImage + "')",
        backgroundSize: "cover"
      }}>
        <h3 className="vid-title" style={{fontSize: this.props.fontSize}}>{this.props.title}</h3>
      </div>
    )
  }
}

class Slide1 extends ScanComponent {
  constructor(props) {
    super(props);
    this.state = {
      top: 10,
      caption: false,
      active: false,
      slideWords: "6.5%"
    };
  }

  componentWillReceiveProps() {
    this.setState(_.extend(this.state, this.adjust(this.state)));
  }

  componentDidMount(){
    var domNode = this.refs.map; //ReactDOM.findDOMNode();
    var map = new google.maps.Map(domNode);
    // replace "toner" here with "terrain" or "watercolor"
    this.state.map = map;
    this.state.streetView = map.getStreetView();
    this.state.streetView.setVisible(true);
    this.state.streetView.setOptions({ linksControl: false, panControl: false,
      zoomControl: false, mapTypeControl: false,
      streetViewControl: false, overviewMapControl: false,
      addressControl: false, enableCloseButton: false});

    var startPoint = new google.maps.LatLng(43.29638, 5.377674);
    this.state.streetView.setPosition(startPoint);
    this.state.streetView.setPov({heading: 77.68007576992042, pitch: 30.9837616957764, zoom: 1}); //64.9837616957764
    $(domNode).css({"pointer-events": "none"});

    $(window).on("keydown",_.bind(function(e){
        if(e.keyCode == 32){
            if(this.state.active){
                e.preventDefault();
                this.togglePov();
                $(".v-white-glow").css({opacity:1});
                setTimeout(function(){
                    $(".v-white-glow").css({opacity:0});
                },500)
                return false;
            }
        }
    },this));
  }

  isActive(d){
    return (d.pctScroll >= this.props.start && d.pctScroll < this.props.end);
  }

  adjust(last_state, d) {
    let {viewportHeight, viewportTop, adjustedViewportTop, contentHeight, pctScroll} = this.props.measurements,
        adjustedPctScroll = this.scaler(pctScroll),
        active = this.isActive(this.props.measurements),
        currentPov = this.state.streetView.getPov(),
        caption = false;

    if(!active) { return {active}; }

    var conti = new Conti(0,0.05,"adjustedPctScroll",function(clamped_pct, t){
        t.new_pitch = 64.9837616957764;
        t.new_volume = 0
        t.new_slide = 6.5;
        return t;
      }).abut(0.1, function(clamped_pct, t){
        t.new_pitch = Math.linearTween(clamped_pct, 64.9837616957764, -64.9837616957764, 1)
        t.new_volume = Math.linearTween(clamped_pct,0,0.6,1);
        t.new_slide = Math.linearTween(clamped_pct,10,-100,1);
        return t;
      }).abut(0.35, function(clamped_pct, t){
        t.new_pitch = 0;
        t.new_volume = 0.6;
        t.new_slide = -100;
        return t;
      }).abut(0.85, function(clamped_pct, t){
        t.new_pitch = 0;
        t.new_volume = Math.linearTween(clamped_pct,0.6,-0.6,1);
        t.new_slide = -100;
        return t;
      }).abut(1, function(clamped_pct,t){
        t.new_pitch = 0;
        t.new_volume = 0;
        t.new_slide = -100;
        return t;
      });

    var trans_data = conti.run(_.extend(this.props.measurements, {adjustedPctScroll}), {})

    if (active) { $("#shopping-mp3")[0].play(); }
    else { $("#shopping-mp3")[0].pause(); }

    $("#shopping-mp3")[0].volume = trans_data.new_volume;

    if (adjustedPctScroll < 0) {
        caption = false
    } else if ((adjustedPctScroll >= 0.25 && adjustedPctScroll < 0.45)){
        caption = "I woke up in the middle of the promenade.";
        if(caption !== this.state.caption){ $("#shopping-mp3-1")[0].play(); }
    } else if ((adjustedPctScroll >= 0.45 && adjustedPctScroll < 0.65)){
        caption = "Traffic had stopped, my head spinning.";
        if(caption !== this.state.caption){ $("#shopping-mp3-2")[0].play(); }
    } else if ((adjustedPctScroll >= 0.65 && adjustedPctScroll < 0.85)) {
        caption = "Yung TourGuide was laughing.<br/>'First time, eh?'";
        if(caption !== this.state.caption){ $("#shopping-mp3-4")[0].play(); }
    } else if (adjustedPctScroll > 0.85 && adjustedPctScroll < 1) {
        caption = "My hand was clutching a bottle of magic juice. My night had just started."
        if(caption !== this.state.caption){ $("#shopping-mp3-3")[0].play(); }
    }

    currentPov.pitch = trans_data.new_pitch;

    this.state.streetView.setPov(currentPov);
    return {active: active, top: 0, caption: caption, slideWords: trans_data.new_slide + "%"};
  }

  togglePov(){
    var current_pov = _.clone(this.state.streetView.getPov());
    if(!this.pov_toggle){
        current_pov.heading += 180;
        this.pov_toggle = true;
    } else {
        current_pov.heading -= 180;
        this.pov_toggle = false;
    }
    animatePov(this.state.streetView,current_pov);
  }

  render() {
    return(
      <div className='bg-slide' style={{
        top: this.state.top,
        height: this.props.measurements.viewportHeight
      }}>
        <div className="streetview-back" ref="map" id="slide1" style={{
          width: this.props.measurements.viewportWidth,
          height: this.props.measurements.viewportHeight
        }}/>
        <h6 className="slide-words" style={{top: this.state.slideWords}}>
            At 6:00 PM, I got the text. "Meet Yung Tourguide in the middle of Marseille and take this pill". A pill popped out of my phone, because it was the future. I was gonna have a crazy night in the service of journalism.
        </h6>
        <h5 className="slide-caption" style={{display: this.state.caption ? 'block' : 'none'}} dangerouslySetInnerHTML={{ __html: this.state.caption}}>
        </h5>
        <audio id="shopping-mp3" loop>
          <source src="/shopping-square-1.mp3" type="audio/mp3"/>
        </audio>
        <audio id="shopping-mp3-1">
          <source src="/erik3/clip1.wav" type="audio/wav"/>
        </audio>
        <audio id="shopping-mp3-2">
          <source src="/erik3/clip2.wav" type="audio/wav"/>
        </audio>
        <audio id="shopping-mp3-3">
          <source src="/erik3/clip3.wav" type="audio/wav"/>
        </audio>
        <audio id="shopping-mp3-4">
          <source src="/erik3/clip4.wav" type="audio/wav"/>
        </audio>
      </div>
    )
  }
}

class Slide2 extends ScanComponent {
  constructor(props) {
    super(props);
    this.state = {
      bottom: 0,
      top: 0,
      active: false
    };
  }

  componentWillMount() {
    var positions = {
      top: -1 * this.props.measurements.viewportHeight,
      bottom: this.props.measurements.viewportHeight
    };
    this.setState(_.extend(this.state, positions));
  }

  componentWillReceiveProps() {
    this.setState(_.extend(this.state, this.adjust(this.state)));
  }

  isActive(d){
    return (d.pctScroll >= this.props.start && d.pctScroll < this.props.end);
  }

  adjust(last_state, d) {
    var {viewportHeight, viewportTop, adjustedViewportTop, contentHeight, pctScroll} = this.props.measurements,
        offsetTop = -1 * viewportHeight,
        offsetBottom = viewportHeight,
        adjustedPctScroll = this.scaler(pctScroll),
        active = this.isActive(this.props.measurements),
        bgBottom = 0,
        clampedScroll;

    if(pctScroll <= this.props.start){
        bgBottom = offsetBottom;
    } else if (pctScroll > this.props.end){
        bgBottom = 0;
    } else {
        // clampedScroll = adjustedPctScroll / 0.1
        bgBottom = Math.linearTween(adjustedPctScroll, offsetBottom, -1 * offsetBottom, 1)
    }

    return {bottom: bgBottom, active: active};
  }

  toggleBars(){
    if(this.bars_on){
        this.bars_on = false;
        $("#bar1").css({right: this.props.measurements.viewportWidth});
        setTimeout(function(){
            $("#bar2").css({left: this.props.measurements.viewportWidth});
        },500)
        setTimeout(function(){
            $("#bar3").css({right: this.props.measurements.viewportWidth});
        },750)
    } else {
        this.bars_on = true;
        $("#bar1").css({right: 0});
        setTimeout(function(){
            $("#bar2").css({left: 0});
        },500)
        setTimeout(function(){
            $("#bar3").css({right: 0});
        },750)
    }
  }

  componentDidMount() {
    $(window).on("keydown",_.bind(function(e){
        if(e.keyCode == 32){
            if(this.state.active){
                e.preventDefault();
                this.toggleBars();
                $(".v-white-glow").css({opacity:1});
                setTimeout(_.bind(function(){
                    $(".v-white-glow").css({opacity:0});
                    if(! this.played){
                        $("#city")[0].play();
                        $("#city-v")[0].play();
                        $("#city")[0].volume = 0.4;
                        this.played = true;
                    }
                },this),500)
                return false;
            }
        }
    },this))
  }

  render() {
    return(
      <div className='bg-slide' style={{
        //top:0,
        height: this.props.measurements.viewportHeight,
        bottom: this.state.bottom,
        backgroundColor: "white",
        overflow: "hidden",
        zIndex: 100
      }}>
        <div className="text-crop">
            <h5 className="slide-caption black">My hand was clutching a bottle of magic juice. My night had just started.</h5>
        </div>
        <div className="blackbar" id="bar1" style={{height:"22%", top: "20%", right: this.props.measurements.viewportWidth}}>
            <div className="btext" style={{width: this.props.measurements.viewportWidth}}>
                <div className="btext-inner">
                  12 Midnight: Sudden laughter, repeated in short bursts. "I would like to metamorphose into a mouse-mountain."
                </div>
            </div>
        </div>
        <div className="blackbar" id="bar2" style={{height:"17%", top:"43%", left: this.props.measurements.viewportWidth}}>
            <div className="btext" style={{width: this.props.measurements.viewportWidth}}>
                <div className="btext-inner">
                  1:30: We turn into an alley and ask a stranger to bum a cigarette.
                </div>
            </div>
        </div>
        <div className="blackbar" id="bar3" style={{height:"28%", top: "63%", right: this.props.measurements.viewportWidth}}>
            <div className="btext" style={{width: this.props.measurements.viewportWidth}}>
                <div className="btext-inner">
                  2:17: I find myself outside a bar. It could be any bar, in any city. Except in most cities, the bar would be closed by now. Here, the bar lively. A woman approaches me.
                </div>
            </div>
        </div>
        <audio id="city">
          <source src="/erik3/city.mp3" type="audio/mp3"/>
        </audio>
        <audio id="city-v">
          <source src="/erik3/city-v.wav" type="audio/wav"/>
        </audio>
      </div>
    )
  }
}

class Slide3 extends ScanComponent {
  constructor(props) {
    super(props);
    this.state = {
      current_slide: 0,
      map_opacity: 0,
      map_progress: 0,
      black: 0
    };
  }

  isActive(d){
    return (d.pctScroll >= this.props.start && d.pctScroll < this.props.end);
  }

  componentWillMount() {
    var dimensions = {
      top: -1 * this.props.measurements.viewportHeight
    };
    this.setState(_.extend(this.state, dimensions));
  }

  componentWillReceiveProps() {
    this.setState(_.extend(this.state, this.adjust(this.state)));
  }

  adjust(last_state, d) {
    var {viewportHeight, viewportTop, adjustedViewportTop, contentHeight, pctScroll} = this.props.measurements,
        active = this.isActive(this.props.measurements),
        adjustedPctScroll = this.scaler(pctScroll),
        adjScroll,
        newTop;

    if(adjustedPctScroll <= 0) {
      return { map_opacity: 0,
        map_progress: 0,
        black: 0,
        top: -1 * viewportHeight };
    }

    // , ':', contentHeight, ':', viewportHeight, ':', viewportTop
    // console.log(active, ':', adjustedPctScroll, ':', pctScroll);

    if(adjustedPctScroll > 0.20) {
      newTop = 0;
    } else {
      newTop = Math.linearTween(adjustedPctScroll, -viewportHeight, viewportHeight, 0.20);
    }


    if(adjustedPctScroll < 0.35){
        $("#diner-mp3")[0].play();
        var new_volume = 0;
    } else if (adjustedPctScroll >= 0.30 && adjustedPctScroll < 0.55) {
        $("#diner-mp3")[0].play();
        var new_volume = Math.linearTween(adjustedPctScroll, 0, 0.6, 1);
    } else if (adjustedPctScroll >= 0.55 && adjustedPctScroll < 0.70) {
        $("#diner-mp3")[0].play();
        var new_volume = 0.6
    }


    var caption = false;
    if (adjustedPctScroll < 0.20) {
        caption = false
    } else if (adjustedPctScroll >= 0.20 && adjustedPctScroll < 0.30){
        caption = "Yung Tourguide took me to his favorite diner, Schmetty's.";
        if(caption !== this.state.caption){
          $("#diner-mp3-1")[0].play();
        }
    } else if (adjustedPctScroll >= 0.30 && adjustedPctScroll < 0.55){
        caption = "The deli meats were chopped. I was chopped. I needed extra ketchup but they weren't serving Heinz.";
        if(caption !== this.state.caption){
          $("#diner-mp3-2")[0].play();
        }
    } else if (adjustedPctScroll >= 0.55 && adjustedPctScroll < 0.70) {
        caption = "Yung Tourguide said that he ate here 8 times a week, 50 weeks a year.";
        if(caption !== this.state.caption){
          $("#diner-mp3-3")[0].play();
        }
    }

    var c = this;

    var map_conti = new Conti(0,0.65,"adjustedPctScroll", function(pct, t){
        t.black = 0;
        t.map_progress = 0;
        t.map_opacity = 0;
        t.volume = new_volume || 0;
        t.bells_volume = 0;
        clearInterval(this.bells_interval);
        clearInterval(this.bells_interval_2);
        this.bells_interval = false;
        this.bells_interval_2 = false;
        return t;
    }).abut(0.70, function(pct, t){
        t.black = Math.linearTween(pct,0,0.7,1);
        t.volume = Math.linearTween(pct,0.6,-0.6,1);
        t.map_progress = 0;
        t.map_opacity = pct;
        t.bells_volume = pct;
        if(!this.bells_interval){
            this.bells_interval = setInterval(function(){
                $("#map-cap").addClass("blur");
                setTimeout(function(){jQ("#map-cap").removeClass("blur")},150);
            },860)
        }
        return t;
    }).abut(0.75, function(pct, t){
        t.black = 0.7;
        t.volume = 0;
        t.map_progress = pct;
        t.map_opacity = 1;
        t.bells_volume = 1;
        if(!this.bells_interval){
            this.bells_interval = setInterval(function(){
                $("#map-cap").addClass("blur");
                setTimeout(function(){jQ("#map-cap").removeClass("blur")},150);
            },860)
        }
        return t;
    }).abut(2, function(pct, t){
        t.black = 0.7;
        t.volume = 0;
        t.map_progress = 1;
        t.map_opacity = 1;
        t.bells_volume = 1;
        if(!this.bells_interval){
            this.bells_interval = setInterval(function(){
                $("#map-cap").addClass("blur");
                setTimeout(function(){jQ("#map-cap").removeClass("blur")},150);
            },860)
        }
        return t;
    })


    var map_data = map_conti.run(_.extend(this.props.measurements, {adjustedPctScroll}),{})
    $("#diner-mp3")[0].volume = 0; //map_data.volume;

    if(map_data.bells_volume > 0){
        $("#jakes")[0].play();
        $("#jakes")[0].volume = map_data.bells_volume;
    } else {
        $("#jakes")[0].pause();
    }

    return {top: newTop, caption: caption, black: map_data.black,
     map_progress: map_data.map_progress, map_opacity: map_data.map_opacity,
     map_offset_x: map_data.map_offset_x, map_offset_y: map_data.map_offset_y};
  }

  shuffleSlides(){
    if(this.state.current_slide === 0){
        this.setState({current_slide: 1})
    } else if (this.state.current_slide === 1){
        this.setState({current_slide: 2})
    } else {
        this.setState({current_slide: 0})
    }
  }

  componentDidMount() {
    $(window).on("keydown",_.bind(function(e){
        if(e.keyCode == 32){
            if(this.state.active){
                e.preventDefault();
                this.shuffleSlides();
                return false;
            }
        }
    },this))
  }

  render() {
    var cs = this.state.current_slide,
        pic_2_left = (cs === 1 ||  cs === 2 ? 0 : -1 * this.props.measurements.viewportWidth),
        pic_3_left = (cs === 2 ? 0 : -1 * this.props.measurements.viewportWidth),
        map_width = this.props.measurements.viewportHeight * 1.686;
        var overlayStyle = {width: map_width, opacity: this.state.map_opacity, backgroundPositionX: -610 + this.state.map_offset_x, backgroundPositionY: 0 + this.state.map_offset_y};
    return(
      <div className='bg-slide' style={{
        height: this.props.measurements.viewportHeight,
        top: this.state.top,
        zIndex: 200,
        backgroundImage: "url('/erik3/36.jpg')",
        backgroundSize: "cover",
      }}>
        <div id="slide-pic-2" className="slide-slide" style={{
            backgroundImage: "url('/erik3/diner-food.jpg')",
            backgroundPosition: "0 -200px",
            left: pic_2_left
        }}></div>
        <div id="slide-pic-3" className="slide-slide" style={{
            backgroundImage: "url('/erik3/36-2.jpg')",
            left: pic_3_left
        }}></div>
        <h5 className="slide-caption" style={{display: this.state.caption ? 'block' : 'none'}} dangerouslySetInnerHTML={{ __html: this.state.caption}}>
        </h5>

        <audio id="jakes" loop>
          <source src="/erik3/bells.wav" type="audio/wav"/>
        </audio>

        <audio id="diner-mp3" loop>
          <source src="/erik3/diner.mp3" type="audio/mp3"/>
        </audio>

        <audio id="diner-mp3-1">
          <source src="/erik3/diner-clip1.wav" type="audio/wav"/>
        </audio>
        <audio id="diner-mp3-2">
          <source src="/erik3/diner-clip2.wav" type="audio/wav"/>
        </audio>
        <audio id="diner-mp3-3">
          <source src="/erik3/diner-clip3.wav" type="audio/wav"/>
        </audio>
        <div className="full-black" style={{opacity: this.state.black}}/>
        <h5 className="slide-caption" id="map-cap" style={{opacity: this.state.map_opacity}}>
            We paid the bill. <br/>
            That''s when he said it. <br/>
            "Viceboy, are you ready to dance?"
        </h5>
        <div id="trip-overlay" style={overlayStyle}>
        </div>
      </div>
    )
  }
}

function embedComponent(Component, container, callback) {
  $(container).empty();
  var Viewport = createViewport(Component, container);
  ReactDOM.render(<Viewport/>, container, callback);
}

$(function() {
  embedComponent(Root, document.body);
});

var animatePov = function(sv,pov){
    var start_pov = sv.getPov(),
        ticks = 24,
        heading_d = pov.heading - start_pov.heading,
        pitch_d = pov.pitch - start_pov.pitch,
        zoom_d = pov.zoom - start_pov.zoom,
        i = 0;
    var next = function(){
        var pov = sv.getPov(),
            h = pov.heading,
            p = pov.pitch,
            z = pov.zoom,
            new_heading = Math.easeInOutQuad(i,start_pov.heading,heading_d,ticks),
            new_pitch = Math.easeInOutQuad(i,start_pov.pitch,pitch_d,ticks),
            new_zoom = Math.easeInOutQuad(i,start_pov.zoom,zoom_d,ticks);
        console.log(new_heading)
        sv.setPov({heading: new_heading, pitch: new_pitch, zoom: new_zoom});
        i++;
        if(i < ticks){
            setTimeout(function(){
              next();
            },33)
        }
    }
    next();
};
