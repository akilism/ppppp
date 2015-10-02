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
    { "name": "bangkok",
      "type": "title",
      "title": "bangkok",
      "backgroundImage": "/thailand/bangkok.jpg",
      "fontSize": 250,
      "coords": { "lat": 40.8025967, "lng": -73.9502753},
      "progressIndicator": {
        "name": "bangkok",
        "location": "thailand",
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
        getPercentageInverse: this.getInv.bind(this),
        toggleWormhole: this.toggleWormhole.bind(this)
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

      this.setState({measurements:
          { viewportWidth,
            viewportHeight,
            viewportLeft: 0,
            viewportTop: 0,
            contentHeight: (viewportHeight * 20),
            adjustedViewportTop: 0,
            pctScroll: 0,
            wormholeDist: 0,
            wormholeActive: false },
        wormholeJump: null,
        jumpDiff: 0,
        wormholePosition: null});
    }

    componentDidMount() {
      $(window).on('scroll', _.throttle(this.handleScroll.bind(this), 10));
    }

    toggleWormhole(wormholeJump) {
      wormholeJump = wormholeJump || this.state.wormholeJump;

      var newState = this.calculateMeasurements(!this.state.measurements.wormholeActive, wormholeJump);
      newState.measurements.wormholeActive = !this.state.measurements.wormholeActive;
      newState.wormholePosition = this.state.measurements.viewportTop;
      this.setState(newState);
    }

    handleScroll(ev) {
      var newState = this.calculateMeasurements(this.state.measurements.wormholeActive, this.state.wormholeJump);
      this.setState(newState);
    }

    calculateMeasurements(wormholeActive, wormholeJump) {
      var viewportLeft = 0, //$(ev.target).scrollLeft(),
          viewportTop = $(window).scrollTop(),
          contentHeight = this.state.measurements.contentHeight,
          adjustedViewportTop = (viewportTop / this.state.measurements.viewportHeight) * (contentHeight * 0.1),
          wormholeDist = this.state.measurements.wormholeDist,
          jumpDiff = this.state.jumpDiff,
          pctScroll;

      // when the wormhole is active viewport top is set to the wormhole activation point. this effectively
      // freezes the non-wormhole components in place to their pre-wormhole positions.
      // when the wormhole is off we subtract the wormhole travelled distance from the viewport top so that
      // pctScroll is calculated as if you never scrolled into the wormhole.
      if(wormholeActive) {
        wormholeDist = this.state.wormholePosition ? viewportTop - this.state.wormholePosition : 0;
        viewportTop = this.state.wormholePosition ?  this.state.wormholePosition : viewportTop;
      } else {
        // wormholeJump is the exit pctScroll location for the wormhole.
        // This is calculated once when we jump out of a wormhole.
        // That value is then applied on each new viewportTop when calculating the pctScroll.
        if(wormholeJump) {
          var jumpTop = wormholeJump * (contentHeight - this.state.measurements.viewportHeight);
          jumpDiff = (viewportTop - wormholeDist) - jumpTop;
          wormholeJump = null;
        }

        viewportTop = (viewportTop - wormholeDist < 0) ? 0 : (viewportTop - wormholeDist);
      }

      pctScroll = (viewportTop - jumpDiff) / (contentHeight - this.state.measurements.viewportHeight);
      //Ugly but stops the cards from scroll past 0.
      pctScroll = (pctScroll < 0) ? 0 : pctScroll;

      return {
        wormholeJump,
        jumpDiff,
        measurements: _.extend(this.state.measurements, {viewportLeft, viewportTop, contentHeight, adjustedViewportTop, pctScroll, wormholeDist})
      };
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

    // These are probably not going to be used anymore. They were for
    // finding a markers pctScroll and invScroll.
    getPct(ref, anchor) {
      var component = this.bfs(ref);
      return component.getPct(anchor);
    }

    getInv(ref, anchor) {
      var component = this.bfs(ref);
      return component.getInv(anchor);
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
    //End unused stuff.
  }

  Viewport.childContextTypes = {
    getPercentage: React.PropTypes.func.isRequired,
    getPercentageInverse: React.PropTypes.func.isRequired,
    toggleWormhole: React.PropTypes.func.isRequired
  };

  return Viewport;
}

class Root extends React.Component {
  constructor(props) {
    super(props)
  }

  render() {
    // down the street 13.782658, 100.516636
    // restaurant 13.782994, 100.515541
    // <SlideStreet startPos={{lat:13.782658, lng: 100.516636}} endPos={{lat: 13.782994, lng: 100.515541}} />

    var images = ['khao_day.jpg', 'khao_famous_day.jpg', 'khao_cheap_eats_day.jpg', 'khao_hostel_day.jpg', 'khao_booze_day.jpg', 'khao_anything_day.jpg'];
    var altImages = ['khao_night.jpg', 'khao_famous_night.jpg', 'khao_cheap_eats_night.jpg', 'khao_hostel_night.jpg', 'khao_booze_night.jpg', 'khao_anything_night.jpg'];
    var galleryImages = [{imagePath: '/thailand/cook1.png', caption: "But there are hidden gems in the quite side streets, them local secret spots and what not."},
    {imagePath: '/thailand/cook0.png', caption: "I can smell the chillies down the block, clearly this is my kind of place."},
    {imagePath: '/thailand/cook2.png', caption: "Pad Kra Pao Gai that good Thai Basil Chicken. Oooh that heat, love it."},
    {imagePath: '/thailand/cook3.png', caption: "Chef Dunn in kitchen and shes got bellys to feed. Let's do this."},
    {imagePath: '/thailand/cook4.png', caption: "I wanna bring some heat so everyone's fucking coughing in this bitch."},
    {imagePath: '/thailand/cook5.png', caption: "Now we're going to find out if I'm the real deal or not.."},
    {imagePath: '/thailand/cook6.png', caption: "It's pretty good, it's real yummy."},
    {imagePath: '/thailand/cook7.png', caption: "That was amazing but I'm still on the prowl for more."}];
    var pathChoices = [{ choiceImage: "/thailand/thai_basil_chicken_choice.gif",
        name: "Thai Basil Chicken",
        component: ScrollGallery,
        props: {images: galleryImages}},
      { choiceImage: "/thailand/bounce.gif",
        name: "Thai Soup",
        component: SlideMovie,
        props: {videoSrc: "/thailand/soup_history.mp4", caption: "This soup was delicious but there must be more to eat."}}];

    var indicators = [{head: "default", start: 0, end: 0.05},
                      // {head: "default", start: 0.05, end: 0.12},
                      {head: "perspective", start: 0.12, end: 0.24},
                      {head: "action", start: 0.24, end: 0.31},
                      {head: "perspective", start: 0.31, end: 0.41},
                      {head: "perspective", start: 0.40, end:0.55},
                      {head: "default", start: 0.55, end:1},
                      {head: "default", start: 0.075, end: 0.12},
                      {head: "default", start: 1}  ];
    return (
      <div>
        <SlideBlock measurements={this.props.measurements} start={0.075} end={0.12} caption="&ldquo;I am a spice fiend, live and breath that shit, and it's been like that since day one. I got introduced to Thai food and it was like a match made in heaven. I was like instantly hooked. I love reading about it, the people, the culture. I'm such a big fan.&rdquo;" />
        <Timelapse measurements={this.props.measurements} start={0.05} end={0.12} imagePath="/thailand/table" frameCount={17} />
        <WordMask measurements={this.props.measurements} start={0.12} end={0.24} bgUrl="/thailand/biketomarket.gif" quote={["The thing is ", " I've never actually ", " been there. ", " That shit's ", " going to change. ", " JD ", " is ", " going ", " to ", " Thailand."]} />
        <Title measurements={this.props.measurements} start={0} end={0.05} title="bangkok" subtitle="with Jourdan Dunn" backgroundImage="/thailand/bangkok.jpg" />
        <SlideMovie measurements={this.props.measurements} start={0.24} end={0.31} videoSrc="/thailand/market2.mp4" />
        <ImageSwitcher measurements={this.props.measurements} start={0.40} end={0.55} images={images} altImages={altImages} />
        <ZoomWords measurements={this.props.measurements} start={0.40} end={0.55} bgUrl="" quote={["Khao San Road ", " Bangkok's famous backpacker disneyland. ", " Cheap eats. ", " Cheap hostels. ", " Cheap drinks. ", " You can find absolutely anything there."]} />
        <SlippyBlock measurements={this.props.measurements} start={0.31} end={0.41} />
        <ScrollGallery measurements={this.props.measurements} start={0.55} end={1} images={galleryImages} />
        <ProgressBar measurements={this.props.measurements} indicators={indicators} />
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
  toggleWormhole: React.PropTypes.func.isRequired
};


class ProgressBar extends ScanComponent {
  constructor(props) {
    super(props);
    this.state = {
      progress: 0,
      progressPx: 0,
      progressPct: 0,
      playhead: "default", //"default, perspective, play, split"
      hint: "",
      hintBoxStyle: { display: "none" }
    };
  }

  handleClick(i, evt) {
    var indicator = this.props.progressIndicators[i];
    indicator.show = true;
    if(this.state.activeIndicator.name === indicator.name) {
      this.setState(_.extend(this.state, {activeIndicator: {show: false}}));
    } else {
      this.setState(_.extend(this.state, {activeIndicator: indicator}));
      this.setCard(evt.clientX, evt.clientY);
    }
  }

  getCurrentIndicator() {
    var pctScroll = this.props.measurements.pctScroll;
    return this.props.progressIndicators.filter((i) => {
      return pctScroll >= i.startPosition && pctScroll < i.endPosition;
    })[0];
  }

  componentWillMount() {
    this.setState(_.extend(this.state, {barWidth: (this.props.measurements.viewportWidth - 80)}));
  }

  componentWillReceiveProps() {
    this.setState(this.adjust(this.state));
  }

  adjust(last_state) {
    var {viewportHeight, viewportTop, adjustedViewportTop, contentHeight, pctScroll, viewportWidth} = this.props.measurements,
      playhead = last_state.playhead,
      currentIndicactor = this.props.indicators.filter((i) => {
        return (pctScroll >= i.start && pctScroll < i.end);
      })[0];

    if(currentIndicactor && currentIndicactor.head) {
      playhead = currentIndicactor.head;
    }

    return {progressPx: Math.round(this.state.barWidth * pctScroll), progressPct: (pctScroll * 100), playhead};
  }

  buildIndicator(i, idx) {
    var r = 5;
    var classes = (i.start < this.props.measurements.pctScroll) ? "progress-indicator progress-indicator-passed" : "progress-indicator";

    var xPos = i.start * this.state.barWidth;
    return (
      <div key={idx} className={classes} style={{transform: "translate(" + xPos + "px, 0)"}}></div>
      );
  }

  getCurrentplayhead() {
    var className = "progress-playhead";
    switch (this.state.playhead) {
      case "perspective":
        return {className: className + " playhead-perspective", src: "/thailand/6th_eye.svg"};
      case "action":
        return {className: className + " playhead-action", src: "/thailand/2600.png"};
      case "split":
        return {className: className + " playhead-split", src: "/map-unfold/asap-head.png"};
      default:
        return {className: className + " playhead-default", src: "/map-unfold/asap-head.png"};
    }
  }

  handleMouseMove(evt) {
    if(this.state.playhead === "default") {
      this.setState({hintBoxStyle: {display: "none"}});
      return;
    }

    let hint = "",
        x = evt.clientX - 260,
        y = evt.clientY,
        hintBoxStyle = {display: "block", left: x, top: y};

    switch (this.state.playhead) {
      case "perspective":
        hint = "Hit shift to get a different perspective.";
        break;
      case "action":
        hint = "Push enter to perform a trick.";
        break;
      case "split":
        hint = "Shift? Enter? Maybe both?";
        break;
    }

    this.setState({hint, hintBoxStyle});
  }

  handleMouseOut(evt) {
    let hintBoxStyle = {display: "none"};
    this.setState({hintBoxStyle});
  }

  render() {
    var playhead = this.getCurrentplayhead();
    var indicators = this.props.indicators.map(this.buildIndicator, this);
    // <img src={playhead.src} id="playhead" className={playhead.className}/>
    // style={{transform: "translate(" + (this.state.progressPx-5) + "px,0)"}}
    return (

      <div className="progress-bar minimal" style={{width: this.state.barWidth}}>
        <div className="progress-back"></div>
        <div className="progress-fill" style={{width: this.state.progressPx}}>
        </div>
        {indicators}
        <div onMouseOut={this.handleMouseOut.bind(this)} onMouseMove={this.handleMouseMove.bind(this)} className={playhead.className}></div>
        <div className="hint-box" ref="hintBox" style={this.state.hintBoxStyle}>{this.state.hint}</div>
      </div>
    );
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
    this.setState(this.adjust(this.state));
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

    // if(adjustedPctScroll > 0.01 && adjustedPctScroll < 0.025 && this.refs.sound1.paused) {
    //   this.refs.sound1.play();
    // } else if (adjustedPctScroll >= 1) {
    //   this.refs.sound1.pause();
    // }

    return {top: newTop};
  }

  render() {
    return(
      <div className="bg-slide title-slide" style={{
        height: this.props.measurements.viewportHeight,
        transform: "translate(0, " + this.state.top + "px)",
        backgroundImage: "url('" + this.props.backgroundImage + "')",
        backgroundSize: "cover"
      }}>
        <h3 className="vid-title" style={{fontSize: this.props.fontSize}}>{this.props.title}</h3>
        <h4 className="vid-subtitle">{this.props.subtitle}</h4>
        <audio ref="sound1">
          <source src="/thailand/chatter.mp3" type="audio/mp3"/>
        </audio>
      </div>
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

  componentWillReceiveProps() {
    this.setState(this.adjust(this.state));
  }

  isActive(d){
    return (d.pctScroll >= this.props.start && d.pctScroll < this.props.end);
  }

  adjust(last_state) {
    var {viewportHeight, viewportTop, adjustedViewportTop, contentHeight, pctScroll} = this.props.measurements,
        adjustedPctScroll = this.scaler(pctScroll),
        active = this.isActive(this.props.measurements),
        dest_top = viewportHeight * -1,
        frames = this.props.frameCount,
        frame,
        newTop;

    if(pctScroll < this.props.start) {
      frame = 0;
    } else if (pctScroll > this.props.end) {
      frame = frames;
    } else {
      frame = Math.min(frames, Math.round(frames * adjustedPctScroll));
    }

    return {frame: frame};
  }

  render() {
    return(
        <img className="timelapse" id="timelapse" src={ this.props.imagePath + "/frame_" + this.state.frame + ".gif"}/>
    )
  }
}

class WordMask extends ScanComponent {
  constructor(props) {
    super(props);
    this.state = {
        text: [],
        maskText: [],
        wordCount: 0,
        wordIdx: -1,
        played: false,
        clipMode: "text",
        word: "",
        flickered: false
    };
    this.wordScaler = scaler(this.props.start, this.props.end-0.025, 0, 1);
  }

  flicker(count) {
    if(count === 0) {
      $(this.refs.bg).css("-webkit-background-clip", "initial");
      return;
    } else if(count % 2 === 0) {
      $(this.refs.bg).css("-webkit-background-clip", "initial");
    } else {
      $(this.refs.bg).css("-webkit-background-clip", "text");
    }

    setTimeout(() => {
      this.flicker(--count);
    }, 10);
  }

  componentWillMount() {
    this.setState({wordCount: this.props.quote.length-1, bgUrl: this.props.bgUrl});
  }

  componentWillReceiveProps() {
    this.setState(this.adjust(this.state));
  }

  isActive(d){
    return (d.pctScroll >= this.props.start && d.pctScroll < this.props.end);
  }

  adjust(last_state) {
    var {viewportHeight, viewportTop, adjustedViewportTop, contentHeight, pctScroll} = this.props.measurements,
        adjustedPctScroll = this.scaler(pctScroll),
        adjustWordScroll = this.wordScaler(pctScroll),
        active = this.isActive(this.props.measurements),
        dest_top = viewportHeight * -1,
        text = "",
        maskText = "",
        word = "",
        flickered,
        wordIdx = last_state.wordIdx,
        clipMode = last_state.clipMode,
        played = last_state.played,
        newTop;

    if(adjustedPctScroll < 0) {
      wordIdx = -1;
      clipMode = "text";
      flickered = false;
    } else {
      wordIdx = Math.round(this.state.wordCount * adjustWordScroll);
      clipMode = "text";
    }

    //flash in the background
    if(wordIdx > this.state.wordCount) {
      clipMode = "";
      wordIdx = this.state.wordCount+1;

      if(!this.state.flickered) {
        this.flicker(48);
      }
      flickered = true;
      if (this.refs.welcome.paused && !this.state.played && this.state.active) {
        // this.refs.welcome.play();
        played = true;
      }
    }

    //update the displayed words.
    //current word in white.
    //hidden span of words to keep the spacing correct.
    //masked out layer of words to show the background image.
    if(wordIdx === -1) {
      maskText = "";
      text = "";
      word = "";
    } else if (wordIdx === 0) {
      maskText = "";
      text = this.props.quote.slice(0, wordIdx).join("");
      word = this.props.quote[wordIdx];
    } else if (wordIdx > this.state.wordCount) {
      word = "";
      maskText = this.props.quote.slice(0, wordIdx+1).join("");
      text = this.props.quote.slice(0, wordIdx+1).join("");
    } else {
      maskText = this.props.quote.slice(0, wordIdx).join("");
      text = this.props.quote.slice(0, wordIdx).join("");
      word = this.props.quote[wordIdx];
    }

    return {active, clipMode, flickered, maskText, text, word, wordIdx, played};
  }

  render() {
    return(
      <div>
        <div className="bg-mask mask-text" style={{backgroundImage: "url(" + this.state.bgUrl + ")", WebkitBackgroundClip: this.state.clipMode }} ref="bg">
          {this.state.maskText}
        </div>
        <span ref="text" className="mask-text text"><span ref="hide" className="hide">{this.state.text}</span><span ref="show" className="show">{this.state.word}</span></span>
        <audio ref="welcome">
          <source ref="welcomeSrc" type="audio/mp3" src="/thailand/bangkok.mp3" />
        </audio>
      </div>
    )
  }
}

class SlideMovie extends ScanComponent {
  constructor(props) {
    super(props);
    this.state = {
      top: 0,
      caption: ".",
      active: false,
      videoSrc: "",
      played: false,
      slideWords: "6.5%",
      cardData: {
        name: "Tewate Market",
        coords: {lat: 13.771224, lng: 100.502749},
        city: "Bangkok",
        country: "Thailand"
      }
    };
  }

  componentWillReceiveProps() {
    this.setState(this.adjust(this.state));
  }

  componentWillMount() {
    this.setState({top: this.props.measurements.viewportHeight});
  }

  isActive(d){
    return (d.pctScroll >= this.props.start && d.pctScroll < this.props.end);
  }

  adjust(last_state, d) {
    let {viewportHeight, viewportTop, adjustedViewportTop, contentHeight, pctScroll} = this.props.measurements,
        adjustedPctScroll = this.scaler(pctScroll),
        active = this.isActive(this.props.measurements),
        caption = "It's amazing this market.",
        videoSrc = last_state.videoSrc,
        played = last_state.played,
        top;

    var conti = new Conti(0,0.75,"adjustedPctScroll", (pct, t) => {
      t.top = Math.linearTween(pct,viewportHeight,-viewportHeight,1);
      t.play = false;
      t.videoSrc = this.props.videoSrc;
      // if(!this.refs.videoSrc.getAttribute("src")) {
      //   this.refs.videoSrc.setAttribute("src", this.props.videoSrc);
      // }

      return t;
    }).abut(1, (pct, t) => {
      // console.log("videosource:", this.refs.videoSrc);
      t.top = 0;
      t.play = true;
      return t;
    });

    var trans_data = conti.run(_.extend(this.props.measurements, {adjustedPctScroll}), {});
    // console.log(trans_data);

    if(trans_data.videoSrc) {
      videoSrc = trans_data.videoSrc;
    }

    if (trans_data.play) {
      // console.log(this.refs.video.loop, this.refs.video.paused);

      if(this.refs.video.paused && !this.state.played) {
        //this.refs.video.play();
        played = true;
      }
    };

    if(adjustedPctScroll < 0) {
      top = viewportHeight;
      if(!this.refs.video.paused) {
        this.refs.video.pause();
      }
    } else if (adjustedPctScroll > 1) {
      top = 0;
    } else {
      top = trans_data.top;
    }

    return {active, caption, played, top, videoSrc};
  }

  render() {
    var controls = (this.props.controls) ? "controls" : "";
    var loop = (this.props.loop) ? "loop" : "";
    // {this.props.videoSrc}
    return(
      <div ref="slideRoot" className="bg-slide bg-video" style={{
        transform: "translate(0, " + this.state.top + "px)",
        height: this.props.measurements.viewportHeight,
        zIndex: 100
      }}>
        <video ref="video" className="slide-video" controls>
          <source ref="videoSrc" type="video/mp4" src="" />
        </video>
        <h5 className="slide-caption video-caption" style={{display: this.state.caption ? "block" : "none"}}>
          &ldquo;It's amazing this <GoogleCardLink cssClass="video-link" cardData={this.state.cardData} text="market" />.&rdquo;
        </h5>
      </div>
    ); //'
  }
}

class SlideBlock extends ScanComponent {
  constructor(props) {
    super(props);
    this.state = {
      top: 0,
      opacity: 0,
      active: false,
      caption: true,
      display: "none"
    };
  }

  componentWillReceiveProps() {
    this.setState(this.adjust(this.state));
  }

  componentWillMount() {
    this.setState({top: this.props.measurements.viewportHeight});
  }

  isActive(d){
    return (d.pctScroll >= this.props.start && d.pctScroll < this.props.end);
  }

  adjust(last_state, d) {
    let {viewportHeight, viewportTop, adjustedViewportTop, contentHeight, pctScroll} = this.props.measurements,
        adjustedPctScroll = this.scaler(pctScroll),
        active = this.isActive(this.props.measurements),
        opacity,
        top,
        display = last_state.display;

    var conti = new Conti(0,0.5,"adjustedPctScroll", (pct, t) => {
      t.top = Math.linearTween(pct,viewportHeight,-viewportHeight,1);
      t.opacity = Math.linearTween(pct, 0, 1, 0.5);
      return t;
    })
    .abut(0.85, (pct, t) => {
      t.top = 0;
      t.opacity = Math.linearTween(pct, 1, 0, 0.5);
      return t;
    })
    .abut(1, (pct, t) => {
      t.top = 0;
      t.opacity = 0;
      return t;
    });

    var trans_data = conti.run(_.extend(this.props.measurements, {adjustedPctScroll}), {});
    // console.log(trans_data);

    if(adjustedPctScroll < 0) {
      top = viewportHeight;
      opacity = 0;
      display = "none";
    } else if (adjustedPctScroll > 1) {
      top = 0;
      opacity = 0;
      display = "none";
    } else {
      top = trans_data.top;
      opacity = trans_data.opacity;
      display = "block";
    }

    return {active, opacity, top, display};
  }

  render() {
    return(
      <div ref="slideRoot" className="bg-slide slide-block" style={{
        transform: "transform(0, " + this.state.top + "px)",
        height: this.props.measurements.viewportHeight,
        zIndex: 200,
        opacity: this.state.opacity,
        display: this.state.display
      }}>
        <h5 className="slide-caption block-caption" style={{display: this.state.caption ? "block" : "none"}}>
          {this.props.caption}
        </h5>
      </div>
    )
  }
}

class SlippyText extends ScanComponent {
  constructor(props) {
    super(props);
    this.state = {
      className: "slippy-text"
    }
  }

  componentWillReceiveProps() {
    this.setState(this.adjust(this.state));
  }

  isActive(d){
    return (d.pctScroll >= this.props.start && d.pctScroll < this.props.end);
  }

  adjust(last_state, d) {
    let {viewportHeight, viewportTop, adjustedViewportTop, contentHeight, pctScroll} = this.props.measurements,
        adjustedPctScroll = this.scaler(pctScroll),
        active = this.isActive(this.props.measurements);

    return {active, className: (adjustedPctScroll > 0 && adjustedPctScroll < 0.95) ? "slippy-text from-left" : "slippy-text"};
  }

  render() {
    return (
      <div>
      <h5 className={this.state.className}>
        {this.props.caption}
      </h5>
      </div>
    );
  }
}

class SlippyBlock extends ScanComponent {
  constructor(props) {
    super(props);
    this.state = {
      caption: "Off to Khao San Road.",
      count: 0,
      maxCount: 6,
      top: 0,
      adjustedPctScroll: 0,
      wormholeActive: false,
      wormholeLength: 2500,
      zIndex: -1,
      svStart: [13.758118, 100.449034],
      svEnd: [13.759744, 100.495667],
      svCurrent: [13.758118, 100.449034]
    }
  }

  componentWillReceiveProps() {
    this.setState(this.adjust(this.state));
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

    var startPoint = new google.maps.LatLng(13.758980, 100.497201);
    this.state.streetView.setPosition(startPoint);
    this.state.streetView.setPov({heading: 77.68007576992042, pitch: 0, zoom: 1}); //64.9837616957764
    $(domNode).css({"pointer-events": "none"});

    $(window).on("keydown", (e) => {
        if(e.keyCode == 16 && this.state.active){
          e.preventDefault();
          this.toggleWormhole();
          return false;
        }
    });

    var hammerSwipe = new Hammer(document.body);

    hammerSwipe.on("swipe", (ev) => {
        if(this.state.active) {
          ev.preventDefault();
          this.toggleWormhole();
          return false;
        }
    });
  }

  toggleWormhole() {
    // console.log('toggleWormhole:', !this.state.wormholeActive);

    let $map = $(this.refs.mapHolder);
    if($map.hasClass("fade-in")) {
      $map.removeClass("fade-in");
    } else {
      $map.addClass("fade-in");
    }

    this.context.toggleWormhole();
    this.setState({wormholeActive: !this.state.wormholeActive});
  }

  isActive(d){
    return (d.pctScroll >= this.props.start && d.pctScroll < this.props.end);
  }

  adjust(last_state) {
    if(this.state.wormholeActive) {
      return this.wormholeAdjust(last_state);
    } else {
      return this.regularAdjust(last_state);
    }
  }

  wormholeAdjust(last_state) {
    let {viewportHeight, viewportTop, adjustedViewportTop, contentHeight, wormholeDist} = this.props.measurements,
        pctScroll = wormholeDist / (this.state.wormholeLength - viewportHeight),
        adjustedPctScroll = this.scaler(pctScroll),
        active = this.isActive(this.props.measurements),
        count = last_state.count,
        top,
        current_pov = this.state.streetView.getPov(),
        newHeading = 77.68007576992042;


    if(pctScroll < 0 || pctScroll > 1) {
      this.toggleWormhole();
      return {};
    }

    if(pctScroll < 0.85) {
      newHeading = Math.linearTween(pctScroll, 77.68007576992042, 270, 1);

    } else {
      newHeading = 270;
    }

    current_pov.heading = newHeading;
    this.state.streetView.setPov(current_pov);
    // console.log("wormholeAdjust:", pctScroll);
    return last_state;
  }

  regularAdjust(last_state) {
    let {viewportHeight, viewportTop, adjustedViewportTop, contentHeight, pctScroll} = this.props.measurements,
        adjustedPctScroll = this.scaler(pctScroll),
        active = this.isActive(this.props.measurements),
        count = last_state.count,
        top,
        zIndex = last_state.zIndex,
        $slipRoot = $(this.refs.slipRoot);

    if(adjustedPctScroll <= 0) {
      top = 0;
      count = 0;
      if($slipRoot.hasClass("fadezzz")) {
        $slipRoot.removeClass("fadezzz");
      }
    } else if (adjustedPctScroll > 1) {
      top = viewportHeight;
      if(!$slipRoot.hasClass("fadezzz")) {
        $slipRoot.addClass("fadezzz");
      }
    } else {
      if($slipRoot.hasClass("fadezzz")) {
        $slipRoot.removeClass("fadezzz");
      }
      count = Math.round(this.state.maxCount * adjustedPctScroll);
      top = Math.linearTween(adjustedPctScroll, 0, viewportHeight, 0.85);
    }

    if(adjustedPctScroll > 0.05 && adjustedPctScroll < 1) {
      zIndex = 100;
    } else {
      zIndex = -1;
    }

    return {active, count, zIndex, top, adjustedPctScroll};
  }

  getTextBlock(count) {
    var measurements = _.extend(_.clone(this.props.measurements), {pctScroll: this.state.adjustedPctScroll});
    return Array(count).fill(0).map((v, i) => {
      var start = i * 0.15,
          // end = i * 0.25,
          end = 1;
      return <SlippyText caption={this.state.caption} key={i} start={start} end={end} measurements={measurements} />
    });
  }

  render() {
    var textBlocks = (this.state.adjustedPctScroll > 0) ? this.getTextBlock(this.state.count) : [];
    return(
      <div style={{ zIndex: this.state.zIndex }}>
        <div ref="slipRoot" className="slippy-block" style={{
          height: this.state.top,
          zIndex: this.state.zIndex
        }}>
          {textBlocks}
        </div>
        <div ref="mapHolder" className="wormhole-street" style={{zIndex: this.state.zIndex}}>
          <div ref="map" style={{
            width: this.props.measurements.viewportWidth,
            height: this.props.measurements.viewportHeight
          }}>
          </div>
        </div>
      </div>
    )
  }
}

class ZoomWords extends ScanComponent {
  constructor(props) {
    super(props);
    this.state = {
        text: [],
        maskText: [],
        wordCount: 0,
        wordIdx: -1,
        clipMode: "none",
        display: "none",
        word: "",
        flickered: false
    };
  }

  componentWillMount() {
    this.setState({wordCount: this.props.quote.length-1, bgUrl: this.props.bgUrl});
  }

  componentWillReceiveProps() {
    this.setState(this.adjust(this.state));
  }

  isActive(d){
    return (d.pctScroll >= this.props.start && d.pctScroll < this.props.end);
  }

  adjust(last_state) {
    var {viewportHeight, viewportTop, adjustedViewportTop, contentHeight, pctScroll} = this.props.measurements,
        adjustedPctScroll = this.scaler(pctScroll),
        active = this.isActive(this.props.measurements),
        dest_top = viewportHeight * -1,
        text = "",
        maskText = "",
        word = "",
        wordIdx,
        display,
        newTop;

    if(pctScroll < this.props.start) {
      display = "none";
      wordIdx = -1;
    } else if (pctScroll > this.props.end) {
      wordIdx = this.state.wordCount+1;
      display = "block";
    } else {
      display = "block";
      wordIdx = Math.min(this.state.wordCount, Math.round(this.state.wordCount * adjustedPctScroll));
    }

    // console.log(this.state.wordCount, wordIdx);

    if(wordIdx === -1) {
      maskText = "";
      text = "";
      word = "";
    } else if (wordIdx === 0) {
      maskText = "";
      text = this.props.quote.slice(0, wordIdx).join("");
      word = this.props.quote[wordIdx];
    } else if (wordIdx > this.state.wordCount) {
      word = "";
      maskText = this.props.quote.slice(0, wordIdx+1).join("");
      text = this.props.quote.slice(0, wordIdx+1).join("");
    } else {
      maskText = this.props.quote.slice(0, wordIdx).join("");
      text = this.props.quote.slice(0, wordIdx).join("");
      word = this.props.quote[wordIdx];
    }

    // console.log('word:', word, 'wordidx:', wordIdx, flickered);
    return {active, display, maskText, text, word, wordIdx};
  }

  getZoomText() {
    return (
      <div className="zoomed-text" style={{
        display: (this.state.word) ? "flex" : "none"
      }}>
        <span ref="zoomText">{this.state.word}</span>
      </div>);
  }

  render() {
    var zoomText = this.getZoomText();
    // {this.state.maskText}
    return(
      <div style={{display: this.state.display}}>
        <div className="bg-zoom zoom-text" style={{
          backgroundImage: (this.state.bgUrl) ? "url(" + this.state.bgUrl + ")" : "",
          WebkitBackgroundClip: this.state.clipMode,
          zIndex: 100 }}
          ref="bg">

          {zoomText}
        </div>
      </div>
    )
  }
}

class ImageSwitcher extends ScanComponent {
  constructor(props) {
    super(props);
    this.state = {
      altImage: "",
      defImage: "",
      imageCount: 0,
      imageIdx: 0
    }
  }

  componentWillMount() {
    this.setState({imageCount: this.props.images.length-1});
  }

  componentWillReceiveProps() {
    this.setState(this.adjust(this.state));
  }

  isActive(d){
    return (d.pctScroll >= this.props.start && d.pctScroll < this.props.end);
  }

  adjust(last_state) {
    var {viewportHeight, viewportTop, adjustedViewportTop, contentHeight, pctScroll} = this.props.measurements,
        adjustedPctScroll = this.scaler(pctScroll),
        active = this.isActive(this.props.measurements),
        defImage,
        altImage,
        display,
        imageIdx;

    // console.log(adjustedPctScroll);
    if(pctScroll < this.props.start) {
      imageIdx = -1;
      display = "none";
    } else if (pctScroll > this.props.end) {
      imageIdx = this.state.imageCount;
      display = "block";
    } else {
      display = "block";
      imageIdx = Math.min(this.state.imageCount, Math.round(this.state.imageCount * adjustedPctScroll));
    }

    defImage = (imageIdx >= 0) ? "/thailand/" + this.props.images[imageIdx] : "";
    altImage = (imageIdx >= 0) ? "/thailand/" + this.props.altImages[imageIdx] : "";
    return {defImage, altImage, imageIdx, active, display};
  }

  showAltImage() {
    let $alt = $(this.refs.altImage);
    if(!$alt.hasClass("switch-from-left")) {
      $(this.refs.altImage).addClass("switch-from-left");
      $(".zoomed-text").addClass("pull-right");
    }
  }

  hideAltImage() {
    let $alt = $(this.refs.altImage);
    if($alt.hasClass("switch-from-left")) {
      $(this.refs.altImage).removeClass("switch-from-left");
      $(".zoomed-text").removeClass("pull-right");
    }
  }

  componentDidMount() {
    $(window).on("keydown", (e) => {
      if(e.keyCode == 16 && this.state.active) {
        e.preventDefault();
        this.showAltImage();
      }
    });

    $(window).on("keyup", (e) => {
      if(e.keyCode == 16 && this.state.active) {
        e.preventDefault();
        this.hideAltImage();
      }
    });

    var hammerSwipe = new Hammer(document.body);

    hammerSwipe.on("swipeleft", (ev) => {
        if(this.state.active) {
          ev.preventDefault();
          this.showAltImage();
          return false;
        }
    });

    hammerSwipe.on("swiperight", (ev) => {
        if(this.state.active) {
          ev.preventDefault();
          this.hideAltImage();
          return false;
        }
    });
  }

  render() {
    return (
      <div className="image-switcher" style={{zIndex: 100, display: this.state.display}}>
        <img ref="defImage" src={this.state.defImage} className="switcher-def" />
        <img ref="altImage" src={this.state.altImage} className="switcher-alt" />
      </div>
    );
  }
}

class ScrollGallery extends ScanComponent {
  constructor(props) {
    super(props);
    this.state = {
      imageIdx: -1,
      active: false,
      images: [],
      zIndex: 0,
      adjustedPctScroll: -1
    };
  }

  componentWillMount() {
    this.setState({imageCount: this.props.images.length-1, adjustedPctScroll: this.scaler(this.props.measurements.pctScroll)});
  }

  componentWillReceiveProps() {
    this.setState(this.adjust(this.state));
  }

  isActive(d){
    return (d.pctScroll >= this.props.start && d.pctScroll < this.props.end);
  }

  adjust(last_state) {
    var {viewportHeight, viewportTop, adjustedViewportTop, contentHeight, pctScroll} = this.props.measurements,
        adjustedPctScroll = this.scaler(pctScroll),
        active = this.isActive(this.props.measurements),
        images = [],
        display,
        imageIdx,
        zIndex = last_state.zIndex;

    // console.log("scrollGallery:measurements: ", pctScroll, ":", adjustedPctScroll);
    if(adjustedPctScroll < 0) {
      imageIdx = -1;
      display = "none";
      zIndex = 0;
    } else if (adjustedPctScroll > 1) {
      imageIdx = this.state.imageCount;
      display = "block";
    } else {
      display = "block";
      imageIdx = Math.min(this.state.imageCount, Math.round(this.state.imageCount * adjustedPctScroll));
      zIndex = 103;
    }

    if(imageIdx >= 0) {
      images = this.props.images.slice(0, imageIdx+1);
    }
    return {active, display, imageIdx, images, zIndex, adjustedPctScroll};
  }

  render() {
    var scrollDist = 1 / this.props.images.length;
    var measurements = _.extend(_.clone(this.props.measurements), {pctScroll: this.state.adjustedPctScroll});
    // console.log(measurements.pctScroll);
    var images = this.props.images.map((p, i) => {
      let start = i * scrollDist,
      end = (scrollDist * i) + scrollDist;
      return (
        <GalleryImage key={p.imagePath} measurements={measurements} start={start} end={end} caption={p.caption} bgImage={p.imagePath} />
      );
    });
    return (
      <div className="scroll-gallery" style={{display: this.state.display, zIndex: this.state.zIndex}}>
        {images}
      </div>
    );
  }
}

class GalleryImage extends ScanComponent {
  constructor(props) {
    super(props);
    this.state = {
      top: 0,
      opacity: 0,
      active: false,
      caption: true,
      display: "none"
    };
  }

  componentWillReceiveProps() {
    this.setState(this.adjust(this.state));
  }

  componentWillMount() {
    this.setState( {top: this.props.measurements.viewportHeight});
  }

  isActive(d){
    return (d.pctScroll >= this.props.start && d.pctScroll < this.props.end);
  }

  adjust(last_state, d) {
    let {viewportHeight, viewportTop, adjustedViewportTop, contentHeight, pctScroll} = this.props.measurements,
        adjustedPctScroll = this.scaler(pctScroll),
        active = this.isActive(this.props.measurements),
        caption = last_state.caption,
        opacity = last_state.opacity,
        top = last_state.top,
        display = last_state.display;

    var conti = new Conti(0,0.5,"adjustedPctScroll", (pct, t) => {
      t.opacity = 0;// Math.linearTween(pct, 0, 1, 0.5);
      return t;
    })
    .abut(0.95, (pct, t) => {
      t.opacity = Math.linearTween(pct, 0, 1, 0.5);
      return t;
    })
    .abut(1, (pct, t) => {
      t.opacity = Math.linearTween(pct, 1, 0, 0.5);
      return t;
    });

    var trans_data = conti.run(_.extend(this.props.measurements, {adjustedPctScroll}), {});
    // console.log(trans_data);
    // if(adjustedPctScroll > 0.5) {
    //   caption = true;
    // } else {
    //   caption = false;
    // }
    if(adjustedPctScroll < 0) {
      top = viewportHeight;
      // opacity = 0;
      display = "none";
    } else if (adjustedPctScroll > 1) {
      top = 0;
      // opacity = 0;
      // display = "none";
    } else {
      top = Math.linearTween(adjustedPctScroll,viewportHeight,-viewportHeight,1);
      // opacity = 1;
      display = "block";
    }

    return {active, opacity: trans_data.opacity, top, display, caption};
  }

  render() {
    var bgImage = (this.props.bgImage) ? "url(" + this.props.bgImage + ")" : "";
    return(
      <div ref="slideRoot" className="bg-slide slide-block" style={{
        transform: "translate(0, " + this.state.top + "px)",
        height: this.props.measurements.viewportHeight,
        // zIndex: 200,
        // opacity: this.state.opacity,
        display: this.state.display,
        backgroundImage: bgImage
      }}>
        <h5 className="slide-caption block-caption" style={{display: (this.state.caption && this.props.caption) ? "block" : "none",
        opacity: this.state.opacity}}>
          &ldquo;{this.props.caption}&rdquo;
        </h5>
      </div>
    )
  }
}

class PathChoice extends ScanComponent {
  constructor(props) {
    super(props);
    this.state = {
      choice: null,
      callToggle: false,
      wormholeLength: 2500,
      wormholeComponent: null,
      wormholeMeasurements: {},
      wormholeJump: null,
      display: "flex",
      zIndex: -1
    };
  }

  componentWillMount() {
    this.setState({choice: 0});
  }

  componentWillReceiveProps() {
    var adjustments = this.adjust(this.state);
    if(adjustments.callToggle) {
      this.context.toggleWormhole(adjustments.wormholeJump);
    }
    this.setState(adjustments);
  }

  componentDidMount() {
    $(window).on("keydown", (e) => {
      // console.log("keydown: callToggle:", this.state.callToggle, 'wormholeActive:',this.props.measurements.wormholeActive);
      if(e.keyCode == 16 && this.state.active && !this.props.measurements.wormholeActive) {
        e.preventDefault();
        this.switchChoice();
      }
    });
  }

  isActive(d){
    return (d.pctScroll >= this.props.start && d.pctScroll < this.props.end);
  }

  adjust(last_state) {
    if(this.props.measurements.wormholeActive) {
      return this.wormholeAdjust(last_state);
    } else {
      return this.regularAdjust(last_state);
    }
  }

  wormholeAdjust(last_state) {
    var {viewportHeight, viewportTop, adjustedViewportTop, contentHeight, pctScroll, wormholeDist, wormholeActive} = this.props.measurements,
        adjustedPctScroll = this.scaler(pctScroll),
        callToggle = last_state.callToggle,
        wormholeJump,
        pctWormholeScroll = wormholeDist / (this.state.wormholeLength - viewportHeight);

    // console.log("wormholeAdjust", pctWormholeScroll, wormholeActive);
    // Exit out of wormhole locations.
    if (pctWormholeScroll < 0 && wormholeActive) {
      callToggle = true;
      wormholeJump = this.props.start;
    } else if (pctWormholeScroll >= 1 && wormholeActive) {
      callToggle = true;
      wormholeJump = this.props.end - 0.005;
    } else {
      callToggle = false;
      wormholeJump = null;
    }

    return {callToggle, wormholeJump, wormholeMeasurements: _.extend(this.state.wormholeMeasurements, {pctScroll: pctWormholeScroll})};
  }

  regularAdjust(last_state) {
    var {viewportHeight, viewportTop, adjustedViewportTop, contentHeight, pctScroll, wormholeDist, wormholeActive} = this.props.measurements,
        adjustedPctScroll = this.scaler(pctScroll),
        pctWormholeScroll = wormholeDist / (this.state.wormholeLength - viewportHeight),
        active = this.isActive(this.props.measurements),
        callToggle = last_state.callToggle,
        zIndex = last_state.zIndex;


    // console.log("regularAdjust:", viewportTop, pctScroll, adjustedPctScroll);
    if(pctScroll < this.props.start) {
      zIndex = -1;
    } else if (pctScroll > this.props.end) {
      zIndex = -1;
    } else {
      zIndex = 100;
    }

    //togggle wormhole once you scroll card past 0.1 of its internal scroll.
    callToggle = (!callToggle && adjustedPctScroll > 0.1 && adjustedPctScroll < 0.9);


    return {active, zIndex, callToggle, wormholeMeasurements: _.extend(_.clone(this.props.measurements), {pctScroll: pctWormholeScroll})};
  }

  getChoices() {
    var choices = this.props.choices.map((p, i) => {
      var active = (this.state.choice === i);
      var className = (active) ? "active-choice choice-item" : "choice-item";
      return (
        <li key={i} className={className}>
          <img style={{height: 270}} src={p.choiceImage} />
          <span className="choice-name">{p.name}</span>
        </li>
      );
    });
    return (
      <ul className="choice-list">
        {choices}
      </ul>
    );
  }

  switchChoice() {
    let choice = (this.state.choice === this.props.choices.length - 1) ? 0 : this.state.choice + 1;
    this.setState({choice: choice});
  }

  render() {
    var choices = this.getChoices();
    var wormholeComponent;
    if(this.props.measurements.wormholeActive) {
      let choice = this.props.choices[this.state.choice];
      wormholeComponent = <choice.component {...choice.props} measurements={this.state.wormholeMeasurements} start={0} end={1} />;
    } else {
      wormholeComponent = "";
    }
    return (
      <div style={{position: "fixed", top: 0, left: 0, zIndex: this.state.zIndex}}>
        <div className="path-chooser" style={{display: this.state.display}}>
          <h5 className="choice-title">{this.props.title}</h5>
          {choices}
          <span className="choice-instructions">{this.props.instructions}</span>
        </div>
        {wormholeComponent}
      </div>
    );
  }
}

class GoogleCardLink extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      screenCoords: [],
      showCard: false
    };
  }

  handleClick(e) {
    // console.log(e, this.props.cardData);
    this.setState({screenCoords: [e.clientX, e.clientY], showCard: (!this.state.showCard)});
  }

  render() {
    return (
      <div className={this.props.cssClass} ref="link">
        <span onClick={this.handleClick.bind(this)}>{this.props.text}</span>
        <GoogleCard show={this.state.showCard} name={this.props.cardData.name} coords={this.props.cardData.coords} screenCoords={this.state.screenCoords} location={this.props.cardData.city + ', ' + this.props.cardData.country} />
      </div>
    );
  }
}

class GoogleCard extends React.Component {
  // constructor(props) {
  //   super(props);
  // }

  setCard(x, y) {
    var $card = $(ReactDOM.findDOMNode(this.refs.googleCard));
    var top = y - $card.height() - 40;
    var left = x - ($card.width()/2);
    // var right = 60;
      $card.css({
        top: top,
        left: (left < 10) ? 10 : left
        // right: right
      });
  }

  componentWillReceiveProps(nextProps) {
    this.setCard(nextProps.screenCoords[0], nextProps.screenCoords[1]);
  }

  render() {
    var showCard = (this.props.show) ? "visible" : "hidden";
    return (
      <div ref="googleCard" className="google-card" style={{visibility: showCard}}>
          <div ref="cardMap" className="google-card-map">
            <Map center={this.props.coords} zoom={18} />
          </div>
          <div className="google-card-name">{this.props.name}</div>
          <div className="google-card-subtitle">{this.props.location}</div>
      </div>
    );
  }
}

class Map extends React.Component {
  componentDidMount() {
     this.map = new google.maps.Map(ReactDOM.findDOMNode(this.refs.map), {
      center: this.props.center,
      zoom: this.props.zoom,
      disableDefaultUI: true,
      // disableDoubleClickZoom: true,
      // draggable: false,
      scrollwheel: false
    });
  }

  componentWillReceiveProps(nextProps) {
    this.map.setCenter(nextProps.center);
  }

  render() {
    return (<div ref="map" className="map-container"></div>);
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
