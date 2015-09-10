var React = require('react');
var $ = require('jquery');
var _ = require('underscore');
var PureRenderMixin = require('react/addons').addons.PureRenderMixin;

window.jQ = $;

Math.linearTween = function (t, b, c, d) {
	return c*t/d + b;
};
Math.easeOutBack = function (t, b, c, d, s) {
		if (s == undefined) s = 1.70158;
		return c*((t=t/d-1)*t*((s+1)*t + s) + 1) + b;
};
Math.easeInOutQuad = function (t, b, c, d) {
	t /= d/2;
	if (t < 1) return c/2*t*t + b;
	t--;
	return -c/2 * (t*(t-2) - 1) + b;
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

TRV.animatePov = function(sv,pov){
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
        sv.setPov({heading: new_heading, pitch: new_pitch, zoom: new_zoom});
        i++;
        if(i < ticks){
            setTimeout(function(){
              next();
            },33)
        }
    }
    next();
}

class TestComponent extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div style={{position: 'relative', width: '100%', height: '100%'}}>
        <Title/>
        <Slide1/>
        <Slide2/>
        <Slide3/>
      </div>
    );
  }
}

class ScanComponent extends React.Component {
  constructor(props) {
    super(props);
    TRV.scan_components.push(this);
  }

  isActive(){
    return false;
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

class Title extends ScanComponent {
  constructor(props) {
    super(props);
    this.state = {
      bg_top: 0,
    };
  }
  adjust(last_state, d) {
    var dest_top = -1 * $(window).height();
    if(d.pct_scroll < 0.1){
        var new_top = Math.linearTween(d.pct_scroll, 0, dest_top, 0.1);
    } else if (d.pct_scroll) { 
        var new_top = dest_top;
    }
    return {bg_top: new_top};
  }

  render() {
    return(
      <div className='bg-slide' style={{
        position: "fixed",
        top: this.state.bg_top,
        width: this.state.width,
        height: this.state.height,
        backgroundImage: "url('marseille_1.jpg')",
        backgroundSize: "cover",
        zIndex: 100
      }}>
        <h3 className="vid-title" style={{fontSize: 300}}>MARSEILLE</h3>
      </div>
    )
  }
}
class Slide1 extends ScanComponent {
  constructor(props) {
    super(props);
    this.state = {
      bg_top: 0,
      width: $(window).width(),
      height: $(window).height(),
      caption: false,
      active: false,
      black: 0,
      redh: 0,
      slideWords: "10%"
    };
  }
  isActive(d){
    if(d.pct_scroll >= 0.1 && d.pct_scroll < 0.35){
        return true;
    } else {
        return false;
    }
  }
  adjust(last_state, d) {

    if(this.isActive(d)){
        this.state.active = true;    
    } else {
        this.state.active = false;    
    }

    if(d.pct_scroll < 0.1){
        $("#shopping-mp3")[0].play();
        var new_pitch = 64.9837616957764;
        var new_volume = 0;
        var new_slide = 10
    } else if (d.pct_scroll >= 0.1 && d.pct_scroll < 0.2) {
        $("#shopping-mp3")[0].play();
        var clamped_pct = (d.pct_scroll - 0.1) / 0.1;
        var new_pitch = Math.linearTween(clamped_pct, 64.9837616957764, -64.9837616957764, 1);
        var new_volume = Math.linearTween(clamped_pct,0,0.6,1);
        var new_slide = Math.linearTween(clamped_pct,10,-100,1);
    } else if (d.pct_scroll >= 0.2 && d.pct_scroll < 0.35) {
        $("#shopping-mp3")[0].play();
        var new_pitch = 0;
        var new_volume = 0.6
        var new_slide = -100;
    } else if (d.pct_scroll >= 0.35 && d.pct_scroll < 0.45) {
        $("#shopping-mp3")[0].play();
        var new_pitch = 0;
        var clamped_pct = (d.pct_scroll - 0.35) / 0.1;
        var new_volume = Math.linearTween(clamped_pct,0.6,-0.6,1);
        var new_slide = -100;
    } else if (d.pct_scroll >= 0.45) {
        $("#shopping-mp3")[0].pause();
        var new_pitch = 0;
        var new_volume = 0;
        var new_slide = -100;
    }

    $("#shopping-mp3")[0].volume = new_volume;

    var caption = false;
    if (d.pct_scroll < 0.15) {
        caption = false
    } else if ((d.pct_scroll >= 0.15 && d.pct_scroll < 0.2)){
        caption = "I woke up in the middle of the promenade.";
        if(caption !== this.state.caption){
          $("#shopping-mp3-1")[0].play();
        }
    } else if ((d.pct_scroll >= 0.2 && d.pct_scroll < 0.25)){
        caption = "Traffic had stopped, my head spinning.";
        if(caption !== this.state.caption){
          $("#shopping-mp3-2")[0].play();
        }
    } else if ((d.pct_scroll >= 0.25 && d.pct_scroll < 0.3)) {
        caption = "Yung TourGuide was laughing.<br/>'First time, eh?'";
        if(caption !== this.state.caption){
          $("#shopping-mp3-4")[0].play();
        }
    } else if (d.pct_scroll > 0.3 && d.pct_scroll < 0.45) {
        caption = "My hand was clutching a bottle of magic juice. My night had just started."
        if(caption !== this.state.caption){
          $("#shopping-mp3-3")[0].play();
        }
    }

    var card_pct;
    if(d.pct_scroll < 0.1){
       card_pct = 0;
    } if(d.pct_scroll > 0.35) {
       card_pct = 1;
    } else {
       card_pct = (d.pct_scroll - 0.1) / 0.25;
    }


    var redh = Math.linearTween(card_pct,0,79,1)

    var black_pct;
    if (d.pct_scroll < 0.2){
        black_pct = 0;
    } else if (d.pct_scroll >= 0.45){
        black_pct = 0.9;
    } else {
        black_pct = (d.pct_scroll - 0.2) / 0.25
    }
    var new_black = Math.linearTween(black_pct,0,0.9,1);

    var current_pov = TRV.streetView.getPov();

    current_pov.pitch = new_pitch;
    TRV.streetView.setPov(current_pov)
    return {bg_top: 0, caption: caption, redh: redh, black: new_black, slideWords: new_slide + "%"};
  }
  togglePov(){
    var current_pov = _.clone(TRV.streetView.getPov());
    if(!this.pov_toggle){
        current_pov.heading += 180;
        this.pov_toggle = true;
    } else {
        current_pov.heading -= 180;
        this.pov_toggle = false;
    }
    TRV.animatePov(TRV.streetView,current_pov);
  }
  componentDidMount(){
    var map = new google.maps.Map(document.getElementById('slide1'));
  // replace "toner" here with "terrain" or "watercolor"
    TRV.map = map;
    TRV.streetView = TRV.map.getStreetView();
    TRV.streetView.setVisible(true);
    TRV.streetView.setOptions( {linksControl: false,panControl: false, zoomControl: false, mapTypeControl: false, streetViewControl: false, overviewMapControl: false, addressControl: false, enableCloseButton: false})

    var startPoint = new google.maps.LatLng(43.29638, 5.377674); 
    TRV.streetView.setPosition(startPoint)
    TRV.streetView.setPov({heading: 77.68007576992042, pitch: 64.9837616957764, zoom: 1})
    $('#slide1').css({"pointer-events": "none"})

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
    },this))
  }

  render() {
    return(
      <div className='bg-slide' style={{
        position: "fixed",
        top: this.state.bg_top,
        width: this.state.width,
        height: this.state.height,
      }}>
        <div id="slide1" style= {{
          width: this.state.width,
          height: this.state.height,
        }}/>
        <h6 className="slide-words" style={{
            top: this.state.slideWords
        }}>
            At 6:00 PM, I got the text. "Meet Yung Tourguide in the middle of Marseille and take this pill". A pill popped out of my phone, because it was the future. I was gonna have a crazy night in the service of journalism.
        </h6>
        <h5 className="slide-caption" style={{display: this.state.caption ? 'block' : 'none'}} dangerouslySetInnerHTML={{ __html: this.state.caption}}>
        </h5>
        <div className="v-white-glow"/>
        <div className="v-white">
            <div className="v-red" style={{height: this.state.redh}}/>
        </div>
        <div className="full-black" style={{opacity: this.state.black}}/>

        <audio id="shopping-mp3" loop>
          <source src="/shopping-square-1.mp3" type="audio/mp3"/>
        </audio>

        <audio id="shopping-mp3-1">
          <source src="clip1.wav" type="audio/wav"/>
        </audio>
        <audio id="shopping-mp3-2">
          <source src="clip2.wav" type="audio/wav"/>
        </audio>
        <audio id="shopping-mp3-3">
          <source src="clip3.wav" type="audio/wav"/>
        </audio>
        <audio id="shopping-mp3-4">
          <source src="clip4.wav" type="audio/wav"/>
        </audio>
      </div>
    )
  }
}

class Slide2 extends ScanComponent {
  constructor(props) {
    super(props);
    this.state = {
      bg_bottom: $(window).height(),
      width: $(window).width(),
      height: $(window).height(),
    };
  }
  adjust(last_state, d) {
    var obot = $(window).height()
    if(d.pct_scoll < 0.35){
        var bg_bot = obot;
    } else if (d.pct_scroll > 0.45){
        var bg_bot = 0;
    } else {
        var clamped_scroll = (d.pct_scroll - 0.35) / 0.1 
        var bg_bot = Math.linearTween(clamped_scroll,obot,-1 * obot,1)
    }

    if(d.pct_scroll > 0.35 && d.pct_scroll < 0.5){
        var active = true;
    } else {
        var active = false;
    }
    return {bg_bottom: bg_bot, active: active};
  }
  toggleBars(){
    if(this.bars_on){
        this.bars_on = false;
        $("#bar1").css({right: $(window).width()}); 
        setTimeout(function(){
            $("#bar2").css({left: $(window).width()}); 
        },500)
        setTimeout(function(){
            $("#bar3").css({right: $(window).width()}); 
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
        position: "fixed",
        top:0,
        bottom: this.state.bg_bottom,
        width: this.state.width,
        height: "auto",
        backgroundColor: "white",
        overflow: "hidden"
      }}>
        <div className="text-crop">
            <h5 className="slide-caption black">My hand was clutching a bottle of magic juice. My night had just started.</h5>
        </div>
        <div className="blackbar" id="bar1" style={{height:"22%", top: "20%", right: $(window).width()}}>
            <div className="btext" style={{width: $(window).width()}}>
                <div className="btext-inner">
12 Midnight: Sudden laughter, repeated in short bursts. "I would like to metamorphose into a mouse-mountain.
                </div>
            </div>
        </div>
        <div className="blackbar" id="bar2" style={{height:"17%", top:"43%", left: $(window).width()}}>
            <div className="btext" style={{width: $(window).width()}}>
                <div className="btext-inner">
1:30: We turn into an alley and ask a stranger to bum a cigarette.
                </div>
            </div>
        </div>
        <div className="blackbar" id="bar3" style={{height:"28%", top: "63%", right: $(window).width()}}>
            <div className="btext" style={{width: $(window).width()}}>
                <div className="btext-inner">
2:17: I find myself outside a bar. It could be any bar, in any city. Except in most cities, the bar would be closed by now. Here, the bar lively. A woman approaches me.
                </div>
            </div>
        </div>
        <audio id="city">
          <source src="city.mp3" type="audio/mp3"/>
        </audio>
        <audio id="city-v">
          <source src="city-v.wav" type="audio/wav"/>
        </audio>
      </div>
    )
  }
}

class Slide3 extends ScanComponent {
  constructor(props) {
    super(props);
    this.state = {
      bg_top: -1 * $(window).height(),
      width: $(window).width(),
      height: $(window).height(),
      redh: 0,
      current_slide: 0
    };
  }

  isActive(d){
    if(d.pct_scroll >= 0.5 && d.pct_scroll < 0.7){
        return true;
    } else {
        return false;
    }
  }
  
  adjust(last_state, d) {

    if(this.isActive(d)){
        this.state.active = true;    
    } else {
        this.state.active = false;    
    }

    var otop = -1 * $(window).height();

    var pct_scroll;

    if(d.pct_scroll < 0.45){
        pct_scroll = 0
    } else if(d.pct_scroll > 0.5){
        pct_scroll = 1
    } else {
        pct_scroll = (d.pct_scroll - 0.45) / 0.05
    }
    
    var new_top = Math.linearTween(pct_scroll,otop,-otop,1);

    if(d.pct_scroll < 0.45){
        $("#diner-mp3")[0].play();
        var new_volume = 0;
    } else if (d.pct_scroll >= 0.45 && d.pct_scroll < 0.5) {
        $("#diner-mp3")[0].play();
        var clamped_pct = (d.pct_scroll - 0.45) / 0.05;
        var new_volume = Math.linearTween(clamped_pct,0,0.6,1);
    } else if (d.pct_scroll >= 0.5 && d.pct_scroll < 0.65) {
        $("#diner-mp3")[0].play();
        var new_volume = 0.6
    }
    
    if(new_volume || new_volume === 0){
        $("#diner-mp3")[0].volume = new_volume;
    }

    var caption = false;
    if (d.pct_scroll < 0.5) {
        caption = false
    } else if ((d.pct_scroll >= 0.5 && d.pct_scroll < 0.55)){
        caption = "Yung Tourguide took me to his favorite diner, Schmetty's.";
        if(caption !== this.state.caption){
          $("#diner-mp3-1")[0].play();
        }
    } else if ((d.pct_scroll >= 0.55 && d.pct_scroll < 0.6)){
        caption = "The deli meats were chopped. I was chopped. I needed extra ketchup but they weren't serving Heinz.";
        if(caption !== this.state.caption){
          $("#diner-mp3-2")[0].play();
        }
    } else if ((d.pct_scroll >= 0.6 && d.pct_scroll < 0.65)) {
        caption = "Yung Tourguide said that he ate here 8 times a week, 50 weeks a year.";
        if(caption !== this.state.caption){
          $("#diner-mp3-3")[0].play();
        }
    }

    var card_pct;
    if(d.pct_scroll < 0.5){
       card_pct = 0;
    } if(d.pct_scroll > 0.65) {
       card_pct = 1;
    } else {
       card_pct = (d.pct_scroll - 0.5) / 0.15;
    }


    var redh = Math.linearTween(card_pct,0,79,1)

    return {bg_top: new_top, redh: redh, caption: caption};
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
                $(".v-white-glow").css({opacity:1});
                setTimeout(function(){
                    $(".v-white-glow").css({opacity:0});
                },500)
                return false;
            }
        }
    },this))
  }
  
  render() {
    var cs = this.state.current_slide,
        pic_2_left = (cs === 1 ||  cs === 2 ? 0 : -1 * $(window).width()),
        pic_3_left = (cs === 2 ? 0 : -1 * $(window).width())
    return(
      <div className='bg-slide' style={{
        position: "fixed",
        top: this.state.bg_top,
        width: this.state.width,
        height: this.state.height,
        backgroundImage: "url('36.jpg')",
        backgroundSize: "cover"
      }}>
        <div id="slide-pic-2" className="slide-slide" style={{
            backgroundImage: "url('diner-food.jpg')",
            backgroundPosition: "0 -200px",
            left: pic_2_left
        }}></div>
        <div id="slide-pic-3" className="slide-slide" style={{
            backgroundImage: "url('36-2.jpg')",
            left: pic_3_left
        }}></div>
        <h5 className="slide-caption" style={{display: this.state.caption ? 'block' : 'none'}} dangerouslySetInnerHTML={{ __html: this.state.caption}}>
        </h5>
        <div className="v-white-glow"/>
        <div className="v-white">
            <div className="v-red" style={{height: this.state.redh}}/>
        </div>

        <audio id="diner-mp3" loop>
          <source src="diner.mp3" type="audio/mp3"/>
        </audio>

        <audio id="diner-mp3-1">
          <source src="diner-clip1.wav" type="audio/wav"/>
        </audio>
        <audio id="diner-mp3-2">
          <source src="diner-clip2.wav" type="audio/wav"/>
        </audio>
        <audio id="diner-mp3-3">
          <source src="diner-clip3.wav" type="audio/wav"/>
        </audio>
      </div>
    )
  }
}

class PagerL extends ScanComponent {
  constructor(props) {
    super(props);

    var start_left = (-1 * $(window).width());

    this.state = {
      left: start_left,
      width: $(window).width(),
      height: $(window).height(),
      line1: false,
      line2: false,
      line3: false
    };
  }
  adjust(last_state, d) {
    var first_graf_elapsed = d.markers["crown-vic"](0.5).pct_elapsed,
        start_left = -1 * $(window).width(),
        left;

    left = Math.easeOutBack(first_graf_elapsed, start_left, 145, 1.0);
    return {left: left};
  }
  animateIn(i,start_left){
    var new_left = Math.linearTween(i, start_left, -start_left, 15);
    this.setState({left: new_left});
    if(i <= 14){
      setTimeout(_.bind(function(){
        requestAnimationFrame(_.bind(function(){
            this.animateIn(i+1,start_left);
        },this))
      },this),33)
    } else {
      $("#bye-vid")[0].play(); 
      $("#left-pager-audio")[0].play(); 
      $("#train-natch").show();
      TRV.scan_components[0].setState({dir: "timelapse2", frames: 20, frame: 20, loop: true})
      setTimeout(function(){
        TRV.scan_components[1].setState({line1: true});
      },1000)
      setTimeout(function(){
        TRV.scan_components[1].setState({line1: false, line2: true});
      },5000)
      setTimeout(function(){
        TRV.scan_components[1].setState({line2: false, line3: true});
      },10000)
      setTimeout(_.bind(function(){
        this.animateOut(0,start_left) 
        $("#bye-vid")[0].pause(); 
        $("#left-pager-audio")[0].pause(); 
      },this),15000);
    }
  }
  animateOut(i,end_left){
    var new_left = Math.linearTween(i, 0, end_left, 15);
    this.setState({left: new_left});
    if(i <= 14){
      setTimeout(_.bind(function(){
        requestAnimationFrame(_.bind(function(){
          this.animateOut(i+1,end_left);
        },this))
      },this),33)
    } else {
        $("body").css({overflow:"scroll"});
        TRV.scan_components[1].setState({line3: false});
    }
  }
  leftPage(){
    $("body").css({overflow:"hidden"});
    this.animateIn(0, this.state.left);
  }

  render() {
    return(
      <div id="left-pager" style={{left: this.state.left}} onClick={_.bind(this.leftPage,this)} >
        <video id="bye-vid" width={this.state.width} height={this.state.height}>
          <source src="/bye.mp4" type="video/mp4"/>
        </video>
        <audio id="left-pager-audio">
          <source src="/train.wav" type="audio/wav"/>
        </audio>
        <h3 className="vid-title" style={{display: this.state.line1 ? 'block' : 'none'}}>THE TRAIN NEVER CAME</h3>
        <h3 className="vid-title" style={{display: this.state.line2 ? 'block' : 'none'}}>ABANDONED, I BEGAN WEEPING</h3>
        <h3 className="vid-title" style={{display: this.state.line3 ? 'block' : 'none'}}>THEN UBER SAVED MY LIFE</h3>
      </div>
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
        dir: "timelapse",
        frames: 59,
        frame: 0,
        loop: false
    };
  }
 
  adjust(last_state, d) {
    var first_graf_elapsed = d.markers["12-chairs"](0.5).pct_elapsed,
        first_graf_elapsed_raw = d.markers["12-chairs"](0.5).pct_elapsed_raw,
        window_height = $(window).height(),
        frames = this.state.frames,
        frame,bg_top;
    if(this.state.loop){
        frame = Math.round((frames * first_graf_elapsed_raw) % frames);
        if(frame < 0){frame = 0}
    } else {
        frame = Math.round(frames * first_graf_elapsed);
    }
    return {frame: frame};
  }

  render() {
    return(
        <img id="timelapse" src={this.state.dir + "/frame_" + this.state.frame +".gif"}/>
    )
  }
}


$(function() {
  $("#page").height($(window).height() * 30);
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
    var pct_scroll = new_scroll / ($("body").height() - $(window).height());
    _(TRV.scan_components).each(function(c){
      var last_state = _(c.state).clone();
      var new_state = c.adjust(last_state, {
        scroll_top: new_scroll,
        pct_scroll: pct_scroll,
        markers: markers,
        inv_markers: inv_markers
      });
      c.setState(new_state);
    });
  },5));
});
